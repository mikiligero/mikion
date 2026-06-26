// Runner del digest: reúne las tareas con fecha del workspace de cada usuario y
// entrega el resumen a la bandeja de entrada + Telegram (vía createNotification).
// La lógica pura (ventanas, agrupación, formato) está en digest.ts.

import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { databases, docs, people, preferences, rows, workspaces } from "@/db/schema";
import { dateEnd, dateStart } from "@/lib/calendar-utils";
import { getRowTitle } from "@/lib/database-utils";
import type { DatabaseSchema, PropertyDef } from "@/lib/types";
import { createNotification, getSharedTreeForUser } from "@/lib/actions/helpers";
import {
  buildDigest,
  madridTime,
  madridToday,
  renderDigest,
  rowAssignedTo,
  shouldSendSlot,
  type Digest,
  type DigestItem,
  type DigestSlot,
  type SlotConfig,
} from "@/lib/digest";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function firstDateProperty(schema: DatabaseSchema): PropertyDef | null {
  return schema.properties.find((p) => p.type === "date") ?? null;
}
function statusProperty(schema: DatabaseSchema): PropertyDef | null {
  return schema.properties.find((p) => p.type === "status") ?? null;
}

type DigestDb = {
  id: string;
  schema: DatabaseSchema;
  title: string;
  workspaceId: string;
  scope: "team" | "private";
  // shared: BD que le han compartido (no propia) → solo entran las tareas
  // asignadas al usuario; las propias entran enteras.
  shared: boolean;
};

/**
 * BD que entran en el digest de un usuario: las de su propio workspace + las que
 * le han compartido (la propia BD, o una página ancestro que la contiene). Así
 * un recordatorio de tareas llega también a quien tiene la BD compartida.
 */
async function collectDigestDatabases(userId: string): Promise<DigestDb[]> {
  const out = new Map<string, DigestDb>();
  const cols = {
    id: databases.id,
    schema: databases.schema,
    title: docs.title,
    workspaceId: docs.workspaceId,
    scope: docs.section,
  };

  // 1) BD propias (del workspace del usuario).
  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerId, userId),
  });
  if (ws) {
    const owned = await db
      .select(cols)
      .from(databases)
      .innerJoin(docs, eq(databases.docId, docs.id))
      .where(and(eq(docs.workspaceId, ws.id), isNull(docs.deletedAt)));
    for (const d of owned) out.set(d.id, { ...d, shared: false });
  }

  // 2) BD compartidas: docs kind=database dentro del árbol compartido (la BD en
  //    sí o cualquier descendiente de una página compartida).
  const sharedTree = await getSharedTreeForUser(userId);
  const sharedDbDocs = sharedTree.docs.filter((d) => d.kind === "database");
  if (sharedDbDocs.length) {
    const shared = await db
      .select(cols)
      .from(databases)
      .innerJoin(docs, eq(databases.docId, docs.id))
      .where(
        inArray(
          databases.docId,
          sharedDbDocs.map((d) => d.id)
        )
      );
    // No pisamos una BD propia con su versión compartida (si fuera el caso).
    for (const d of shared) {
      if (!out.has(d.id)) out.set(d.id, { ...d, shared: true });
    }
  }

  return Array.from(out.values());
}

/**
 * Para cada (workspace, ámbito) de las BD compartidas, el `people.id` que
 * vincula al usuario destinatario. Permite filtrar las tareas compartidas a las
 * que tiene asignadas. Clave del mapa: `${workspaceId}::${scope}`.
 */
async function recipientPersonIds(
  userId: string,
  dbs: DigestDb[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const shared = dbs.filter((d) => d.shared);
  if (shared.length === 0) return map;
  const rows = await db
    .select({
      id: people.id,
      workspaceId: people.workspaceId,
      scope: people.scope,
    })
    .from(people)
    .where(eq(people.userId, userId));
  for (const r of rows) map.set(`${r.workspaceId}::${r.scope}`, r.id);
  return map;
}

/** Ids de las propiedades de tipo persona de un esquema. */
function personPropertyIds(schema: DatabaseSchema): string[] {
  return schema.properties.filter((p) => p.type === "person").map((p) => p.id);
}

/** Reúne las tareas con fecha (de BD propias y compartidas) y construye el digest. */
export async function computeUserDigest(
  userId: string,
  slot: DigestSlot,
  now: Date = new Date()
): Promise<Digest> {
  const today = madridToday(now);

  const dbRows = await collectDigestDatabases(userId);
  if (dbRows.length === 0) return { slot, total: 0, groups: [] };

  // En las BD compartidas solo cuentan las tareas asignadas al usuario; para eso
  // necesitamos su `people.id` en el ámbito/workspace dueño de cada BD.
  const personByScope = await recipientPersonIds(userId, dbRows);

  // Solo las BD que tienen propiedad de fecha.
  const withDate = dbRows
    .map((d) => ({ ...d, dateProp: firstDateProperty(d.schema) }))
    .filter((d): d is typeof d & { dateProp: PropertyDef } => !!d.dateProp);
  if (withDate.length === 0) return { slot, total: 0, groups: [] };

  const allRows = await db
    .select()
    .from(rows)
    .where(
      and(
        inArray(
          rows.databaseId,
          withDate.map((d) => d.id)
        ),
        isNull(rows.deletedAt)
      )
    );

  const byDb = new Map(withDate.map((d) => [d.id, d]));
  const items: DigestItem[] = [];
  for (const row of allRows) {
    const meta = byDb.get(row.databaseId);
    if (!meta) continue;

    // BD compartida: solo las tareas asignadas a este usuario.
    if (meta.shared) {
      const personId = personByScope.get(`${meta.workspaceId}::${meta.scope}`);
      if (
        !personId ||
        !rowAssignedTo(row.values, personPropertyIds(meta.schema), personId)
      )
        continue;
    }

    const dateVal = row.values?.[meta.dateProp.id] ?? null;
    // El vencimiento es el fin del rango si lo hay, si no la fecha.
    const due = dateEnd(dateVal) ?? dateStart(dateVal);
    if (!due) continue;

    const stProp = statusProperty(meta.schema);
    let done = false;
    let statusName: string | undefined;
    if (stProp) {
      const optId = row.values?.[stProp.id];
      const opt = stProp.options?.find((o) => o.id === optId);
      if (opt) {
        statusName = opt.name;
        done = opt.group === "done";
      }
    }

    items.push({
      title: getRowTitle(row.values, meta.schema),
      dbTitle: meta.title || "Sin título",
      dayISO: due.slice(0, 10),
      statusName,
      done,
    });
  }

  return buildDigest(items, slot, today);
}

/** Calcula y entrega el digest de una franja a TODOS los usuarios, ignorando su
 * horario (modo forzado / compatibilidad). Devuelve cuántos recibieron aviso. */
export async function runDigest(
  slot: DigestSlot,
  now: Date = new Date()
): Promise<{ usersNotified: number }> {
  const owners = await db
    .selectDistinct({ ownerId: workspaces.ownerId })
    .from(workspaces);

  let usersNotified = 0;
  for (const { ownerId } of owners) {
    if ((await sendUserDigestNow(ownerId, slot, now)).total > 0) usersNotified++;
  }
  return { usersNotified };
}

/** Calcula y, si hay tareas, entrega el digest de una franja a un usuario
 * concreto (sin mirar su horario ni marcar nada). Para el botón «Enviar ahora».
 * Devuelve cuántas tareas tenía. */
export async function sendUserDigestNow(
  userId: string,
  slot: DigestSlot,
  now: Date = new Date()
): Promise<{ total: number }> {
  const digest = await computeUserDigest(userId, slot, now);
  if (digest.total > 0) {
    const { title, body } = renderDigest(digest);
    await createNotification({ userId, type: "reminder", title, body });
  }
  return { total: digest.total };
}

async function markSlotSent(
  userId: string,
  slot: DigestSlot,
  dayISO: string
): Promise<void> {
  const field =
    slot === "morning"
      ? { digestMorningSentDate: dayISO }
      : { digestEveningSentDate: dayISO };
  await db
    .insert(preferences)
    .values({ userId, ...field })
    .onConflictDoUpdate({ target: preferences.userId, set: field });
}

/** Modo planificado: el cron tiquea cada 30 min y aquí decidimos, por usuario y
 * franja, si toca enviar según su hora/días configurados (una vez al día). */
export async function runScheduledDigests(
  now: Date = new Date()
): Promise<{ usersNotified: number; slotsFired: number }> {
  const todayISO = madridToday(now);
  const nowHHMM = madridTime(now);

  const owners = await db
    .selectDistinct({ ownerId: workspaces.ownerId })
    .from(workspaces);

  let usersNotified = 0;
  let slotsFired = 0;
  for (const { ownerId } of owners) {
    const pref = await db.query.preferences.findFirst({
      where: eq(preferences.userId, ownerId),
    });
    const slots: { slot: DigestSlot; cfg: SlotConfig }[] = [
      {
        slot: "morning",
        cfg: {
          enabled: pref?.digestMorningEnabled ?? true,
          time: pref?.digestMorningTime ?? "08:00",
          days: pref?.digestMorningDays ?? ALL_DAYS,
          sentDate: pref?.digestMorningSentDate ?? null,
        },
      },
      {
        slot: "evening",
        cfg: {
          enabled: pref?.digestEveningEnabled ?? true,
          time: pref?.digestEveningTime ?? "18:00",
          days: pref?.digestEveningDays ?? ALL_DAYS,
          sentDate: pref?.digestEveningSentDate ?? null,
        },
      },
    ];
    for (const { slot, cfg } of slots) {
      if (!shouldSendSlot(cfg, nowHHMM, todayISO)) continue;
      slotsFired++;
      const { total } = await sendUserDigestNow(ownerId, slot, now);
      if (total > 0) usersNotified++;
      // Marca enviado aunque esté vacío: la franja se evalúa una vez al día.
      await markSlotSent(ownerId, slot, todayISO);
    }
  }
  return { usersNotified, slotsFired };
}

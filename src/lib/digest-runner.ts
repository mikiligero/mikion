// Runner del digest: reúne las tareas con fecha del workspace de cada usuario y
// entrega el resumen a la bandeja de entrada + Telegram (vía createNotification).
// La lógica pura (ventanas, agrupación, formato) está en digest.ts.

import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { databases, digestRules, docs, people, rows, workspaces } from "@/db/schema";
import type { DigestRule } from "@/db/schema";
import { dateEnd, dateStart } from "@/lib/calendar-utils";
import { getRowTitle } from "@/lib/database-utils";
import type { DatabaseSchema, PropertyDef, SelectOption } from "@/lib/types";
import { createNotification, getSharedTreeForUser } from "@/lib/actions/helpers";
import {
  buildDigest,
  madridTime,
  madridToday,
  passesPriorityFilter,
  passesStatusFilter,
  renderDigest,
  rowAssignedTo,
  passesAmbitoFilter,
  shouldSendRule,
  type Bucket,
  type Digest,
  type DigestItem,
} from "@/lib/digest";

function firstDateProperty(schema: DatabaseSchema): PropertyDef | null {
  return schema.properties.find((p) => p.type === "date") ?? null;
}

/** Opción seleccionada de la primera propiedad de un tipo con grupos. */
function groupedOption(
  schema: DatabaseSchema,
  type: "status" | "priority",
  values: Record<string, unknown> | null
): SelectOption | undefined {
  const prop = schema.properties.find((p) => p.type === type);
  if (!prop) return undefined;
  const optId = values?.[prop.id];
  return prop.options?.find((o) => o.id === optId);
}

/** Normaliza un nombre (sin acentos, minúsculas) para casar «Ámbito»/«ambito». */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Propiedad de selección llamada «Ámbito» (por convención de nombre). */
export function ambitoProperty(schema: DatabaseSchema): PropertyDef | undefined {
  return schema.properties.find(
    (p) => p.type === "select" && normalizeName(p.name) === "ambito"
  );
}

/** Nombre de la opción de «Ámbito» seleccionada en una fila, si la hay. */
function ambitoName(
  schema: DatabaseSchema,
  values: Record<string, unknown> | null
): string | undefined {
  const prop = ambitoProperty(schema);
  if (!prop) return undefined;
  const optId = values?.[prop.id];
  return prop.options?.find((o) => o.id === optId)?.name;
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

/** Reúne las tareas con fecha (de BD propias y compartidas), aplica los filtros
 * de estado/prioridad del aviso y construye el digest de sus tramos. */
export async function computeUserDigest(
  userId: string,
  rule: DigestRule,
  now: Date = new Date()
): Promise<Digest> {
  const today = madridToday(now);

  const dbRows = await collectDigestDatabases(userId);
  if (dbRows.length === 0) return { total: 0, groups: [] };

  // En las BD compartidas solo cuentan las tareas asignadas al usuario; para eso
  // necesitamos su `people.id` en el ámbito/workspace dueño de cada BD.
  const personByScope = await recipientPersonIds(userId, dbRows);

  // Solo las BD que tienen propiedad de fecha.
  const withDate = dbRows
    .map((d) => ({ ...d, dateProp: firstDateProperty(d.schema) }))
    .filter((d): d is typeof d & { dateProp: PropertyDef } => !!d.dateProp);
  if (withDate.length === 0) return { total: 0, groups: [] };

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

    // Filtros del aviso: estado (lenient), prioridad y ámbito (estrictos).
    const stOpt = groupedOption(meta.schema, "status", row.values);
    if (!passesStatusFilter(stOpt?.group, rule.statusGroups)) continue;
    const prOpt = groupedOption(meta.schema, "priority", row.values);
    if (!passesPriorityFilter(prOpt?.group, rule.priorityGroups)) continue;
    const ambito = ambitoName(meta.schema, row.values);
    if (!passesAmbitoFilter(ambito, rule.ambitos)) continue;

    items.push({
      title: getRowTitle(row.values, meta.schema),
      dbTitle: meta.title || "Sin título",
      dayISO: due.slice(0, 10),
      statusName: stOpt?.name,
      ambito,
      done: stOpt?.group === "done",
    });
  }

  return buildDigest(items, rule.buckets as Bucket[], today, rule.oldestCount);
}

/** Calcula y, si hay tareas, entrega el aviso (bandeja + Telegram). No marca
 * nada (lo hace el planificador). Devuelve cuántas tareas tenía. */
export async function deliverRule(
  rule: DigestRule,
  now: Date = new Date()
): Promise<{ total: number }> {
  const digest = await computeUserDigest(rule.userId, rule, now);
  if (digest.total > 0) {
    const { title, body } = renderDigest(digest, {
      buckets: rule.buckets as Bucket[],
      statusGroups: rule.statusGroups,
      priorityGroups: rule.priorityGroups,
      oldestCount: rule.oldestCount,
    });
    await createNotification({
      userId: rule.userId,
      type: "reminder",
      title,
      body,
    });
  }
  return { total: digest.total };
}

async function markRuleSent(ruleId: string, dayISO: string): Promise<void> {
  await db
    .update(digestRules)
    .set({ lastSentDate: dayISO })
    .where(eq(digestRules.id, ruleId));
}

/** Modo forzado (pruebas): entrega TODOS los avisos activos ignorando horario. */
export async function runDigestNow(
  now: Date = new Date()
): Promise<{ rulesDelivered: number }> {
  const all = await db
    .select()
    .from(digestRules)
    .where(eq(digestRules.enabled, true));
  let rulesDelivered = 0;
  for (const rule of all) {
    if ((await deliverRule(rule, now)).total > 0) rulesDelivered++;
  }
  return { rulesDelivered };
}

/** Modo planificado: el cron tiquea cada 30 min y aquí, por cada aviso, decide
 * si toca enviarlo según su hora/días (una vez al día). */
export async function runScheduledDigests(
  now: Date = new Date()
): Promise<{ usersNotified: number; rulesFired: number }> {
  const todayISO = madridToday(now);
  const nowHHMM = madridTime(now);

  const all = await db.select().from(digestRules);

  let usersNotified = 0;
  let rulesFired = 0;
  for (const rule of all) {
    const due = shouldSendRule(
      {
        enabled: rule.enabled,
        time: rule.time,
        days: rule.days,
        lastSentDate: rule.lastSentDate,
      },
      nowHHMM,
      todayISO
    );
    if (!due) continue;
    rulesFired++;
    const { total } = await deliverRule(rule, now);
    if (total > 0) usersNotified++;
    // Marca enviado aunque esté vacío: el aviso se evalúa una vez al día.
    await markRuleSent(rule.id, todayISO);
  }
  return { usersNotified, rulesFired };
}

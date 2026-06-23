// Runner del digest: reúne las tareas con fecha del workspace de cada usuario y
// entrega el resumen a la bandeja de entrada + Telegram (vía createNotification).
// La lógica pura (ventanas, agrupación, formato) está en digest.ts.

import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { databases, docs, rows, workspaces } from "@/db/schema";
import { dateEnd, dateStart } from "@/lib/calendar-utils";
import { getRowTitle } from "@/lib/database-utils";
import type { DatabaseSchema, PropertyDef } from "@/lib/types";
import { createNotification } from "@/lib/actions/helpers";
import {
  buildDigest,
  madridToday,
  renderDigest,
  type Digest,
  type DigestItem,
  type DigestSlot,
} from "@/lib/digest";

function firstDateProperty(schema: DatabaseSchema): PropertyDef | null {
  return schema.properties.find((p) => p.type === "date") ?? null;
}
function statusProperty(schema: DatabaseSchema): PropertyDef | null {
  return schema.properties.find((p) => p.type === "status") ?? null;
}

/** Reúne las tareas con fecha del workspace del usuario y construye su digest. */
export async function computeUserDigest(
  userId: string,
  slot: DigestSlot,
  now: Date = new Date()
): Promise<Digest> {
  const today = madridToday(now);

  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerId, userId),
  });
  if (!ws) return { slot, total: 0, groups: [] };

  const dbRows = await db
    .select({ id: databases.id, schema: databases.schema, title: docs.title })
    .from(databases)
    .innerJoin(docs, eq(databases.docId, docs.id))
    .where(and(eq(docs.workspaceId, ws.id), isNull(docs.deletedAt)));
  if (dbRows.length === 0) return { slot, total: 0, groups: [] };

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

/** Calcula y entrega el digest a cada usuario (bandeja + Telegram). Devuelve
 * cuántos usuarios recibieron aviso (los de digest vacío se omiten). */
export async function runDigest(
  slot: DigestSlot,
  now: Date = new Date()
): Promise<{ usersNotified: number }> {
  const owners = await db
    .selectDistinct({ ownerId: workspaces.ownerId })
    .from(workspaces);

  let usersNotified = 0;
  for (const { ownerId } of owners) {
    const digest = await computeUserDigest(ownerId, slot, now);
    if (digest.total === 0) continue;
    const { title, body } = renderDigest(digest);
    await createNotification({ userId: ownerId, type: "reminder", title, body });
    usersNotified++;
  }
  return { usersNotified };
}

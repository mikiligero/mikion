"use server";

import { and, asc, eq } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { db } from "@/db";
import { habits, habitLogs } from "@/db/schema";
import { assertDocAccess } from "./helpers";
import type { HabitDTO } from "@/lib/habits";

/** Hábitos (no archivados) + registros de un doc de hábitos. */
export async function listHabitData(docId: string): Promise<{
  habits: HabitDTO[];
  logs: { habitId: string; day: string }[];
}> {
  await assertDocAccess(docId, { write: false });
  const rows = await db
    .select()
    .from(habits)
    .where(eq(habits.docId, docId))
    .orderBy(asc(habits.orderKey));
  const active = rows.filter((h) => !h.archivedAt);
  const ids = active.map((h) => h.id);
  const logs = ids.length
    ? await db
        .select({ habitId: habitLogs.habitId, day: habitLogs.day })
        .from(habitLogs)
    : [];
  // Solo registros de los hábitos vivos de este doc.
  const idSet = new Set(ids);
  return {
    habits: active.map((h) => ({
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      color: h.color,
      orderKey: h.orderKey,
    })),
    logs: logs.filter((l) => idSet.has(l.habitId)),
  };
}

/** Crea un hábito al final de la lista. */
export async function createHabit(
  docId: string,
  input: { name: string; emoji?: string | null; color?: string }
): Promise<HabitDTO> {
  await assertDocAccess(docId, { write: true });
  const all = await db
    .select({ orderKey: habits.orderKey })
    .from(habits)
    .where(eq(habits.docId, docId))
    .orderBy(asc(habits.orderKey));
  const lastKey = all.length ? all[all.length - 1].orderKey : null;
  const orderKey = generateKeyBetween(lastKey, null);
  const [created] = await db
    .insert(habits)
    .values({
      docId,
      name: input.name.trim() || "Nuevo hábito",
      emoji: input.emoji ?? null,
      color: input.color ?? "green",
      orderKey,
    })
    .returning();
  return {
    id: created.id,
    name: created.name,
    emoji: created.emoji,
    color: created.color,
    orderKey: created.orderKey,
  };
}

/** Actualiza nombre/emoji/color de un hábito (valida acceso vía su doc). */
export async function updateHabit(
  habitId: string,
  patch: { name?: string; emoji?: string | null; color?: string }
): Promise<{ ok: boolean }> {
  const h = await db.query.habits.findFirst({ where: eq(habits.id, habitId) });
  if (!h) throw new Error("Hábito no encontrado");
  await assertDocAccess(h.docId, { write: true });
  await db
    .update(habits)
    .set({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.emoji !== undefined ? { emoji: patch.emoji } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
    })
    .where(eq(habits.id, habitId));
  return { ok: true };
}

/** Borra un hábito (y sus registros por cascada). */
export async function deleteHabit(habitId: string): Promise<{ ok: boolean }> {
  const h = await db.query.habits.findFirst({ where: eq(habits.id, habitId) });
  if (!h) return { ok: true };
  await assertDocAccess(h.docId, { write: true });
  await db.delete(habits).where(eq(habits.id, habitId));
  return { ok: true };
}

/** Marca o desmarca un hábito en un día ("YYYY-MM-DD"). */
export async function toggleHabitLog(
  habitId: string,
  day: string,
  done: boolean
): Promise<{ ok: boolean }> {
  const h = await db.query.habits.findFirst({ where: eq(habits.id, habitId) });
  if (!h) throw new Error("Hábito no encontrado");
  await assertDocAccess(h.docId, { write: true });
  if (done) {
    await db
      .insert(habitLogs)
      .values({ habitId, day })
      .onConflictDoNothing();
  } else {
    await db
      .delete(habitLogs)
      .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.day, day)));
  }
  return { ok: true };
}

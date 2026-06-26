"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { digestRules } from "@/db/schema";
import type { DigestRule } from "@/db/schema";
import { generateKeyBetween } from "fractional-indexing";
import { deliverRule } from "@/lib/digest-runner";
import { requireUserId } from "./helpers";

export type DigestRuleDTO = {
  id: string;
  time: string;
  days: number[];
  buckets: string[];
  statusGroups: string[];
  priorityGroups: string[];
  enabled: boolean;
};

function toDTO(r: DigestRule): DigestRuleDTO {
  return {
    id: r.id,
    time: r.time,
    days: r.days,
    buckets: r.buckets,
    statusGroups: r.statusGroups,
    priorityGroups: r.priorityGroups,
    enabled: r.enabled,
  };
}

/** Avisos del usuario actual, ordenados. */
export async function listDigestRules(): Promise<DigestRuleDTO[]> {
  const userId = await requireUserId();
  const rows = await db
    .select()
    .from(digestRules)
    .where(eq(digestRules.userId, userId))
    .orderBy(asc(digestRules.orderKey));
  return rows.map(toDTO);
}

/** Crea un aviso nuevo (al final). Por defecto: hoy, todos los días, 09:00. */
export async function createDigestRule(): Promise<DigestRuleDTO> {
  const userId = await requireUserId();
  const all = await db
    .select({ orderKey: digestRules.orderKey })
    .from(digestRules)
    .where(eq(digestRules.userId, userId))
    .orderBy(asc(digestRules.orderKey));
  const lastKey = all.length ? all[all.length - 1].orderKey : null;
  const orderKey = generateKeyBetween(lastKey, null);

  const [created] = await db
    .insert(digestRules)
    .values({
      userId,
      time: "09:00",
      days: [0, 1, 2, 3, 4, 5, 6],
      buckets: ["today"],
      statusGroups: ["todo", "inProgress"],
      priorityGroups: [],
      enabled: true,
      orderKey,
    })
    .returning();
  return toDTO(created);
}

/** Actualiza campos de un aviso del usuario. */
export async function updateDigestRule(
  id: string,
  patch: Partial<{
    time: string;
    days: number[];
    buckets: string[];
    statusGroups: string[];
    priorityGroups: string[];
    enabled: boolean;
  }>
): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  await db
    .update(digestRules)
    .set(patch)
    .where(and(eq(digestRules.id, id), eq(digestRules.userId, userId)));
  return { ok: true };
}

/** Borra un aviso del usuario. */
export async function deleteDigestRule(id: string): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  await db
    .delete(digestRules)
    .where(and(eq(digestRules.id, id), eq(digestRules.userId, userId)));
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Entrega AHORA un aviso del usuario (bandeja + Telegram), ignorando horario.
 * Para el botón «Enviar ahora». Devuelve cuántas tareas tenía. */
export async function sendDigestRuleNow(
  id: string
): Promise<{ total: number }> {
  const userId = await requireUserId();
  const rule = await db.query.digestRules.findFirst({
    where: and(eq(digestRules.id, id), eq(digestRules.userId, userId)),
  });
  if (!rule) return { total: 0 };
  return deliverRule(rule);
}

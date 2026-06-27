"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { databases, digestRules, docs, workspaces } from "@/db/schema";
import type { DigestRule } from "@/db/schema";
import { generateKeyBetween } from "fractional-indexing";
import { deliverRule, ambitoProperty } from "@/lib/digest-runner";
import { requireUserId } from "./helpers";

export type DigestRuleDTO = {
  id: string;
  time: string;
  days: number[];
  buckets: string[];
  statusGroups: string[];
  impactGroups: string[];
  effortGroups: string[];
  ambitos: string[];
  oldestCount: number;
  enabled: boolean;
};

function toDTO(r: DigestRule): DigestRuleDTO {
  return {
    id: r.id,
    time: r.time,
    days: r.days,
    buckets: r.buckets,
    statusGroups: r.statusGroups,
    impactGroups: r.impactGroups,
    effortGroups: r.effortGroups,
    ambitos: r.ambitos,
    oldestCount: r.oldestCount,
    enabled: r.enabled,
  };
}

/** Opciones de «Ámbito» (nombres) de las BD del usuario, para el filtro de los
 * avisos. Reúne las opciones de toda columna de selección llamada «Ámbito». */
export async function listAmbitoOptions(): Promise<string[]> {
  const userId = await requireUserId();
  const rows = await db
    .select({ schema: databases.schema })
    .from(databases)
    .innerJoin(docs, eq(docs.id, databases.docId))
    .innerJoin(workspaces, eq(workspaces.id, docs.workspaceId))
    .where(and(eq(workspaces.ownerId, userId), isNull(docs.deletedAt)));
  const names = new Set<string>();
  for (const { schema } of rows) {
    const prop = ambitoProperty(schema);
    for (const o of prop?.options ?? []) names.add(o.name);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "es"));
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
      impactGroups: [],
      effortGroups: [],
      ambitos: [],
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
    impactGroups: string[];
    effortGroups: string[];
    ambitos: string[];
    oldestCount: number;
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

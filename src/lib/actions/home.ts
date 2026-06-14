"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { db } from "@/db";
import { homeTasks } from "@/db/schema";
import { getUserWorkspace } from "./helpers";

async function assertTaskAccess(taskId: string) {
  const ws = await getUserWorkspace();
  const task = await db.query.homeTasks.findFirst({
    where: and(eq(homeTasks.id, taskId), eq(homeTasks.workspaceId, ws.id)),
  });
  if (!task) throw new Error("Tarea no encontrada");
  return task;
}

export async function addHomeTask(text: string, tag?: string) {
  if (!text.trim()) return;
  const ws = await getUserWorkspace();
  const [row] = await db
    .select({ max: sql<string | null>`max(${homeTasks.orderKey})` })
    .from(homeTasks)
    .where(eq(homeTasks.workspaceId, ws.id));
  const orderKey = generateKeyBetween(row?.max ?? null, null);
  await db
    .insert(homeTasks)
    .values({ workspaceId: ws.id, text: text.trim(), tag: tag ?? null, orderKey });
  revalidatePath("/");
}

export async function toggleHomeTask(taskId: string) {
  const task = await assertTaskAccess(taskId);
  await db
    .update(homeTasks)
    .set({ done: !task.done })
    .where(eq(homeTasks.id, taskId));
  revalidatePath("/");
}

export async function deleteHomeTask(taskId: string) {
  await assertTaskAccess(taskId);
  await db.delete(homeTasks).where(eq(homeTasks.id, taskId));
  revalidatePath("/");
}

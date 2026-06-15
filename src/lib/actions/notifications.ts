"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUserId } from "./helpers";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  docId: string | null;
  rowId: string | null;
  read: boolean;
  createdAt: string;
};

export async function getNotifications(): Promise<NotificationItem[]> {
  const userId = await requireUserId();
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(100);
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    docId: r.docId,
    rowId: r.rowId,
    read: r.read,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function markRead(id: string) {
  const userId = await requireUserId();
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  revalidatePath("/", "layout");
}

export async function markAllRead() {
  const userId = await requireUserId();
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, userId));
  revalidatePath("/", "layout");
}

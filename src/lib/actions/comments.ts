"use server";

import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { comments, docs, users, workspaces } from "@/db/schema";
import { assertDocAccess, requireUserId, createNotification } from "./helpers";

async function notifyOwner(
  docId: string,
  authorId: string,
  type: "comment" | "reply",
  body: string
) {
  const doc = await db.query.docs.findFirst({ where: eq(docs.id, docId) });
  if (!doc) return;
  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, doc.workspaceId),
  });
  if (!ws || ws.ownerId === authorId) return; // no notificarse a uno mismo
  await createNotification({
    userId: ws.ownerId,
    type,
    title:
      type === "reply"
        ? `Nueva respuesta en "${doc.title || "Sin título"}"`
        : `Nuevo comentario en "${doc.title || "Sin título"}"`,
    body: body.slice(0, 120),
    docId,
    actorId: authorId,
  });
}

export type CommentItem = {
  id: string;
  parentId: string | null;
  blockId: string | null;
  anchoredText: string | null;
  body: string;
  resolved: boolean;
  authorId: string;
  authorName: string;
  createdAt: string;
};

/** Comprueba acceso al doc del comentario; devuelve docId. */
async function assertCommentAccess(
  commentId: string,
  opts: { write?: boolean } = {}
): Promise<string> {
  const [row] = await db
    .select({ docId: comments.docId })
    .from(comments)
    .where(eq(comments.id, commentId));
  if (!row?.docId) throw new Error("Comentario no encontrado");
  await assertDocAccess(row.docId, opts);
  return row.docId;
}

export async function getComments(docId: string): Promise<CommentItem[]> {
  await assertDocAccess(docId, { write: false });
  const rows = await db
    .select({
      id: comments.id,
      parentId: comments.parentId,
      blockId: comments.blockId,
      anchoredText: comments.anchoredText,
      body: comments.body,
      resolved: comments.resolved,
      authorId: comments.authorId,
      authorName: users.name,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.docId, docId))
    .orderBy(asc(comments.createdAt));
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function addComment(
  docId: string,
  body: string,
  anchor?: { blockId: string; anchoredText: string }
) {
  if (!body.trim()) return;
  await assertDocAccess(docId);
  const authorId = await requireUserId();
  await db.insert(comments).values({
    docId,
    body: body.trim(),
    authorId,
    blockId: anchor?.blockId ?? null,
    anchoredText: anchor?.anchoredText?.slice(0, 200) ?? null,
  });
  await notifyOwner(docId, authorId, "comment", body.trim());
  revalidatePath("/", "layout");
}

export async function addReply(parentId: string, body: string) {
  if (!body.trim()) return;
  const docId = await assertCommentAccess(parentId);
  const authorId = await requireUserId();
  await db
    .insert(comments)
    .values({ docId, parentId, body: body.trim(), authorId });
  await notifyOwner(docId, authorId, "reply", body.trim());
  revalidatePath("/", "layout");
}

export async function resolveComment(id: string, resolved: boolean) {
  await assertCommentAccess(id);
  await db.update(comments).set({ resolved }).where(eq(comments.id, id));
  revalidatePath("/", "layout");
}

export async function deleteComment(id: string) {
  await assertCommentAccess(id);
  // Borra el hilo (el comentario y, por la FK self-ref en cascade, sus respuestas).
  await db.delete(comments).where(eq(comments.id, id));
  revalidatePath("/", "layout");
}

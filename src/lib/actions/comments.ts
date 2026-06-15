"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { comments, docs, users, workspaces } from "@/db/schema";
import { assertDocAccess, requireUserId } from "./helpers";

export type CommentItem = {
  id: string;
  parentId: string | null;
  body: string;
  resolved: boolean;
  authorId: string;
  authorName: string;
  createdAt: string;
};

/** Comprueba que el comentario pertenece a un doc del usuario; devuelve docId. */
async function assertCommentAccess(commentId: string): Promise<string> {
  const userId = await requireUserId();
  const [row] = await db
    .select({ docId: comments.docId })
    .from(comments)
    .innerJoin(docs, eq(comments.docId, docs.id))
    .innerJoin(workspaces, eq(docs.workspaceId, workspaces.id))
    .where(and(eq(comments.id, commentId), eq(workspaces.ownerId, userId)));
  if (!row?.docId) throw new Error("Comentario no encontrado");
  return row.docId;
}

export async function getComments(docId: string): Promise<CommentItem[]> {
  await assertDocAccess(docId);
  const rows = await db
    .select({
      id: comments.id,
      parentId: comments.parentId,
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

export async function addComment(docId: string, body: string) {
  if (!body.trim()) return;
  await assertDocAccess(docId);
  const authorId = await requireUserId();
  await db.insert(comments).values({ docId, body: body.trim(), authorId });
  revalidatePath("/", "layout");
}

export async function addReply(parentId: string, body: string) {
  if (!body.trim()) return;
  const docId = await assertCommentAccess(parentId);
  const authorId = await requireUserId();
  await db
    .insert(comments)
    .values({ docId, parentId, body: body.trim(), authorId });
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

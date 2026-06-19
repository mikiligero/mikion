"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { docShares, users } from "@/db/schema";
import {
  requireUserId,
  resolveDocAccess,
  createNotification,
} from "./helpers";

export type Collaborator = {
  userId: string;
  name: string;
  email: string;
  role: "viewer" | "editor";
};

export type ShareableUser = { id: string; name: string; email: string };

/** Resuelve el doc y exige que el usuario actual sea su dueño. */
async function requireOwner(docId: string) {
  const userId = await requireUserId();
  const access = await resolveDocAccess(docId, userId);
  if (!access) throw new Error("Página no encontrada");
  if (access.role !== "owner")
    throw new Error("Solo el dueño puede gestionar el acceso");
  return { userId, doc: access.doc };
}

/** Comparte un doc (y su subárbol) con un usuario concreto. */
export async function shareDoc(
  docId: string,
  targetUserId: string,
  role: "viewer" | "editor"
) {
  const { userId, doc } = await requireOwner(docId);
  if (targetUserId === userId)
    throw new Error("No puedes compartir contigo mismo");

  const target = await db.query.users.findFirst({
    where: eq(users.id, targetUserId),
    columns: { id: true },
  });
  if (!target) throw new Error("Usuario no encontrado");

  await db
    .insert(docShares)
    .values({ docId, userId: target.id, role, invitedBy: userId })
    .onConflictDoUpdate({
      target: [docShares.docId, docShares.userId],
      set: { role },
    });

  const owner = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { name: true },
  });
  await createNotification({
    userId: target.id,
    type: "share",
    title: `${owner?.name ?? "Alguien"} te compartió «${doc.title || "Sin título"}»`,
    docId,
    actorId: userId,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Usuarios con los que se puede compartir este doc: todos menos el dueño actual
 * y los que ya son colaboradores. Solo dueño.
 */
export async function listShareableUsers(
  docId: string
): Promise<ShareableUser[]> {
  const { userId } = await requireOwner(docId);

  const existing = await db
    .select({ userId: docShares.userId })
    .from(docShares)
    .where(eq(docShares.docId, docId));
  const excludeIds = [userId, ...existing.map((e) => e.userId)];

  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(ne(users.id, userId), notInArray(users.id, excludeIds)))
    .orderBy(users.name);
}

/** Cambia el rol de un colaborador. Solo dueño. */
export async function setShareRole(
  docId: string,
  targetUserId: string,
  role: "viewer" | "editor"
) {
  await requireOwner(docId);
  await db
    .update(docShares)
    .set({ role })
    .where(
      and(eq(docShares.docId, docId), eq(docShares.userId, targetUserId))
    );
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Revoca el acceso de un colaborador. Solo dueño. */
export async function unshareDoc(docId: string, targetUserId: string) {
  await requireOwner(docId);
  await db
    .delete(docShares)
    .where(
      and(eq(docShares.docId, docId), eq(docShares.userId, targetUserId))
    );
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Lista de colaboradores del doc + el rol del usuario actual. */
export async function listShares(docId: string): Promise<{
  isOwner: boolean;
  myRole: "owner" | "editor" | "viewer";
  collaborators: Collaborator[];
}> {
  const userId = await requireUserId();
  const access = await resolveDocAccess(docId, userId);
  if (!access) throw new Error("Página no encontrada");

  const rows = await db
    .select({
      userId: docShares.userId,
      name: users.name,
      email: users.email,
      role: docShares.role,
    })
    .from(docShares)
    .innerJoin(users, eq(users.id, docShares.userId))
    .where(eq(docShares.docId, docId));

  return {
    isOwner: access.role === "owner",
    myRole: access.role,
    collaborators: rows,
  };
}

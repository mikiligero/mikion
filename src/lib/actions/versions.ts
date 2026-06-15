"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { versions, docs, users } from "@/db/schema";
import { assertDocAccess, requireUserId } from "./helpers";

export type VersionItem = {
  id: string;
  authorName: string | null;
  createdAt: string;
  preview: string;
};

export async function getVersions(docId: string): Promise<VersionItem[]> {
  await assertDocAccess(docId);
  const rows = await db
    .select({
      id: versions.id,
      authorName: users.name,
      createdAt: versions.createdAt,
      textContent: versions.textContent,
    })
    .from(versions)
    .leftJoin(users, eq(versions.authorId, users.id))
    .where(eq(versions.docId, docId))
    .orderBy(desc(versions.createdAt));

  return rows.map((r) => ({
    id: r.id,
    authorName: r.authorName,
    createdAt: r.createdAt.toISOString(),
    preview: r.textContent.slice(0, 160),
  }));
}

export async function restoreVersion(versionId: string) {
  const [v] = await db
    .select()
    .from(versions)
    .where(eq(versions.id, versionId))
    .limit(1);
  if (!v) throw new Error("Versión no encontrada");
  await assertDocAccess(v.docId);
  const userId = await requireUserId();

  // Guarda el estado actual como versión (para poder deshacer la restauración).
  const doc = await db.query.docs.findFirst({ where: eq(docs.id, v.docId) });
  if (doc) {
    await db.insert(versions).values({
      docId: v.docId,
      blocks: doc.blocks,
      textContent: doc.textContent,
      authorId: userId,
    });
  }

  await db
    .update(docs)
    .set({ blocks: v.blocks, textContent: v.textContent, updatedAt: new Date() })
    .where(eq(docs.id, v.docId));
  revalidatePath("/", "layout");
  return { docId: v.docId };
}

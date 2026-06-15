"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { versions, docs, rows, users } from "@/db/schema";
import type { Block } from "@/lib/types";
import { extractText } from "@/lib/blocknote-utils";
import {
  assertDocAccess,
  assertRowAccess,
  requireUserId,
  snapshotVersion,
} from "./helpers";

export type VersionItem = {
  id: string;
  authorName: string | null;
  createdAt: string;
  preview: string;
};

async function listVersions(
  cond: ReturnType<typeof eq>
): Promise<VersionItem[]> {
  const rowsList = await db
    .select({
      id: versions.id,
      authorName: users.name,
      createdAt: versions.createdAt,
      textContent: versions.textContent,
    })
    .from(versions)
    .leftJoin(users, eq(versions.authorId, users.id))
    .where(cond)
    .orderBy(desc(versions.createdAt));
  return rowsList.map((r) => ({
    id: r.id,
    authorName: r.authorName,
    createdAt: r.createdAt.toISOString(),
    preview: r.textContent.slice(0, 160),
  }));
}

export async function getVersions(docId: string): Promise<VersionItem[]> {
  await assertDocAccess(docId);
  return listVersions(eq(versions.docId, docId));
}

export async function getRowVersions(rowId: string): Promise<VersionItem[]> {
  await assertRowAccess(rowId);
  return listVersions(eq(versions.rowId, rowId));
}

export async function restoreVersion(versionId: string) {
  const [v] = await db
    .select()
    .from(versions)
    .where(eq(versions.id, versionId))
    .limit(1);
  if (!v) throw new Error("Versión no encontrada");
  const userId = await requireUserId();

  if (v.docId) {
    await assertDocAccess(v.docId);
    const doc = await db.query.docs.findFirst({ where: eq(docs.id, v.docId) });
    if (doc) {
      // Respaldo del estado actual (sin throttle) antes de restaurar.
      await snapshotVersion(
        { docId: v.docId },
        doc.blocks as Block[] | null,
        doc.textContent,
        userId,
        { throttleMs: 0 }
      );
    }
    await db
      .update(docs)
      .set({ blocks: v.blocks, textContent: v.textContent, updatedAt: new Date() })
      .where(eq(docs.id, v.docId));
  } else if (v.rowId) {
    const { row } = await assertRowAccess(v.rowId);
    await snapshotVersion(
      { rowId: v.rowId },
      row.blocks as Block[] | null,
      extractText(row.blocks as Block[] | null),
      userId,
      { throttleMs: 0 }
    );
    await db
      .update(rows)
      .set({ blocks: v.blocks, updatedAt: new Date() })
      .where(eq(rows.id, v.rowId));
  }

  revalidatePath("/", "layout");
}

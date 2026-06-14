"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { docs, databases, views } from "@/db/schema";
import type { Block } from "@/lib/types";
import { defaultDatabaseSchema } from "@/lib/database-utils";
import {
  assertDocAccess,
  getDescendantIds,
  getUserWorkspace,
  nextOrderKey,
} from "./helpers";

function revalidateShell() {
  // El layout de (app) carga el árbol del sidebar; revalidarlo refresca toda
  // la navegación tras una mutación.
  revalidatePath("/", "layout");
}

export async function createDoc(input: {
  section: "team" | "private";
  parentId?: string | null;
  kind?: "page" | "database" | "calendar";
}) {
  const ws = await getUserWorkspace();
  const parentId = input.parentId ?? null;
  if (parentId) await assertDocAccess(parentId);

  const orderKey = await nextOrderKey(ws.id, input.section, parentId);
  const [doc] = await db
    .insert(docs)
    .values({
      workspaceId: ws.id,
      section: input.section,
      parentId,
      kind: input.kind ?? "page",
      orderKey,
    })
    .returning();

  // Una BD necesita su esquema y una vista de tabla por defecto.
  if (doc.kind === "database") {
    const [database] = await db
      .insert(databases)
      .values({ docId: doc.id, schema: defaultDatabaseSchema() })
      .returning();
    await db.insert(views).values({
      databaseId: database.id,
      name: "Tabla",
      type: "table",
      config: { filters: [], sorts: [] },
    });
  }

  revalidateShell();
  return { id: doc.id };
}

export async function renameDoc(docId: string, title: string) {
  await assertDocAccess(docId);
  await db
    .update(docs)
    .set({ title, updatedAt: new Date() })
    .where(eq(docs.id, docId));
  revalidateShell();
}

/** Autosave del contenido del editor. Sin revalidate: el editor ya tiene el
 * contenido en cliente; revalidar en cada pulsación recargaría el shell. */
export async function savePageContent(
  docId: string,
  blocks: Block[],
  textContent: string
) {
  await assertDocAccess(docId);
  await db
    .update(docs)
    .set({ blocks, textContent, updatedAt: new Date() })
    .where(eq(docs.id, docId));
}

/** Actualiza emoji y/o portada. Revalida porque el emoji se ve en el árbol. */
export async function updateDocMeta(
  docId: string,
  meta: { emoji?: string | null; cover?: string | null }
) {
  await assertDocAccess(docId);
  await db
    .update(docs)
    .set({ ...meta, updatedAt: new Date() })
    .where(eq(docs.id, docId));
  revalidateShell();
}

export async function toggleFavorite(docId: string) {
  const doc = await assertDocAccess(docId);
  await db
    .update(docs)
    .set({ isFavorite: !doc.isFavorite })
    .where(eq(docs.id, docId));
  revalidateShell();
}

export async function moveToTrash(docId: string) {
  await assertDocAccess(docId);
  const ids = [docId, ...(await getDescendantIds(docId))];
  await db
    .update(docs)
    .set({ deletedAt: new Date(), isFavorite: false })
    .where(inArray(docs.id, ids));
  revalidateShell();
}

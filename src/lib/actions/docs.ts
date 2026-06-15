"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { docs, databases, views } from "@/db/schema";
import type { Block } from "@/lib/types";
import { defaultDatabaseSchema } from "@/lib/database-utils";
import { extractText, extractMentions } from "@/lib/blocknote-utils";
import {
  assertDocAccess,
  getDescendantIds,
  getUserWorkspace,
  nextOrderKey,
  requireUserId,
  createNotification,
  snapshotVersion,
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

export async function createPageFromTemplate(input: {
  section?: "team" | "private";
  title: string;
  emoji: string;
  blocks: Block[];
}) {
  const ws = await getUserWorkspace();
  const section = input.section ?? "team";
  const orderKey = await nextOrderKey(ws.id, section, null);
  const [doc] = await db
    .insert(docs)
    .values({
      workspaceId: ws.id,
      section,
      kind: "page",
      title: input.title,
      emoji: input.emoji,
      blocks: input.blocks,
      textContent: extractText(input.blocks),
      orderKey,
    })
    .returning();
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
  const doc = await assertDocAccess(docId);
  const userId = await requireUserId();
  const prevMentions = new Set(extractMentions(doc.blocks as Block[] | null));

  await db
    .update(docs)
    .set({ blocks, textContent, updatedAt: new Date() })
    .where(eq(docs.id, docId));

  await snapshotVersion({ docId }, blocks, textContent, userId);

  // Notifica las menciones nuevas (las que no estaban en la versión anterior).
  for (const mentionedId of extractMentions(blocks)) {
    if (!prevMentions.has(mentionedId)) {
      await createNotification({
        userId: mentionedId,
        type: "mention",
        title: `Te mencionaron en "${doc.title || "Sin título"}"`,
        docId,
        actorId: userId,
      });
    }
  }
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

/** Restaura un doc (y su subárbol). Si su padre sigue en la papelera o ya no
 * existe, lo mueve a la raíz de su sección. */
export async function restoreDoc(docId: string) {
  const doc = await assertDocAccess(docId);
  const ids = [docId, ...(await getDescendantIds(docId))];
  await db.update(docs).set({ deletedAt: null }).where(inArray(docs.id, ids));

  if (doc.parentId) {
    const parent = await db.query.docs.findFirst({
      where: eq(docs.id, doc.parentId),
    });
    if (!parent || parent.deletedAt) {
      const orderKey = await nextOrderKey(doc.workspaceId, doc.section, null);
      await db
        .update(docs)
        .set({ parentId: null, orderKey })
        .where(eq(docs.id, docId));
    }
  }
  revalidateShell();
}

/** Borra definitivamente un doc y su subárbol. */
export async function deleteDocPermanently(docId: string) {
  await assertDocAccess(docId);
  const ids = [docId, ...(await getDescendantIds(docId))];
  await db.delete(docs).where(inArray(docs.id, ids));
  revalidateShell();
}

/** Vacía la papelera del workspace (borra definitivamente todo lo eliminado). */
export async function emptyTrash() {
  const ws = await getUserWorkspace();
  await db
    .delete(docs)
    .where(and(eq(docs.workspaceId, ws.id), isNotNull(docs.deletedAt)));
  revalidateShell();
}

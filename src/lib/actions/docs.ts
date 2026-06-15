"use server";

import { revalidatePath } from "next/cache";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { docs, databases, views, versions } from "@/db/schema";
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
// Snapshots de versión como mucho cada N minutos (evita una por pulsación).
const VERSION_THROTTLE_MS = 3 * 60 * 1000;

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

  // Historial de versiones: añade un snapshot si el último es antiguo (o no hay).
  const [last] = await db
    .select({ createdAt: versions.createdAt })
    .from(versions)
    .where(eq(versions.docId, docId))
    .orderBy(desc(versions.createdAt))
    .limit(1);
  if (!last || Date.now() - last.createdAt.getTime() > VERSION_THROTTLE_MS) {
    await db
      .insert(versions)
      .values({ docId, blocks, textContent, authorId: userId });
  }

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

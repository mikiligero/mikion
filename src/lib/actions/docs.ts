"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { db } from "@/db";
import { docs, databases, views, rows } from "@/db/schema";
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
  const parentId = input.parentId ?? null;
  // Bajo un padre (posiblemente compartido por otro usuario) se hereda su
  // workspace y sección; en la raíz se crea en el workspace propio.
  let workspaceId: string;
  let section: "team" | "private";
  if (parentId) {
    const parent = await assertDocAccess(parentId);
    workspaceId = parent.workspaceId;
    section = parent.section;
  } else {
    const ws = await getUserWorkspace();
    workspaceId = ws.id;
    section = input.section;
  }

  const kind = input.kind ?? "page";
  // Título por defecto según el tipo (las páginas quedan "Sin título").
  const defaultTitle =
    kind === "calendar" ? "Calendario" : kind === "database" ? "Base de datos" : "";

  const orderKey = await nextOrderKey(workspaceId, section, parentId);
  const [doc] = await db
    .insert(docs)
    .values({
      workspaceId,
      section,
      parentId,
      kind,
      title: defaultTitle,
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

/** Crea una subpágina bajo `parentDocId` (para enlazarla en línea desde el
 * editor, p. ej. el comando "/página"). Hereda workspace y sección del padre. */
export async function createSubPage(parentDocId: string) {
  const parent = await assertDocAccess(parentDocId);
  const orderKey = await nextOrderKey(
    parent.workspaceId,
    parent.section,
    parentDocId
  );
  const [doc] = await db
    .insert(docs)
    .values({
      workspaceId: parent.workspaceId,
      section: parent.section,
      parentId: parentDocId,
      kind: "page",
      title: "Nueva página",
      orderKey,
    })
    .returning();
  revalidateShell();
  return { id: doc.id, title: doc.title, emoji: doc.emoji };
}

/** Título/emoji actuales de un doc, para que el chip de enlace en línea
 * (comando "/página") se mantenga sincronizado si la página se renombra. */
export async function getDocTitle(docId: string) {
  const doc = await assertDocAccess(docId);
  return { title: doc.title, emoji: doc.emoji };
}

/** Datos para la tarjeta de previsualización del chip de enlace en línea:
 * título/emoji en vivo, ruta de ancestros (migas) y un fragmento del contenido. */
export async function getDocPreview(docId: string) {
  const doc = await assertDocAccess(docId);
  const path: string[] = [];
  let parentId = doc.parentId;
  while (parentId) {
    const parent = await db.query.docs.findFirst({
      where: eq(docs.id, parentId),
      columns: { title: true, parentId: true },
    });
    if (!parent) break;
    path.unshift(parent.title || "Sin título");
    parentId = parent.parentId;
  }
  const snippet = (doc.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160);
  return { title: doc.title, emoji: doc.emoji, kind: doc.kind, path, snippet };
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

/** Actualiza emoji, portada y/o estilo de página. Revalida porque emoji/estilo
 *  se reflejan en el árbol y en el render del contenido. */
export async function updateDocMeta(
  docId: string,
  meta: {
    emoji?: string | null;
    cover?: string | null;
    coverPosition?: number;
    font?: "default" | "serif" | "mono";
    fullWidth?: boolean;
    smallText?: boolean;
  }
) {
  await assertDocAccess(docId);
  await db
    .update(docs)
    .set({ ...meta, updatedAt: new Date() })
    .where(eq(docs.id, docId));
  revalidateShell();
}

/** Estilo de página del doc activo (para los controles de la barra superior). */
export async function getDocStyle(docId: string): Promise<{
  kind: "page" | "database" | "calendar";
  font: "default" | "serif" | "mono";
  fullWidth: boolean;
  smallText: boolean;
}> {
  const doc = await assertDocAccess(docId, { write: false });
  return {
    kind: doc.kind,
    font: doc.font,
    fullWidth: doc.fullWidth,
    smallText: doc.smallText,
  };
}

export async function toggleFavorite(docId: string) {
  const doc = await assertDocAccess(docId);
  await db
    .update(docs)
    .set({ isFavorite: !doc.isFavorite })
    .where(eq(docs.id, docId));
  revalidateShell();
}

/** Duplica un doc y todo su subárbol (subpáginas + BD con vistas y filas). */
export async function duplicateDoc(docId: string) {
  const doc = await assertDocAccess(docId);
  const newId = await duplicateSubtree(doc.id, doc.parentId, `${doc.title} (copia)`);
  revalidateShell();
  return { id: newId };
}

async function duplicateSubtree(
  docId: string,
  newParentId: string | null,
  titleOverride?: string
): Promise<string> {
  const original = await db.query.docs.findFirst({ where: eq(docs.id, docId) });
  if (!original) throw new Error("Doc no encontrado");

  const orderKey = await nextOrderKey(
    original.workspaceId,
    original.section,
    newParentId
  );
  const [copy] = await db
    .insert(docs)
    .values({
      workspaceId: original.workspaceId,
      section: original.section,
      parentId: newParentId,
      kind: original.kind,
      emoji: original.emoji,
      title: titleOverride ?? original.title,
      cover: original.cover,
      coverPosition: original.coverPosition,
      blocks: original.blocks,
      textContent: original.textContent,
      font: original.font,
      fullWidth: original.fullWidth,
      smallText: original.smallText,
      orderKey,
    })
    .returning();

  // Si es una BD, copia su esquema/automatizaciones, vistas y filas.
  if (original.kind === "database") {
    const database = await db.query.databases.findFirst({
      where: eq(databases.docId, docId),
    });
    if (database) {
      const [dbCopy] = await db
        .insert(databases)
        .values({
          docId: copy.id,
          schema: database.schema,
          automations: database.automations,
        })
        .returning();
      const oldViews = await db
        .select()
        .from(views)
        .where(eq(views.databaseId, database.id));
      for (const v of oldViews) {
        await db.insert(views).values({
          databaseId: dbCopy.id,
          name: v.name,
          type: v.type,
          config: v.config,
          orderKey: v.orderKey,
        });
      }
      const oldRows = await db
        .select()
        .from(rows)
        .where(and(eq(rows.databaseId, database.id), isNull(rows.deletedAt)));
      for (const r of oldRows) {
        await db.insert(rows).values({
          databaseId: dbCopy.id,
          values: r.values,
          blocks: r.blocks,
          cover: r.cover,
          orderKey: r.orderKey,
        });
      }
    }
  }

  // Copia recursiva de subpáginas (hijos en docs, no filas de BD).
  const children = await db
    .select({ id: docs.id })
    .from(docs)
    .where(and(eq(docs.parentId, docId), isNull(docs.deletedAt)))
    .orderBy(asc(docs.orderKey));
  for (const child of children) {
    await duplicateSubtree(child.id, copy.id);
  }
  return copy.id;
}

/** Mueve un doc en el árbol: cambia padre/sección y/o lo coloca entre vecinos
 * (orden fraccional). Evita ciclos (no se puede mover dentro de sí mismo). */
export async function moveDoc(input: {
  docId: string;
  newParentId: string | null;
  section?: "team" | "private";
  afterId?: string | null;
  beforeId?: string | null;
}) {
  const doc = await assertDocAccess(input.docId);
  if (input.newParentId) {
    await assertDocAccess(input.newParentId);
    const descendants = await getDescendantIds(input.docId);
    if (
      input.newParentId === input.docId ||
      descendants.includes(input.newParentId)
    ) {
      throw new Error("No se puede mover una página dentro de sí misma");
    }
  }

  const section = input.section ?? doc.section;
  let orderKey: string;
  if (input.afterId || input.beforeId) {
    const after = input.afterId
      ? await db.query.docs.findFirst({ where: eq(docs.id, input.afterId) })
      : null;
    const before = input.beforeId
      ? await db.query.docs.findFirst({ where: eq(docs.id, input.beforeId) })
      : null;
    orderKey = generateKeyBetween(after?.orderKey ?? null, before?.orderKey ?? null);
  } else {
    orderKey = await nextOrderKey(doc.workspaceId, section, input.newParentId);
  }

  await db
    .update(docs)
    .set({ parentId: input.newParentId, section, orderKey })
    .where(eq(docs.id, input.docId));
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

/** Vacía la papelera del workspace (borra definitivamente todo lo eliminado:
 * páginas/BBDD y también las filas enviadas a la papelera). */
export async function emptyTrash() {
  const ws = await getUserWorkspace();

  // Filas en papelera de las BBDD del workspace.
  const dbIds = await db
    .select({ id: databases.id })
    .from(databases)
    .innerJoin(docs, eq(databases.docId, docs.id))
    .where(eq(docs.workspaceId, ws.id));
  if (dbIds.length) {
    await db
      .delete(rows)
      .where(
        and(
          inArray(
            rows.databaseId,
            dbIds.map((d) => d.id)
          ),
          isNotNull(rows.deletedAt)
        )
      );
  }

  await db
    .delete(docs)
    .where(and(eq(docs.workspaceId, ws.id), isNotNull(docs.deletedAt)));
  revalidateShell();
}

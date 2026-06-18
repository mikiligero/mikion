"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { db } from "@/db";
import { rows, databases, views, docs } from "@/db/schema";
import type {
  Automation,
  Block,
  DatabaseSchema,
  DbTemplate,
  PropertyDef,
  PropertyType,
  PropertyValue,
  ViewConfig,
  ViewType,
} from "@/lib/types";
import { newPropertyDef, defaultDatabaseSchema } from "@/lib/database-utils";
import { extractText } from "@/lib/blocknote-utils";
import {
  assertDatabaseAccess,
  assertDocAccess,
  assertRowAccess,
  assertViewAccess,
  nextOrderKey,
  requireUserId,
  snapshotVersion,
} from "./helpers";
import type { Row } from "@/db/schema";

function revalidateShell() {
  revalidatePath("/", "layout");
}

async function nextRowOrderKey(databaseId: string): Promise<string> {
  const [row] = await db
    .select({ max: sql<string | null>`max(${rows.orderKey})` })
    .from(rows)
    .where(and(eq(rows.databaseId, databaseId), isNull(rows.deletedAt)));
  return generateKeyBetween(row?.max ?? null, null);
}

export async function createRow(
  databaseId: string,
  values: Record<string, PropertyValue> = {}
) {
  const { database } = await assertDatabaseAccess(databaseId);
  // Siembra el valor predeterminado de status/select (como Notion fija el
  // estado por defecto), sin pisar valores ya provistos.
  const seeded: Record<string, PropertyValue> = { ...values };
  for (const p of database.schema.properties) {
    if (
      (p.type === "status" || p.type === "select") &&
      p.defaultOptionId &&
      seeded[p.id] === undefined
    ) {
      seeded[p.id] = p.defaultOptionId;
    }
  }
  const orderKey = await nextRowOrderKey(databaseId);
  const [row] = await db
    .insert(rows)
    .values({ databaseId, values: seeded, orderKey })
    .returning();
  revalidateShell();
  return { id: row.id };
}

/** Duplica una fila (valores + contenido + portada) y la coloca justo debajo. */
export async function duplicateRow(rowId: string) {
  const { row } = await assertRowAccess(rowId);
  const [next] = await db
    .select({ orderKey: rows.orderKey })
    .from(rows)
    .where(
      and(
        eq(rows.databaseId, row.databaseId),
        isNull(rows.deletedAt),
        sql`${rows.orderKey} > ${row.orderKey}`
      )
    )
    .orderBy(asc(rows.orderKey))
    .limit(1);
  const orderKey = generateKeyBetween(row.orderKey, next?.orderKey ?? null);
  const [copy] = await db
    .insert(rows)
    .values({
      databaseId: row.databaseId,
      values: row.values ?? {},
      blocks: row.blocks ?? null,
      cover: row.cover ?? null,
      orderKey,
    })
    .returning();
  revalidateShell();
  return { id: copy.id };
}

export async function updateCell(
  rowId: string,
  propertyId: string,
  value: PropertyValue
) {
  const { row } = await assertRowAccess(rowId);
  const nextValues = { ...(row.values ?? {}), [propertyId]: value };
  await db
    .update(rows)
    .set({ values: nextValues, updatedAt: new Date() })
    .where(eq(rows.id, rowId));
  revalidateShell();
}

/** Guarda una fila como plantilla reutilizable de su base de datos. */
export async function saveRowAsTemplate(rowId: string, name: string) {
  const { row } = await assertRowAccess(rowId);
  const { database } = await assertDatabaseAccess(row.databaseId);
  const template: DbTemplate = {
    id: crypto.randomUUID(),
    name: name.trim() || "Plantilla",
    emoji: row.emoji ?? null,
    values: row.values ?? {},
    blocks: row.blocks ?? null,
  };
  await db
    .update(databases)
    .set({ templates: [...(database.templates ?? []), template] })
    .where(eq(databases.id, database.id));
  revalidateShell();
  return { id: template.id };
}

/** Crea una fila a partir de una plantilla (valores + contenido + emoji). */
export async function createRowFromTemplate(
  databaseId: string,
  templateId: string
) {
  const { database } = await assertDatabaseAccess(databaseId);
  const template = (database.templates ?? []).find((t) => t.id === templateId);
  if (!template) throw new Error("Plantilla no encontrada");
  const orderKey = await nextRowOrderKey(databaseId);
  const [row] = await db
    .insert(rows)
    .values({
      databaseId,
      emoji: template.emoji ?? null,
      values: template.values ?? {},
      blocks: template.blocks ?? null,
      orderKey,
    })
    .returning();
  revalidateShell();
  return { id: row.id };
}

/** Elimina una plantilla de la base de datos. */
export async function deleteTemplate(databaseId: string, templateId: string) {
  const { database } = await assertDatabaseAccess(databaseId);
  await db
    .update(databases)
    .set({
      templates: (database.templates ?? []).filter((t) => t.id !== templateId),
    })
    .where(eq(databases.id, database.id));
  revalidateShell();
}

/** Establece (o quita) el emoji/icono de una fila. */
export async function setRowEmoji(rowId: string, emoji: string | null) {
  await assertRowAccess(rowId);
  await db
    .update(rows)
    .set({ emoji, updatedAt: new Date() })
    .where(eq(rows.id, rowId));
  revalidateShell();
}

/** Establece (o quita) la portada de una fila. Al cambiarla, resetea la
 * posición vertical a 50 (centrada), igual que en las páginas. */
export async function setRowCover(rowId: string, cover: string | null) {
  await assertRowAccess(rowId);
  await db
    .update(rows)
    .set({ cover, coverPosition: 50, updatedAt: new Date() })
    .where(eq(rows.id, rowId));
  revalidateShell();
}

/** Guarda la posición vertical (0–100) de la portada de imagen de una fila. */
export async function setRowCoverPosition(rowId: string, position: number) {
  await assertRowAccess(rowId);
  const clamped = Math.min(100, Math.max(0, Math.round(position)));
  await db
    .update(rows)
    .set({ coverPosition: clamped, updatedAt: new Date() })
    .where(eq(rows.id, rowId));
  revalidateShell();
}

export async function deleteRow(rowId: string) {
  const { row } = await assertRowAccess(rowId);
  await db
    .update(rows)
    .set({ deletedAt: new Date() })
    .where(eq(rows.id, row.id));
  revalidateShell();
}

/** Restaura una fila de la papelera (quita su marca de borrado). */
export async function restoreRow(rowId: string) {
  const { row } = await assertRowAccess(rowId);
  await db
    .update(rows)
    .set({ deletedAt: null })
    .where(eq(rows.id, row.id));
  revalidateShell();
}

/** Borra una fila definitivamente (no recuperable). */
export async function deleteRowPermanently(rowId: string) {
  const { row } = await assertRowAccess(rowId);
  await db.delete(rows).where(eq(rows.id, row.id));
  revalidateShell();
}

/** Mueve una fila: cambia su grupo (valor de propiedad) y/o su posición
 * entre vecinos. Usado por el tablero (drag entre columnas). */
export async function moveRow(
  rowId: string,
  opts: {
    groupPropertyId?: string;
    groupValue?: PropertyValue;
    afterId?: string | null;
    beforeId?: string | null;
  }
) {
  const { row } = await assertRowAccess(rowId);
  let values = row.values ?? {};
  if (opts.groupPropertyId !== undefined) {
    values = { ...values, [opts.groupPropertyId]: opts.groupValue ?? null };
  }
  let orderKey = row.orderKey;
  if (opts.afterId !== undefined || opts.beforeId !== undefined) {
    const [after] = opts.afterId
      ? await db.select().from(rows).where(eq(rows.id, opts.afterId)).limit(1)
      : [];
    const [before] = opts.beforeId
      ? await db.select().from(rows).where(eq(rows.id, opts.beforeId)).limit(1)
      : [];
    orderKey = generateKeyBetween(after?.orderKey ?? null, before?.orderKey ?? null);
  }
  await db
    .update(rows)
    .set({ values, orderKey, updatedAt: new Date() })
    .where(eq(rows.id, rowId));
  revalidateShell();
}

/** Guarda el contenido (blocks) de la página de una fila. Sin revalidate. */
export async function saveRowContent(rowId: string, blocks: Block[]) {
  await assertRowAccess(rowId);
  await db
    .update(rows)
    .set({ blocks, updatedAt: new Date() })
    .where(eq(rows.id, rowId));
  const userId = await requireUserId();
  await snapshotVersion({ rowId }, blocks, extractText(blocks), userId);
  // Refresca las filas del cliente para que el panel lateral muestre el
  // contenido actualizado al cerrarlo y volver a abrirlo sin recargar.
  revalidateShell();
}

async function setSchema(databaseId: string, schema: DatabaseSchema) {
  await db
    .update(databases)
    .set({ schema })
    .where(eq(databases.id, databaseId));
  revalidateShell();
}

export async function addProperty(databaseId: string, type: PropertyType) {
  const { database } = await assertDatabaseAccess(databaseId);
  const schema = database.schema;
  const prop = newPropertyDef(type);
  await setSchema(databaseId, {
    properties: [...schema.properties, prop],
  });
  return { id: prop.id };
}

/** Inserta una propiedad nueva junto a otra (a izquierda/derecha), p. ej. desde
 * el menú de la cabecera de columna en la tabla. */
export async function addPropertyAt(
  databaseId: string,
  type: PropertyType,
  refPropertyId: string,
  side: "left" | "right"
) {
  const { database } = await assertDatabaseAccess(databaseId);
  const props = database.schema.properties;
  const prop = newPropertyDef(type);
  const refIndex = props.findIndex((p) => p.id === refPropertyId);
  const at = refIndex < 0 ? props.length : refIndex + (side === "right" ? 1 : 0);
  const next = [...props.slice(0, at), prop, ...props.slice(at)];
  await setSchema(databaseId, { properties: next });
  return { id: prop.id };
}

export async function updateProperty(
  databaseId: string,
  propertyId: string,
  patch: Partial<Omit<PropertyDef, "id">>
) {
  const { database } = await assertDatabaseAccess(databaseId);
  await setSchema(databaseId, {
    properties: database.schema.properties.map((p) =>
      p.id === propertyId ? { ...p, ...patch } : p
    ),
  });
}

export async function deleteProperty(databaseId: string, propertyId: string) {
  const { database } = await assertDatabaseAccess(databaseId);
  await setSchema(databaseId, {
    properties: database.schema.properties.filter((p) => p.id !== propertyId),
  });
}

export async function updateView(
  viewId: string,
  patch: Partial<ViewConfig>
) {
  const { view } = await assertViewAccess(viewId);
  await db
    .update(views)
    .set({ config: { ...view.config, ...patch } })
    .where(eq(views.id, viewId));
  revalidateShell();
}

/** Elimina una vista. No permite borrar la última (la BD necesita al menos una). */
export async function deleteView(viewId: string) {
  const { view } = await assertViewAccess(viewId);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(views)
    .where(eq(views.databaseId, view.databaseId));
  if (n <= 1) return { deleted: false };
  await db.delete(views).where(eq(views.id, viewId));
  revalidateShell();
  return { deleted: true };
}

// Crea el doc-BD (kind=database) bajo la página actual + esquema por defecto +
// vista tabla. Base compartida por las dos variantes (integrada / página completa).
async function createDatabaseDoc(parentDocId: string) {
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
      kind: "database",
      title: "Base de datos",
      orderKey,
    })
    .returning();
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
  revalidateShell();
  return { doc, database };
}

// BD integrada: se incrusta en la página actual con un bloque `inlineDatabase`.
// Devuelve los ids para el bloque.
export async function createInlineDatabase(parentDocId: string) {
  const { doc, database } = await createDatabaseDoc(parentDocId);
  return { databaseId: database.id, docId: doc.id };
}

// BD de página completa: una subpágina (kind=database) que se enlaza en la
// página actual con un chip `pageLink` y se abre como página propia.
export async function createPageDatabase(parentDocId: string) {
  const { doc } = await createDatabaseDoc(parentDocId);
  return { docId: doc.id, title: doc.title, emoji: doc.emoji };
}

// Carga el esquema + filas de una BD (para refrescar el bloque en cliente).
export async function getInlineDatabase(databaseId: string): Promise<{
  schema: DatabaseSchema;
  rows: Row[];
  docId: string;
}> {
  const { database, docId } = await assertDatabaseAccess(databaseId);
  const rowRows = await db
    .select()
    .from(rows)
    .where(and(eq(rows.databaseId, databaseId), isNull(rows.deletedAt)))
    .orderBy(asc(rows.orderKey));
  return { schema: database.schema, rows: rowRows, docId };
}

export async function setAutomations(
  databaseId: string,
  automations: Automation[]
) {
  await assertDatabaseAccess(databaseId);
  await db
    .update(databases)
    .set({ automations })
    .where(eq(databases.id, databaseId));
  revalidateShell();
}

export async function createView(databaseId: string, type: ViewType) {
  await assertDatabaseAccess(databaseId);
  const [last] = await db
    .select({ max: sql<string | null>`max(${views.orderKey})` })
    .from(views)
    .where(eq(views.databaseId, databaseId));
  const orderKey = generateKeyBetween(last?.max ?? null, null);
  const names: Record<ViewType, string> = {
    table: "Tabla",
    board: "Tablero",
    calendar: "Calendario",
    timeline: "Cronograma",
    chart: "Gráfico",
  };
  const [view] = await db
    .insert(views)
    .values({
      databaseId,
      name: names[type],
      type,
      config: { filters: [], sorts: [] },
      orderKey,
    })
    .returning();
  revalidateShell();
  return { id: view.id };
}

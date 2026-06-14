"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { db } from "@/db";
import { rows, databases, views } from "@/db/schema";
import type {
  Block,
  DatabaseSchema,
  PropertyDef,
  PropertyType,
  PropertyValue,
  ViewConfig,
  ViewType,
} from "@/lib/types";
import { newPropertyDef } from "@/lib/database-utils";
import {
  assertDatabaseAccess,
  assertRowAccess,
  assertViewAccess,
} from "./helpers";

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
  await assertDatabaseAccess(databaseId);
  const orderKey = await nextRowOrderKey(databaseId);
  const [row] = await db
    .insert(rows)
    .values({ databaseId, values, orderKey })
    .returning();
  revalidateShell();
  return { id: row.id };
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

export async function deleteRow(rowId: string) {
  const { row } = await assertRowAccess(rowId);
  await db
    .update(rows)
    .set({ deletedAt: new Date() })
    .where(eq(rows.id, row.id));
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

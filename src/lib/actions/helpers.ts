import { headers } from "next/headers";
import { and, eq, isNull, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { docs, workspaces, databases, rows, views } from "@/db/schema";
import type { Doc, DbDatabase, Row, View } from "@/db/schema";

/** Id del usuario autenticado o lanza error. */
export async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("No autenticado");
  return session.user.id;
}

/** Workspace del usuario actual (modelo Personal: uno). */
export async function getUserWorkspace() {
  const userId = await requireUserId();
  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerId, userId),
  });
  if (!ws) throw new Error("Workspace no encontrado");
  return ws;
}

/** Comprueba que el workspace pertenece al usuario actual. */
export async function assertWorkspaceAccess(workspaceId: string) {
  const userId = await requireUserId();
  const ws = await db.query.workspaces.findFirst({
    where: and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, userId)),
  });
  if (!ws) throw new Error("Workspace no encontrado");
  return ws;
}

/** Comprueba que el doc pertenece a un workspace del usuario actual. */
export async function assertDocAccess(docId: string): Promise<Doc> {
  const userId = await requireUserId();
  const [row] = await db
    .select({ doc: docs })
    .from(docs)
    .innerJoin(workspaces, eq(docs.workspaceId, workspaces.id))
    .where(and(eq(docs.id, docId), eq(workspaces.ownerId, userId)));
  if (!row) throw new Error("Página no encontrada");
  return row.doc;
}

/** Comprueba acceso a una BD (vía su doc → workspace del usuario). */
export async function assertDatabaseAccess(
  databaseId: string
): Promise<{ database: DbDatabase; docId: string }> {
  const userId = await requireUserId();
  const [row] = await db
    .select({ database: databases, docId: docs.id })
    .from(databases)
    .innerJoin(docs, eq(databases.docId, docs.id))
    .innerJoin(workspaces, eq(docs.workspaceId, workspaces.id))
    .where(and(eq(databases.id, databaseId), eq(workspaces.ownerId, userId)));
  if (!row) throw new Error("Base de datos no encontrada");
  return { database: row.database, docId: row.docId };
}

/** Comprueba acceso a una fila (vía BD → doc → workspace). */
export async function assertRowAccess(
  rowId: string
): Promise<{ row: Row; docId: string }> {
  const userId = await requireUserId();
  const [r] = await db
    .select({ row: rows, docId: docs.id })
    .from(rows)
    .innerJoin(databases, eq(rows.databaseId, databases.id))
    .innerJoin(docs, eq(databases.docId, docs.id))
    .innerJoin(workspaces, eq(docs.workspaceId, workspaces.id))
    .where(and(eq(rows.id, rowId), eq(workspaces.ownerId, userId)));
  if (!r) throw new Error("Fila no encontrada");
  return { row: r.row, docId: r.docId };
}

/** Comprueba acceso a una vista (vía BD → doc → workspace). */
export async function assertViewAccess(
  viewId: string
): Promise<{ view: View; databaseId: string; docId: string }> {
  const userId = await requireUserId();
  const [r] = await db
    .select({ view: views, databaseId: databases.id, docId: docs.id })
    .from(views)
    .innerJoin(databases, eq(views.databaseId, databases.id))
    .innerJoin(docs, eq(databases.docId, docs.id))
    .innerJoin(workspaces, eq(docs.workspaceId, workspaces.id))
    .where(and(eq(views.id, viewId), eq(workspaces.ownerId, userId)));
  if (!r) throw new Error("Vista no encontrada");
  return { view: r.view, databaseId: r.databaseId, docId: r.docId };
}

/** Ids de todos los descendientes de un doc (sin incluirlo). */
export async function getDescendantIds(docId: string): Promise<string[]> {
  const result = await db.execute<{ id: string }>(sql`
    WITH RECURSIVE descendants AS (
      SELECT id FROM docs WHERE parent_id = ${docId}
      UNION ALL
      SELECT d.id FROM docs d JOIN descendants x ON d.parent_id = x.id
    )
    SELECT id FROM descendants
  `);
  return Array.from(result).map((r) => r.id);
}

/** orderKey fraccional al final de los hermanos de (section, parentId). */
export async function nextOrderKey(
  workspaceId: string,
  section: "team" | "private",
  parentId: string | null
): Promise<string> {
  const [row] = await db
    .select({ max: sql<string | null>`max(${docs.orderKey})` })
    .from(docs)
    .where(
      and(
        eq(docs.workspaceId, workspaceId),
        eq(docs.section, section),
        parentId === null ? isNull(docs.parentId) : eq(docs.parentId, parentId),
        isNull(docs.deletedAt)
      )
    );
  return generateKeyBetween(row?.max ?? null, null);
}

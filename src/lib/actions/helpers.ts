import { headers } from "next/headers";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  docs,
  workspaces,
  databases,
  rows,
  views,
  notifications,
  preferences,
  versions,
  users,
  docShares,
} from "@/db/schema";
import type { Doc, DbDatabase, Row, View } from "@/db/schema";
import type { Block } from "@/lib/types";
import type { TreeDoc } from "@/lib/tree";
import { pickAccessRole, type AccessRole } from "@/lib/access";

export { pickAccessRole };
export type { AccessRole };
import { sendTelegramMessage } from "@/lib/telegram";

/**
 * Punto ÚNICO de creación de notificaciones. Inserta en BD y es el lugar donde
 * en el futuro se enviará también por Telegram (u otros canales).
 */
export async function createNotification(input: {
  userId: string;
  type: "mention" | "comment" | "reply" | "reminder" | "share";
  title: string;
  body?: string | null;
  docId?: string | null;
  rowId?: string | null;
  actorId?: string | null;
}) {
  if (!input.userId) return;
  await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    docId: input.docId ?? null,
    rowId: input.rowId ?? null,
    actorId: input.actorId ?? null,
  });

  // Envío por Telegram si el destinatario tiene chat_id configurado.
  const pref = await db.query.preferences.findFirst({
    where: eq(preferences.userId, input.userId),
  });
  if (pref?.telegramChatId) {
    const text = input.body
      ? `<b>${input.title}</b>\n${input.body}`
      : `<b>${input.title}</b>`;
    await sendTelegramMessage(pref.telegramChatId, text).catch(() => {});
  }
}

// Historial de versiones: máx. por doc/fila y throttle entre snapshots.
export const VERSIONS_KEEP = 15;
const VERSION_THROTTLE_MS = 5 * 60 * 1000;

/**
 * Crea un snapshot de versión (para un doc o una fila) si el último es antiguo,
 * y poda dejando solo los VERSIONS_KEEP más recientes. Único punto de versionado.
 */
export async function snapshotVersion(
  target: { docId: string } | { rowId: string },
  blocks: Block[] | null,
  textContent: string,
  authorId: string,
  opts?: { throttleMs?: number }
) {
  const cond =
    "docId" in target
      ? eq(versions.docId, target.docId)
      : eq(versions.rowId, target.rowId);
  const throttle = opts?.throttleMs ?? VERSION_THROTTLE_MS;

  const [last] = await db
    .select({ createdAt: versions.createdAt })
    .from(versions)
    .where(cond)
    .orderBy(desc(versions.createdAt))
    .limit(1);
  if (last && Date.now() - last.createdAt.getTime() <= throttle) return;

  await db.insert(versions).values({
    docId: "docId" in target ? target.docId : null,
    rowId: "rowId" in target ? target.rowId : null,
    blocks,
    textContent,
    authorId,
  });

  const old = await db
    .select({ id: versions.id })
    .from(versions)
    .where(cond)
    .orderBy(desc(versions.createdAt))
    .offset(VERSIONS_KEEP);
  if (old.length) {
    await db.delete(versions).where(
      inArray(
        versions.id,
        old.map((r) => r.id)
      )
    );
  }
}

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

// ---------------------------------------------------------------------------
// Resolución de acceso a docs: dueño del workspace o invitado vía doc_shares
// (sobre el propio doc o cualquiera de sus ancestros → hereda al subárbol).
// ---------------------------------------------------------------------------


/** Lanza si la operación es de escritura y el rol es solo lectura. */
function guardWrite(role: AccessRole, write: boolean) {
  if (write && role === "viewer") throw new Error("Sin permiso de edición");
}

/**
 * Resuelve el acceso de un usuario a un doc: dueño del workspace, o un grant de
 * doc_shares sobre el propio doc o cualquiera de sus ancestros. Devuelve el doc
 * y el rol efectivo, o null si no tiene acceso.
 */
export async function resolveDocAccess(
  docId: string,
  userId: string
): Promise<{ doc: Doc; role: AccessRole } | null> {
  const [row] = await db
    .select({ doc: docs, ownerId: workspaces.ownerId })
    .from(docs)
    .innerJoin(workspaces, eq(docs.workspaceId, workspaces.id))
    .where(eq(docs.id, docId));
  if (!row) return null;
  if (row.ownerId === userId) return { doc: row.doc, role: "owner" };

  const grants = await db.execute<{ role: "viewer" | "editor" }>(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_id FROM docs WHERE id = ${docId}
      UNION ALL
      SELECT d.id, d.parent_id FROM docs d JOIN ancestors a ON d.id = a.parent_id
    )
    SELECT s.role FROM doc_shares s
    JOIN ancestors a ON a.id = s.doc_id
    WHERE s.user_id = ${userId}
  `);
  const role = pickAccessRole(
    false,
    Array.from(grants).map((g) => g.role)
  );
  return role ? { doc: row.doc, role } : null;
}

/**
 * Colaboradores de un doc (para @menciones): dueño del workspace + destinatarios
 * de shares sobre el doc o sus ancestros.
 */
export async function docCollaborators(
  docId: string
): Promise<{ id: string; name: string }[]> {
  const [row] = await db
    .select({ ownerId: workspaces.ownerId })
    .from(docs)
    .innerJoin(workspaces, eq(docs.workspaceId, workspaces.id))
    .where(eq(docs.id, docId));
  if (!row) return [];

  const owner = await db.query.users.findFirst({
    where: eq(users.id, row.ownerId),
    columns: { id: true, name: true },
  });
  const list: { id: string; name: string }[] = owner
    ? [{ id: owner.id, name: owner.name }]
    : [];

  const shared = await db.execute<{ id: string; name: string }>(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_id FROM docs WHERE id = ${docId}
      UNION ALL
      SELECT d.id, d.parent_id FROM docs d JOIN ancestors a ON d.id = a.parent_id
    )
    SELECT DISTINCT u.id, u.name FROM doc_shares s
    JOIN ancestors a ON a.id = s.doc_id
    JOIN users u ON u.id = s.user_id
  `);
  for (const u of Array.from(shared)) {
    if (!list.some((x) => x.id === u.id)) list.push({ id: u.id, name: u.name });
  }
  return list;
}

/**
 * Docs compartidos con un usuario para el sidebar: cada raíz compartida + todos
 * sus descendientes vivos (campos mínimos del árbol), más el rol por raíz.
 */
export async function getSharedTreeForUser(userId: string): Promise<{
  docs: TreeDoc[];
  roots: { id: string; role: "viewer" | "editor" }[];
}> {
  const shares = await db
    .select({ docId: docShares.docId, role: docShares.role })
    .from(docShares)
    .where(eq(docShares.userId, userId));
  if (!shares.length) return { docs: [], roots: [] };

  const rootIds = shares.map((s) => s.docId);
  const idList = sql.join(
    rootIds.map((id) => sql`${id}`),
    sql`, `
  );
  const rows = await db.execute<{
    id: string;
    parent_id: string | null;
    section: "team" | "private";
    kind: "page" | "database" | "calendar";
    emoji: string | null;
    title: string;
    is_favorite: boolean;
    order_key: string;
  }>(sql`
    WITH RECURSIVE sub AS (
      SELECT id, parent_id, section, kind, emoji, title, is_favorite, order_key
      FROM docs WHERE id IN (${idList}) AND deleted_at IS NULL
      UNION ALL
      SELECT d.id, d.parent_id, d.section, d.kind, d.emoji, d.title, d.is_favorite, d.order_key
      FROM docs d JOIN sub s ON d.parent_id = s.id
      WHERE d.deleted_at IS NULL
    )
    SELECT id, parent_id, section, kind, emoji, title, is_favorite, order_key FROM sub
  `);

  const docsList: TreeDoc[] = Array.from(rows).map((r) => ({
    id: r.id,
    parentId: r.parent_id,
    section: r.section,
    kind: r.kind,
    emoji: r.emoji,
    title: r.title,
    isFavorite: r.is_favorite,
    orderKey: r.order_key,
  }));
  // Solo raíces realmente presentes (no borradas).
  const present = new Set(docsList.map((d) => d.id));
  return {
    docs: docsList,
    roots: shares
      .filter((s) => present.has(s.docId))
      .map((s) => ({ id: s.docId, role: s.role })),
  };
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

/**
 * Comprueba acceso a un doc (dueño o invitado). `write` (def. true) exige rol de
 * edición; pásalo a false en operaciones de solo lectura.
 */
export async function assertDocAccess(
  docId: string,
  opts: { write?: boolean } = {}
): Promise<Doc> {
  const userId = await requireUserId();
  const access = await resolveDocAccess(docId, userId);
  if (!access) throw new Error("Página no encontrada");
  guardWrite(access.role, opts.write ?? true);
  return access.doc;
}

/** Comprueba acceso a una BD (vía su doc → acceso de doc). */
export async function assertDatabaseAccess(
  databaseId: string,
  opts: { write?: boolean } = {}
): Promise<{ database: DbDatabase; docId: string }> {
  const userId = await requireUserId();
  const [row] = await db
    .select({ database: databases, docId: docs.id })
    .from(databases)
    .innerJoin(docs, eq(databases.docId, docs.id))
    .where(eq(databases.id, databaseId));
  if (!row) throw new Error("Base de datos no encontrada");
  const access = await resolveDocAccess(row.docId, userId);
  if (!access) throw new Error("Base de datos no encontrada");
  guardWrite(access.role, opts.write ?? true);
  return { database: row.database, docId: row.docId };
}

/** Comprueba acceso a una fila (vía BD → doc → acceso de doc). */
export async function assertRowAccess(
  rowId: string,
  opts: { write?: boolean } = {}
): Promise<{ row: Row; docId: string }> {
  const userId = await requireUserId();
  const [r] = await db
    .select({ row: rows, docId: docs.id })
    .from(rows)
    .innerJoin(databases, eq(rows.databaseId, databases.id))
    .innerJoin(docs, eq(databases.docId, docs.id))
    .where(eq(rows.id, rowId));
  if (!r) throw new Error("Fila no encontrada");
  const access = await resolveDocAccess(r.docId, userId);
  if (!access) throw new Error("Fila no encontrada");
  guardWrite(access.role, opts.write ?? true);
  return { row: r.row, docId: r.docId };
}

/** Comprueba acceso a una vista (vía BD → doc → acceso de doc). */
export async function assertViewAccess(
  viewId: string,
  opts: { write?: boolean } = {}
): Promise<{ view: View; databaseId: string; docId: string }> {
  const userId = await requireUserId();
  const [r] = await db
    .select({ view: views, databaseId: databases.id, docId: docs.id })
    .from(views)
    .innerJoin(databases, eq(views.databaseId, databases.id))
    .innerJoin(docs, eq(databases.docId, docs.id))
    .where(eq(views.id, viewId));
  if (!r) throw new Error("Vista no encontrada");
  const access = await resolveDocAccess(r.docId, userId);
  if (!access) throw new Error("Vista no encontrada");
  guardWrite(access.role, opts.write ?? true);
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
  const maxKey = row?.max ?? null;
  try {
    return generateKeyBetween(maxKey, null);
  } catch {
    // maxKey is an invalid fractional index (e.g. legacy seed data) — ignore it
    return generateKeyBetween(null, null);
  }
}

"use server";

import { desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  comments,
  databases,
  digestRules,
  docShares,
  docs,
  homeTasks,
  notifications,
  people,
  preferences,
  rows,
  views,
  workspaces,
} from "@/db/schema";
import { requireUserId } from "./helpers";

/**
 * Volcado completo de los datos del usuario actual (su workspace) en un objeto
 * JSON-serializable, para depurar incidencias. Incluye páginas/bloques, bases de
 * datos (esquema, vistas, filas), comentarios, personas, tareas de inicio,
 * avisos, compartidos y notificaciones recientes. NO incluye secretos
 * (contraseñas, tokens) ni el chat_id de Telegram (se reduce a un booleano).
 */
export async function exportUserData(): Promise<{
  filename: string;
  json: string;
}> {
  const userId = await requireUserId();
  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerId, userId),
  });
  if (!ws) throw new Error("Workspace no encontrado");

  // Páginas/BD del workspace (incluye las de la papelera para reproducir bugs).
  const docList = await db
    .select()
    .from(docs)
    .where(eq(docs.workspaceId, ws.id));
  const docIds = docList.map((d) => d.id);

  const dbList = docIds.length
    ? await db.select().from(databases).where(inArray(databases.docId, docIds))
    : [];
  const dbIds = dbList.map((d) => d.id);

  const viewList = dbIds.length
    ? await db.select().from(views).where(inArray(views.databaseId, dbIds))
    : [];
  const rowList = dbIds.length
    ? await db.select().from(rows).where(inArray(rows.databaseId, dbIds))
    : [];
  const rowIds = rowList.map((r) => r.id);

  // Comentarios anclados a cualquier doc o fila del workspace.
  const commentList =
    docIds.length || rowIds.length
      ? await db
          .select()
          .from(comments)
          .where(
            or(
              docIds.length ? inArray(comments.docId, docIds) : undefined,
              rowIds.length ? inArray(comments.rowId, rowIds) : undefined
            )
          )
      : [];

  const peopleList = await db
    .select()
    .from(people)
    .where(eq(people.workspaceId, ws.id));

  const homeTaskList = await db
    .select()
    .from(homeTasks)
    .where(eq(homeTasks.workspaceId, ws.id));

  const prefRow = await db.query.preferences.findFirst({
    where: eq(preferences.userId, userId),
  });
  // Redacta el chat_id de Telegram: solo nos interesa si está configurado.
  const prefsRedacted = prefRow
    ? {
        ...prefRow,
        telegramChatId: undefined,
        telegramConfigured: !!prefRow.telegramChatId,
      }
    : null;

  const ruleList = await db
    .select()
    .from(digestRules)
    .where(eq(digestRules.userId, userId));

  // Compartidos: por mí (sobre mis docs) y conmigo (donde soy destinatario).
  const sharesByMe = docIds.length
    ? await db.select().from(docShares).where(inArray(docShares.docId, docIds))
    : [];
  const sharesWithMe = await db
    .select()
    .from(docShares)
    .where(eq(docShares.userId, userId));

  // Notificaciones recientes (últimas 100) para depurar avisos.
  const noteList = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(100);

  const data = {
    meta: {
      exportedAt: new Date().toISOString(),
      schemaVersion: 19,
      userId,
      counts: {
        docs: docList.length,
        databases: dbList.length,
        views: viewList.length,
        rows: rowList.length,
        comments: commentList.length,
        people: peopleList.length,
        homeTasks: homeTaskList.length,
        digestRules: ruleList.length,
        notifications: noteList.length,
      },
    },
    workspace: ws,
    preferences: prefsRedacted,
    docs: docList,
    databases: dbList,
    views: viewList,
    rows: rowList,
    comments: commentList,
    people: peopleList,
    homeTasks: homeTaskList,
    digestRules: ruleList,
    shares: { byMe: sharesByMe, withMe: sharesWithMe },
    notifications: noteList,
  };

  const stamp = new Date().toISOString().slice(0, 10);
  return {
    filename: `mikion-export-${stamp}.json`,
    json: JSON.stringify(data, null, 2),
  };
}

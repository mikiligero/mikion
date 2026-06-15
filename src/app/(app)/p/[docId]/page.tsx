import { notFound } from "next/navigation";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { docs, databases, views, rows as rowsTable } from "@/db/schema";
import { requireWorkspace } from "@/lib/session";
import { findOption } from "@/lib/database-view";
import { getRowTitle } from "@/lib/database-utils";
import { PageEditor } from "@/components/editor/page-editor";
import { DatabaseContainer } from "@/components/database/database-container";
import { TeamCalendar, type CalEvent } from "@/components/calendar/team-calendar";
import type { Block } from "@/lib/types";

export default async function DocPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const { docId } = await params;
  const { session, workspace } = await requireWorkspace();
  const mentionUsers = [{ id: session.user.id, name: session.user.name }];

  const doc = await db.query.docs.findFirst({
    where: and(eq(docs.id, docId), eq(docs.workspaceId, workspace.id)),
  });
  if (!doc || doc.deletedAt) notFound();

  if (doc.kind === "page") {
    return (
      <PageEditor
        doc={{
          id: doc.id,
          emoji: doc.emoji,
          title: doc.title,
          cover: doc.cover,
          fullWidth: doc.fullWidth,
        }}
        initialContent={(doc.blocks as Block[] | null) ?? null}
        mentionUsers={mentionUsers}
      />
    );
  }

  if (doc.kind === "database") {
    const database = await db.query.databases.findFirst({
      where: eq(databases.docId, doc.id),
    });
    if (!database) notFound();

    const [viewRows, rowRows] = await Promise.all([
      db
        .select({
          id: views.id,
          name: views.name,
          type: views.type,
          config: views.config,
        })
        .from(views)
        .where(eq(views.databaseId, database.id))
        .orderBy(asc(views.orderKey)),
      db
        .select()
        .from(rowsTable)
        .where(
          and(
            eq(rowsTable.databaseId, database.id),
            isNull(rowsTable.deletedAt)
          )
        )
        .orderBy(asc(rowsTable.orderKey)),
    ]);

    return (
      <DatabaseContainer
        doc={{ id: doc.id, emoji: doc.emoji, title: doc.title }}
        database={{
          id: database.id,
          schema: database.schema,
          automations: database.automations,
        }}
        views={viewRows}
        rows={rowRows}
      />
    );
  }

  // Calendario del equipo: agrega eventos de todas las BD del workspace
  // (filas con una propiedad de fecha).
  const dbs = await db
    .select({ id: databases.id, schema: databases.schema, docId: databases.docId })
    .from(databases)
    .innerJoin(docs, eq(databases.docId, docs.id))
    .where(and(eq(docs.workspaceId, workspace.id), isNull(docs.deletedAt)));

  const events: CalEvent[] = [];
  if (dbs.length) {
    const allRows = await db
      .select()
      .from(rowsTable)
      .where(
        and(
          inArray(
            rowsTable.databaseId,
            dbs.map((d) => d.id)
          ),
          isNull(rowsTable.deletedAt)
        )
      );
    const dbById = new Map(dbs.map((d) => [d.id, d]));
    for (const r of allRows) {
      const parent = dbById.get(r.databaseId)!;
      const dateProp = parent.schema.properties.find((p) => p.type === "date");
      const v = dateProp ? r.values?.[dateProp.id] : null;
      if (typeof v !== "string" || !v) continue;
      const colorProp = parent.schema.properties.find(
        (p) => p.type === "status" || p.type === "select"
      );
      const opt = colorProp ? findOption(colorProp, r.values?.[colorProp.id]) : undefined;
      events.push({
        id: r.id,
        docId: parent.docId,
        title: getRowTitle(r.values, parent.schema),
        date: v.slice(0, 10),
        color: opt?.color,
      });
    }
  }

  return <TeamCalendar title={doc.title} events={events} />;
}

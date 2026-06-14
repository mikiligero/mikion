import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { docs, databases, views, rows as rowsTable } from "@/db/schema";
import { requireWorkspace } from "@/lib/session";
import { PageEditor } from "@/components/editor/page-editor";
import { DatabaseContainer } from "@/components/database/database-container";
import type { Block } from "@/lib/types";

export default async function DocPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const { docId } = await params;
  const { workspace } = await requireWorkspace();

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
        database={{ id: database.id, schema: database.schema }}
        views={viewRows}
        rows={rowRows}
      />
    );
  }

  // Calendario (Fase 2): placeholder.
  return (
    <div className="mx-auto max-w-3xl px-8 py-16">
      <div className="text-[70px] leading-none">{doc.emoji ?? "📅"}</div>
      <h1 className="font-serif text-ink mt-2 text-[42px] font-[560] leading-[1.12]">
        {doc.title || "Sin título"}
      </h1>
      <p className="text-ink-faint mt-3 text-sm">Calendario · Fase 2</p>
    </div>
  );
}

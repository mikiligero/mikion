import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { docs, databases, rows as rowsTable } from "@/db/schema";
import { requireWorkspace } from "@/lib/session";
import { getRowTitle } from "@/lib/database-utils";
import { listPeople } from "@/lib/people";
import { RowPage } from "@/components/database/row-page";
import type { Block } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ docId: string; rowId: string }>;
}) {
  const { docId, rowId } = await params;
  const { workspace } = await requireWorkspace();
  const doc = await db.query.docs.findFirst({
    columns: { id: true },
    where: and(eq(docs.id, docId), eq(docs.workspaceId, workspace.id)),
  });
  if (!doc) return { title: "Sin título" };
  const database = await db.query.databases.findFirst({
    where: eq(databases.docId, doc.id),
  });
  const row = database
    ? await db.query.rows.findFirst({
        columns: { values: true },
        where: and(eq(rowsTable.id, rowId), eq(rowsTable.databaseId, database.id)),
      })
    : null;
  const title = database && row ? getRowTitle(row.values, database.schema) : "";
  return { title: title?.trim() || "Sin título" };
}

export default async function RowDocPage({
  params,
}: {
  params: Promise<{ docId: string; rowId: string }>;
}) {
  const { docId, rowId } = await params;
  const { session, workspace } = await requireWorkspace();
  const mentionUsers = [{ id: session.user.id, name: session.user.name }];

  const doc = await db.query.docs.findFirst({
    where: and(eq(docs.id, docId), eq(docs.workspaceId, workspace.id)),
  });
  if (!doc || doc.kind !== "database") notFound();

  const database = await db.query.databases.findFirst({
    where: eq(databases.docId, doc.id),
  });
  if (!database) notFound();

  const [row] = await db
    .select()
    .from(rowsTable)
    .where(
      and(eq(rowsTable.id, rowId), eq(rowsTable.databaseId, database.id))
    )
    .limit(1);
  if (!row || row.deletedAt) notFound();

  const people = await listPeople(workspace.id, doc.section);

  return (
    <RowPage
      databaseId={database.id}
      schema={database.schema}
      people={people}
      row={{
        id: row.id,
        emoji: row.emoji,
        values: row.values,
        cover: row.cover,
        coverPosition: row.coverPosition,
        blocks: (row.blocks as Block[] | null) ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }}
      mentionUsers={mentionUsers}
    />
  );
}

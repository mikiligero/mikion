import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { databases, rows as rowsTable } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { resolveDocAccess, docCollaborators } from "@/lib/actions/helpers";
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
  const session = await requireSession();
  const access = await resolveDocAccess(docId, session.user.id);
  if (!access) return { title: "Sin título" };
  const doc = access.doc;
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
  const session = await requireSession();
  const access = await resolveDocAccess(docId, session.user.id);
  if (!access || access.doc.deletedAt || access.doc.kind !== "database") notFound();
  const doc = access.doc;
  const readOnly = access.role === "viewer";
  const mentionUsers = await docCollaborators(docId);

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

  const people = await listPeople(doc.workspaceId, doc.section);

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
        coverZoom: row.coverZoom,
        blocks: (row.blocks as Block[] | null) ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }}
      mentionUsers={mentionUsers}
      readOnly={readOnly}
    />
  );
}

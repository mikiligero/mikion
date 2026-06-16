import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { docs, databases, rows as rowsTable } from "@/db/schema";
import { requireWorkspace } from "@/lib/session";
import { RowPage } from "@/components/database/row-page";
import type { Block } from "@/lib/types";

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

  return (
    <RowPage
      databaseId={database.id}
      schema={database.schema}
      row={{
        id: row.id,
        emoji: row.emoji,
        values: row.values,
        cover: row.cover,
        blocks: (row.blocks as Block[] | null) ?? null,
      }}
      mentionUsers={mentionUsers}
    />
  );
}

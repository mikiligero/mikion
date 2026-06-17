import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { docs, databases, rows as rowsTable } from "@/db/schema";
import { requireWorkspace } from "@/lib/session";
import { getRowTitle } from "@/lib/database-utils";
import { TrashList, type TrashItem } from "@/components/workspace/trash-list";

export default async function TrashPage() {
  const { workspace } = await requireWorkspace();

  // Páginas / BBDD / calendarios eliminados.
  const trashedDocs = await db
    .select({
      id: docs.id,
      parentId: docs.parentId,
      title: docs.title,
      emoji: docs.emoji,
      kind: docs.kind,
      deletedAt: docs.deletedAt,
    })
    .from(docs)
    .where(and(eq(docs.workspaceId, workspace.id), isNotNull(docs.deletedAt)))
    .orderBy(desc(docs.deletedAt));

  // Muestra solo las raíces de subárboles eliminados (no cada descendiente).
  const trashedIds = new Set(trashedDocs.map((d) => d.id));
  const roots = trashedDocs.filter(
    (d) => !d.parentId || !trashedIds.has(d.parentId)
  );

  // Filas de BBDD enviadas a la papelera (excluye las de BBDD ya eliminadas).
  const trashedRows = await db
    .select({
      id: rowsTable.id,
      values: rowsTable.values,
      schema: databases.schema,
      deletedAt: rowsTable.deletedAt,
    })
    .from(rowsTable)
    .innerJoin(databases, eq(rowsTable.databaseId, databases.id))
    .innerJoin(docs, eq(databases.docId, docs.id))
    .where(
      and(
        eq(docs.workspaceId, workspace.id),
        isNotNull(rowsTable.deletedAt),
        isNull(docs.deletedAt)
      )
    )
    .orderBy(desc(rowsTable.deletedAt));

  const items: TrashItem[] = [
    ...roots.map((d) => ({
      id: d.id,
      type: "doc" as const,
      title: d.title,
      emoji: d.emoji,
      kind: d.kind,
      deletedAt: (d.deletedAt as Date).toISOString(),
    })),
    ...trashedRows.map((r) => ({
      id: r.id,
      type: "row" as const,
      title: getRowTitle(r.values, r.schema),
      emoji: null,
      deletedAt: (r.deletedAt as Date).toISOString(),
    })),
  ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));

  return <TrashList items={items} />;
}

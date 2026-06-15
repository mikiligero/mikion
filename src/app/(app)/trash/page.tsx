import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { docs } from "@/db/schema";
import { requireWorkspace } from "@/lib/session";
import { TrashList } from "@/components/workspace/trash-list";

export default async function TrashPage() {
  const { workspace } = await requireWorkspace();

  const trashed = await db
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
  const trashedIds = new Set(trashed.map((d) => d.id));
  const roots = trashed.filter(
    (d) => !d.parentId || !trashedIds.has(d.parentId)
  );

  return (
    <TrashList
      items={roots.map((d) => ({
        id: d.id,
        title: d.title,
        emoji: d.emoji,
        kind: d.kind,
        deletedAt: (d.deletedAt as Date).toISOString(),
      }))}
    />
  );
}

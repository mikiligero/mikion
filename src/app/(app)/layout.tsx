import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { docs } from "@/db/schema";
import { requireWorkspace } from "@/lib/session";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Topbar } from "@/components/topbar/topbar";
import { CommandPalette } from "@/components/search/command-palette";
import { CommentsHost } from "@/components/comments/comments-host";
import { TemplatesHost } from "@/components/templates/templates-host";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, workspace } = await requireWorkspace();

  // Árbol del sidebar: todos los docs vivos del workspace (campos mínimos).
  const tree = await db
    .select({
      id: docs.id,
      parentId: docs.parentId,
      section: docs.section,
      kind: docs.kind,
      emoji: docs.emoji,
      title: docs.title,
      isFavorite: docs.isFavorite,
      orderKey: docs.orderKey,
    })
    .from(docs)
    .where(and(eq(docs.workspaceId, workspace.id), isNull(docs.deletedAt)))
    .orderBy(asc(docs.orderKey));

  return (
    <div className="bg-paper flex h-screen overflow-hidden">
      <AppSidebar
        workspace={{ id: workspace.id, name: workspace.name }}
        user={{ name: session.user.name, email: session.user.email }}
        docs={tree}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        <Topbar docs={tree} />
        <div className="content-scroll flex-1 overflow-y-auto">{children}</div>
      </main>
      <CommentsHost />
      <TemplatesHost />
      <CommandPalette />
    </div>
  );
}

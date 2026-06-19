import { and, asc, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { docs, notifications } from "@/db/schema";
import { requireWorkspace } from "@/lib/session";
import { getSharedTreeForUser } from "@/lib/actions/helpers";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarProvider } from "@/components/sidebar/sidebar-context";
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

  const [unread] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, session.user.id),
        eq(notifications.read, false)
      )
    );

  // Docs compartidos conmigo (de otros usuarios) para una tercera sección.
  const shared = await getSharedTreeForUser(session.user.id);
  // El breadcrumb/paleta resuelven rutas desde la lista combinada.
  const allDocs = [...tree, ...shared.docs];

  return (
    <SidebarProvider>
      <div className="bg-paper flex h-screen overflow-hidden">
        <AppSidebar
          workspace={{ id: workspace.id, name: workspace.name }}
          user={{ name: session.user.name, email: session.user.email }}
          docs={tree}
          shared={shared.docs}
          sharedRoots={shared.roots}
          unread={unread?.value ?? 0}
        />
        <main className="bg-surface flex min-w-0 flex-1 flex-col">
          <Topbar docs={allDocs} />
          <div className="content-scroll flex-1 overflow-y-auto">{children}</div>
        </main>
        <CommentsHost />
        <TemplatesHost />
        <CommandPalette />
      </div>
    </SidebarProvider>
  );
}

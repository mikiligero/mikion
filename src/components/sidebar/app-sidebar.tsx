"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Home,
  Inbox,
  Star,
  Plus,
  Settings,
  Trash2,
  FileText,
  Database,
  Calendar,
  ChevronDown,
  PanelLeftClose,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { buildTree, type TreeDoc } from "@/lib/tree";
import { createDoc, moveToTrash, moveDoc } from "@/lib/actions/docs";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
import { docIcon } from "./doc-icon";
import { PageTree } from "./page-tree";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type DocKind = "page" | "database" | "calendar";

type Props = {
  workspace: { id: string; name: string };
  user: { name: string; email: string };
  docs: TreeDoc[];
  unread: number;
};

export function AppSidebar({ workspace, user, docs, unread }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { collapsed, toggle, mobileOpen, closeMobile } = useSidebar();

  const activeId = pathname.startsWith("/p/") ? pathname.split("/")[2] : null;

  const team = useMemo(() => buildTree(docs, "team"), [docs]);
  const priv = useMemo(() => buildTree(docs, "private"), [docs]);
  const favorites = useMemo(() => docs.filter((d) => d.isFavorite), [docs]);

  function toggleNode(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function create(
    section: "team" | "private",
    parentId: string | null,
    kind: DocKind = "page"
  ) {
    startTransition(async () => {
      const { id } = await createDoc({ section, parentId, kind });
      if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
      router.push(`/p/${id}`);
    });
  }

  function trash(id: string) {
    startTransition(async () => {
      await moveToTrash(id);
      toast.success("Movido a la papelera");
      if (activeId === id) router.push("/");
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function onDragEnd(e: DragEndEvent) {
    const activeDocId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    const dragged = docs.find((d) => d.id === activeDocId);
    if (!dragged) return;

    // Descendientes (para evitar mover dentro de sí mismo).
    const descendants = new Set<string>();
    const collect = (pid: string) => {
      for (const d of docs)
        if (d.parentId === pid) {
          descendants.add(d.id);
          collect(d.id);
        }
    };
    collect(activeDocId);

    const byKey = (a: TreeDoc, b: TreeDoc) =>
      a.orderKey < b.orderKey ? -1 : a.orderKey > b.orderKey ? 1 : 0;

    let newParentId: string | null;
    let section: "team" | "private";
    let afterId: string | null = null;
    let beforeId: string | null = null;

    if (overId.startsWith("root:")) {
      section = overId.slice(5) as "team" | "private";
      newParentId = null;
      const roots = docs
        .filter((d) => d.section === section && !d.parentId && d.id !== activeDocId)
        .sort(byKey);
      afterId = roots.length ? roots[roots.length - 1].id : null;
    } else if (overId.startsWith("node:")) {
      const targetId = overId.slice(5);
      if (targetId === activeDocId || descendants.has(targetId)) return;
      const target = docs.find((d) => d.id === targetId);
      if (!target) return;
      newParentId = target.parentId ?? null;
      section = target.section;
      const siblings = docs
        .filter(
          (d) =>
            d.section === section &&
            (d.parentId ?? null) === newParentId &&
            d.id !== activeDocId
        )
        .sort(byKey);
      const idx = siblings.findIndex((d) => d.id === targetId);
      afterId = idx > 0 ? siblings[idx - 1].id : null;
      beforeId = siblings[idx]?.id ?? null;
    } else {
      return;
    }

    startTransition(() =>
      moveDoc({ docId: activeDocId, newParentId, section, afterId, beforeId })
    );
  }

  const treeProps = {
    activeId,
    expanded,
    onToggle: toggleNode,
    onCreateChild: (parentId: string) => create("team", parentId),
    onTrash: trash,
  };

  return (
    <>
      {/* Overlay del drawer móvil; cierra al tocar fuera. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={closeMobile}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "bg-sidebar border-line fixed inset-y-0 left-0 z-50 flex h-screen w-(--sidebar-w) shrink-0 flex-col border-r transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:relative md:translate-x-0 md:overflow-hidden md:transition-[width]",
          collapsed ? "md:w-0 md:border-r-0" : "md:w-(--sidebar-w)"
        )}
      >
      {/* Cabecera de workspace + lanzador de apps */}
      <div className="flex items-center">
        <Popover>
          <PopoverTrigger asChild>
            <button className="hover:bg-sidebar-hover flex min-w-0 flex-1 items-center gap-2 px-3 py-3 text-left">
              <div className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-md text-sm font-semibold">
                M
              </div>
              <span className="text-ink flex-1 truncate text-sm font-medium">
                {workspace.name}
              </span>
              <ChevronDown className="text-ink-faint size-4 shrink-0" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-60 p-1">
            <div className="px-2 py-1.5 text-xs text-ink-faint">{user.email}</div>
            <AppLauncherItem label="Mikion" active />
            <AppLauncherItem label="Mikion Calendar" soon />
            <AppLauncherItem label="Mikion Mail" soon />
            <div className="bg-line my-1 h-px" />
            <Link
              href="/settings"
              className="hover:bg-sidebar-hover flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
            >
              <Settings className="size-4 text-ink-faint" /> Ajustes
            </Link>
          </PopoverContent>
        </Popover>
        <button
          onClick={toggle}
          aria-label="Ocultar barra lateral"
          title="Ocultar barra lateral (⌘\)"
          className="text-ink-soft hover:bg-sidebar-hover mr-2 flex size-7 shrink-0 items-center justify-center rounded-sm"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {/* Accesos rápidos */}
        <QuickRow
          icon={<Search className="size-4" />}
          label="Buscar"
          onClick={() => window.dispatchEvent(new Event("mikion:command"))}
        />
        <QuickRow
          icon={<Home className="size-4" />}
          label="Inicio"
          href="/"
          active={pathname === "/"}
        />
        <QuickRow
          icon={<Inbox className="size-4" />}
          label="Bandeja de entrada"
          href="/inbox"
          active={pathname === "/inbox"}
          badge={unread > 0 ? String(unread) : undefined}
        />

        {/* Favoritos */}
        {favorites.length > 0 && (
          <Section title="Favoritos">
            {favorites.map((d) => (
              <Link
                key={d.id}
                href={`/p/${d.id}`}
                className={cn(
                  "text-ink-soft hover:bg-sidebar-hover flex items-center gap-2 rounded-sm px-1.5 py-1 text-sm",
                  activeId === d.id && "bg-sidebar-hover text-ink font-medium"
                )}
              >
                <span className="flex size-[18px] items-center justify-center text-[15px]">
                  {docIcon(d.kind, d.emoji, activeId === d.id)}
                </span>
                <span className="truncate">{d.title || "Sin título"}</span>
              </Link>
            ))}
          </Section>
        )}

        <DndContext id="sidebar-tree-dnd" sensors={sensors} onDragEnd={onDragEnd}>
          {/* Espacio de equipo */}
          <Section
            title="Espacio de equipo"
            addMenu={
              <CreateMenu onPick={(k) => create("team", null, k)}>
                <button
                  className="text-ink-faint hover:bg-line flex size-5 items-center justify-center rounded-sm opacity-0 group-hover/section:opacity-100"
                  aria-label="Añadir en Espacio de equipo"
                >
                  <Plus className="size-4" />
                </button>
              </CreateMenu>
            }
          >
            <RootDroppable section="team">
              {team.length > 0 ? (
                <PageTree nodes={team} depth={0} {...treeProps} />
              ) : (
                <EmptyHint />
              )}
            </RootDroppable>
          </Section>

          {/* Privado */}
          <Section
            title="Privado"
            addMenu={
              <CreateMenu onPick={(k) => create("private", null, k)}>
                <button
                  className="text-ink-faint hover:bg-line flex size-5 items-center justify-center rounded-sm opacity-0 group-hover/section:opacity-100"
                  aria-label="Añadir en Privado"
                >
                  <Plus className="size-4" />
                </button>
              </CreateMenu>
            }
          >
            <RootDroppable section="private">
              {priv.length > 0 ? (
                <PageTree
                  nodes={priv}
                  depth={0}
                  {...treeProps}
                  onCreateChild={(parentId) => create("private", parentId)}
                />
              ) : (
                <EmptyHint />
              )}
            </RootDroppable>
          </Section>
        </DndContext>

        <CreateMenu onPick={(k) => create("team", null, k)}>
          <button className="text-ink-faint hover:bg-sidebar-hover mt-2 flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-sm">
            <Plus className="size-4" /> Nueva página
          </button>
        </CreateMenu>
      </nav>

      {/* Pie */}
      <div className="border-line space-y-0.5 border-t p-2">
        <QuickRow
          icon={<Settings className="size-4" />}
          label="Ajustes"
          href="/settings"
          active={pathname === "/settings"}
        />
        <QuickRow
          icon={<Trash2 className="size-4" />}
          label="Papelera"
          href="/trash"
          active={pathname === "/trash"}
        />
      </div>
    </aside>
    </>
  );
}

function QuickRow({
  icon,
  label,
  href,
  onClick,
  active,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  badge?: string;
}) {
  const cls = cn(
    "text-ink-soft hover:bg-sidebar-hover flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-sm",
    active && "bg-sidebar-hover text-ink font-medium"
  );
  const inner = (
    <>
      <span className="text-ink-faint">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="bg-brand-soft text-brand rounded-full px-1.5 text-xs font-medium">
          {badge}
        </span>
      )}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function Section({
  title,
  addMenu,
  children,
}: {
  title: string;
  addMenu?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="group/section mt-5">
      <div className="flex items-center justify-between px-1.5 pb-1">
        <span className="text-ink-faint text-[11.5px] font-semibold uppercase tracking-[0.04em]">
          {title}
        </span>
        {addMenu}
      </div>
      {children}
    </div>
  );
}

function CreateMenu({
  onPick,
  children,
}: {
  onPick: (kind: DocKind) => void;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem onClick={() => onPick("page")}>
          <FileText className="size-4" /> Página
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPick("database")}>
          <Database className="size-4" /> Base de datos
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPick("calendar")}>
          <Calendar className="size-4" /> Calendario
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyHint() {
  return (
    <p className="text-ink-ghost px-1.5 py-1 text-xs">Vacío</p>
  );
}

function RootDroppable({
  section,
  children,
}: {
  section: "team" | "private";
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `root:${section}` });
  return (
    <div
      ref={setNodeRef}
      className={cn("min-h-6 rounded-sm", isOver && "bg-sidebar-hover/50")}
    >
      {children}
    </div>
  );
}

function AppLauncherItem({
  label,
  active,
  soon,
}: {
  label: string;
  active?: boolean;
  soon?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
        active ? "text-ink" : "text-ink-soft",
        soon && "opacity-60"
      )}
    >
      <FileText className="size-4 text-ink-faint" />
      <span className="flex-1">{label}</span>
      {active && <Star className="size-3.5 text-brand" />}
      {soon && <span className="text-ink-ghost text-[10px]">pronto</span>}
    </div>
  );
}

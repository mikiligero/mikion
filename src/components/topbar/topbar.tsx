"use client";

import { Fragment, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Search,
  Star,
  Moon,
  Sun,
  Bell,
  MessageSquare,
  MoreHorizontal,
  ChevronRight,
  Copy,
  Files,
  History,
  Trash2,
  PanelLeft,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { ancestorChain, type TreeDoc } from "@/lib/tree";
import {
  toggleFavorite,
  moveToTrash,
  duplicateDoc,
  getDocStyle,
  getDocBlocks,
  updateDocMeta,
} from "@/lib/actions/docs";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/sidebar/sidebar-context";
import { VersionHistoryDialog } from "@/components/editor/version-history";
import { ShareDialog } from "@/components/topbar/share-dialog";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type DocStyle = {
  kind: "page" | "database" | "calendar";
  font: "default" | "serif" | "mono";
  fullWidth: boolean;
  smallText: boolean;
};

const FONT_LABEL: Record<"default" | "serif" | "mono", string> = {
  default: "Predet.",
  serif: "Serif",
  mono: "Mono",
};

const STATIC_LABELS: Record<string, string> = {
  "/": "Inicio",
  "/inbox": "Bandeja de entrada",
  "/trash": "Papelera",
  "/settings": "Ajustes",
};

type Crumb = { label: string; href?: string };

export function Topbar({ docs }: { docs: TreeDoc[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { collapsed, toggle: toggleSidebar, toggleMobile } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [, startTransition] = useTransition();
  // Guard de hidratación para next-themes (resolvedTheme solo es fiable tras montar).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const docId = pathname.startsWith("/p/") ? pathname.split("/")[2] : null;
  const doc = docId ? docs.find((d) => d.id === docId) ?? null : null;
  // En una página de fila de BD (/p/[docId]/[rowId]) el objetivo de exportación
  // es la fila, no la base de datos.
  const rowId = docId ? pathname.split("/")[3] ?? null : null;
  const exportTargetId = rowId ?? docId;

  // Estilo de la página activa (fuente / texto pequeño / ancho completo) para
  // los controles del menú «…». Se carga al cambiar de doc; se etiqueta con su
  // docId para no mostrar el de la página anterior mientras carga el nuevo.
  const [style, setStyle] = useState<(DocStyle & { docId: string }) | null>(
    null
  );
  useEffect(() => {
    if (!docId) return;
    let alive = true;
    getDocStyle(docId)
      .then((s) => alive && setStyle({ ...s, docId }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [docId]);
  const activeStyle = style && style.docId === docId ? style : null;
  const canExport = activeStyle?.kind === "page" || !!rowId;

  function patchStyle(patch: Partial<Omit<DocStyle, "kind">>) {
    if (!docId || !activeStyle) return;
    setStyle({ ...activeStyle, ...patch });
    startTransition(async () => {
      await updateDocMeta(docId, patch);
      router.refresh();
    });
  }

  function exportAs(format: "html" | "pdf" | "markdown") {
    if (!exportTargetId) return;
    window.dispatchEvent(
      new CustomEvent("mikion:export", {
        detail: { docId: exportTargetId, format },
      })
    );
  }

  async function exportJson() {
    if (!exportTargetId) return;
    const data = await getDocBlocks(exportTargetId);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.title || "pagina"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const crumbs: Crumb[] = (() => {
    if (docId) {
      const chain = ancestorChain(docs, docId);
      const sectionLabel =
        chain[0]?.section === "private" ? "Privado" : "Espacio de equipo";
      return [
        { label: "Inicio", href: "/" },
        { label: sectionLabel },
        ...chain.map((d) => ({
          label: d.title || "Sin título",
          href: `/p/${d.id}`,
        })),
      ];
    }
    return [{ label: STATIC_LABELS[pathname] ?? "Inicio", href: "/" }];
  })();

  function onToggleFavorite() {
    if (!doc) return;
    startTransition(async () => {
      await toggleFavorite(doc.id);
    });
  }

  function onTrash() {
    if (!doc) return;
    startTransition(async () => {
      await moveToTrash(doc.id);
      toast.success("Movido a la papelera");
      router.push("/");
    });
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Enlace copiado");
  }

  return (
    <header className="border-line flex h-12 shrink-0 items-center gap-1 border-b px-3">
      {/* Móvil (<768px): la sidebar vive en un drawer independiente del
          colapso de escritorio, así que este botón es siempre visible. */}
      <button
        onClick={toggleMobile}
        aria-label="Abrir barra lateral"
        className="text-ink-soft hover:bg-sidebar-hover mr-1 flex size-7 shrink-0 items-center justify-center rounded-sm md:hidden"
      >
        <PanelLeft className="size-4" />
      </button>
      {collapsed && (
        <button
          onClick={toggleSidebar}
          aria-label="Mostrar barra lateral"
          title="Mostrar barra lateral (⌘\)"
          className="text-ink-soft hover:bg-sidebar-hover mr-1 hidden size-7 shrink-0 items-center justify-center rounded-sm md:flex"
        >
          <PanelLeft className="size-4" />
        </button>
      )}
      {/* Breadcrumbs */}
      <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <Fragment key={i}>
              {i > 0 && <ChevronRight className="text-ink-ghost size-3.5 shrink-0" />}
              {c.href && !last ? (
                <Link
                  href={c.href}
                  className="text-ink-soft hover:bg-sidebar-hover truncate rounded-sm px-1.5 py-0.5"
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "truncate px-1.5 py-0.5",
                    last ? "text-ink font-medium" : "text-ink-soft"
                  )}
                >
                  {c.label}
                </span>
              )}
            </Fragment>
          );
        })}
      </nav>

      {/* Acciones */}
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton
          label="Buscar"
          onClick={() => window.dispatchEvent(new Event("mikion:command"))}
        >
          <Search className="size-4" />
        </IconButton>

        {doc && (
          <IconButton
            label="Favorito"
            onClick={onToggleFavorite}
            active={doc.isFavorite}
          >
            <Star className={cn("size-4", doc.isFavorite && "fill-brand text-brand")} />
          </IconButton>
        )}

        {docId && (
          <IconButton
            label="Comentarios"
            onClick={() => window.dispatchEvent(new Event("mikion:comments"))}
          >
            <MessageSquare className="size-4" />
          </IconButton>
        )}

        <IconButton
          label="Tema"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </IconButton>

        <Link
          href="/inbox"
          className="text-ink-soft hover:bg-sidebar-hover flex size-7 items-center justify-center rounded-sm"
          aria-label="Notificaciones"
        >
          <Bell className="size-4" />
        </Link>

        {docId && <ShareDialog docId={docId} />}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="text-ink-soft hover:bg-sidebar-hover flex size-7 items-center justify-center rounded-sm"
              aria-label="Más"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {activeStyle?.kind === "page" && (
              <>
                <DropdownMenuLabel className="text-ink-faint text-[11px] font-medium tracking-wide">
                  ESTILO
                </DropdownMenuLabel>
                <div className="flex gap-1 px-1.5 pb-1.5">
                  {(["default", "serif", "mono"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => patchStyle({ font: f })}
                      className={cn(
                        "flex flex-1 flex-col items-center gap-0.5 rounded-md border py-1.5",
                        activeStyle.font === f
                          ? "border-brand text-brand"
                          : "border-line text-ink-soft hover:bg-sidebar-hover"
                      )}
                    >
                      <span
                        className={cn(
                          "text-lg leading-none",
                          f === "serif" && "font-serif",
                          f === "mono" && "font-mono"
                        )}
                      >
                        Ag
                      </span>
                      <span className="text-[10px]">{FONT_LABEL[f]}</span>
                    </button>
                  ))}
                </div>
                <StyleToggle
                  label="Texto pequeño"
                  checked={activeStyle.smallText}
                  onToggle={() => patchStyle({ smallText: !activeStyle.smallText })}
                />
                <StyleToggle
                  label="Ancho completo"
                  checked={activeStyle.fullWidth}
                  onToggle={() => patchStyle({ fullWidth: !activeStyle.fullWidth })}
                />
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={() => window.dispatchEvent(new Event("mikion:templates"))}
            >
              <Files className="size-4" /> Plantillas
            </DropdownMenuItem>
            {doc && (
              <DropdownMenuItem
                onClick={() =>
                  startTransition(async () => {
                    const { id } = await duplicateDoc(doc.id);
                    router.push(`/p/${id}`);
                  })
                }
              >
                <Copy className="size-4" /> Duplicar página
              </DropdownMenuItem>
            )}
            {doc && doc.kind === "page" && (
              <DropdownMenuItem onClick={() => setShowVersions(true)}>
                <History className="size-4" /> Historial de versiones
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={copyLink}>
              <Copy className="size-4" /> Copiar enlace
            </DropdownMenuItem>
            {canExport && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Download className="size-4" /> Exportar
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => exportAs("pdf")}>
                    PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("html")}>
                    HTML
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("markdown")}>
                    Markdown
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportJson}>
                    JSON (bloques)
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            {doc && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onTrash}>
                  <Trash2 className="size-4" /> Mover a la papelera
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {doc && (
        <VersionHistoryDialog
          target={{ docId: doc.id }}
          open={showVersions}
          onOpenChange={setShowVersions}
        />
      )}
    </header>
  );
}

/** Fila del menú con un Switch; no cierra el menú al alternar. */
function StyleToggle({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <DropdownMenuItem
      onSelect={(e) => e.preventDefault()}
      onClick={onToggle}
      className="flex items-center justify-between"
    >
      <span>{label}</span>
      <Switch checked={checked} className="pointer-events-none" />
    </DropdownMenuItem>
  );
}

function IconButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "text-ink-soft hover:bg-sidebar-hover flex size-7 items-center justify-center rounded-sm",
        active && "text-brand"
      )}
    >
      {children}
    </button>
  );
}

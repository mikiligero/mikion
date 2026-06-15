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
  Users,
  MessageSquare,
  MoreHorizontal,
  ChevronRight,
  Copy,
  Files,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ancestorChain, type TreeDoc } from "@/lib/tree";
import { toggleFavorite, moveToTrash } from "@/lib/actions/docs";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();
  // Guard de hidratación para next-themes (resolvedTheme solo es fiable tras montar).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const docId = pathname.startsWith("/p/") ? pathname.split("/")[2] : null;
  const doc = docId ? docs.find((d) => d.id === docId) ?? null : null;

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

        <button
          onClick={() => toast("Compartir · próximamente")}
          className="text-brand hover:bg-brand-tint ml-1 flex items-center gap-1.5 rounded-sm px-2 py-1 text-[13px] font-medium"
        >
          <Users className="size-4" /> Compartir
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="text-ink-soft hover:bg-sidebar-hover flex size-7 items-center justify-center rounded-sm"
              aria-label="Más"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onClick={() => window.dispatchEvent(new Event("mikion:templates"))}
            >
              <Files className="size-4" /> Plantillas
            </DropdownMenuItem>
            {doc && (
              <DropdownMenuItem onClick={() => toast("Duplicar · próximamente")}>
                <Copy className="size-4" /> Duplicar página
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={copyLink}>
              <Copy className="size-4" /> Copiar enlace
            </DropdownMenuItem>
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
    </header>
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

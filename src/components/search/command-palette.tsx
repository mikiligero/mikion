"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  FileText,
  Database,
  Calendar,
  Home,
  Inbox,
  Settings,
  Moon,
  Plus,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { createDoc } from "@/lib/actions/docs";
import {
  getPaletteItems,
  searchContent,
  type PaletteDoc,
  type PaletteRow,
  type ContentResult,
} from "@/lib/actions/search";

export const OPEN_COMMAND_EVENT = "mikion:command";

const includes = (text: string, q: string) =>
  text.toLowerCase().includes(q.toLowerCase());

// Renderiza el fragmento de ts_headline marcando en negrita las coincidencias
// (<b>…</b>), parseando el texto en vez de inyectar HTML.
function Snippet({ text }: { text: string }) {
  const parts = text.split(/<b>(.*?)<\/b>/g);
  return (
    <span className="text-ink-faint truncate text-xs">
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="text-ink-soft font-semibold">
            {p}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </span>
  );
}

function kindIcon(kind: string, emoji: string | null) {
  if (emoji) return <span className="text-base">{emoji}</span>;
  if (kind === "database") return <Database className="size-4" />;
  if (kind === "calendar") return <Calendar className="size-4" />;
  return <FileText className="size-4" />;
}

export function CommandPalette() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<PaletteDoc[]>([]);
  const [rows, setRows] = useState<PaletteRow[]>([]);
  const [content, setContent] = useState<ContentResult[]>([]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_EVENT, onOpen);
    };
  }, []);

  // Carga títulos al abrir (setState en callback async, no en el cuerpo).
  useEffect(() => {
    if (!open) return;
    getPaletteItems().then((data) => {
      setDocs(data.docs);
      setRows(data.rows);
    });
  }, [open]);

  // Búsqueda full-text de contenido (debounce). Solo consulta con ≥2 chars.
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) return;
    const t = setTimeout(() => {
      searchContent(q).then(setContent);
    }, 200);
    return () => clearTimeout(t);
  }, [query, open]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setContent([]);
    }
  }

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }
  function run(fn: () => void) {
    setOpen(false);
    fn();
  }

  const actions = useMemo(
    () => [
      {
        id: "new-page",
        label: "Nueva página",
        icon: <Plus className="size-4" />,
        run: () =>
          run(() =>
            startTransition(async () => {
              const { id } = await createDoc({ section: "team", kind: "page" });
              router.push(`/p/${id}`);
            })
          ),
      },
      {
        id: "new-db",
        label: "Nueva base de datos",
        icon: <Database className="size-4" />,
        run: () =>
          run(() =>
            startTransition(async () => {
              const { id } = await createDoc({ section: "team", kind: "database" });
              router.push(`/p/${id}`);
            })
          ),
      },
      { id: "home", label: "Ir a Inicio", icon: <Home className="size-4" />, run: () => go("/") },
      { id: "inbox", label: "Ir a Bandeja de entrada", icon: <Inbox className="size-4" />, run: () => go("/inbox") },
      { id: "settings", label: "Abrir Ajustes", icon: <Settings className="size-4" />, run: () => go("/settings") },
      {
        id: "templates",
        label: "Plantillas",
        icon: <FileText className="size-4" />,
        run: () => run(() => window.dispatchEvent(new Event("mikion:templates"))),
      },
      {
        id: "theme",
        label: "Cambiar tema",
        icon: <Moon className="size-4" />,
        run: () => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark")),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedTheme]
  );

  const fActions = actions.filter((a) => includes(a.label, query));
  const fDocs = docs.filter((d) => includes(d.title || "Sin título", query));
  const fRows = rows.filter((r) => includes(r.title, query));
  // Evita duplicar páginas ya listadas por título; solo con ≥2 chars.
  const titleIds = new Set(fDocs.map((d) => d.id));
  const fContent =
    query.trim().length >= 2
      ? content.filter((c) => !titleIds.has(c.id))
      : [];

  const empty =
    fActions.length === 0 &&
    fDocs.length === 0 &&
    fRows.length === 0 &&
    fContent.length === 0;

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange} title="Paleta de comandos">
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Buscar páginas, contenido, proyectos o acciones…"
        />
        <CommandList>
          {empty && <CommandEmpty>Sin resultados.</CommandEmpty>}

          {fActions.length > 0 && (
            <CommandGroup heading="Acciones">
              {fActions.map((a) => (
                <CommandItem key={a.id} value={a.id} onSelect={a.run}>
                  {a.icon} {a.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {fDocs.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Páginas">
                {fDocs.map((d) => (
                  <CommandItem key={d.id} value={d.id} onSelect={() => go(`/p/${d.id}`)}>
                    {kindIcon(d.kind, d.emoji)}
                    {d.title || "Sin título"}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {fContent.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="En el contenido">
                {fContent.map((c) => (
                  <CommandItem key={c.id} value={`c-${c.id}`} onSelect={() => go(`/p/${c.id}`)}>
                    {kindIcon(c.kind, c.emoji)}
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{c.title || "Sin título"}</span>
                      {c.snippet && <Snippet text={c.snippet} />}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {fRows.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Proyectos">
                {fRows.map((r) => (
                  <CommandItem key={r.id} value={`r-${r.id}`} onSelect={() => go(`/p/${r.docId}/${r.id}`)}>
                    <FileText className="size-4" /> {r.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

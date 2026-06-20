"use client";

import "@blocknote/shadcn/style.css";
import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  useCreateBlockNote,
  SuggestionMenuController,
  GridSuggestionMenuController,
  getDefaultReactEmojiPickerItems,
  FormattingToolbar,
  FormattingToolbarController,
  getFormattingToolbarItems,
  useComponentsContext,
  useBlockNoteEditor,
  type GridSuggestionMenuProps,
  type DefaultReactGridSuggestionItem,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { filterSuggestionItems, type PartialBlock } from "@blocknote/core";
import { MessageSquarePlus } from "lucide-react";
import { es } from "@blocknote/core/locales";
import {
  multiColumnDropCursor,
  locales as multiColumnLocales,
} from "@blocknote/xl-multi-column";
import type { Block } from "@/lib/types";
import { extractText } from "@/lib/blocknote-utils";
import { embedInfo } from "@/lib/embed";
import {
  buildExportHtml,
  buildExportMarkdown,
  type ExportMeta,
} from "@/lib/export-doc";
import { translateEmojiQuery } from "@/lib/emoji-es";
import { schema, getSlashItems, getMentionItems } from "./blocks";

/** Cuadrícula de emoji para el menú «:» en línea.
 *
 * Sustituye al componente por defecto de @blocknote/shadcn porque sus celdas no
 * llevan `onMouseDown preventDefault`: al hacer clic, el editor pierde el foco y
 * el menú se cierra (por el meta «blur» del plugin) ANTES de que se dispare el
 * `onClick`, así que el emoji nunca se inserta. Aquí lo prevenimos en la propia
 * celda, igual que hace el item normal del menú «/». */
function EmojiGridMenu(
  props: GridSuggestionMenuProps<DefaultReactGridSuggestionItem>
) {
  const { items, onItemClick, selectedIndex, columns } = props;
  return (
    <div
      className="bg-popover border-line max-h-[280px] overflow-y-auto rounded-lg border p-1.5 shadow-md"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 2rem)`,
      }}
    >
      {items.length === 0 ? (
        <div className="text-ink-faint col-span-full px-2 py-3 text-center text-sm">
          Sin resultados
        </div>
      ) : (
        items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onItemClick?.(item)}
            aria-selected={i === selectedIndex || undefined}
            className="hover:bg-sidebar-hover aria-selected:bg-sidebar-hover flex size-8 items-center justify-center rounded-md text-xl leading-none"
          >
            {item.icon as React.ReactNode}
          </button>
        ))
      )}
    </div>
  );
}

/** Botón "Comentar" en la barra de formato: ancla un comentario al bloque del
 * cursor (con el texto seleccionado, o el del bloque, como cita). Emite un
 * evento que el panel de comentarios escucha para abrirse pre-anclado. */
function CommentToolbarButton() {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      label="Comentar"
      mainTooltip="Comentar"
      onClick={() => {
        const block = editor.getTextCursorPosition().block;
        const selected = editor.getSelectedText().trim();
        const anchored =
          selected || extractText([block as unknown as Block]).slice(0, 200);
        window.dispatchEvent(
          new CustomEvent("mikion:comment-block", {
            detail: { blockId: block.id, text: anchored },
          })
        );
      }}
    >
      <MessageSquarePlus size={16} />
    </Components.FormattingToolbar.Button>
  );
}

/** Descarga un texto como archivo desde el navegador. */
function downloadFile(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Incrusta la imagen de portada como data URL para que el HTML/PDF sea
 * autónomo (como Notion). Si falla (p. ej. CORS), deja la URL absoluta. */
async function inlineCover(meta: ExportMeta): Promise<ExportMeta> {
  if (!meta.coverBg) return meta;
  const m = meta.coverBg.match(/url\("?([^")]+)"?\)/);
  if (!m) return meta; // gradiente: nada que incrustar
  const src = m[1];
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    return { ...meta, coverBg: meta.coverBg.replace(src, dataUrl) };
  } catch {
    const abs = new URL(src, window.location.origin).href;
    return { ...meta, coverBg: meta.coverBg.replace(src, abs) };
  }
}

/** Imprime un HTML autónomo en un iframe oculto (para "Exportar → PDF"). */
function printHtml(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  iframe.srcdoc = html;
  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) return;
    // Damos un margen para que la portada y demás imágenes terminen de cargar.
    setTimeout(() => {
      win.focus();
      win.print();
    }, 300);
    setTimeout(() => iframe.remove(), 60000);
  };
  document.body.appendChild(iframe);
}

export function BlockNoteEditor({
  initialContent,
  onSave,
  mentionUsers = [],
  pageDocId,
  editable = true,
  exportMeta,
}: {
  initialContent: Block[] | null;
  onSave: (blocks: Block[], text: string) => void;
  mentionUsers?: { id: string; name: string }[];
  pageDocId?: string;
  editable?: boolean;
  /** Metadatos para exportar (portada/icono/título/propiedades). El export se
   * dispara cuando el evento `mikion:export` trae `docId === exportMeta.id`. */
  exportMeta?: ExportMeta | null;
}) {
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  const editor = useCreateBlockNote({
    schema,
    dropCursor: multiColumnDropCursor,
    dictionary: {
      ...es,
      slash_menu: {
        ...es.slash_menu,
        check_list: {
          ...es.slash_menu.check_list,
          title: "Lista de Tareas",
          aliases: [
            ...es.slash_menu.check_list.aliases,
            "tareas",
            "lista de tareas",
            "tasks",
          ],
        },
      },
      multi_column: multiColumnLocales.es,
    },
    initialContent:
      initialContent && initialContent.length
        ? (initialContent as unknown as PartialBlock[])
        : undefined,
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mantenemos onSave en una ref para poder vaciar el guardado pendiente al
  // desmontar sin reejecutar el efecto en cada render (onSave es una flecha).
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const blocks = editor.document as unknown as Block[];
    onSaveRef.current(blocks, extractText(blocks));
  }, [editor]);

  const handleChange = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  }, [flush]);

  // Si el editor se desmonta (p. ej. al cerrar el panel lateral) con un cambio
  // pendiente del debounce, lo guardamos antes de irnos para no perderlo.
  useEffect(
    () => () => {
      if (timer.current) flush();
    },
    [flush]
  );

  // Exportar (HTML / Markdown / PDF) cuando la barra superior lo solicita.
  // Guardamos los metadatos en una ref para reflejar título/portada/propiedades
  // en vivo sin re-suscribir el listener en cada render.
  const exportMetaRef = useRef(exportMeta);
  useEffect(() => {
    exportMetaRef.current = exportMeta;
  }, [exportMeta]);
  useEffect(() => {
    async function onExport(e: Event) {
      const meta = exportMetaRef.current;
      if (!meta) return;
      const detail = (e as CustomEvent<{ docId: string; format: string }>)
        .detail;
      if (detail.docId !== meta.id) return;
      const name = meta.title?.trim() || "pagina";
      if (detail.format === "markdown") {
        const md = await editor.blocksToMarkdownLossy();
        downloadFile(`${name}.md`, "text/markdown", buildExportMarkdown(meta, md));
        return;
      }
      const inner = await editor.blocksToFullHTML();
      const html = buildExportHtml(await inlineCover(meta), inner);
      if (detail.format === "pdf") {
        printHtml(html);
        return;
      }
      downloadFile(`${name}.html`, "text/html", html);
    }
    window.addEventListener("mikion:export", onExport as EventListener);
    return () =>
      window.removeEventListener("mikion:export", onExport as EventListener);
  }, [editor]);

  // Pegar un enlace de proveedor conocido (YouTube, Spotify, Maps…) lo incrusta
  // directamente como bloque embed en vez de dejarlo como enlace.
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData("text/plain").trim();
      if (!text || /\s/.test(text)) return;
      const info = embedInfo(text);
      if (!info || info.kind !== "iframe") return;
      e.preventDefault();
      e.stopPropagation();
      const cur = editor.getTextCursorPosition().block;
      const empty =
        !cur.content || (Array.isArray(cur.content) && cur.content.length === 0);
      const block = { type: "embed" as const, props: { url: text } };
      if (cur.type === "paragraph" && empty) editor.updateBlock(cur, block);
      else editor.insertBlocks([block], cur, "after");
    },
    [editor]
  );

  return (
    <div onPasteCapture={handlePaste}>
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        onChange={handleChange}
        slashMenu={false}
        formattingToolbar={false}
        emojiPicker={false}
      >
        <FormattingToolbarController
          formattingToolbar={() => (
            <FormattingToolbar>
              <CommentToolbarButton />
              {getFormattingToolbarItems()}
            </FormattingToolbar>
          )}
        />
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={(query) =>
            getSlashItems(editor, query, pageDocId, (href) => router.push(href))
          }
        />
        {/* Emoji en línea: escribe «:» en cualquier sitio para elegir un icono.
         *  La consulta se traduce de español a inglés (el índice de emoji-mart
         *  sólo tiene palabras clave en inglés) y usamos una cuadrícula propia
         *  para que el clic con ratón inserte el emoji (ver EmojiGridMenu). */}
        <GridSuggestionMenuController
          triggerCharacter=":"
          columns={10}
          minQueryLength={2}
          getItems={async (query) => {
            // Primero en inglés (índice nativo de emoji-mart). Sólo si no hay
            // resultados probamos la traducción ES→EN, así el inglés sigue
            // funcionando y «fuego», «corazón»… también encuentran emoji.
            const direct = await getDefaultReactEmojiPickerItems(editor, query);
            if (direct.length > 0 || query.trim() === "") return direct;
            const translated = translateEmojiQuery(query);
            return translated === query
              ? direct
              : getDefaultReactEmojiPickerItems(editor, translated);
          }}
          gridSuggestionMenuComponent={EmojiGridMenu}
        />
        {mentionUsers.length > 0 && (
          <SuggestionMenuController
            triggerCharacter="@"
            getItems={async (query) =>
              filterSuggestionItems(getMentionItems(editor, mentionUsers), query)
            }
          />
        )}
      </BlockNoteView>
    </div>
  );
}

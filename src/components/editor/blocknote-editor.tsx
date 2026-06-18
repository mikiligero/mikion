"use client";

import "@blocknote/shadcn/style.css";
import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  useCreateBlockNote,
  SuggestionMenuController,
  FormattingToolbar,
  FormattingToolbarController,
  getFormattingToolbarItems,
  useComponentsContext,
  useBlockNoteEditor,
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
import { schema, getSlashItems, getMentionItems } from "./blocks";

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

export function BlockNoteEditor({
  initialContent,
  onSave,
  mentionUsers = [],
  pageDocId,
}: {
  initialContent: Block[] | null;
  onSave: (blocks: Block[], text: string) => void;
  mentionUsers?: { id: string; name: string }[];
  pageDocId?: string;
}) {
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  const editor = useCreateBlockNote({
    schema,
    dropCursor: multiColumnDropCursor,
    dictionary: { ...es, multi_column: multiColumnLocales.es },
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
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        onChange={handleChange}
        slashMenu={false}
        formattingToolbar={false}
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

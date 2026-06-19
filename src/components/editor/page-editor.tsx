"use client";

import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { ImagePlus, Smile } from "lucide-react";
import type { Block } from "@/lib/types";
import { coverBackground } from "@/lib/covers";
import { renameDoc, updateDocMeta, savePageContent } from "@/lib/actions/docs";
import type { Block as BlockType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmojiPickerPopover } from "./emoji-picker";
import { CoverPicker } from "./cover-picker";
import { CoverHeader } from "./cover-header";

const BlockNoteEditor = dynamic(
  () => import("./blocknote-editor").then((m) => m.BlockNoteEditor),
  {
    ssr: false,
    loading: () => (
      <p className="text-ink-faint px-1 py-4 text-sm">Cargando editor…</p>
    ),
  }
);

type Props = {
  doc: {
    id: string;
    emoji: string | null;
    title: string;
    cover: string | null;
    coverPosition: number;
    fullWidth: boolean;
  };
  initialContent: Block[] | null;
  mentionUsers?: { id: string; name: string }[];
  /** Doc compartido en modo lector: edición deshabilitada. */
  readOnly?: boolean;
};

export function PageEditor({ doc, initialContent, mentionUsers, readOnly = false }: Props) {
  const [emoji, setEmoji] = useState(doc.emoji);
  const [cover, setCover] = useState(doc.cover);
  const [coverPosition, setCoverPosition] = useState(doc.coverPosition ?? 50);
  const [title, setTitle] = useState(doc.title);
  const [, startTransition] = useTransition();

  const coverBg = coverBackground(cover, coverPosition);

  // Refleja el título en la pestaña del navegador al renombrar (sin recargar).
  useEffect(() => {
    document.title = `${title.trim() || "Sin título"} · Mikion`;
  }, [title]);

  function saveEmoji(next: string | null) {
    setEmoji(next);
    startTransition(() => updateDocMeta(doc.id, { emoji: next }));
  }
  function saveCover(next: string | null) {
    setCover(next);
    setCoverPosition(50);
    startTransition(() =>
      updateDocMeta(doc.id, { cover: next, coverPosition: 50 })
    );
  }
  function saveCoverPosition(next: number) {
    setCoverPosition(next);
    startTransition(() => updateDocMeta(doc.id, { coverPosition: next }));
  }
  function saveTitle() {
    if (title !== doc.title) startTransition(() => renameDoc(doc.id, title));
  }

  return (
    <div className="pb-32">
      {/* Portada */}
      <CoverHeader
        cover={cover}
        coverPosition={coverPosition}
        onCoverChange={saveCover}
        onPositionChange={saveCoverPosition}
      />

      <div
        className={cn(
          "page-w mx-auto",
          doc.fullWidth ? "max-w-none" : "max-w-3xl"
        )}
      >
        {/* Cabecera: alineada con el contenido del editor (padding 54px) */}
        <div className="px-[54px]">
          {/* Icono — por encima de la portada */}
          <div
            className={cn(
              "relative z-10 w-fit",
              emoji && coverBg ? "-mt-[52px]" : "pt-12"
            )}
          >
            {emoji ? (
              <EmojiPickerPopover
                onSelect={saveEmoji}
                trigger={
                  <button className="hover:bg-sidebar-hover inline-flex rounded-md p-1 text-[70px] leading-none">
                    {emoji}
                  </button>
                }
              />
            ) : null}
          </div>

          {/* Barra de añadir (icono / portada) */}
          <div className={cn(
            "mt-2 flex gap-3 text-sm opacity-0 transition-opacity hover:opacity-100 [&:has(+_*)]:opacity-100",
            readOnly && "hidden"
          )}>
            {!emoji && (
              <EmojiPickerPopover
                onSelect={saveEmoji}
                trigger={
                  <button className="text-ink-faint hover:text-ink-soft flex items-center gap-1.5">
                    <Smile className="size-4" /> Añadir icono
                  </button>
                }
              />
            )}
            {!coverBg && (
              <CoverPicker onPick={saveCover}>
                <button className="text-ink-faint hover:text-ink-soft flex items-center gap-1.5">
                  <ImagePlus className="size-4" /> Añadir portada
                </button>
              </CoverPicker>
            )}
          </div>

          {/* Título: una sola línea. El título nunca debe contener salto de
              línea — se ha visto duplicarse con un "\n" tras undo/redo
              nativo del navegador en el textarea, que puede desincronizar
              el value controlado de React del DOM real. Saneamos en cada
              cambio y bloqueamos Enter para no depender de ese caso. */}
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value.replace(/\r?\n/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            onBlur={saveTitle}
            readOnly={readOnly}
            rows={1}
            placeholder="Sin título"
            className="font-serif text-ink placeholder:text-ink-ghost mt-2 w-full resize-none border-none bg-transparent text-[42px] font-[560] leading-[1.12] tracking-[-0.018em] outline-none"
          />
        </div>

        {/* Editor (su propio padding 54px aloja los controles + ⠿) */}
        <div className="mt-2">
          <BlockNoteEditor
            initialContent={initialContent}
            mentionUsers={mentionUsers}
            pageDocId={doc.id}
            editable={!readOnly}
            onSave={(blocks: BlockType[], text: string) =>
              void savePageContent(doc.id, blocks, text)
            }
          />
        </div>
      </div>
    </div>
  );
}

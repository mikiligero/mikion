"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { ImagePlus, Smile, X, RefreshCw } from "lucide-react";
import type { Block } from "@/lib/types";
import { coverBackground } from "@/lib/covers";
import { renameDoc, updateDocMeta, savePageContent } from "@/lib/actions/docs";
import type { Block as BlockType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmojiPickerPopover } from "./emoji-picker";
import { CoverPicker } from "./cover-picker";

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
    fullWidth: boolean;
  };
  initialContent: Block[] | null;
  mentionUsers?: { id: string; name: string }[];
};

export function PageEditor({ doc, initialContent, mentionUsers }: Props) {
  const [emoji, setEmoji] = useState(doc.emoji);
  const [cover, setCover] = useState(doc.cover);
  const [title, setTitle] = useState(doc.title);
  const [, startTransition] = useTransition();

  const coverBg = coverBackground(cover);

  function saveEmoji(next: string | null) {
    setEmoji(next);
    startTransition(() => updateDocMeta(doc.id, { emoji: next }));
  }
  function saveCover(next: string | null) {
    setCover(next);
    startTransition(() => updateDocMeta(doc.id, { cover: next }));
  }
  function saveTitle() {
    if (title !== doc.title) startTransition(() => renameDoc(doc.id, title));
  }

  return (
    <div className="pb-32">
      {/* Portada */}
      {coverBg && (
        <div
          className="group/cover relative h-[200px] w-full"
          style={{ background: coverBg }}
        >
          <div className="absolute bottom-3 right-4 flex gap-1.5 opacity-0 transition-opacity group-hover/cover:opacity-100">
            <CoverPicker onPick={saveCover}>
              <button className="bg-surface/85 text-ink-soft hover:bg-surface flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium shadow-sm backdrop-blur">
                <RefreshCw className="size-3.5" /> Cambiar portada
              </button>
            </CoverPicker>
            <button
              onClick={() => saveCover(null)}
              className="bg-surface/85 text-ink-soft hover:bg-surface flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium shadow-sm backdrop-blur"
            >
              <X className="size-3.5" /> Quitar
            </button>
          </div>
        </div>
      )}

      <div
        className={cn(
          "page-w mx-auto",
          doc.fullWidth ? "max-w-none" : "max-w-3xl"
        )}
      >
        {/* Cabecera: alineada con el contenido del editor (padding 54px) */}
        <div className="px-[54px]">
          {/* Icono — por encima de la portada */}
          <div className={cn("relative z-10", coverBg ? "-mt-[52px]" : "pt-12")}>
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
          <div className="mt-2 flex gap-3 text-sm opacity-0 transition-opacity hover:opacity-100 [&:has(+_*)]:opacity-100">
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

          {/* Título */}
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
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
            onSave={(blocks: BlockType[], text: string) =>
              void savePageContent(doc.id, blocks, text)
            }
          />
        </div>
      </div>
    </div>
  );
}

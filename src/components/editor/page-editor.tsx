"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { ImagePlus, Smile, X, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import type { Block } from "@/lib/types";
import { COVER_KEYS, COVERS, IMAGE_COVERS, coverBackground } from "@/lib/covers";
import { renameDoc, updateDocMeta, savePageContent } from "@/lib/actions/docs";
import type { Block as BlockType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmojiPickerPopover } from "./emoji-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
};

export function PageEditor({ doc, initialContent }: Props) {
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
            <CoverMenu onPick={saveCover}>
              <button className="bg-surface/85 text-ink-soft hover:bg-surface flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium shadow-sm backdrop-blur">
                <RefreshCw className="size-3.5" /> Cambiar portada
              </button>
            </CoverMenu>
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
          "page-w mx-auto px-12",
          doc.fullWidth ? "max-w-none" : "max-w-3xl"
        )}
      >
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
            <CoverMenu onPick={saveCover}>
              <button className="text-ink-faint hover:text-ink-soft flex items-center gap-1.5">
                <ImagePlus className="size-4" /> Añadir portada
              </button>
            </CoverMenu>
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

        {/* Editor */}
        <div className="mt-2">
          <BlockNoteEditor
            initialContent={initialContent}
            onSave={(blocks: BlockType[], text: string) =>
              void savePageContent(doc.id, blocks, text)
            }
          />
        </div>
      </div>
    </div>
  );
}

function CoverMenu({
  onPick,
  children,
}: {
  onPick: (cover: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/files", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.url) {
        onPick(data.url);
        setOpen(false);
      } else {
        toast.error(data.error ?? "No se pudo subir la imagen");
      }
    } catch {
      toast.error("No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <label className="border-line text-ink-soft hover:bg-sidebar-hover mb-3 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed py-2 text-sm">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          <Upload className="size-4" />
          {uploading ? "Subiendo…" : "Subir imagen"}
        </label>
        <p className="text-ink-faint mb-2 text-xs font-medium">Imágenes</p>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {IMAGE_COVERS.map((img) => (
            <button
              key={img.url}
              onClick={() => {
                onPick(img.url);
                setOpen(false);
              }}
              className="border-line h-12 overflow-hidden rounded-md border bg-cover bg-center"
              style={{ backgroundImage: `url("${img.url}")` }}
              aria-label={img.label}
              title={img.label}
            />
          ))}
        </div>
        <p className="text-ink-faint mb-2 text-xs font-medium">Gradientes</p>
        <div className="grid grid-cols-4 gap-2">
          {COVER_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => {
                onPick(key);
                setOpen(false);
              }}
              className="border-line h-10 rounded-md border"
              style={{ background: COVERS[key] }}
              aria-label={key}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

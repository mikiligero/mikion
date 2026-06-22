"use client";

import { useEffect, useState } from "react";
import { Database, FileText, Calendar } from "lucide-react";
import type { BlockNoteEditor } from "@blocknote/core";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { listInsertableDocs, type InsertableDoc } from "@/lib/actions/docs";

export const INSERT_EXISTING_EVENT = "mikion:insert-existing";

/** Modo de inserción del selector de elementos existentes. */
export type InsertMode = "page" | "db-inline" | "db-link";

type InsertDetail = {
  mode: InsertMode;
  /** Bloque donde insertar (el párrafo del «/»). */
  blockId: string;
  /** Doc actual, para no ofrecer enlazarse a sí mismo. */
  excludeId?: string | null;
};

const TITLES: Record<InsertMode, string> = {
  page: "Enlazar una página",
  "db-inline": "Incrustar una base de datos",
  "db-link": "Enlazar una base de datos",
};

function icon(doc: InsertableDoc) {
  if (doc.emoji) return <span className="text-base">{doc.emoji}</span>;
  if (doc.kind === "database") return <Database className="size-4" />;
  if (doc.kind === "calendar") return <Calendar className="size-4" />;
  return <FileText className="size-4" />;
}

/** Selector (estilo paleta) para insertar una página o base de datos YA
 * existente en el editor. Se abre con el evento `mikion:insert-existing` que
 * lanzan los ítems del menú «/». Según el modo inserta un chip `pageLink`
 * (enlace, no mueve nada) o un bloque `inlineDatabase` (vista incrustada). */
export function InsertExistingDialog({
  editor,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<InsertDetail | null>(null);
  const [docs, setDocs] = useState<InsertableDoc[]>([]);

  useEffect(() => {
    function onOpen(e: Event) {
      const d = (e as CustomEvent<InsertDetail>).detail;
      setDetail(d);
      setOpen(true);
      listInsertableDocs()
        .then(setDocs)
        .catch(() => setDocs([]));
    }
    window.addEventListener(INSERT_EXISTING_EVENT, onOpen as EventListener);
    return () =>
      window.removeEventListener(INSERT_EXISTING_EVENT, onOpen as EventListener);
  }, []);

  if (!detail) return null;

  const wantsDatabase = detail.mode !== "page";
  const items = docs.filter(
    (d) =>
      d.id !== detail.excludeId &&
      (wantsDatabase ? d.kind === "database" : d.kind === "page")
  );

  function insert(doc: InsertableDoc) {
    if (!detail) return;
    const blockId = detail.blockId;

    if (detail.mode === "db-inline") {
      if (!doc.databaseId) return;
      const block = editor.getBlock(blockId);
      const isEmptyPara =
        block &&
        block.type === "paragraph" &&
        (!block.content ||
          (Array.isArray(block.content) && block.content.length === 0));
      const newBlock = {
        type: "inlineDatabase",
        props: { databaseId: doc.databaseId },
      };
      if (isEmptyPara) editor.updateBlock(block, newBlock);
      else editor.insertBlocks([newBlock], blockId, "after");
    } else {
      // Enlace a página o a BD: chip `pageLink` en línea.
      try {
        editor.setTextCursorPosition(blockId, "end");
      } catch {
        // El bloque pudo desaparecer; insertamos en el cursor actual.
      }
      editor.insertInlineContent([
        {
          type: "pageLink",
          props: { docId: doc.id, title: doc.title ?? "", emoji: doc.emoji ?? "" },
        },
        " ",
      ]);
    }

    setOpen(false);
    editor.focus();
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title={TITLES[detail.mode]}>
      <Command>
        <CommandInput placeholder={`${TITLES[detail.mode]}…`} />
        <CommandList>
          <CommandEmpty>
            {wantsDatabase ? "No hay bases de datos." : "No hay páginas."}
          </CommandEmpty>
          <CommandGroup heading={wantsDatabase ? "Bases de datos" : "Páginas"}>
            {items.map((doc) => (
              <CommandItem
                key={doc.id}
                value={`${doc.title} ${doc.id}`}
                onSelect={() => insert(doc)}
                className="gap-2"
              >
                {icon(doc)}
                <span className="truncate">{doc.title || "Sin título"}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

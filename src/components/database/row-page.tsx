"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { History, Smile } from "lucide-react";
import type { DatabaseSchema, PropertyValue, PropertyValues, Block } from "@/lib/types";
import { titleProperty } from "@/lib/database-utils";
import { coverBackground } from "@/lib/covers";
import {
  updateCell,
  updateProperty,
  saveRowContent,
  setRowEmoji,
} from "@/lib/actions/databases";
import { randomSelectColor, isSystemProperty } from "@/lib/types";
import type { PropertyDef } from "@/lib/types";
import { PropertyCell, systemFieldValue } from "./property-cell";
import { randomId } from "@/lib/utils";
import { propertyIcon } from "./property-icon";
import { EmojiPickerPopover } from "@/components/editor/emoji-picker";
import { VersionHistoryDialog } from "@/components/editor/version-history";

const BlockNoteEditor = dynamic(
  () => import("@/components/editor/blocknote-editor").then((m) => m.BlockNoteEditor),
  {
    ssr: false,
    loading: () => (
      <p className="text-ink-faint px-1 py-4 text-sm">Cargando editor…</p>
    ),
  }
);

export function RowPage({
  databaseId,
  schema,
  row,
  mentionUsers,
}: {
  databaseId: string;
  schema: DatabaseSchema;
  row: {
    id: string;
    emoji: string | null;
    values: PropertyValues | null;
    cover: string | null;
    blocks: Block[] | null;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
  };
  mentionUsers?: { id: string; name: string }[];
}) {
  const [, startTransition] = useTransition();
  const userName = mentionUsers?.[0]?.name;
  const tp = titleProperty(schema);
  const [title, setTitle] = useState(
    tp && typeof row.values?.[tp.id] === "string"
      ? (row.values[tp.id] as string)
      : ""
  );
  const [emoji, setEmoji] = useState(row.emoji);
  const coverBg = coverBackground(row.cover);

  function saveEmoji(next: string) {
    setEmoji(next);
    startTransition(() => setRowEmoji(row.id, next));
  }
  const otherProps = schema.properties.filter((p) => p.type !== "title");
  const [showVersions, setShowVersions] = useState(false);

  function setCell(propertyId: string, value: PropertyValue) {
    startTransition(() => updateCell(row.id, propertyId, value));
  }

  async function addOption(propertyId: string, name: string): Promise<string> {
    const prop = schema.properties.find((p) => p.id === propertyId);
    const opt = { id: randomId(), name, color: randomSelectColor() };
    await updateProperty(databaseId, propertyId, {
      options: [...(prop?.options ?? []), opt],
    });
    return opt.id;
  }

  function patchProperty(propertyId: string, patch: Partial<PropertyDef>) {
    startTransition(() => updateProperty(databaseId, propertyId, patch));
  }

  return (
    <div className="pb-32">
      {coverBg && <div className="h-[180px] w-full" style={{ background: coverBg }} />}

      <div className="page-w mx-auto max-w-3xl pt-10">
        <div className="px-[54px]">
        <div className="flex justify-end">
          <button
            onClick={() => setShowVersions(true)}
            className="text-ink-faint hover:bg-sidebar-hover flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs"
          >
            <History className="size-3.5" /> Historial
          </button>
        </div>
        {/* Icono/emoji de la fila */}
        {emoji ? (
          <EmojiPickerPopover
            onSelect={saveEmoji}
            trigger={
              <button className="hover:bg-sidebar-hover -ml-1 inline-flex rounded-md p-1 text-[60px] leading-none">
                {emoji}
              </button>
            }
          />
        ) : (
          <EmojiPickerPopover
            onSelect={saveEmoji}
            trigger={
              <button className="text-ink-faint hover:text-ink-soft mt-1 flex items-center gap-1.5 text-sm">
                <Smile className="size-4" /> Añadir icono
              </button>
            }
          />
        )}

        {/* Título */}
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => tp && setCell(tp.id, title)}
          rows={1}
          placeholder="Sin título"
          className="font-serif text-ink placeholder:text-ink-ghost mt-1 w-full resize-none border-none bg-transparent text-[40px] font-[560] leading-[1.12] tracking-[-0.018em] outline-none"
        />

        {/* Propiedades (cabecera tipo callout) */}
        <div className="border-line bg-sidebar/40 mt-4 space-y-1 rounded-lg border p-3">
          {otherProps.map((prop) => (
            <div key={prop.id} className="flex items-center gap-2 text-sm">
              <div className="text-ink-faint flex w-40 shrink-0 items-center gap-1.5">
                {propertyIcon(prop.type)}
                <span className="truncate">{prop.name}</span>
              </div>
              <div className="min-w-0 flex-1">
                <PropertyCell
                  property={prop}
                  value={
                    isSystemProperty(prop.type)
                      ? systemFieldValue(prop, row, { userName })
                      : (row.values?.[prop.id] ?? null)
                  }
                  onChange={(v) => setCell(prop.id, v)}
                  onAddOption={
                    prop.type === "select" ||
                    prop.type === "status" ||
                    prop.type === "multiselect"
                      ? (name) => addOption(prop.id, name)
                      : undefined
                  }
                  onPropertyPatch={
                    prop.type === "date"
                      ? (patch) => patchProperty(prop.id, patch)
                      : undefined
                  }
                />
              </div>
            </div>
          ))}
        </div>
        </div>

        {/* Contenido de la fila (su propio padding 54px) */}
        <div className="mt-4">
          <BlockNoteEditor
            initialContent={row.blocks}
            mentionUsers={mentionUsers}
            onSave={(blocks) => void saveRowContent(row.id, blocks)}
          />
        </div>
      </div>

      <VersionHistoryDialog
        target={{ rowId: row.id }}
        open={showVersions}
        onOpenChange={setShowVersions}
      />
    </div>
  );
}

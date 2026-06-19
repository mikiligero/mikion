"use client";

import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Maximize2, X } from "lucide-react";
import type { Row } from "@/db/schema";
import type {
  DatabaseSchema,
  Block,
  PropertyValues,
  SelectOption,
} from "@/lib/types";
import { RowPage } from "./row-page";

export function RowSidePeek({
  open,
  onOpenChange,
  databaseId,
  schema,
  row,
  docId,
  mentionUsers,
  people,
  readOnly = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  databaseId: string;
  schema: DatabaseSchema;
  row: Row | null;
  docId: string;
  mentionUsers?: { id: string; name: string }[];
  people?: SelectOption[];
  readOnly?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/10 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          className="bg-paper ring-foreground/10 fixed inset-y-0 right-0 z-50 flex w-full max-w-[720px] flex-col shadow-xl ring-1 outline-none data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">
            Editar fila
          </DialogPrimitive.Title>
          {/* Barra superior */}
          <div className="border-line flex items-center gap-1 border-b px-3 py-2">
            {row && (
              <Link
                href={`/p/${docId}/${row.id}`}
                className="text-ink-faint hover:bg-sidebar-hover flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs"
              >
                <Maximize2 className="size-3.5" /> Abrir como página
              </Link>
            )}
            <DialogPrimitive.Close className="text-ink-faint hover:bg-sidebar-hover ml-auto flex size-7 items-center justify-center rounded-sm">
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Contenido de la fila */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {row && (
              <RowPage
                key={row.id}
                databaseId={databaseId}
                schema={schema}
                row={{
                  id: row.id,
                  emoji: row.emoji,
                  values: row.values as PropertyValues | null,
                  cover: row.cover,
                  coverPosition: row.coverPosition,
                  blocks: row.blocks as Block[] | null,
                  createdAt: row.createdAt,
                  updatedAt: row.updatedAt,
                }}
                mentionUsers={mentionUsers}
                hideCover
                people={people}
                readOnly={readOnly}
              />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

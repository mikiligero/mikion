"use client";

import { useState } from "react";
import { EmojiPicker } from "frimousse";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function EmojiPickerPopover({
  trigger,
  onSelect,
}: {
  trigger: React.ReactNode;
  onSelect: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-[296px] p-0">
        <EmojiPicker.Root
          locale="es"
          onEmojiSelect={({ emoji }) => {
            onSelect(emoji);
            setOpen(false);
          }}
          className="isolate flex h-[320px] flex-col bg-popover"
        >
          <EmojiPicker.Search
            placeholder="Buscar emoji…"
            className="border-line bg-surface text-ink mx-2 mt-2 rounded-md border px-2.5 py-1.5 text-sm outline-none"
          />
          <EmojiPicker.Viewport className="relative flex-1 overflow-y-auto p-2">
            <EmojiPicker.Loading className="text-ink-faint absolute inset-0 grid place-items-center text-sm">
              Cargando…
            </EmojiPicker.Loading>
            <EmojiPicker.Empty className="text-ink-faint absolute inset-0 grid place-items-center text-sm">
              Sin emojis
            </EmojiPicker.Empty>
            <EmojiPicker.List
              className="select-none"
              components={{
                CategoryHeader: ({ category, ...props }) => (
                  <div
                    className="bg-popover text-ink-faint px-1 pb-1 pt-2 text-xs font-medium"
                    {...props}
                  >
                    {category.label}
                  </div>
                ),
                Row: ({ children, ...props }) => (
                  <div className="flex" {...props}>
                    {children}
                  </div>
                ),
                Emoji: ({ emoji, ...props }) => (
                  <button
                    className="hover:bg-sidebar-hover flex size-8 items-center justify-center rounded-md text-xl"
                    {...props}
                  >
                    {emoji.emoji}
                  </button>
                ),
              }}
            />
          </EmojiPicker.Viewport>
        </EmojiPicker.Root>
      </PopoverContent>
    </Popover>
  );
}

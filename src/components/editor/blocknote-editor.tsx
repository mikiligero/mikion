"use client";

import "@blocknote/shadcn/style.css";
import { useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import type { PartialBlock } from "@blocknote/core";
import type { Block } from "@/lib/types";
import { extractText } from "@/lib/blocknote-utils";

export function BlockNoteEditor({
  initialContent,
  onSave,
}: {
  initialContent: Block[] | null;
  onSave: (blocks: Block[], text: string) => void;
}) {
  const { resolvedTheme } = useTheme();

  const editor = useCreateBlockNote({
    initialContent:
      initialContent && initialContent.length
        ? (initialContent as unknown as PartialBlock[])
        : undefined,
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const blocks = editor.document as unknown as Block[];
      onSave(blocks, extractText(blocks));
    }, 600);
  }, [editor, onSave]);

  return (
    <BlockNoteView
      editor={editor}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      onChange={handleChange}
    />
  );
}

import type { Block } from "@/lib/types";

// Extrae texto plano del documento BlockNote para la búsqueda full-text.
// Recorre el contenido inline de cada bloque y sus hijos.
export function extractText(blocks: Block[] | null | undefined): string {
  if (!blocks?.length) return "";
  const out: string[] = [];

  const walkInline = (content: unknown) => {
    if (!Array.isArray(content)) return;
    for (const node of content) {
      if (node && typeof node === "object") {
        const n = node as { type?: string; text?: string; content?: unknown };
        if (typeof n.text === "string") out.push(n.text);
        else if (n.content) walkInline(n.content);
      }
    }
  };

  const walk = (list: Block[]) => {
    for (const block of list) {
      walkInline(block.content);
      if (block.children?.length) walk(block.children);
    }
  };

  walk(blocks);
  return out.join(" ").replace(/\s+/g, " ").trim();
}

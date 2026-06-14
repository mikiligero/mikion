import { describe, it, expect } from "vitest";
import { extractText } from "@/lib/blocknote-utils";
import type { Block } from "@/lib/types";

describe("extractText", () => {
  it("vacío / null → cadena vacía", () => {
    expect(extractText(null)).toBe("");
    expect(extractText([])).toBe("");
    expect(extractText(undefined)).toBe("");
  });

  it("extrae texto inline de bloques", () => {
    const blocks: Block[] = [
      { type: "paragraph", content: [{ type: "text", text: "Hola" }] },
      {
        type: "heading",
        content: [
          { type: "text", text: "mundo" },
          { type: "text", text: "!" },
        ],
      },
    ];
    expect(extractText(blocks)).toBe("Hola mundo !");
  });

  it("recorre hijos anidados", () => {
    const blocks: Block[] = [
      {
        type: "toggle",
        content: [{ type: "text", text: "padre" }],
        children: [
          { type: "paragraph", content: [{ type: "text", text: "hijo" }] },
        ],
      },
    ];
    expect(extractText(blocks)).toBe("padre hijo");
  });

  it("ignora bloques sin texto y normaliza espacios", () => {
    const blocks: Block[] = [
      { type: "image", content: undefined },
      { type: "paragraph", content: [{ type: "text", text: "  a   b  " }] },
    ];
    expect(extractText(blocks)).toBe("a b");
  });

  it("desciende por content anidado (links con content)", () => {
    const blocks: Block[] = [
      {
        type: "paragraph",
        content: [
          { type: "link", content: [{ type: "text", text: "enlace" }] },
        ],
      },
    ];
    expect(extractText(blocks)).toBe("enlace");
  });
});

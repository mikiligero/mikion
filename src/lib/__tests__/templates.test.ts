import { describe, it, expect } from "vitest";
import { TEMPLATES, TEMPLATE_CATEGORIES } from "@/lib/templates";

describe("plantillas", () => {
  it("hay 6 plantillas con ids únicos", () => {
    expect(TEMPLATES).toHaveLength(6);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(6);
  });

  it("todas las categorías declaradas se usan y son válidas", () => {
    const used = new Set(TEMPLATES.map((t) => t.category));
    for (const c of TEMPLATE_CATEGORIES) expect(used.has(c)).toBe(true);
    for (const t of TEMPLATES) expect(TEMPLATE_CATEGORIES).toContain(t.category);
  });

  it("build() produce bloques válidos (con type) y emoji", () => {
    for (const t of TEMPLATES) {
      const { title, emoji, blocks } = t.build();
      expect(typeof title).toBe("string");
      expect(emoji).toBeTruthy();
      expect(blocks.length).toBeGreaterThan(0);
      for (const b of blocks) {
        expect(typeof b.type).toBe("string");
        expect((b.type as string).length).toBeGreaterThan(0);
      }
    }
  });

  it("la plantilla en blanco tiene título vacío y un solo bloque", () => {
    const blank = TEMPLATES.find((t) => t.id === "blank")!.build();
    expect(blank.title).toBe("");
    expect(blank.blocks).toHaveLength(1);
  });
});

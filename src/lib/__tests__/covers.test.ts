import { describe, it, expect } from "vitest";
import { coverBackground, COVERS, COVER_KEYS } from "@/lib/covers";

describe("COVERS", () => {
  it("tiene las 8 portadas del prototipo", () => {
    expect(COVER_KEYS).toHaveLength(8);
    expect(COVER_KEYS).toContain("clay");
    expect(COVER_KEYS).toContain("night");
  });
});

describe("coverBackground", () => {
  it("null → null", () => {
    expect(coverBackground(null)).toBeNull();
  });

  it("clave de gradiente → su gradiente", () => {
    expect(coverBackground("clay")).toBe(COVERS.clay);
  });

  it("URL http → imagen de fondo", () => {
    expect(coverBackground("https://x.com/a.jpg")).toBe(
      'url("https://x.com/a.jpg") center/cover no-repeat'
    );
  });

  it("ruta /uploads → imagen de fondo", () => {
    expect(coverBackground("/uploads/a.png")).toBe(
      'url("/uploads/a.png") center/cover no-repeat'
    );
  });

  it("gradiente literal se devuelve tal cual", () => {
    const g = "linear-gradient(120deg, #fff 0%, #000 100%)";
    expect(coverBackground(g)).toBe(g);
  });
});

import { describe, it, expect } from "vitest";
import {
  clampCoverPosition,
  coverBackground,
  COVERS,
  COVER_KEYS,
} from "@/lib/covers";

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
      'url("https://x.com/a.jpg") center 50% / cover no-repeat'
    );
  });

  it("ruta /uploads → imagen de fondo", () => {
    expect(coverBackground("/uploads/a.png", 24)).toBe(
      'url("/uploads/a.png") center 24% / cover no-repeat'
    );
  });

  it("gradiente literal se devuelve tal cual", () => {
    const g = "linear-gradient(120deg, #fff 0%, #000 100%)";
    expect(coverBackground(g)).toBe(g);
  });
});

describe("clampCoverPosition", () => {
  it("mantiene la posición entre 0 y 100", () => {
    expect(clampCoverPosition(-20)).toBe(0);
    expect(clampCoverPosition(42.4)).toBe(42);
    expect(clampCoverPosition(120)).toBe(100);
    expect(clampCoverPosition(null)).toBe(50);
  });
});

import { describe, it, expect } from "vitest";
import { prefixTsQuery, leadTrim } from "@/lib/search-utils";

describe("prefixTsQuery", () => {
  it("convierte cada término en prefijo unido por &", () => {
    expect(prefixTsQuery("hola mundo")).toBe("hola:* & mundo:*");
  });

  it("minúsculas y conserva la ñ (unaccent va en Postgres)", () => {
    expect(prefixTsQuery("Señor")).toBe("señor:*");
  });

  it("saneа puntuación y símbolos", () => {
    expect(prefixTsQuery("a, b!  c.")).toBe("a:* & b:* & c:*");
  });

  it("solo espacios/símbolos → null", () => {
    expect(prefixTsQuery("   ")).toBeNull();
    expect(prefixTsQuery("!!! ???")).toBeNull();
  });
});

describe("leadTrim", () => {
  it("sin marca <b> lo devuelve igual", () => {
    expect(leadTrim("texto sin marca")).toBe("texto sin marca");
  });

  it("con la marca al inicio no recorta", () => {
    expect(leadTrim("<b>match</b> y más")).toBe("<b>match</b> y más");
  });

  it("recorta el contexto previo largo dejando ~3 palabras y …", () => {
    const s = "uno dos tres cuatro cinco seis <b>match</b> final";
    expect(leadTrim(s)).toBe("… cuatro cinco seis <b>match</b> final");
  });

  it("contexto previo corto (≤4 palabras) no se recorta", () => {
    const s = "uno dos tres <b>match</b> final";
    expect(leadTrim(s)).toBe(s);
  });
});

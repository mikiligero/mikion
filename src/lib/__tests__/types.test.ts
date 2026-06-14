import { describe, it, expect } from "vitest";
import {
  PROPERTY_TYPES,
  SELECT_COLOR_KEYS,
  randomSelectColor,
} from "@/lib/types";

describe("PROPERTY_TYPES", () => {
  it("define los 12 tipos de propiedad", () => {
    expect(PROPERTY_TYPES).toHaveLength(13); // title + 12 tipos de dato
    const values = PROPERTY_TYPES.map((t) => t.value);
    for (const t of [
      "title",
      "text",
      "number",
      "select",
      "multiselect",
      "status",
      "person",
      "date",
      "checkbox",
      "url",
      "formula",
      "relation",
      "rollup",
    ]) {
      expect(values).toContain(t);
    }
  });
});

describe("randomSelectColor", () => {
  it("siempre devuelve una clave de color válida", () => {
    for (let i = 0; i < 50; i++) {
      expect(SELECT_COLOR_KEYS).toContain(randomSelectColor());
    }
  });
});

import { describe, it, expect } from "vitest";
import {
  PROPERTY_TYPES,
  SELECT_COLOR_KEYS,
  randomSelectColor,
} from "@/lib/types";

describe("PROPERTY_TYPES", () => {
  it("incluye los tipos base, los nuevos y los de sistema", () => {
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
      "phone",
      "email",
      "id",
      "formula",
      "relation",
      "rollup",
      "createdTime",
      "lastEditedTime",
      "createdBy",
      "lastEditedBy",
    ]) {
      expect(values).toContain(t);
    }
    // sin duplicados
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("randomSelectColor", () => {
  it("siempre devuelve una clave de color válida", () => {
    for (let i = 0; i < 50; i++) {
      expect(SELECT_COLOR_KEYS).toContain(randomSelectColor());
    }
  });
});

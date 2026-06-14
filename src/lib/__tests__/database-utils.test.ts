import { describe, it, expect } from "vitest";
import type { DatabaseSchema } from "@/lib/types";
import {
  defaultDatabaseSchema,
  newPropertyDef,
  titleProperty,
  getRowTitle,
  TITLE_PROPERTY_ID,
} from "@/lib/database-utils";

describe("defaultDatabaseSchema", () => {
  it("crea Nombre (title) + Estado (status con 3 opciones)", () => {
    const s = defaultDatabaseSchema();
    expect(s.properties[0]).toMatchObject({ id: TITLE_PROPERTY_ID, type: "title" });
    const status = s.properties.find((p) => p.type === "status");
    expect(status?.options).toHaveLength(3);
    // ids de opción únicos
    const ids = status!.options!.map((o) => o.id);
    expect(new Set(ids).size).toBe(3);
  });
});

describe("newPropertyDef", () => {
  it("genera id y nombre por defecto según tipo", () => {
    const p = newPropertyDef("number");
    expect(p.type).toBe("number");
    expect(p.id).toBeTruthy();
    expect(p.name).toBe("Número");
    expect(p.options).toBeUndefined();
  });

  it("inicializa options para select/status/multiselect", () => {
    expect(newPropertyDef("select").options).toEqual([]);
    expect(newPropertyDef("status").options).toEqual([]);
    expect(newPropertyDef("multiselect").options).toEqual([]);
  });
});

describe("titleProperty / getRowTitle", () => {
  const schema: DatabaseSchema = {
    properties: [
      { id: "title", name: "Nombre", type: "title" },
      { id: "x", name: "Otra", type: "text" },
    ],
  };

  it("titleProperty devuelve la de tipo title", () => {
    expect(titleProperty(schema)?.id).toBe("title");
  });

  it("getRowTitle devuelve el valor del título o 'Sin título'", () => {
    expect(getRowTitle({ title: "Hola" }, schema)).toBe("Hola");
    expect(getRowTitle({ title: "" }, schema)).toBe("Sin título");
    expect(getRowTitle({}, schema)).toBe("Sin título");
    expect(getRowTitle(null, schema)).toBe("Sin título");
  });

  it("titleProperty cae a la primera si no hay tipo title", () => {
    const s: DatabaseSchema = {
      properties: [{ id: "a", name: "A", type: "text" }],
    };
    expect(titleProperty(s)?.id).toBe("a");
  });
});

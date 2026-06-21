import { describe, it, expect } from "vitest";
import type { Row } from "@/db/schema";
import type { DatabaseSchema, PropertyValues } from "@/lib/types";
import {
  findProperty,
  findOption,
  visibleProperties,
  applyView,
  groupRows,
} from "@/lib/database-view";

const schema: DatabaseSchema = {
  properties: [
    { id: "title", name: "Nombre", type: "title" },
    {
      id: "status",
      name: "Estado",
      type: "status",
      options: [
        { id: "todo", name: "Por hacer", color: "gray" },
        { id: "doing", name: "En curso", color: "blue" },
        { id: "done", name: "Hecho", color: "green" },
      ],
    },
    { id: "num", name: "Número", type: "number" },
    { id: "chk", name: "Listo", type: "checkbox" },
  ],
};

function row(id: string, values: PropertyValues, orderKey = "a0"): Row {
  return {
    id,
    databaseId: "db",
    emoji: null,
    values,
    blocks: null,
    cover: null,
    coverPosition: 50,
    coverZoom: 100,
    orderKey,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const rows: Row[] = [
  row("r1", { title: "Beta", status: "doing", num: 3, chk: true }, "a0"),
  row("r2", { title: "Alfa", status: "todo", num: 1, chk: false }, "a1"),
  row("r3", { title: "Gamma", status: "done", num: 2, chk: true }, "a2"),
];

describe("findProperty / findOption", () => {
  it("encuentra propiedad por id", () => {
    expect(findProperty(schema, "status")?.name).toBe("Estado");
    expect(findProperty(schema, "nope")).toBeUndefined();
  });
  it("encuentra opción por id", () => {
    const status = findProperty(schema, "status");
    expect(findOption(status, "done")?.name).toBe("Hecho");
    expect(findOption(status, 123)).toBeUndefined();
    expect(findOption(undefined, "done")).toBeUndefined();
  });
});

describe("visibleProperties", () => {
  it("respeta hiddenProperties y propertyOrder", () => {
    const props = visibleProperties(schema, {
      filters: [],
      sorts: [],
      hiddenProperties: ["num"],
      propertyOrder: ["status", "title"],
    });
    expect(props.map((p) => p.id)).toEqual(["status", "title", "chk"]);
  });

  it("sin config devuelve todas en orden de esquema", () => {
    const props = visibleProperties(schema, { filters: [], sorts: [] });
    expect(props.map((p) => p.id)).toEqual(["title", "status", "num", "chk"]);
  });
});

describe("applyView · filtros", () => {
  it("filtra select/status por conjunto de opciones (multi)", () => {
    const out = applyView(rows, schema, {
      filters: [{ propertyId: "status", operator: "equals", value: ["doing", "done"] }],
      sorts: [],
    });
    expect(out.map((r) => r.id).sort()).toEqual(["r1", "r3"]);
  });

  it("filtro select vacío no filtra", () => {
    const out = applyView(rows, schema, {
      filters: [{ propertyId: "status", operator: "equals", value: [] }],
      sorts: [],
    });
    expect(out).toHaveLength(3);
  });

  it("filtra checkbox marcado / no marcado", () => {
    expect(
      applyView(rows, schema, {
        filters: [{ propertyId: "chk", operator: "isChecked" }],
        sorts: [],
      }).map((r) => r.id).sort()
    ).toEqual(["r1", "r3"]);
    expect(
      applyView(rows, schema, {
        filters: [{ propertyId: "chk", operator: "isNotChecked" }],
        sorts: [],
      }).map((r) => r.id)
    ).toEqual(["r2"]);
  });

  it("filtra texto por 'contains'", () => {
    const out = applyView(rows, schema, {
      filters: [{ propertyId: "title", operator: "contains", value: "a" }],
      sorts: [],
    });
    // "Beta", "Alfa", "Gamma" contienen 'a' (insensible a mayúsculas)
    expect(out).toHaveLength(3);
  });
});

describe("applyView · orden", () => {
  it("ordena por número asc/desc", () => {
    expect(
      applyView(rows, schema, {
        filters: [],
        sorts: [{ propertyId: "num", direction: "asc" }],
      }).map((r) => r.id)
    ).toEqual(["r2", "r3", "r1"]);
    expect(
      applyView(rows, schema, {
        filters: [],
        sorts: [{ propertyId: "num", direction: "desc" }],
      }).map((r) => r.id)
    ).toEqual(["r1", "r3", "r2"]);
  });

  it("ordena select por nombre de opción", () => {
    // En curso < Hecho < Por hacer (alfabético)
    expect(
      applyView(rows, schema, {
        filters: [],
        sorts: [{ propertyId: "status", direction: "asc" }],
      }).map((r) => r.id)
    ).toEqual(["r1", "r3", "r2"]);
  });
});

describe("groupRows", () => {
  it("agrupa por status en orden de opciones + 'Sin asignar'", () => {
    const groups = groupRows(rows, schema, "status");
    expect(groups.map((g) => g.id)).toEqual(["todo", "doing", "done", null]);
    expect(groups.find((g) => g.id === "doing")?.rows.map((r) => r.id)).toEqual(["r1"]);
    expect(groups[groups.length - 1].label).toBe("Sin asignar");
  });

  it("mete las filas sin valor en el grupo null", () => {
    const extra = [...rows, row("r4", { title: "Sin estado" }, "a3")];
    const groups = groupRows(extra, schema, "status");
    expect(groups.find((g) => g.id === null)?.rows.map((r) => r.id)).toEqual(["r4"]);
  });

  it("conserva el orden de entrada dentro de cada grupo (respeta la ordenación)", () => {
    // Tres filas 'doing' que llegan en orden b, a, c (p. ej. ya ordenadas por
    // applyView, no por orderKey) deben salir en ese mismo orden.
    const sorted = [
      row("b", { title: "B", status: "doing" }, "a2"),
      row("a", { title: "A", status: "doing" }, "a0"),
      row("c", { title: "C", status: "doing" }, "a1"),
    ];
    const groups = groupRows(sorted, schema, "status");
    expect(groups.find((g) => g.id === "doing")?.rows.map((r) => r.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });
});

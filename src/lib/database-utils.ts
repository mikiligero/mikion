import type {
  DatabaseSchema,
  PropertyDef,
  PropertyType,
  PropertyValues,
  SelectOption,
} from "@/lib/types";

export const TITLE_PROPERTY_ID = "title";

function opt(name: string, color: string): SelectOption {
  return { id: crypto.randomUUID(), name, color };
}

/** Schema inicial de una BD nueva: Nombre (título) + Estado. */
export function defaultDatabaseSchema(): DatabaseSchema {
  return {
    properties: [
      { id: TITLE_PROPERTY_ID, name: "Nombre", type: "title" },
      {
        id: crypto.randomUUID(),
        name: "Estado",
        type: "status",
        options: [
          opt("Por hacer", "gray"),
          opt("En curso", "blue"),
          opt("Hecho", "green"),
        ],
      },
    ],
  };
}

const DEFAULT_NAMES: Record<PropertyType, string> = {
  title: "Título",
  text: "Texto",
  number: "Número",
  select: "Selección",
  multiselect: "Multiselección",
  status: "Estado",
  person: "Persona",
  date: "Fecha",
  checkbox: "Casilla",
  url: "URL",
  formula: "Fórmula",
  relation: "Relación",
  rollup: "Rollup",
};

/** Nueva definición de propiedad de un tipo dado. */
export function newPropertyDef(type: PropertyType): PropertyDef {
  const def: PropertyDef = {
    id: crypto.randomUUID(),
    name: DEFAULT_NAMES[type],
    type,
  };
  if (type === "select" || type === "multiselect" || type === "status") {
    def.options = [];
  }
  return def;
}

export function titleProperty(schema: DatabaseSchema): PropertyDef | undefined {
  return (
    schema.properties.find((p) => p.type === "title") ?? schema.properties[0]
  );
}

/** Título legible de una fila (valor de su propiedad title). */
export function getRowTitle(
  values: PropertyValues | null,
  schema: DatabaseSchema
): string {
  const tp = titleProperty(schema);
  const v = tp ? values?.[tp.id] : null;
  return typeof v === "string" && v.trim() ? v : "Sin título";
}

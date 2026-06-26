import type {
  DatabaseSchema,
  PropertyDef,
  PropertyType,
  PropertyValues,
  SelectOption,
} from "@/lib/types";

export const TITLE_PROPERTY_ID = "title";

function opt(
  name: string,
  color: string,
  group?: SelectOption["group"]
): SelectOption {
  return { id: crypto.randomUUID(), name, color, ...(group ? { group } : {}) };
}

/** Schema inicial de una BD nueva: Nombre (título) + Estado. */
export function defaultDatabaseSchema(): DatabaseSchema {
  const todo = opt("Por hacer", "gray", "todo");
  const status: PropertyDef = {
    id: crypto.randomUUID(),
    name: "Estado",
    type: "status",
    options: [
      todo,
      opt("En curso", "blue", "inProgress"),
      opt("Hecho", "green", "done"),
    ],
    defaultOptionId: todo.id,
  };
  return {
    properties: [
      { id: TITLE_PROPERTY_ID, name: "Nombre", type: "title" },
      status,
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
  priority: "Prioridad",
  ambito: "Ámbito",
  person: "Persona",
  date: "Fecha",
  checkbox: "Casilla",
  url: "URL",
  phone: "Teléfono",
  email: "Correo electrónico",
  id: "ID",
  place: "Lugar",
  formula: "Fórmula",
  relation: "Relación",
  page: "Enlace a página",
  createdTime: "Fecha de creación",
  lastEditedTime: "Última edición",
  createdBy: "Creado por",
  lastEditedBy: "Última edición por",
};

/** Nueva definición de propiedad de un tipo dado. */
export function newPropertyDef(type: PropertyType): PropertyDef {
  const def: PropertyDef = {
    id: crypto.randomUUID(),
    name: DEFAULT_NAMES[type],
    type,
  };
  if (
    type === "select" ||
    type === "multiselect" ||
    type === "status" ||
    type === "ambito"
  ) {
    def.options = [];
  }
  // Prioridad: se siembra con la escala estándar para que sea útil al instante
  // (cada opción ya mapea a su nivel, base del filtro de avisos).
  if (type === "priority") {
    def.options = [
      opt("Baja", "blue", "low"),
      opt("Media", "amber", "medium"),
      opt("Alta", "orange", "high"),
      opt("Urgente", "red", "urgent"),
    ];
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

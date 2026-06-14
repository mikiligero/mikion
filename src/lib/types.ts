// Tipos compartidos del dominio Mikion (esquema de bases de datos, vistas,
// contenido del editor). Son la fuente de verdad para las columnas jsonb.

// --- Contenido del editor (BlockNote) -------------------------------------
// Estructura laxa: el JSON real lo define BlockNote. Lo tipamos lo justo para
// almacenarlo y extraer texto, sin acoplar el server a la librería cliente.
export type Block = {
  id?: string;
  type?: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: Block[];
};

// --- Preferencias ----------------------------------------------------------
export type ThemePref = "light" | "dark";
export type FontPref = "default" | "serif" | "mono";

// --- Esquema de base de datos (12 tipos de propiedad) ---------------------
export type PropertyType =
  | "title"
  | "text"
  | "number"
  | "select"
  | "multiselect"
  | "status"
  | "person"
  | "date"
  | "checkbox"
  | "url"
  | "formula"
  | "relation"
  | "rollup";

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "title", label: "Título" },
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "select", label: "Selección" },
  { value: "multiselect", label: "Selección múltiple" },
  { value: "status", label: "Estado" },
  { value: "person", label: "Persona" },
  { value: "date", label: "Fecha" },
  { value: "checkbox", label: "Casilla" },
  { value: "url", label: "URL" },
  { value: "formula", label: "Fórmula" },
  { value: "relation", label: "Relación" },
  { value: "rollup", label: "Rollup" },
];

export type FormulaKind = "daysLeft" | "overdue" | "priorityScore" | "done";

export type RollupFn = "count" | "sum" | "min" | "max";

export type RollupConfig = {
  relationPropertyId: string; // propiedad de tipo relation de esta BD
  targetPropertyId?: string; // propiedad de la BD relacionada a agregar
  fn: RollupFn;
};

export type SelectOption = {
  id: string;
  name: string;
  color: string; // clave de tint: green/blue/amber/purple/rose/teal/gray
};

export type PropertyDef = {
  id: string;
  name: string;
  type: PropertyType;
  options?: SelectOption[]; // select / multiselect / status
  formula?: FormulaKind; // type === "formula"
  relationDatabaseId?: string; // type === "relation"
  rollup?: RollupConfig; // type === "rollup"
};

export type DatabaseSchema = {
  properties: PropertyDef[];
};

// Valor de una propiedad en una fila. Según el tipo:
// title/text/url: string · number: number · select/status: id de opción ·
// multiselect: ids · person: id(s) usuario · date: ISO · checkbox: boolean ·
// relation: ids de filas · formula/rollup: calculados (no se persisten)
export type PropertyValue = string | number | boolean | string[] | null;
export type PropertyValues = Record<string, PropertyValue>;

// --- Vistas ----------------------------------------------------------------
export type ViewType = "table" | "board" | "calendar" | "timeline" | "chart";

export type FilterOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "isEmpty"
  | "isNotEmpty"
  | "greaterThan"
  | "lessThan"
  | "isChecked"
  | "isNotChecked"
  | "before"
  | "after";

export type Filter = {
  propertyId: string;
  operator: FilterOperator;
  value?: PropertyValue;
};

export type Sort = {
  propertyId: string;
  direction: "asc" | "desc";
};

export type ViewConfig = {
  filters: Filter[];
  sorts: Sort[];
  groupBy?: string; // propiedad select/status/person (board / agrupación)
  hiddenProperties?: string[];
  propertyOrder?: string[];
  chartType?: "bar" | "donut"; // type === "chart"
  chartGroupBy?: string;
};

// --- Colores de opciones (mapean a tints del tema) ------------------------
export const SELECT_COLOR_KEYS = [
  "green",
  "blue",
  "amber",
  "purple",
  "rose",
  "teal",
  "gray",
] as const;

export function randomSelectColor(): string {
  return SELECT_COLOR_KEYS[Math.floor(Math.random() * SELECT_COLOR_KEYS.length)];
}

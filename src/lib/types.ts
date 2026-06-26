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

// --- Esquema de base de datos (tipos de propiedad) ------------------------
export type PropertyType =
  | "title"
  | "text"
  | "number"
  | "select"
  | "multiselect"
  | "status"
  | "priority"
  | "ambito"
  | "person"
  | "date"
  | "checkbox"
  | "url"
  | "phone"
  | "email"
  | "id"
  | "place"
  | "formula"
  | "relation"
  | "page"
  | "createdTime"
  | "lastEditedTime"
  | "createdBy"
  | "lastEditedBy";

// Tipos de sistema: solo lectura, su valor se deriva de la fila (no de `values`).
export const SYSTEM_PROPERTY_TYPES: PropertyType[] = [
  "id",
  "createdTime",
  "lastEditedTime",
  "createdBy",
  "lastEditedBy",
];

export function isSystemProperty(type: PropertyType): boolean {
  return SYSTEM_PROPERTY_TYPES.includes(type);
}

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "title", label: "Título" },
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "select", label: "Selección" },
  { value: "multiselect", label: "Selección múltiple" },
  { value: "status", label: "Estado" },
  { value: "priority", label: "Prioridad" },
  { value: "ambito", label: "Ámbito" },
  { value: "person", label: "Persona" },
  { value: "date", label: "Fecha" },
  { value: "checkbox", label: "Casilla" },
  { value: "url", label: "URL" },
  { value: "phone", label: "Teléfono" },
  { value: "email", label: "Correo electrónico" },
  { value: "id", label: "ID" },
  { value: "place", label: "Lugar" },
  { value: "formula", label: "Fórmula" },
  { value: "relation", label: "Relación" },
  { value: "page", label: "Enlace a página" },
  { value: "createdTime", label: "Fecha de creación" },
  { value: "lastEditedTime", label: "Última edición" },
  { value: "createdBy", label: "Creado por" },
  { value: "lastEditedBy", label: "Última edición por" },
];

export type FormulaKind = "daysLeft" | "overdue" | "priorityScore" | "done";

// Valor de una propiedad de tipo "place" (se guarda como JSON en el valor).
export type PlaceValue = {
  name: string;
  address?: string;
  lat?: number;
  lon?: number;
};

// Grupos de un estado (como Notion: Pendiente / En progreso / Completado).
export type StatusGroup = "todo" | "inProgress" | "done";

export const STATUS_GROUPS: { value: StatusGroup; label: string }[] = [
  { value: "todo", label: "Pendiente" },
  { value: "inProgress", label: "En progreso" },
  { value: "done", label: "Completado" },
];

// Niveles de prioridad (estandarizados, para poder filtrar igual en toda BD).
export type PriorityGroup = "low" | "medium" | "high" | "urgent";

export const PRIORITY_GROUPS: { value: PriorityGroup; label: string }[] = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

/** Grupos disponibles para una propiedad con grupos (status / priority). */
export function groupsForType(
  type: PropertyType
): { value: StatusGroup | PriorityGroup; label: string }[] {
  if (type === "priority") return PRIORITY_GROUPS;
  if (type === "status") return STATUS_GROUPS;
  return [];
}

/** ¿La propiedad clasifica sus opciones en grupos (status / priority)? */
export function hasOptionGroups(type: PropertyType): boolean {
  return type === "status" || type === "priority";
}

export type SelectOption = {
  id: string;
  name: string;
  color: string; // clave de SELECT_COLORS (ver abajo); legacy: teal
  group?: StatusGroup | PriorityGroup; // status: grupo de estado · priority: nivel
  isUser?: boolean; // solo persona: vinculada a una cuenta (no borrable a mano)
};

// Formato de presentación de una propiedad de fecha.
export type DateFormat = "full" | "short" | "relative";

export const DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: "full", label: "Fecha completa" },
  { value: "short", label: "Día y mes" },
  { value: "relative", label: "Relativa" },
];

export type PropertyDef = {
  id: string;
  name: string;
  type: PropertyType;
  options?: SelectOption[]; // select / multiselect / status
  defaultOptionId?: string; // select / status: valor al crear fila
  formula?: FormulaKind; // type === "formula"
  relationDatabaseId?: string; // type === "relation"
  includeTime?: boolean; // type === "date": guardar/mostrar la hora
  dateRange?: boolean; // type === "date": rango (valor = [inicio, fin])
  dateFormat?: DateFormat; // type === "date": formato de presentación
  reminder?: string; // type === "date": recordatorio (solo UI, sin disparo)
};

export type DatabaseSchema = {
  properties: PropertyDef[];
};

// Plantilla de fila: valores + contenido por defecto al crear una fila nueva.
export type DbTemplate = {
  id: string;
  name: string;
  emoji?: string | null;
  values: PropertyValues;
  blocks?: Block[] | null;
  /** Se aplica automáticamente al crear una fila nueva («Nueva fila»). Solo una
   * plantilla por BD puede ser la predeterminada. */
  isDefault?: boolean;
  /** Rellena el título de la nueva fila con la fecha de hoy (DD/MM/AAAA). */
  titleFromDate?: boolean;
};

// Valor de una propiedad en una fila. Según el tipo:
// title/text/url: string · number: number · select/status: id de opción ·
// multiselect: ids · person: id(s) usuario · date: ISO · checkbox: boolean ·
// place: JSON PlaceValue · relation: ids de filas · formula: calculado
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

// Cálculo al pie de una columna (vista tabla).
export type CalcType =
  | "count"
  | "countNotEmpty"
  | "countEmpty"
  | "percentNotEmpty"
  | "percentEmpty"
  | "countUnique"
  | "sum"
  | "average"
  | "min"
  | "max"
  | "median"
  | "range";

export type ViewConfig = {
  filters: Filter[];
  sorts: Sort[];
  groupBy?: string; // propiedad select/status/person (board / agrupación)
  hiddenProperties?: string[];
  propertyOrder?: string[];
  datePropertyId?: string; // propiedad de fecha (vista calendario / cronograma)
  chartType?: "bar" | "donut"; // type === "chart"
  chartGroupBy?: string;
  calculations?: Record<string, CalcType>; // propertyId → cálculo al pie (tabla)
  colorBy?: string; // propiedad select/status que tiñe la fila (tabla)
};

// --- Colores de opciones (mapean a tints del tema) ------------------------
// --- Automatizaciones (por base de datos) ---------------------------------
export type AutomationTrigger =
  | "status_done"
  | "item_added"
  | "due_2days"
  | "priority_changed"
  | "assignee_set"
  | "due_passed";

export type AutomationAction =
  | "set_end_date"
  | "assign_me"
  | "slack_reminder"
  | "status_review"
  | "notify_assignee"
  | "create_subtask";

export type Automation = {
  id: string;
  when: AutomationTrigger;
  then: AutomationAction;
  enabled: boolean;
};

export const AUTOMATION_TRIGGERS: { value: AutomationTrigger; label: string }[] = [
  { value: "status_done", label: "El estado cambia a «Hecho»" },
  { value: "item_added", label: "Se añade un elemento" },
  { value: "due_2days", label: "La entrega es en 2 días" },
  { value: "priority_changed", label: "Cambia la prioridad" },
  { value: "assignee_set", label: "Se asigna un responsable" },
  { value: "due_passed", label: "Pasa la fecha de entrega" },
];

export const AUTOMATION_ACTIONS: { value: AutomationAction; label: string }[] = [
  { value: "set_end_date", label: "Marcar la fecha de fin con hoy" },
  { value: "assign_me", label: "Autoasignarme" },
  { value: "slack_reminder", label: "Enviar recordatorio a Slack" },
  { value: "status_review", label: "Cambiar estado a «En revisión»" },
  { value: "notify_assignee", label: "Notificar al responsable" },
  { value: "create_subtask", label: "Crear subtarea" },
];

// Paleta de opciones (select / multiselect / status). La `key` es la clave de
// tint CSS (`var(--tint-<key>)` / `-bg`); `label` el nombre mostrado.
export const SELECT_COLORS: { key: string; label: string }[] = [
  { key: "default", label: "Predeterminado" },
  { key: "gray", label: "Gris" },
  { key: "brown", label: "Marrón" },
  { key: "orange", label: "Naranja" },
  { key: "amber", label: "Amarillo" },
  { key: "green", label: "Verde" },
  { key: "blue", label: "Azul" },
  { key: "purple", label: "Morado" },
  { key: "rose", label: "Rosa" },
  { key: "red", label: "Rojo" },
];

// Claves válidas para una opción. Incluye `teal` (legacy) para que las opciones
// guardadas antes sigan pintando aunque ya no esté en el selector.
export const SELECT_COLOR_KEYS = [
  ...SELECT_COLORS.map((c) => c.key),
  "teal",
] as const;

export function selectColorLabel(key: string): string {
  return SELECT_COLORS.find((c) => c.key === key)?.label ?? key;
}

export function randomSelectColor(): string {
  // Evita el neutro "default" al crear opciones nuevas.
  const pool = SELECT_COLORS.filter((c) => c.key !== "default");
  return pool[Math.floor(Math.random() * pool.length)].key;
}

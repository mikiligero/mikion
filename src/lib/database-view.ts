import type { Row } from "@/db/schema";
import type {
  CalcType,
  DatabaseSchema,
  Filter,
  PropertyDef,
  PropertyValue,
  Sort,
  SelectOption,
  ViewConfig,
} from "@/lib/types";

export function findProperty(
  schema: DatabaseSchema,
  id: string
): PropertyDef | undefined {
  return schema.properties.find((p) => p.id === id);
}

export function findOption(
  prop: PropertyDef | undefined,
  id: unknown
): SelectOption | undefined {
  if (!prop?.options || typeof id !== "string") return undefined;
  return prop.options.find((o) => o.id === id);
}

/** Propiedades visibles, en el orden configurado. */
export function visibleProperties(
  schema: DatabaseSchema,
  config: ViewConfig
): PropertyDef[] {
  const hidden = new Set(config.hiddenProperties ?? []);
  const order = config.propertyOrder ?? [];
  const byId = new Map(schema.properties.map((p) => [p.id, p]));
  const ordered: PropertyDef[] = [];
  for (const id of order) {
    const p = byId.get(id);
    if (p) {
      ordered.push(p);
      byId.delete(id);
    }
  }
  // Propiedades no listadas en el orden van detrás (en orden de esquema).
  for (const p of schema.properties) if (byId.has(p.id)) ordered.push(p);
  return ordered.filter((p) => !hidden.has(p.id));
}

function matchesFilter(row: Row, schema: DatabaseSchema, f: Filter): boolean {
  const prop = findProperty(schema, f.propertyId);
  if (!prop) return true;
  const v = row.values?.[f.propertyId] ?? null;

  switch (prop.type) {
    case "select":
    case "status": {
      // value = array de ids de opción seleccionados (multi-check).
      const allowed = Array.isArray(f.value) ? f.value : [];
      if (allowed.length === 0) return true;
      return typeof v === "string" && allowed.includes(v);
    }
    case "checkbox":
      return f.operator === "isNotChecked" ? !v : !!v;
    default: {
      // contains genérico sobre texto.
      const needle = typeof f.value === "string" ? f.value.toLowerCase() : "";
      if (!needle) return true;
      return String(v ?? "").toLowerCase().includes(needle);
    }
  }
}

function sortValue(row: Row, schema: DatabaseSchema, s: Sort): string | number {
  const prop = findProperty(schema, s.propertyId);
  const v = row.values?.[s.propertyId] ?? null;
  if (!prop) return "";
  if (prop.type === "number") return typeof v === "number" ? v : -Infinity;
  if (prop.type === "checkbox") return v ? 1 : 0;
  if (prop.type === "select" || prop.type === "status") {
    return findOption(prop, v)?.name ?? "";
  }
  return typeof v === "string" ? v.toLowerCase() : "";
}

/** Aplica filtros y ordenación de la vista a las filas. */
export function applyView(
  rows: Row[],
  schema: DatabaseSchema,
  config: ViewConfig
): Row[] {
  let out = rows.filter((r) =>
    (config.filters ?? []).every((f) => matchesFilter(r, schema, f))
  );
  for (const s of [...(config.sorts ?? [])].reverse()) {
    out = out.slice().sort((a, b) => {
      const av = sortValue(a, schema, s);
      const bv = sortValue(b, schema, s);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return s.direction === "desc" ? -cmp : cmp;
    });
  }
  return out;
}

export type RowGroup = {
  id: string | null; // id de opción, o null = sin asignar
  option: SelectOption | null;
  label: string;
  rows: Row[];
};

/** Agrupa filas por una propiedad select/status. */
export function groupRows(
  rows: Row[],
  schema: DatabaseSchema,
  groupPropertyId: string
): RowGroup[] {
  const prop = findProperty(schema, groupPropertyId);
  const options = prop?.options ?? [];
  const byOption = new Map<string | null, Row[]>();
  byOption.set(null, []);
  for (const o of options) byOption.set(o.id, []);

  for (const row of rows) {
    const v = row.values?.[groupPropertyId];
    const key = typeof v === "string" && byOption.has(v) ? v : null;
    byOption.get(key)!.push(row);
  }

  const sortByOrder = (a: Row, b: Row) =>
    a.orderKey < b.orderKey ? -1 : a.orderKey > b.orderKey ? 1 : 0;

  const groups: RowGroup[] = options.map((o) => ({
    id: o.id,
    option: o,
    label: o.name,
    rows: (byOption.get(o.id) ?? []).slice().sort(sortByOrder),
  }));
  groups.push({
    id: null,
    option: null,
    label: "Sin asignar",
    rows: (byOption.get(null) ?? []).slice().sort(sortByOrder),
  });
  return groups;
}

// --- Cálculos al pie de columna -------------------------------------------
/** Etiquetas de cada tipo de cálculo (para el menú y el pie). */
export const CALC_LABELS: Record<CalcType, string> = {
  count: "Contar todo",
  countNotEmpty: "Rellenos",
  countEmpty: "Vacíos",
  percentNotEmpty: "% rellenos",
  percentEmpty: "% vacíos",
  countUnique: "Valores únicos",
  sum: "Suma",
  average: "Media",
  min: "Mínimo",
  max: "Máximo",
  median: "Mediana",
  range: "Rango",
};

/** Cálculos numéricos: solo aplican a propiedades de tipo number. */
export const NUMERIC_CALCS: CalcType[] = [
  "sum",
  "average",
  "min",
  "max",
  "median",
  "range",
];

/** Cálculos disponibles para una propiedad según su tipo. */
export function calcsForProperty(prop: PropertyDef): CalcType[] {
  const common: CalcType[] = [
    "count",
    "countNotEmpty",
    "countEmpty",
    "percentNotEmpty",
    "percentEmpty",
    "countUnique",
  ];
  return prop.type === "number" ? [...common, ...NUMERIC_CALCS] : common;
}

function isEmptyValue(v: PropertyValue): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function fmtNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Calcula el valor de pie de una columna sobre las filas dadas. */
export function computeCalc(
  type: CalcType,
  prop: PropertyDef,
  rows: Row[]
): string {
  const values = rows.map((r) => r.values?.[prop.id] ?? null);
  const total = rows.length;
  const notEmpty = values.filter((v) => !isEmptyValue(v));
  const empty = total - notEmpty.length;

  switch (type) {
    case "count":
      return String(total);
    case "countNotEmpty":
      return String(notEmpty.length);
    case "countEmpty":
      return String(empty);
    case "percentNotEmpty":
      return total ? `${Math.round((notEmpty.length / total) * 100)}%` : "0%";
    case "percentEmpty":
      return total ? `${Math.round((empty / total) * 100)}%` : "0%";
    case "countUnique":
      return String(
        new Set(notEmpty.map((v) => JSON.stringify(v))).size
      );
    default:
      break;
  }

  // Cálculos numéricos.
  const nums = notEmpty
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((n) => Number.isFinite(n));
  if (nums.length === 0) return "—";
  switch (type) {
    case "sum":
      return fmtNumber(nums.reduce((a, b) => a + b, 0));
    case "average":
      return fmtNumber(nums.reduce((a, b) => a + b, 0) / nums.length);
    case "min":
      return fmtNumber(Math.min(...nums));
    case "max":
      return fmtNumber(Math.max(...nums));
    case "range":
      return fmtNumber(Math.max(...nums) - Math.min(...nums));
    case "median": {
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return fmtNumber(
        sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
      );
    }
    default:
      return "—";
  }
}

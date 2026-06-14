import type { Row } from "@/db/schema";
import type {
  DatabaseSchema,
  Filter,
  PropertyDef,
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

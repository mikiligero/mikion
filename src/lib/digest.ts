// Lógica PURA de los resúmenes de tareas («digest»). Sin acceso a BD (el runner
// que toca Postgres está en digest-runner.ts), para poder testearla.
//
// Cada aviso elige uno o varios TRAMOS según la fecha de la tarea (relativos a
// hoy): retrasados (< hoy), hoy, mañana, y «próximos 10 días» (hoy+2 … hoy+11).
// Zona horaria de referencia: Europe/Madrid.

import { isoDay, MONTHS, WEEKDAYS } from "@/lib/calendar-utils";
import type { DatabaseSchema, PropertyDef } from "@/lib/types";

// Tramos seleccionables en un aviso.
export type Bucket = "overdue" | "today" | "tomorrow" | "week";

export const BUCKETS: { value: Bucket; label: string }[] = [
  { value: "overdue", label: "Retrasados" },
  { value: "today", label: "Hoy" },
  { value: "tomorrow", label: "Mañana" },
  { value: "week", label: "Próximos 10 días" },
];

export type DigestItem = {
  title: string;
  dbTitle: string;
  dayISO: string;
  statusName?: string;
  ambito?: string; // nombre de la opción de la columna «Ámbito», si existe
  href?: string; // ruta a la fila (/p/{docId}/{rowId}) → tarea como enlace
  done: boolean;
};
type DigestGroup = { dayISO: string; label: string; items: DigestItem[] };
// groups: tareas de los tramos, agrupadas por día. oldest: las «más antiguas»
// añadidas (que NO entran por tramo), en su propia sección.
export type Digest = {
  total: number;
  groups: DigestGroup[];
  oldest: DigestItem[];
};

/**
 * ¿Los valores de una fila referencian a `personId` en alguna de las propiedades
 * de tipo persona indicadas? Esas propiedades guardan un `string[]` de ids de
 * persona. Se usa para filtrar el digest de una BD compartida a las tareas
 * asignadas al destinatario.
 */
export function rowAssignedTo(
  values: Record<string, unknown> | null | undefined,
  personPropIds: string[],
  personId: string
): boolean {
  for (const pid of personPropIds) {
    const v = values?.[pid];
    if (Array.isArray(v) && (v as unknown[]).includes(personId)) return true;
  }
  return false;
}

/** Filtro de ESTADO (lenient): vacío = sin filtro; una tarea sin grupo de estado
 * (sin propiedad o sin valor) NO se descarta, para no perder tareas con el estado
 * sin fijar. */
export function passesStatusFilter(
  group: string | undefined,
  allowed: string[]
): boolean {
  if (allowed.length === 0) return true;
  if (group === undefined) return true;
  return allowed.includes(group);
}

/** Filtro de IMPACTO (estricto): vacío = sin filtro; si se piden niveles, solo
 * pasan las tareas con un impacto de esos niveles. Sin impacto (sin propiedad
 * o sin valor) NO es «importante» → se descarta. */
export function passesImpactFilter(
  group: string | undefined,
  allowed: string[]
): boolean {
  if (allowed.length === 0) return true;
  return group !== undefined && allowed.includes(group);
}

/** Filtro de ESFUERZO (estricto): vacío = sin filtro; si se piden niveles, solo
 * pasan las tareas con un esfuerzo de esos niveles. Sin esfuerzo → fuera. */
export function passesEffortFilter(
  group: string | undefined,
  allowed: string[]
): boolean {
  if (allowed.length === 0) return true;
  return group !== undefined && allowed.includes(group);
}

/** Filtro de ÁMBITO (estricto, por nombre de opción): vacío = sin filtro; si se
 * piden ámbitos, solo pasan las tareas con esa opción. Sin ámbito → fuera. */
export function passesAmbitoFilter(
  name: string | undefined,
  allowed: string[]
): boolean {
  if (allowed.length === 0) return true;
  return name !== undefined && allowed.includes(name);
}

/** Normaliza un nombre (sin acentos, minúsculas) para casar «Ámbito»/«ambito». */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Propiedad de Ámbito de un esquema: por tipo «ambito», o (compat) una
 * selección llamada «Ámbito». Devuelve undefined si no hay ninguna. */
export function ambitoProperty(
  schema: DatabaseSchema
): PropertyDef | undefined {
  return (
    schema.properties.find((p) => p.type === "ambito") ??
    schema.properties.find(
      (p) => p.type === "select" && normalizeName(p.name) === "ambito"
    )
  );
}

/** Fecha de hoy en Europe/Madrid como "YYYY-MM-DD". */
export function madridToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Hora actual en Europe/Madrid como "HH:MM" (24h). */
export function madridTime(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

/** Día de la semana (lun=0 … dom=6) de un día ISO. */
export function weekdayMon0OfISO(dayISO: string): number {
  return weekdayMon0(dayISO);
}

/** Datos de un aviso necesarios para decidir el envío. */
export type RuleSchedule = {
  enabled: boolean;
  /** "HH:MM" (pasos de 30 min). */
  time: string;
  /** Días en que aplica (lun=0 … dom=6). */
  days: number[];
  /** Último día enviado ("YYYY-MM-DD"), para no duplicar. */
  lastSentDate: string | null;
};

/** ¿Toca disparar este aviso ahora? Se lanza en el primer tic a partir de la
 * hora, una sola vez al día, y solo en los días marcados. */
export function shouldSendRule(
  cfg: RuleSchedule,
  nowHHMM: string,
  todayISO: string
): boolean {
  if (!cfg.enabled) return false;
  if (!cfg.days.includes(weekdayMon0(todayISO))) return false;
  if (cfg.lastSentDate === todayISO) return false; // ya enviado hoy
  return nowHHMM >= cfg.time;
}

/** Opciones de hora en pasos de 30 min: "00:00" … "23:30". */
export const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return isoDay(d);
}
/** Lunes = 0 … Domingo = 6. */
function weekdayMon0(s: string): number {
  return (parseISO(s).getDay() + 6) % 7;
}

/** Tramo al que pertenece una fecha respecto a «hoy», o null si queda fuera
 * («próximos 10 días» = hoy+2 … hoy+11). */
export function bucketOfDay(dayISO: string, today: string): Bucket | null {
  if (dayISO < today) return "overdue";
  if (dayISO === today) return "today";
  if (dayISO === addDays(today, 1)) return "tomorrow";
  if (dayISO <= addDays(today, 11)) return "week";
  return null;
}

/** Etiqueta de un día relativo a hoy: «Hoy», «Mañana» o «mié 25 jun». */
export function dayLabel(dayISO: string, today: string): string {
  if (dayISO === today) return "Hoy";
  if (dayISO === addDays(today, 1)) return "Mañana";
  const d = parseISO(dayISO);
  return `${WEEKDAYS[weekdayMon0(dayISO)]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

const byDayAsc = (a: DigestItem, b: DigestItem) =>
  a.dayISO < b.dayISO ? -1 : a.dayISO > b.dayISO ? 1 : 0;

/** Agrupa items por día (orden cronológico, alfabético dentro del día). */
function groupByDay(items: DigestItem[], today: string): DigestGroup[] {
  const byDay = new Map<string, DigestItem[]>();
  for (const it of items) {
    if (!byDay.has(it.dayISO)) byDay.set(it.dayISO, []);
    byDay.get(it.dayISO)!.push(it);
  }
  return [...byDay.keys()].sort().map((dayISO) => ({
    dayISO,
    label: dayLabel(dayISO, today),
    items: byDay.get(dayISO)!.sort((a, b) => a.title.localeCompare(b.title, "es")),
  }));
}

/** Tareas de los tramos pedidos (agrupadas por día) + las N «más antiguas» en
 * sección aparte (las que NO entran ya por tramo, para no duplicar). El filtrado
 * por estado/prioridad/ámbito ya viene aplicado por el runner. */
export function buildDigest(
  items: DigestItem[],
  buckets: Bucket[],
  today: string,
  oldestCount = 0
): Digest {
  const want = new Set(buckets);
  const bucketItems = items.filter((it) => {
    const b = bucketOfDay(it.dayISO, today);
    return b !== null && want.has(b);
  });
  const inBucket = new Set(bucketItems);

  // Las N más antiguas (fecha ascendente); las que ya salen por tramo no se
  // repiten aquí (se muestran en su día).
  let oldest: DigestItem[] = [];
  if (oldestCount > 0) {
    oldest = [...items]
      .sort(byDayAsc)
      .slice(0, oldestCount)
      .filter((it) => !inBucket.has(it));
  }

  return {
    total: bucketItems.length + oldest.length,
    groups: groupByDay(bucketItems, today),
    oldest,
  };
}

// Contexto del aviso para describir su contenido en el título.
export type DigestTitleOpts = {
  buckets: Bucket[];
  statusGroups: string[];
  impactGroups: string[];
};

const STATUS_ADJ: Record<string, [string, string]> = {
  todo: ["pendiente", "pendientes"],
  inProgress: ["en curso", "en curso"],
  done: ["completada", "completadas"],
};
const IMPACT_NAME: Record<string, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
  urgent: "Muy alto",
};
const IMPACT_ORDER = ["low", "medium", "high", "urgent"];

/** Une una lista en español: [a] → "a"; [a,b] → "a y b"; [a,b,c] → "a, b y c". */
function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/** Parte temporal futura del título (hoy/mañana/próximos días, combinables). */
function futurePhrase(set: Set<Bucket>): string {
  const t = set.has("today");
  const m = set.has("tomorrow");
  const w = set.has("week");
  if (t && m && w) return "para los próximos días";
  if (t && m) return "para hoy y mañana";
  if (t && w) return "para hoy y los próximos días";
  if (m && w) return "para mañana y los próximos días";
  if (t) return "para hoy";
  if (m) return "para mañana";
  if (w) return "en los próximos días";
  return "";
}

/** Frase de tramos: «atrasadas», «para mañana», «atrasadas y para hoy»… */
function timePhrase(buckets: Bucket[]): string {
  const set = new Set(buckets);
  const future = futurePhrase(set);
  if (set.has("overdue")) return future ? `atrasadas y ${future}` : "atrasadas";
  return future;
}

/** Título dinámico del aviso (estilo frase natural): cantidad + estado/impacto
 * (solo si se filtra) + tramo. P. ej. «🔔 3 tareas de impacto Alto, atrasadas
 * y para hoy». */
export function digestTitle(n: number, opts: DigestTitleOpts): string {
  const count = `${n} ${n === 1 ? "tarea" : "tareas"}`;

  // Estado: solo cuando se filtra a un único grupo (el resto no aporta).
  let statusAdj = "";
  if (opts.statusGroups.length === 1) {
    const adj = STATUS_ADJ[opts.statusGroups[0]];
    if (adj) statusAdj = n === 1 ? adj[0] : adj[1];
  }

  // Impacto: solo cuando se filtra (vacío = todos → no se menciona).
  let impactPhrase = "";
  if (opts.impactGroups.length) {
    const names = IMPACT_ORDER.filter((g) =>
      opts.impactGroups.includes(g)
    ).map((g) => IMPACT_NAME[g]);
    if (names.length) impactPhrase = `de impacto ${joinList(names)}`;
  }

  const prefix = [count, statusAdj, impactPhrase].filter(Boolean).join(" ");
  const time = timePhrase(opts.buckets);
  if (!time) return `🔔 ${prefix}`;
  // Coma para separar «…Alto» de «atrasadas» y que no se lean pegadas.
  const sep =
    time.startsWith("atrasadas") && (statusAdj || impactPhrase) ? ", " : " ";
  return `🔔 ${prefix}${sep}${time}`;
}

/** Línea de una tarea: «• Título (BD · Ámbito - X · Estado)». El título va como
 * enlace markdown «[Título](ruta)» si la tarea tiene `href` (lo renderizan la
 * bandeja con <Link> y Telegram con <a>). */
function itemLine(it: DigestItem): string {
  const meta = [
    it.dbTitle,
    it.ambito ? `Ámbito - ${it.ambito}` : null,
    it.statusName,
  ]
    .filter(Boolean)
    .join(" · ");
  const title = it.href ? `[${it.title}](${it.href})` : it.title;
  return `• ${title}${meta ? ` (${meta})` : ""}`;
}

/** Título + cuerpo (texto plano) del aviso para bandeja + Telegram. Las «más
 * antiguas» van en su propia sección al final, cada una con su fecha. */
export function renderDigest(
  digest: Digest,
  opts: DigestTitleOpts,
  today: string
): { title: string; body: string } {
  const title = digestTitle(digest.total, opts);
  const sections = digest.groups.map(
    (g) => `${g.label}\n${g.items.map(itemLine).join("\n")}`
  );
  if (digest.oldest.length) {
    const lines = digest.oldest.map(
      (it) => `${itemLine(it)} — ${dayLabel(it.dayISO, today)}`
    );
    sections.push(`Tareas antiguas:\n${lines.join("\n")}`);
  }
  return { title, body: sections.join("\n\n") };
}

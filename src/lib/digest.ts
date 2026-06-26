// Lógica PURA de los resúmenes de tareas próximas («digest»). Sin acceso a BD
// (el runner que toca Postgres está en digest-runner.ts), para poder testearla.
//
// Dos franjas:
//   - morning (08:00): solo las tareas con fecha = HOY.
//   - evening (18:00): MAÑANA + resto de la semana (hasta el domingo).
// Zona horaria de referencia: Europe/Madrid.

import { isoDay, MONTHS, WEEKDAYS } from "@/lib/calendar-utils";

export type DigestSlot = "morning" | "evening";

export type DigestItem = {
  title: string;
  dbTitle: string;
  dayISO: string;
  statusName?: string;
  done: boolean;
};
type DigestGroup = { dayISO: string; label: string; items: DigestItem[] };
export type Digest = { slot: DigestSlot; total: number; groups: DigestGroup[] };

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

/** Configuración de una franja del digest (guardada por usuario). */
export type SlotConfig = {
  enabled: boolean;
  /** "HH:MM" (pasos de 30 min). */
  time: string;
  /** Días en que aplica (lun=0 … dom=6). */
  days: number[];
  /** Último día enviado ("YYYY-MM-DD"), para no duplicar. */
  sentDate: string | null;
};

/** ¿Toca enviar esta franja ahora? Se dispara en el primer tic a partir de la
 * hora configurada, una sola vez al día, y solo en los días marcados. */
export function shouldSendSlot(
  cfg: SlotConfig,
  nowHHMM: string,
  todayISO: string
): boolean {
  if (!cfg.enabled) return false;
  if (!cfg.days.includes(weekdayMon0(todayISO))) return false;
  if (cfg.sentDate === todayISO) return false; // ya enviado hoy
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

/** Ventana [start, end] (días ISO inclusive) de cada franja, dado «hoy». */
export function digestWindow(
  slot: DigestSlot,
  today: string
): { start: string; end: string } {
  if (slot === "morning") return { start: today, end: today };
  // evening: mañana → próximo domingo (si hoy es domingo, el de la semana siguiente).
  const toSunday = 6 - weekdayMon0(today) || 7;
  return { start: addDays(today, 1), end: addDays(today, toSunday) };
}

/** Etiqueta de un día relativo a hoy: «Hoy», «Mañana» o «mié 25 jun». */
export function dayLabel(dayISO: string, today: string): string {
  if (dayISO === today) return "Hoy";
  if (dayISO === addDays(today, 1)) return "Mañana";
  const d = parseISO(dayISO);
  return `${WEEKDAYS[weekdayMon0(dayISO)]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

/** Filtra por ventana + no completadas y agrupa por día (orden cronológico). */
export function buildDigest(
  items: DigestItem[],
  slot: DigestSlot,
  today: string
): Digest {
  const { start, end } = digestWindow(slot, today);
  const kept = items.filter(
    (it) => !it.done && it.dayISO >= start && it.dayISO <= end
  );
  const byDay = new Map<string, DigestItem[]>();
  for (const it of kept) {
    if (!byDay.has(it.dayISO)) byDay.set(it.dayISO, []);
    byDay.get(it.dayISO)!.push(it);
  }
  const groups: DigestGroup[] = [...byDay.keys()]
    .sort()
    .map((dayISO) => ({
      dayISO,
      label: dayLabel(dayISO, today),
      items: byDay
        .get(dayISO)!
        .sort((a, b) => a.title.localeCompare(b.title, "es")),
    }));
  return { slot, total: kept.length, groups };
}

/** Título + cuerpo (texto plano) del aviso para bandeja + Telegram. */
export function renderDigest(digest: Digest): { title: string; body: string } {
  const n = digest.total;
  const plural = n === 1 ? "tarea" : "tareas";
  const title =
    digest.slot === "morning"
      ? `☀️ Tu día: ${n} ${plural} para hoy`
      : `🌙 Lo que viene: ${n} ${plural}`;
  const body = digest.groups
    .map((g) => {
      const lines = g.items.map((it) => {
        const meta = [it.dbTitle, it.statusName].filter(Boolean).join(" · ");
        return `• ${it.title}${meta ? ` (${meta})` : ""}`;
      });
      return `${g.label}\n${lines.join("\n")}`;
    })
    .join("\n\n");
  return { title, body };
}

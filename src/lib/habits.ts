// Lógica PURA de los hábitos (sin BD). El runner/acciones tocan Postgres aparte.
// Un «día» es una cadena ISO "YYYY-MM-DD" en zona Europe/Madrid (ver digest.ts).

import type { HabitSchedule } from "@/lib/types";
export type { HabitSchedule };

export type HabitDTO = {
  id: string;
  name: string;
  emoji: string | null;
  color: string;
  schedule: HabitSchedule;
  orderKey: string;
};

// Mínimo necesario para los cálculos por día (id + horario).
type Scheduled = { id: string; schedule: HabitSchedule };

/** Día de la semana de un día ISO (lun=0 … dom=6). */
export function weekdayOf(dayISO: string): number {
  const [y, m, d] = dayISO.split("-").map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

/** ¿El hábito «toca» ese día? (cuenta para el % diario). Los de tipo «times»
 * (N por semana) no están atados a un día, así que no cuentan por día. */
export function countsOnDay(schedule: HabitSchedule, dayISO: string): boolean {
  if (schedule.type === "daily") return true;
  if (schedule.type === "weekly") return schedule.days.includes(weekdayOf(dayISO));
  return false;
}

// Conjunto de días marcados por hábito: habitId → set de "YYYY-MM-DD".
export type DoneMap = Record<string, Set<string>>;

/** Construye el mapa de días hechos a partir de los registros planos. */
export function buildDoneMap(
  logs: { habitId: string; day: string }[]
): DoneMap {
  const map: DoneMap = {};
  for (const l of logs) {
    (map[l.habitId] ??= new Set()).add(l.day);
  }
  return map;
}

/** Suma un nº de días a un día ISO (sin tocar zonas horarias). */
export function addDaysISO(dayISO: string, n: number): string {
  const [y, m, d] = dayISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Los últimos `count` días hasta `today` incluido, en orden cronológico. */
export function lastDays(today: string, count: number): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) out.push(addDaysISO(today, -i));
  return out;
}

/** % de hábitos hechos en un día (0–100), contando solo los que «tocan» ese día.
 * Devuelve null si ese día no toca ningún hábito (día libre → ni éxito ni fallo). */
export function dayPercent(
  habits: Scheduled[],
  done: DoneMap,
  dayISO: string
): number | null {
  const due = habits.filter((h) => countsOnDay(h.schedule, dayISO));
  if (due.length === 0) return null;
  const n = due.filter((h) => done[h.id]?.has(dayISO)).length;
  return Math.round((n / due.length) * 100);
}

/** Día «que toca» anterior a `dayISO` según el horario (máx. 14 días atrás). */
function prevDueDay(schedule: HabitSchedule, dayISO: string): string {
  let c = dayISO;
  for (let i = 0; i < 14; i++) {
    c = addDaysISO(c, -1);
    if (countsOnDay(schedule, c)) return c;
  }
  return c;
}

/**
 * Racha actual de un hábito: nº de días «que tocan» consecutivos hechos,
 * terminando en el último día que tocaba (hoy si ya está hecho; si hoy toca pero
 * aún no lo has marcado, la racha que venía sigue viva). Los hábitos de tipo
 * «times» (sin día fijo) no tienen racha → 0.
 */
export function streak(
  done: Set<string> | undefined,
  today: string,
  schedule: HabitSchedule = { type: "daily" }
): number {
  if (!done || done.size === 0 || schedule.type === "times") return 0;
  // Punto de partida: hoy si toca y está hecho; si toca y no, el anterior que
  // tocaba (la racha previa sigue); si hoy no toca, el último que tocaba.
  const dueToday = countsOnDay(schedule, today);
  let cursor =
    dueToday && !done.has(today) ? prevDueDay(schedule, today) : dueToday ? today : prevDueDay(schedule, today);
  let count = 0;
  while (done.has(cursor)) {
    count++;
    cursor = prevDueDay(schedule, cursor);
  }
  return count;
}

/** Serie temporal del % diario sobre un rango (para la gráfica). El % es null en
 * los días libres (no toca ningún hábito). */
export function percentSeries(
  habits: Scheduled[],
  done: DoneMap,
  days: string[]
): { day: string; percent: number | null }[] {
  return days.map((day) => ({ day, percent: dayPercent(habits, done, day) }));
}

/** % de cumplimiento de UN hábito en un rango: días hechos / días «que tocaban».
 * Para «times» (N/semana) cuenta sobre todos los días del rango. */
export function completionRate(
  done: Set<string> | undefined,
  days: string[],
  schedule: HabitSchedule = { type: "daily" }
): number {
  if (!done || days.length === 0) return 0;
  const dueDays =
    schedule.type === "times" ? days : days.filter((d) => countsOnDay(schedule, d));
  if (dueDays.length === 0) return 0;
  const n = dueDays.filter((d) => done.has(d)).length;
  return Math.round((n / dueDays.length) * 100);
}

/** Los 7 días de la semana (lun→dom) que contienen `dayISO`. */
export function weekDays(dayISO: string): string[] {
  const monday = addDaysISO(dayISO, -weekdayOf(dayISO));
  return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
}

/** Veces hechas esta semana (para objetivos de tipo «times»). */
export function timesThisWeek(
  done: Set<string> | undefined,
  dayISO: string
): number {
  if (!done) return 0;
  return weekDays(dayISO).filter((d) => done.has(d)).length;
}

/** Mensaje motivador según el % del día (estilo de los trackers). */
export function dayMessage(percent: number): string | null {
  if (percent >= 100) return "¡Lo hiciste! 🎉";
  if (percent >= 60) return "¡Casi! 💪";
  return null;
}

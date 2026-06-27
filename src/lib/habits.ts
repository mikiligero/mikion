// Lógica PURA de los hábitos (sin BD). El runner/acciones tocan Postgres aparte.
// Un «día» es una cadena ISO "YYYY-MM-DD" en zona Europe/Madrid (ver digest.ts).

export type HabitDTO = {
  id: string;
  name: string;
  emoji: string | null;
  color: string;
  orderKey: string;
};

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

/** % de hábitos hechos en un día (0–100). Sin hábitos → 0. */
export function dayPercent(
  habitIds: string[],
  done: DoneMap,
  dayISO: string
): number {
  if (habitIds.length === 0) return 0;
  const n = habitIds.filter((id) => done[id]?.has(dayISO)).length;
  return Math.round((n / habitIds.length) * 100);
}

/**
 * Racha actual de un hábito: nº de días consecutivos hechos terminando hoy o
 * ayer (si hoy aún no está hecho, la racha que venía de ayer sigue contando).
 */
export function streak(
  done: Set<string> | undefined,
  today: string
): number {
  if (!done || done.size === 0) return 0;
  // Empieza en hoy si está hecho; si no, en ayer (racha aún viva hasta ayer).
  let cursor = done.has(today) ? today : addDaysISO(today, -1);
  let count = 0;
  while (done.has(cursor)) {
    count++;
    cursor = addDaysISO(cursor, -1);
  }
  return count;
}

/** Serie temporal del % diario sobre un rango de días (para la gráfica). */
export function percentSeries(
  habitIds: string[],
  done: DoneMap,
  days: string[]
): { day: string; percent: number }[] {
  return days.map((day) => ({ day, percent: dayPercent(habitIds, done, day) }));
}

/** % de cumplimiento de UN hábito en un rango (días hechos / días). */
export function completionRate(
  done: Set<string> | undefined,
  days: string[]
): number {
  if (!done || days.length === 0) return 0;
  const n = days.filter((d) => done.has(d)).length;
  return Math.round((n / days.length) * 100);
}

/** Mensaje motivador según el % del día (estilo de los trackers). */
export function dayMessage(percent: number): string | null {
  if (percent >= 100) return "¡Lo hiciste! 🎉";
  if (percent >= 60) return "¡Casi! 💪";
  return null;
}

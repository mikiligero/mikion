// Utilidades de calendario (puras).

export const WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
export const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const pad = (n: number) => String(n).padStart(2, "0");

/** Fecha local → "YYYY-MM-DD". */
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Fecha a medianoche local (descarta la hora). */
export function atMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Días enteros entre a y b (a - b), ignorando la hora. */
export function dayDiff(a: Date, b: Date): number {
  return Math.round(
    (atMidnight(a).getTime() - atMidnight(b).getTime()) / 86400000
  );
}

/** Parsea "YYYY-MM-DD" (o ISO con hora) a Date local, o null si no es válida. */
export function parseDay(v: unknown): Date | null {
  if (typeof v !== "string" || v.length < 10) return null;
  const [y, m, d] = v.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Matriz de 6 semanas × 7 días (lunes primero) del mes (month: 0-11). */
export function monthMatrix(
  year: number,
  month: number
): { date: Date; inMonth: boolean }[][] {
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // lunes = 0
  const start = new Date(year, month, 1 - startWeekday);
  const weeks: { date: Date; inMonth: boolean }[][] = [];
  for (let w = 0; w < 6; w++) {
    const days: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + i);
      days.push({ date, inMonth: date.getMonth() === month });
    }
    weeks.push(days);
  }
  return weeks;
}

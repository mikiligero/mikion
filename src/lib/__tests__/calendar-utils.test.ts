import { describe, it, expect } from "vitest";
import {
  isoDay,
  monthMatrix,
  atMidnight,
  dayDiff,
  parseDay,
  MONTHS,
  WEEKDAYS,
} from "@/lib/calendar-utils";

describe("isoDay", () => {
  it("formatea fecha local como YYYY-MM-DD con relleno", () => {
    expect(isoDay(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(isoDay(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("constantes", () => {
  it("12 meses y 7 días (lunes primero)", () => {
    expect(MONTHS).toHaveLength(12);
    expect(WEEKDAYS).toHaveLength(7);
    expect(WEEKDAYS[0]).toBe("lun");
    expect(WEEKDAYS[6]).toBe("dom");
  });
});

describe("monthMatrix", () => {
  const weeks = monthMatrix(2026, 5); // junio 2026

  it("devuelve 6 semanas de 7 días", () => {
    expect(weeks).toHaveLength(6);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("empieza en lunes", () => {
    expect(weeks[0][0].date.getDay()).toBe(1); // 1 = lunes
  });

  it("los 42 días son consecutivos", () => {
    const flat = weeks.flat();
    for (let i = 1; i < flat.length; i++) {
      const diff =
        (flat[i].date.getTime() - flat[i - 1].date.getTime()) / 86400000;
      expect(Math.round(diff)).toBe(1);
    }
  });

  it("inMonth marca solo los días del mes y contiene del 1 al 30", () => {
    const inMonthDays = weeks
      .flat()
      .filter((d) => d.inMonth)
      .map((d) => d.date.getDate());
    expect(Math.min(...inMonthDays)).toBe(1);
    expect(Math.max(...inMonthDays)).toBe(30); // junio = 30 días
    expect(weeks.flat().every((d) => (d.date.getMonth() === 5) === d.inMonth)).toBe(true);
  });
});

describe("atMidnight / dayDiff", () => {
  it("atMidnight descarta la hora", () => {
    const d = atMidnight(new Date(2026, 5, 15, 23, 59));
    expect(d.getHours()).toBe(0);
    expect(isoDay(d)).toBe("2026-06-15");
  });

  it("dayDiff cuenta días enteros con signo", () => {
    expect(dayDiff(new Date(2026, 5, 18), new Date(2026, 5, 15))).toBe(3);
    expect(dayDiff(new Date(2026, 5, 15), new Date(2026, 5, 18))).toBe(-3);
    expect(dayDiff(new Date(2026, 5, 15, 23), new Date(2026, 5, 15, 1))).toBe(0);
  });

  it("dayDiff cruza meses correctamente", () => {
    expect(dayDiff(new Date(2026, 6, 1), new Date(2026, 5, 30))).toBe(1);
  });
});

describe("parseDay", () => {
  it("parsea YYYY-MM-DD a fecha local", () => {
    const d = parseDay("2026-06-15");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(5);
    expect(d?.getDate()).toBe(15);
  });

  it("acepta ISO con hora (toma los primeros 10 chars)", () => {
    expect(isoDay(parseDay("2026-06-15T10:30:00Z")!)).toBe("2026-06-15");
  });

  it("devuelve null para valores no válidos", () => {
    expect(parseDay(null)).toBeNull();
    expect(parseDay("")).toBeNull();
    expect(parseDay("hola")).toBeNull();
    expect(parseDay(123)).toBeNull();
  });
});

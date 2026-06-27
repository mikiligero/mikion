import { describe, it, expect } from "vitest";
import {
  addDaysISO,
  buildDoneMap,
  dayMessage,
  dayPercent,
  lastDays,
  streak,
} from "@/lib/habits";

const TODAY = "2026-06-26"; // viernes

describe("addDaysISO", () => {
  it("suma y resta días cruzando meses", () => {
    expect(addDaysISO("2026-06-26", 1)).toBe("2026-06-27");
    expect(addDaysISO("2026-07-01", -1)).toBe("2026-06-30");
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("lastDays", () => {
  it("devuelve los N días hasta hoy en orden cronológico", () => {
    expect(lastDays(TODAY, 3)).toEqual(["2026-06-24", "2026-06-25", "2026-06-26"]);
  });
});

describe("buildDoneMap", () => {
  it("agrupa los registros por hábito en sets", () => {
    const m = buildDoneMap([
      { habitId: "a", day: "2026-06-25" },
      { habitId: "a", day: "2026-06-26" },
      { habitId: "b", day: "2026-06-26" },
    ]);
    expect([...m.a].sort()).toEqual(["2026-06-25", "2026-06-26"]);
    expect([...m.b]).toEqual(["2026-06-26"]);
  });
});

describe("dayPercent", () => {
  const done = buildDoneMap([
    { habitId: "a", day: TODAY },
    { habitId: "b", day: TODAY },
  ]);
  it("redondea el % de hábitos hechos en el día", () => {
    expect(dayPercent(["a", "b"], done, TODAY)).toBe(100);
    expect(dayPercent(["a", "b", "c"], done, TODAY)).toBe(67); // 2/3
    expect(dayPercent(["a", "b", "c"], done, "2026-06-25")).toBe(0);
  });
  it("sin hábitos → 0", () => {
    expect(dayPercent([], done, TODAY)).toBe(0);
  });
});

describe("streak", () => {
  it("cuenta días consecutivos terminando hoy", () => {
    const s = new Set(["2026-06-24", "2026-06-25", "2026-06-26"]);
    expect(streak(s, TODAY)).toBe(3);
  });
  it("si hoy no está hecho pero ayer sí, la racha sigue viva (hasta ayer)", () => {
    const s = new Set(["2026-06-24", "2026-06-25"]);
    expect(streak(s, TODAY)).toBe(2);
  });
  it("rompe en el primer hueco", () => {
    const s = new Set(["2026-06-26", "2026-06-24"]); // falta el 25
    expect(streak(s, TODAY)).toBe(1);
  });
  it("vacío o sin nada reciente → 0", () => {
    expect(streak(undefined, TODAY)).toBe(0);
    expect(streak(new Set(["2026-06-01"]), TODAY)).toBe(0);
  });
});

describe("dayMessage", () => {
  it("100% felicita, 60% anima, menos nada", () => {
    expect(dayMessage(100)).toContain("Lo hiciste");
    expect(dayMessage(60)).toContain("Casi");
    expect(dayMessage(40)).toBeNull();
  });
});

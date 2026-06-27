import { describe, it, expect } from "vitest";
import {
  addDaysISO,
  buildDoneMap,
  completionRate,
  countsOnDay,
  dayMessage,
  dayPercent,
  lastDays,
  percentSeries,
  streak,
  timesThisWeek,
  weekDays,
  weekdayOf,
  type HabitSchedule,
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

// Hábito con horario para los cálculos por día (id + schedule).
const hb = (id: string, schedule: HabitSchedule = { type: "daily" }) => ({
  id,
  schedule,
});

describe("dayPercent (con horario)", () => {
  const done = buildDoneMap([
    { habitId: "a", day: TODAY },
    { habitId: "b", day: TODAY },
  ]);
  it("redondea el % de hábitos hechos en el día (diarios)", () => {
    expect(dayPercent([hb("a"), hb("b")], done, TODAY)).toBe(100);
    expect(dayPercent([hb("a"), hb("b"), hb("c")], done, TODAY)).toBe(67); // 2/3
    expect(dayPercent([hb("a"), hb("b"), hb("c")], done, "2026-06-25")).toBe(0);
  });
  it("sin hábitos → null", () => {
    expect(dayPercent([], done, TODAY)).toBeNull();
  });
  it("solo cuenta los que tocan ese día; día sin ninguno → null", () => {
    // TODAY = viernes (weekday 4). Hábito a solo los lunes (0).
    const lun = hb("a", { type: "weekly", days: [0] });
    const vie = hb("b", { type: "weekly", days: [4] });
    expect(dayPercent([lun, vie], done, TODAY)).toBe(100); // solo cuenta b (hecho)
    expect(dayPercent([lun], done, TODAY)).toBeNull(); // a no toca hoy
  });
  it("los de tipo «times» no cuentan por día", () => {
    expect(dayPercent([hb("a", { type: "times", perWeek: 3 })], done, TODAY)).toBeNull();
  });
});

describe("countsOnDay / weekdayOf", () => {
  it("weekdayOf: lun=0 … dom=6", () => {
    expect(weekdayOf("2026-06-22")).toBe(0);
    expect(weekdayOf("2026-06-26")).toBe(4); // viernes
  });
  it("daily siempre, weekly según día, times nunca por día", () => {
    expect(countsOnDay({ type: "daily" }, TODAY)).toBe(true);
    expect(countsOnDay({ type: "weekly", days: [4] }, TODAY)).toBe(true);
    expect(countsOnDay({ type: "weekly", days: [0] }, TODAY)).toBe(false);
    expect(countsOnDay({ type: "times", perWeek: 3 }, TODAY)).toBe(false);
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
  it("con horario semanal cuenta solo los días que tocan", () => {
    // Lunes y viernes. TODAY=vie 26. Hechos: vie 26, lun 22, vie 19 → racha 3.
    const sched: HabitSchedule = { type: "weekly", days: [0, 4] };
    const s = new Set(["2026-06-26", "2026-06-22", "2026-06-19"]);
    expect(streak(s, TODAY, sched)).toBe(3);
    // Si falta el lunes 22, la racha se rompe tras el viernes 26 → 1.
    expect(streak(new Set(["2026-06-26", "2026-06-19"]), TODAY, sched)).toBe(1);
  });
  it("los de tipo «times» no tienen racha", () => {
    expect(streak(new Set([TODAY]), TODAY, { type: "times", perWeek: 3 })).toBe(0);
  });
});

describe("percentSeries", () => {
  it("mapea cada día a su % (para la gráfica)", () => {
    const done = buildDoneMap([
      { habitId: "a", day: "2026-06-25" },
      { habitId: "b", day: "2026-06-25" },
      { habitId: "a", day: "2026-06-26" },
    ]);
    const s = percentSeries(
      [hb("a"), hb("b")],
      done,
      ["2026-06-24", "2026-06-25", "2026-06-26"]
    );
    expect(s).toEqual([
      { day: "2026-06-24", percent: 0 },
      { day: "2026-06-25", percent: 100 },
      { day: "2026-06-26", percent: 50 },
    ]);
  });
});

describe("completionRate (con horario)", () => {
  it("semanal: cuenta sobre los días que tocaban", () => {
    // Lunes/viernes. Rango lun22..dom28. Días que tocan: 22(lun),26(vie) → 2.
    const sched: HabitSchedule = { type: "weekly", days: [0, 4] };
    const days = [
      "2026-06-22", "2026-06-23", "2026-06-24", "2026-06-25",
      "2026-06-26", "2026-06-27", "2026-06-28",
    ];
    const done = new Set(["2026-06-22"]); // hecho 1 de 2 que tocaban
    expect(completionRate(done, days, sched)).toBe(50);
  });
});

describe("weekDays / timesThisWeek", () => {
  it("weekDays devuelve lun→dom de la semana del día", () => {
    expect(weekDays(TODAY)).toEqual([
      "2026-06-22", "2026-06-23", "2026-06-24", "2026-06-25",
      "2026-06-26", "2026-06-27", "2026-06-28",
    ]);
  });
  it("timesThisWeek cuenta las marcas de la semana actual", () => {
    const done = new Set(["2026-06-22", "2026-06-26", "2026-06-15"]); // el 15 es otra semana
    expect(timesThisWeek(done, TODAY)).toBe(2);
  });
});

describe("completionRate", () => {
  it("% de días hechos de un hábito en el rango", () => {
    const done = new Set(["2026-06-24", "2026-06-26"]);
    expect(completionRate(done, ["2026-06-24", "2026-06-25", "2026-06-26", "2026-06-27"])).toBe(50);
  });
  it("sin registros o rango vacío → 0", () => {
    expect(completionRate(undefined, ["2026-06-26"])).toBe(0);
    expect(completionRate(new Set(["2026-06-26"]), [])).toBe(0);
  });
});

describe("dayMessage", () => {
  it("100% felicita, 60% anima, menos nada", () => {
    expect(dayMessage(100)).toContain("Lo hiciste");
    expect(dayMessage(60)).toContain("Casi");
    expect(dayMessage(40)).toBeNull();
  });
});

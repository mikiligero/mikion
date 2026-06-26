import { describe, it, expect } from "vitest";
import {
  buildDigest,
  bucketOfDay,
  dayLabel,
  renderDigest,
  rowAssignedTo,
  shouldSendRule,
  TIME_OPTIONS,
  type DigestItem,
  type RuleSchedule,
} from "@/lib/digest";

// Jueves 2026-06-25 como «hoy» de referencia (semana lun 22 … dom 28).
const TODAY = "2026-06-25";

function item(p: Partial<DigestItem> & { dayISO: string }): DigestItem {
  return {
    title: p.title ?? "Tarea",
    dbTitle: p.dbTitle ?? "TAREAS",
    dayISO: p.dayISO,
    statusName: p.statusName,
    done: p.done ?? false,
  };
}

describe("bucketOfDay", () => {
  it("clasifica cada fecha en su tramo relativo a hoy", () => {
    expect(bucketOfDay("2026-06-24", TODAY)).toBe("overdue"); // ayer
    expect(bucketOfDay("2026-06-25", TODAY)).toBe("today");
    expect(bucketOfDay("2026-06-26", TODAY)).toBe("tomorrow");
    expect(bucketOfDay("2026-06-27", TODAY)).toBe("week"); // hoy+2
    expect(bucketOfDay("2026-07-06", TODAY)).toBe("week"); // hoy+11 (límite)
  });
  it("null más allá de los próximos 10 días", () => {
    expect(bucketOfDay("2026-07-07", TODAY)).toBeNull(); // hoy+12
  });
});

describe("dayLabel", () => {
  it("hoy / mañana / día con nombre", () => {
    expect(dayLabel("2026-06-25", TODAY)).toBe("Hoy");
    expect(dayLabel("2026-06-26", TODAY)).toBe("Mañana");
    expect(dayLabel("2026-06-28", TODAY)).toBe("dom 28 jun");
  });
});

describe("buildDigest", () => {
  it("incluye solo los tramos pedidos y agrupa por día", () => {
    const d = buildDigest(
      [
        item({ title: "Hoy A", dayISO: "2026-06-25" }),
        item({ title: "Mañana", dayISO: "2026-06-26" }),
        item({ title: "Ayer", dayISO: "2026-06-24" }),
      ],
      ["today"],
      TODAY
    );
    expect(d.total).toBe(1);
    expect(d.groups).toHaveLength(1);
    expect(d.groups[0].label).toBe("Hoy");
    expect(d.groups[0].items[0].title).toBe("Hoy A");
  });

  it("varios tramos: retrasados + próximos 10 días, orden cronológico", () => {
    const d = buildDigest(
      [
        item({ title: "Ayer", dayISO: "2026-06-24" }), // overdue
        item({ title: "Hoy", dayISO: "2026-06-25" }), // fuera (no pedido)
        item({ title: "Z futuro", dayISO: "2026-06-27" }), // week
        item({ title: "A futuro", dayISO: "2026-06-27" }), // week
        item({ title: "Lejano", dayISO: "2026-07-20" }), // fuera
      ],
      ["overdue", "week"],
      TODAY
    );
    expect(d.total).toBe(3);
    expect(d.groups.map((g) => g.label)).toEqual(["mié 24 jun", "sáb 27 jun"]);
    expect(d.groups[1].items.map((i) => i.title)).toEqual([
      "A futuro",
      "Z futuro",
    ]);
  });
});

describe("renderDigest", () => {
  it("título con conteo y cuerpo con bullets y meta", () => {
    const d = buildDigest(
      [item({ title: "Llamar", dbTitle: "TAREAS", statusName: "En curso", dayISO: "2026-06-25" })],
      ["today"],
      TODAY
    );
    const { title, body } = renderDigest(d);
    expect(title).toBe("🔔 1 tarea");
    expect(body).toContain("Hoy");
    expect(body).toContain("• Llamar (TAREAS · En curso)");
  });

  it("plural en el título", () => {
    const d = buildDigest(
      [
        item({ title: "A", dayISO: "2026-06-26" }),
        item({ title: "B", dayISO: "2026-06-27" }),
      ],
      ["tomorrow", "week"],
      TODAY
    );
    expect(renderDigest(d).title).toBe("🔔 2 tareas");
  });
});

describe("shouldSendRule", () => {
  const ALL = [0, 1, 2, 3, 4, 5, 6];
  const base: RuleSchedule = {
    enabled: true,
    time: "18:00",
    days: ALL,
    lastSentDate: null,
  };

  it("dispara a partir de la hora si no se envió hoy", () => {
    expect(shouldSendRule(base, "18:00", TODAY)).toBe(true);
    expect(shouldSendRule(base, "18:30", TODAY)).toBe(true);
  });
  it("no dispara antes de la hora", () => {
    expect(shouldSendRule(base, "17:30", TODAY)).toBe(false);
  });
  it("no dispara si está desactivado", () => {
    expect(shouldSendRule({ ...base, enabled: false }, "19:00", TODAY)).toBe(false);
  });
  it("no dispara si hoy no es un día activo", () => {
    expect(shouldSendRule({ ...base, days: [] }, "19:00", TODAY)).toBe(false);
  });
  it("no dispara si ya se envió hoy (anti-duplicado)", () => {
    expect(shouldSendRule({ ...base, lastSentDate: TODAY }, "19:00", TODAY)).toBe(false);
  });
});

describe("TIME_OPTIONS", () => {
  it("48 opciones de 30 min, de 00:00 a 23:30", () => {
    expect(TIME_OPTIONS).toHaveLength(48);
    expect(TIME_OPTIONS[0]).toBe("00:00");
    expect(TIME_OPTIONS[1]).toBe("00:30");
    expect(TIME_OPTIONS.at(-1)).toBe("23:30");
  });
});

describe("rowAssignedTo", () => {
  const values = { p1: ["u-bob", "u-ana"], p2: ["u-leo"], title: "x" };

  it("true si la persona está en alguna propiedad persona", () => {
    expect(rowAssignedTo(values, ["p1", "p2"], "u-ana")).toBe(true);
    expect(rowAssignedTo(values, ["p2"], "u-leo")).toBe(true);
  });

  it("false si no aparece o la propiedad no se mira", () => {
    expect(rowAssignedTo(values, ["p1"], "u-leo")).toBe(false);
    expect(rowAssignedTo(values, ["p1", "p2"], "u-zoe")).toBe(false);
  });

  it("false con valores nulos, vacíos o no-array", () => {
    expect(rowAssignedTo(null, ["p1"], "u-bob")).toBe(false);
    expect(rowAssignedTo({ p1: "u-bob" }, ["p1"], "u-bob")).toBe(false);
    expect(rowAssignedTo(values, [], "u-bob")).toBe(false);
  });
});

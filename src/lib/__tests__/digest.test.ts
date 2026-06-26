import { describe, it, expect } from "vitest";
import {
  buildDigest,
  dayLabel,
  digestWindow,
  renderDigest,
  rowAssignedTo,
  shouldSendSlot,
  TIME_OPTIONS,
  type DigestItem,
  type SlotConfig,
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

describe("digestWindow", () => {
  it("morning = solo hoy", () => {
    expect(digestWindow("morning", TODAY)).toEqual({
      start: "2026-06-25",
      end: "2026-06-25",
    });
  });

  it("evening = mañana hasta el domingo", () => {
    // jueves → mañana viernes 26, fin domingo 28.
    expect(digestWindow("evening", TODAY)).toEqual({
      start: "2026-06-26",
      end: "2026-06-28",
    });
  });

  it("evening en domingo = lunes a domingo siguiente", () => {
    // domingo 2026-06-28 → mañana lunes 29, fin domingo 2026-07-05.
    expect(digestWindow("evening", "2026-06-28")).toEqual({
      start: "2026-06-29",
      end: "2026-07-05",
    });
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
  it("morning incluye solo hoy y excluye completadas", () => {
    const d = buildDigest(
      [
        item({ title: "Hoy A", dayISO: "2026-06-25" }),
        item({ title: "Hoy hecha", dayISO: "2026-06-25", done: true }),
        item({ title: "Mañana", dayISO: "2026-06-26" }),
        item({ title: "Ayer", dayISO: "2026-06-24" }),
      ],
      "morning",
      TODAY
    );
    expect(d.total).toBe(1);
    expect(d.groups).toHaveLength(1);
    expect(d.groups[0].label).toBe("Hoy");
    expect(d.groups[0].items[0].title).toBe("Hoy A");
  });

  it("evening agrupa por día en orden cronológico, sin hoy", () => {
    const d = buildDigest(
      [
        item({ title: "Hoy", dayISO: "2026-06-25" }), // fuera
        item({ title: "Z mañana", dayISO: "2026-06-26" }),
        item({ title: "A mañana", dayISO: "2026-06-26" }),
        item({ title: "Domingo", dayISO: "2026-06-28" }),
        item({ title: "Semana que viene", dayISO: "2026-06-30" }), // fuera
      ],
      "evening",
      TODAY
    );
    expect(d.total).toBe(3);
    expect(d.groups.map((g) => g.label)).toEqual(["Mañana", "dom 28 jun"]);
    // Orden alfabético dentro del día.
    expect(d.groups[0].items.map((i) => i.title)).toEqual([
      "A mañana",
      "Z mañana",
    ]);
  });
});

describe("renderDigest", () => {
  it("título y cuerpo con bullets y meta", () => {
    const d = buildDigest(
      [item({ title: "Llamar", dbTitle: "TAREAS", statusName: "En curso", dayISO: "2026-06-25" })],
      "morning",
      TODAY
    );
    const { title, body } = renderDigest(d);
    expect(title).toBe("☀️ Tu día: 1 tarea para hoy");
    expect(body).toContain("Hoy");
    expect(body).toContain("• Llamar (TAREAS · En curso)");
  });

  it("plural en la tarde", () => {
    const d = buildDigest(
      [
        item({ title: "A", dayISO: "2026-06-26" }),
        item({ title: "B", dayISO: "2026-06-27" }),
      ],
      "evening",
      TODAY
    );
    expect(renderDigest(d).title).toBe("🌙 Lo que viene: 2 tareas");
  });
});

describe("shouldSendSlot", () => {
  const ALL = [0, 1, 2, 3, 4, 5, 6];
  const base: SlotConfig = {
    enabled: true,
    time: "18:00",
    days: ALL,
    sentDate: null,
  };

  it("dispara a partir de la hora si no se envió hoy", () => {
    expect(shouldSendSlot(base, "18:00", TODAY)).toBe(true);
    expect(shouldSendSlot(base, "18:30", TODAY)).toBe(true);
  });
  it("no dispara antes de la hora", () => {
    expect(shouldSendSlot(base, "17:30", TODAY)).toBe(false);
  });
  it("no dispara si está desactivado", () => {
    expect(shouldSendSlot({ ...base, enabled: false }, "19:00", TODAY)).toBe(false);
  });
  it("no dispara si hoy no es un día activo", () => {
    expect(shouldSendSlot({ ...base, days: [] }, "19:00", TODAY)).toBe(false);
  });
  it("no dispara si ya se envió hoy (anti-duplicado)", () => {
    expect(shouldSendSlot({ ...base, sentDate: TODAY }, "19:00", TODAY)).toBe(false);
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

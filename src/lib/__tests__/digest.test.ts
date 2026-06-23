import { describe, it, expect } from "vitest";
import {
  buildDigest,
  dayLabel,
  digestWindow,
  renderDigest,
  type DigestItem,
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

// Cobertura adicional de los avisos de tareas («digest»): zona horaria, límites
// de tramos, todas las combinaciones del título, casos borde de «más antiguas»,
// y los helpers puros del runner (normalizeName / ambitoProperty).
import { describe, it, expect } from "vitest";
import {
  ambitoProperty,
  buildDigest,
  bucketOfDay,
  dayLabel,
  digestTitle,
  madridTime,
  madridToday,
  normalizeName,
  weekdayMon0OfISO,
  type DigestItem,
  type DigestTitleOpts,
} from "@/lib/digest";
import type { DatabaseSchema, PropertyDef } from "@/lib/types";

// Jueves 2026-06-25 (verano, Madrid = UTC+2).
const TODAY = "2026-06-25";

function item(p: Partial<DigestItem> & { dayISO: string }): DigestItem {
  return {
    title: p.title ?? "Tarea",
    dbTitle: p.dbTitle ?? "TAREAS",
    dayISO: p.dayISO,
    statusName: p.statusName,
    ambito: p.ambito,
    href: p.href,
    done: p.done ?? false,
  };
}

// ---------------------------------------------------------------------------
// Zona horaria (Europe/Madrid). El cron tiquea en UTC; la pertenencia a un día
// y la hora de disparo se calculan en hora de Madrid.
// ---------------------------------------------------------------------------
describe("madridToday (día en Europe/Madrid)", () => {
  it("mismo día durante el día", () => {
    expect(madridToday(new Date("2026-06-25T10:00:00Z"))).toBe("2026-06-25");
  });
  it("verano (UTC+2): 22:30Z ya es el día siguiente en Madrid", () => {
    expect(madridToday(new Date("2026-06-25T22:30:00Z"))).toBe("2026-06-26");
  });
  it("invierno (UTC+1): 23:30Z del 1 ene es 2 ene en Madrid", () => {
    expect(madridToday(new Date("2026-01-01T23:30:00Z"))).toBe("2026-01-02");
  });
  it("verano: 21:59Z aún es el mismo día (23:59 Madrid)", () => {
    expect(madridToday(new Date("2026-06-25T21:59:00Z"))).toBe("2026-06-25");
  });
});

describe("madridTime (hora en Europe/Madrid)", () => {
  it("verano (UTC+2): 16:00Z → 18:00", () => {
    expect(madridTime(new Date("2026-06-25T16:00:00Z"))).toBe("18:00");
  });
  it("invierno (UTC+1): 17:00Z → 18:00", () => {
    expect(madridTime(new Date("2026-01-15T17:00:00Z"))).toBe("18:00");
  });
  it("medianoche de Madrid es «00:00», nunca «24:00» (guard ICU)", () => {
    // Verano: medianoche de Madrid = 22:00Z. Si saliera «24:00», shouldSendRule
    // dispararía TODOS los avisos al tiquear a medianoche.
    expect(madridTime(new Date("2026-06-25T22:00:00Z"))).toBe("00:00");
    // Invierno: medianoche de Madrid = 23:00Z.
    expect(madridTime(new Date("2026-01-01T23:00:00Z"))).toBe("00:00");
  });
  it("media hora: 16:30Z verano → 18:30", () => {
    expect(madridTime(new Date("2026-06-25T16:30:00Z"))).toBe("18:30");
  });
});

describe("weekdayMon0OfISO", () => {
  it("lunes=0 … domingo=6", () => {
    expect(weekdayMon0OfISO("2026-06-22")).toBe(0); // lunes
    expect(weekdayMon0OfISO("2026-06-25")).toBe(3); // jueves
    expect(weekdayMon0OfISO("2026-06-28")).toBe(6); // domingo
  });
});

// ---------------------------------------------------------------------------
// Límites de tramos.
// ---------------------------------------------------------------------------
describe("bucketOfDay (límites)", () => {
  it("fecha muy antigua → overdue", () => {
    expect(bucketOfDay("2020-01-01", TODAY)).toBe("overdue");
  });
  it("hoy+5 → week", () => {
    expect(bucketOfDay("2026-06-30", TODAY)).toBe("week");
  });
  it("hoy+11 (último día) → week; hoy+12 → null", () => {
    expect(bucketOfDay("2026-07-06", TODAY)).toBe("week");
    expect(bucketOfDay("2026-07-07", TODAY)).toBeNull();
  });
});

describe("dayLabel (cruces de mes/año)", () => {
  it("hoy / mañana cruzando año", () => {
    expect(dayLabel("2026-12-31", "2026-12-31")).toBe("Hoy");
    expect(dayLabel("2027-01-01", "2026-12-31")).toBe("Mañana");
  });
  it("día con nombre en el mes/año siguiente", () => {
    expect(dayLabel("2027-01-05", "2026-12-31")).toBe("mar 5 ene");
  });
});

// ---------------------------------------------------------------------------
// Título dinámico: todas las frases temporales, plurales de estado, prioridad.
// ---------------------------------------------------------------------------
describe("digestTitle (combinaciones de tramo)", () => {
  // statusGroups con 2 elementos ⇒ no se menciona el estado; sin prioridad.
  const o = (buckets: DigestTitleOpts["buckets"]): DigestTitleOpts => ({
    buckets,
    statusGroups: ["todo", "inProgress"],
    impactGroups: [],
  });

  it("hoy y mañana", () => {
    expect(digestTitle(2, o(["today", "tomorrow"]))).toBe(
      "🔔 2 tareas para hoy y mañana"
    );
  });
  it("hoy y próximos días", () => {
    expect(digestTitle(2, o(["today", "week"]))).toBe(
      "🔔 2 tareas para hoy y los próximos días"
    );
  });
  it("mañana y próximos días", () => {
    expect(digestTitle(2, o(["tomorrow", "week"]))).toBe(
      "🔔 2 tareas para mañana y los próximos días"
    );
  });
  it("los tres tramos futuros se contraen en «los próximos días»", () => {
    expect(digestTitle(2, o(["today", "tomorrow", "week"]))).toBe(
      "🔔 2 tareas para los próximos días"
    );
  });
  it("atrasadas + mañana (sin filtros, separador con espacio)", () => {
    expect(digestTitle(2, o(["overdue", "tomorrow"]))).toBe(
      "🔔 2 tareas atrasadas y para mañana"
    );
  });
  it("sin tramos seleccionados → solo la cantidad", () => {
    expect(digestTitle(3, o([]))).toBe("🔔 3 tareas");
  });
});

describe("digestTitle (estado singular/plural)", () => {
  const o = (over: Partial<DigestTitleOpts>): DigestTitleOpts => ({
    buckets: ["overdue"],
    statusGroups: ["done"],
    impactGroups: [],
    ...over,
  });
  it("completada (n=1) con coma antes de «atrasadas»", () => {
    expect(digestTitle(1, o({}))).toBe("🔔 1 tarea completada, atrasadas");
  });
  it("completadas (n=3)", () => {
    expect(digestTitle(3, o({}))).toBe("🔔 3 tareas completadas, atrasadas");
  });
  it("«en curso» no cambia en plural", () => {
    expect(
      digestTitle(2, o({ statusGroups: ["inProgress"], buckets: ["today"] }))
    ).toBe("🔔 2 tareas en curso para hoy");
  });
  it("estado no se menciona con 0 ni con 3 grupos", () => {
    expect(digestTitle(1, o({ statusGroups: [], buckets: ["today"] }))).toBe(
      "🔔 1 tarea para hoy"
    );
    expect(
      digestTitle(
        1,
        o({ statusGroups: ["todo", "inProgress", "done"], buckets: ["today"] })
      )
    ).toBe("🔔 1 tarea para hoy");
  });
});

describe("digestTitle (prioridad)", () => {
  it("tres niveles unidos con comas y «y»", () => {
    expect(
      digestTitle(4, {
        buckets: ["today"],
        statusGroups: ["todo", "inProgress"],
        impactGroups: ["low", "medium", "high"],
      })
    ).toBe("🔔 4 tareas de impacto Bajo, Medio y Alto para hoy");
  });
  it("respeta el orden de severidad aunque se pasen desordenados", () => {
    expect(
      digestTitle(2, {
        buckets: ["overdue"],
        statusGroups: ["todo", "inProgress"],
        impactGroups: ["urgent", "low"],
      })
    ).toBe("🔔 2 tareas de impacto Bajo y Muy alto, atrasadas");
  });
  it("estado único + prioridad + tramo futuro", () => {
    expect(
      digestTitle(5, {
        buckets: ["today", "tomorrow"],
        statusGroups: ["todo"],
        impactGroups: ["high"],
      })
    ).toBe("🔔 5 tareas pendientes de impacto Alto para hoy y mañana");
  });
});

// ---------------------------------------------------------------------------
// «Más antiguas»: casos borde.
// ---------------------------------------------------------------------------
describe("buildDigest (oldest, casos borde)", () => {
  it("oldestCount mayor que las disponibles: toma todas las que no salen por tramo", () => {
    const d = buildDigest(
      [
        item({ title: "Hoy", dayISO: "2026-06-25" }),
        item({ title: "V1", dayISO: "2026-05-01" }),
        item({ title: "V2", dayISO: "2026-05-10" }),
      ],
      ["today"],
      TODAY,
      5
    );
    expect(d.total).toBe(3);
    expect(d.oldest.map((i) => i.title)).toEqual(["V1", "V2"]);
  });

  it("oldest va en orden de fecha ascendente (más antigua primero)", () => {
    const d = buildDigest(
      [
        item({ title: "Marzo", dayISO: "2026-03-15" }),
        item({ title: "Enero", dayISO: "2026-01-02" }),
        item({ title: "Mayo", dayISO: "2026-05-20" }),
      ],
      [], // ningún tramo: todas son candidatas a oldest
      TODAY,
      3
    );
    expect(d.oldest.map((i) => i.title)).toEqual(["Enero", "Marzo", "Mayo"]);
  });

  it("oldestCount 0 → sin sección de antiguas", () => {
    const d = buildDigest(
      [item({ title: "V", dayISO: "2026-01-01" })],
      ["today"],
      TODAY,
      0
    );
    expect(d.oldest).toEqual([]);
    expect(d.total).toBe(0);
  });

  it("digest vacío devuelve la forma completa", () => {
    const d = buildDigest([], ["today"], TODAY);
    expect(d).toEqual({ total: 0, groups: [], oldest: [] });
  });
});

// ---------------------------------------------------------------------------
// Helpers puros del runner (movidos a digest.ts para testearlos sin BD).
// ---------------------------------------------------------------------------
describe("normalizeName", () => {
  it("quita acentos, pasa a minúsculas y recorta", () => {
    expect(normalizeName("Ámbito")).toBe("ambito");
    expect(normalizeName("  ÁREA  ")).toBe("area");
    expect(normalizeName("Café")).toBe("cafe");
  });
});

describe("ambitoProperty", () => {
  const prop = (over: Partial<PropertyDef>): PropertyDef => ({
    id: over.id ?? "p",
    name: over.name ?? "X",
    type: over.type ?? "select",
    ...over,
  });
  const schema = (properties: PropertyDef[]): DatabaseSchema => ({ properties });

  it("encuentra la propiedad de tipo «ambito»", () => {
    const p = prop({ id: "a", name: "Equipo", type: "ambito" });
    expect(ambitoProperty(schema([p]))?.id).toBe("a");
  });
  it("compat: una selección llamada «Ámbito» (con acento)", () => {
    const p = prop({ id: "s", name: "Ámbito", type: "select" });
    expect(ambitoProperty(schema([p]))?.id).toBe("s");
  });
  it("una selección con otro nombre no cuenta", () => {
    const p = prop({ id: "s", name: "Área", type: "select" });
    expect(ambitoProperty(schema([p]))).toBeUndefined();
  });
  it("prefiere el tipo «ambito» sobre una selección llamada «ambito»", () => {
    const sel = prop({ id: "s", name: "ambito", type: "select" });
    const amb = prop({ id: "a", name: "Cualquiera", type: "ambito" });
    expect(ambitoProperty(schema([sel, amb]))?.id).toBe("a");
  });
  it("sin candidatas → undefined", () => {
    expect(ambitoProperty(schema([prop({ type: "text", name: "Notas" })]))).toBeUndefined();
  });
});

// Pruebas de INTEGRACIÓN del runner de avisos: crean un usuario/workspace/BD
// reales en la BD de dev (Postgres :5433), insertan filas con fechas y estados
// controlados, y ejecutan `computeUserDigest` para verificar que las tareas se
// recogen (o se descartan) como debe. Se ejecutan con `npm run test:integration`.
//
// Reproducen el síntoma reportado («dice que nada que notificar»): el caso más
// común es que la regla solo incluye el tramo «hoy» y no hay ninguna tarea con
// fecha EXACTAMENTE de hoy (las atrasadas/futuras no entran en ese tramo).

import {
  afterAll,
  beforeAll,
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  databases,
  digestRules,
  docs,
  notifications,
  preferences,
  rows,
  users,
  workspaces,
} from "@/db/schema";
import type { DigestRule } from "@/db/schema";
import type { DatabaseSchema, PropertyValues } from "@/lib/types";
import { computeUserDigest, deliverRule } from "@/lib/digest-runner";

// «Ahora» fijo: 2026-06-26 12:00 en Madrid (UTC+2) → hoy = 2026-06-26 (viernes).
const NOW = new Date("2026-06-26T10:00:00Z");
const TODAY = "2026-06-26";
const day = (offset: number): string => {
  const [y, m, d] = TODAY.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + offset));
  return dt.toISOString().slice(0, 10);
};

// Ids estables del fixture (prefijo reconocible para limpiar sin riesgo).
const PFX = `itest-digest-${process.pid}`;
const userId = `${PFX}-user`;
const wsId = `${PFX}-ws`;
const docId = `${PFX}-doc`;
const dbId = `${PFX}-db`;

const P = {
  title: "p-title",
  date: "p-date",
  status: "p-status",
  prio: "p-prio",
  eff: "p-eff",
  amb: "p-amb",
};

const SCHEMA: DatabaseSchema = {
  properties: [
    { id: P.title, name: "Nombre", type: "title" },
    { id: P.date, name: "Entrega", type: "date", dateRange: true },
    {
      id: P.status,
      name: "Estado",
      type: "status",
      options: [
        { id: "st-todo", name: "Pendiente", color: "gray", group: "todo" },
        { id: "st-prog", name: "En curso", color: "blue", group: "inProgress" },
        { id: "st-done", name: "Hecho", color: "green", group: "done" },
      ],
    },
    {
      id: P.prio,
      name: "Impacto",
      type: "impact",
      options: [
        { id: "pr-low", name: "Bajo", color: "gray", group: "low" },
        { id: "pr-high", name: "Alto", color: "red", group: "high" },
      ],
    },
    {
      id: P.eff,
      name: "Esfuerzo",
      type: "effort",
      options: [
        { id: "ef-xs", name: "5 min", color: "green", group: "xs" },
        { id: "ef-l", name: "Varios días", color: "red", group: "l" },
      ],
    },
    {
      id: P.amb,
      name: "Ámbito",
      type: "ambito",
      options: [
        { id: "am-crit", name: "Crítica", color: "red" },
        { id: "am-pers", name: "Personal", color: "blue" },
      ],
    },
  ],
};

// Regla base: hoy, todos los días, estados pendiente+en curso, sin más filtros.
function rule(over: Partial<DigestRule> = {}): DigestRule {
  return {
    id: `${PFX}-rule`,
    userId,
    time: "08:00",
    days: [0, 1, 2, 3, 4, 5, 6],
    buckets: ["today"],
    statusGroups: ["todo", "inProgress"],
    impactGroups: [],
    effortGroups: [],
    ambitos: [],
    oldestCount: 0,
    enabled: true,
    lastSentDate: null,
    orderKey: "a0",
    createdAt: new Date(),
    ...over,
  };
}

let rowSeq = 0;
async function addRow(values: PropertyValues): Promise<string> {
  const id = `${PFX}-row-${rowSeq++}`;
  await db.insert(rows).values({ id, databaseId: dbId, values });
  return id;
}

beforeAll(async () => {
  await db.insert(users).values({
    id: userId,
    name: "Integración Digest",
    email: `${PFX}@example.test`,
  });
  await db.insert(workspaces).values({ id: wsId, name: "WS", ownerId: userId });
  await db.insert(docs).values({
    id: docId,
    workspaceId: wsId,
    section: "team",
    kind: "database",
    title: "Tareas",
  });
  await db.insert(databases).values({ id: dbId, docId, schema: SCHEMA });
});

afterEach(async () => {
  await db.delete(rows).where(eq(rows.databaseId, dbId));
});

afterAll(async () => {
  // El borrado en cascada del usuario arrastra ws → doc → db → rows, y la regla
  // y notificaciones. Aun así limpiamos explícito por claridad.
  await db.delete(digestRules).where(eq(digestRules.userId, userId));
  await db.delete(notifications).where(eq(notifications.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
});

describe("computeUserDigest · tramos", () => {
  it("una tarea con fecha de HOY entra con buckets=[today]", async () => {
    await addRow({ [P.title]: "Hoy", [P.date]: TODAY, [P.status]: "st-todo" });
    const d = await computeUserDigest(userId, rule(), NOW);
    expect(d.total).toBe(1);
    expect(d.groups[0].label).toBe("Hoy");
    expect(d.groups[0].items[0].title).toBe("Hoy");
  });

  it("REPRODUCE «nada que notificar»: atrasada + futura con buckets=[today] → 0", async () => {
    await addRow({ [P.title]: "Atrasada", [P.date]: day(-3), [P.status]: "st-todo" });
    await addRow({ [P.title]: "Futura", [P.date]: day(4), [P.status]: "st-todo" });
    const d = await computeUserDigest(userId, rule({ buckets: ["today"] }), NOW);
    expect(d.total).toBe(0); // ← el síntoma: ninguna es de HOY
  });

  it("las mismas tareas SÍ entran al incluir overdue + week", async () => {
    await addRow({ [P.title]: "Atrasada", [P.date]: day(-3), [P.status]: "st-todo" });
    await addRow({ [P.title]: "Futura", [P.date]: day(4), [P.status]: "st-todo" });
    const d = await computeUserDigest(
      userId,
      rule({ buckets: ["overdue", "today", "week"] }),
      NOW
    );
    expect(d.total).toBe(2);
  });

  it("oldestCount rescata tareas atrasadas aunque el tramo sea solo hoy", async () => {
    await addRow({ [P.title]: "Vieja", [P.date]: day(-30), [P.status]: "st-todo" });
    const d = await computeUserDigest(
      userId,
      rule({ buckets: ["today"], oldestCount: 3 }),
      NOW
    );
    expect(d.total).toBe(1);
    expect(d.oldest.map((i) => i.title)).toEqual(["Vieja"]);
  });
});

describe("computeUserDigest · fechas", () => {
  it("rango de fechas usa el FIN como vencimiento", async () => {
    // [hace 5 días, hoy] → vence HOY (entra en buckets=[today]).
    await addRow({ [P.title]: "Rango fin hoy", [P.date]: [day(-5), TODAY], [P.status]: "st-todo" });
    const d = await computeUserDigest(userId, rule({ buckets: ["today"] }), NOW);
    expect(d.total).toBe(1);
    expect(d.groups[0].items[0].title).toBe("Rango fin hoy");
  });

  it("una fila sin valor de fecha se ignora (no rompe)", async () => {
    await addRow({ [P.title]: "Sin fecha", [P.status]: "st-todo" });
    await addRow({ [P.title]: "Hoy", [P.date]: TODAY, [P.status]: "st-todo" });
    const d = await computeUserDigest(userId, rule(), NOW);
    expect(d.total).toBe(1);
  });

  it("filas en la papelera no cuentan", async () => {
    const id = await addRow({ [P.title]: "Borrada", [P.date]: TODAY, [P.status]: "st-todo" });
    await db.update(rows).set({ deletedAt: new Date() }).where(eq(rows.id, id));
    const d = await computeUserDigest(userId, rule(), NOW);
    expect(d.total).toBe(0);
  });
});

describe("computeUserDigest · filtros", () => {
  it("estado (lenient): «hecho» se descarta; sin estado pasa", async () => {
    await addRow({ [P.title]: "Hecha", [P.date]: TODAY, [P.status]: "st-done" });
    await addRow({ [P.title]: "Sin estado", [P.date]: TODAY });
    const d = await computeUserDigest(
      userId,
      rule({ statusGroups: ["todo", "inProgress"] }),
      NOW
    );
    expect(d.total).toBe(1);
    expect(d.groups[0].items[0].title).toBe("Sin estado");
  });

  it("impacto (estricto): sin impacto se descarta si hay filtro", async () => {
    await addRow({ [P.title]: "Sin impacto", [P.date]: TODAY, [P.status]: "st-todo" });
    await addRow({ [P.title]: "Alto", [P.date]: TODAY, [P.status]: "st-todo", [P.prio]: "pr-high" });
    const d = await computeUserDigest(
      userId,
      rule({ impactGroups: ["high"] }),
      NOW
    );
    expect(d.total).toBe(1);
    expect(d.groups[0].items[0].title).toBe("Alto");
  });

  it("esfuerzo (estricto): solo el nivel pedido", async () => {
    await addRow({ [P.title]: "Rápida", [P.date]: TODAY, [P.status]: "st-todo", [P.eff]: "ef-xs" });
    await addRow({ [P.title]: "Larga", [P.date]: TODAY, [P.status]: "st-todo", [P.eff]: "ef-l" });
    const d = await computeUserDigest(userId, rule({ effortGroups: ["xs"] }), NOW);
    expect(d.total).toBe(1);
    expect(d.groups[0].items[0].title).toBe("Rápida");
  });

  it("ámbito (estricto): solo el nombre pedido", async () => {
    await addRow({ [P.title]: "Crítica", [P.date]: TODAY, [P.status]: "st-todo", [P.amb]: "am-crit" });
    await addRow({ [P.title]: "Personal", [P.date]: TODAY, [P.status]: "st-todo", [P.amb]: "am-pers" });
    const d = await computeUserDigest(
      userId,
      rule({ ambitos: ["Crítica"] }),
      NOW
    );
    expect(d.total).toBe(1);
    expect(d.groups[0].items[0].title).toBe("Crítica");
  });
});

describe("deliverRule · entrega a la bandeja", () => {
  it("crea una notificación tipo «reminder» cuando hay tareas", async () => {
    await addRow({ [P.title]: "Hoy", [P.date]: TODAY, [P.status]: "st-todo" });
    // Sin telegram_chat_id → no se envía a Telegram (preferencia ausente).
    const { total } = await deliverRule(rule(), NOW);
    expect(total).toBe(1);
    const notes = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId));
    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe("reminder");
    expect(notes[0].title).toContain("1 tarea");
    expect(notes[0].body).toContain("[Hoy](/p/");
    // Limpieza de la notificación creada (afterEach solo borra filas).
    await db.delete(notifications).where(eq(notifications.userId, userId));
  });

  it("NO crea notificación cuando no hay nada que notificar", async () => {
    await addRow({ [P.title]: "Futura", [P.date]: day(10), [P.status]: "st-todo" });
    const { total } = await deliverRule(rule({ buckets: ["today"] }), NOW);
    expect(total).toBe(0);
    const notes = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId));
    expect(notes).toHaveLength(0);
  });
});

// Limpieza defensiva de la preferencia si algún test la creara (no debería).
afterAll(async () => {
  await db.delete(preferences).where(eq(preferences.userId, userId));
});

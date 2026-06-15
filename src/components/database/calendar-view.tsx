"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Row } from "@/db/schema";
import type { DatabaseSchema, PropertyDef } from "@/lib/types";
import { findProperty, findOption } from "@/lib/database-view";
import { getRowTitle } from "@/lib/database-utils";
import { createRow } from "@/lib/actions/databases";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const pad = (n: number) => String(n).padStart(2, "0");
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function monthMatrix(year: number, month: number) {
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

export function CalendarView({
  docId,
  databaseId,
  schema,
  rows,
  datePropertyId,
}: {
  docId: string;
  databaseId: string;
  schema: DatabaseSchema;
  rows: Row[];
  datePropertyId: string | null;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });

  // Propiedad de color (primer status/select) para teñir los eventos.
  const colorProp = useMemo(
    () => schema.properties.find((p) => p.type === "status" || p.type === "select"),
    [schema]
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Row[]>();
    if (!datePropertyId) return map;
    for (const r of rows) {
      const v = r.values?.[datePropertyId];
      if (typeof v !== "string" || !v) continue;
      const day = v.slice(0, 10);
      const list = map.get(day);
      if (list) list.push(r);
      else map.set(day, [r]);
    }
    return map;
  }, [rows, datePropertyId]);

  if (!datePropertyId) {
    return (
      <p className="text-ink-faint px-2 py-8 text-sm">
        El calendario necesita una propiedad de fecha. Añade una a la base de
        datos para colocar las filas en el mes.
      </p>
    );
  }

  const weeks = monthMatrix(cursor.y, cursor.m);
  const todayIso = isoDay(today);

  return (
    <div>
      {/* Cabecera de navegación */}
      <div className="mb-3 flex items-center gap-2">
        <h3 className="font-serif text-ink text-lg font-[560] capitalize">
          {MONTHS[cursor.m]} {cursor.y}
        </h3>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() =>
              setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))
            }
            className="text-ink-soft hover:bg-sidebar-hover flex size-7 items-center justify-center rounded-sm"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => setCursor({ y: today.getFullYear(), m: today.getMonth() })}
            className="text-ink-soft hover:bg-sidebar-hover rounded-sm px-2 py-1 text-[13px]"
          >
            Hoy
          </button>
          <button
            onClick={() =>
              setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))
            }
            className="text-ink-soft hover:bg-sidebar-hover flex size-7 items-center justify-center rounded-sm"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <span className="text-ink-faint ml-auto text-xs">
          Por: {findProperty(schema, datePropertyId)?.name}
        </span>
      </div>

      {/* Rejilla */}
      <div className="border-line bg-line-soft grid grid-cols-7 gap-px overflow-hidden rounded-md border">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="bg-surface text-ink-faint px-2 py-1.5 text-[11px] font-medium uppercase"
          >
            {w}
          </div>
        ))}
        {weeks.flat().map(({ date, inMonth }) => {
          const iso = isoDay(date);
          const events = byDay.get(iso) ?? [];
          return (
            <div
              key={iso}
              className={cn(
                "bg-surface group/day min-h-[118px] p-1.5",
                !inMonth && "opacity-45"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs",
                    iso === todayIso
                      ? "bg-brand flex size-5 items-center justify-center rounded-full font-medium text-white"
                      : "text-ink-soft"
                  )}
                >
                  {date.getDate()}
                </span>
                <button
                  onClick={() => createRow(databaseId, { [datePropertyId]: iso })}
                  className="text-ink-faint hover:bg-sidebar-hover flex size-5 items-center justify-center rounded-sm opacity-0 group-hover/day:opacity-100"
                  aria-label="Nueva fila este día"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              <div className="mt-1 space-y-1">
                {events.slice(0, 3).map((r) => (
                  <Event
                    key={r.id}
                    row={r}
                    schema={schema}
                    colorProp={colorProp}
                    docId={docId}
                  />
                ))}
                {events.length > 3 && (
                  <p className="text-ink-faint px-1 text-[11px]">
                    +{events.length - 3} más
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Event({
  row,
  schema,
  colorProp,
  docId,
}: {
  row: Row;
  schema: DatabaseSchema;
  colorProp?: PropertyDef;
  docId: string;
}) {
  const opt = colorProp ? findOption(colorProp, row.values?.[colorProp.id]) : undefined;
  return (
    <Link
      href={`/p/${docId}/${row.id}`}
      className="hover:bg-sidebar-hover flex items-center gap-1.5 truncate rounded-sm px-1 py-0.5 text-[12px]"
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ background: opt ? `var(--tint-${opt.color})` : "var(--brand)" }}
      />
      <span className="text-ink truncate">{getRowTitle(row.values, schema)}</span>
    </Link>
  );
}

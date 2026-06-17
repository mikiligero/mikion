"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Row } from "@/db/schema";
import type { DatabaseSchema } from "@/lib/types";
import { findOption } from "@/lib/database-view";
import { getRowTitle } from "@/lib/database-utils";
import { atMidnight, dayDiff, parseDay, dateEnd } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

const DAYS = 30;
const DAY_W = 40; // px por día
const LABEL_W = 200; // px columna de títulos
const ROW_H = 36;
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function TimelineView({
  docId,
  schema,
  rows,
  datePropertyId,
}: {
  docId: string;
  schema: DatabaseSchema;
  rows: Row[];
  datePropertyId: string | null;
}) {
  const today = atMidnight(new Date());
  const [start, setStart] = useState(() => {
    const s = new Date(today);
    s.setDate(s.getDate() - 5); // hoy queda cerca del inicio
    return s;
  });

  const colorProp = useMemo(
    () => schema.properties.find((p) => p.type === "status" || p.type === "select"),
    [schema]
  );
  // Segunda propiedad de fecha = fin de la barra (si existe).
  const endProp = useMemo(
    () =>
      schema.properties.find((p) => p.type === "date" && p.id !== datePropertyId)?.id ??
      null,
    [schema, datePropertyId]
  );

  if (!datePropertyId) {
    return (
      <p className="text-ink-faint px-2 py-8 text-sm">
        El cronograma necesita una propiedad de fecha.
      </p>
    );
  }

  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const todayIdx = dayDiff(today, start);
  const trackW = DAYS * DAY_W;

  function shift(delta: number) {
    setStart((s) => {
      const n = new Date(s);
      n.setDate(s.getDate() + delta);
      return n;
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="font-serif text-ink text-lg font-[560]">Cronograma</h3>
        <div className="flex items-center gap-0.5">
          <button onClick={() => shift(-15)} className="text-ink-soft hover:bg-sidebar-hover flex size-7 items-center justify-center rounded-sm" aria-label="Anterior">
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => {
              const s = new Date(today);
              s.setDate(s.getDate() - 5);
              setStart(s);
            }}
            className="text-ink-soft hover:bg-sidebar-hover rounded-sm px-2 py-1 text-[13px]"
          >
            Hoy
          </button>
          <button onClick={() => shift(15)} className="text-ink-soft hover:bg-sidebar-hover flex size-7 items-center justify-center rounded-sm" aria-label="Siguiente">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="border-line overflow-x-auto rounded-md border">
        <div style={{ minWidth: LABEL_W + trackW }}>
          {/* Cabecera de días */}
          <div className="border-line flex border-b">
            <div className="shrink-0" style={{ width: LABEL_W }} />
            <div className="relative flex" style={{ width: trackW }}>
              {days.map((d, i) => {
                const wknd = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={i}
                    className={cn(
                      "text-ink-faint shrink-0 border-l py-1 text-center text-[10px]",
                      "border-line-soft",
                      wknd && "bg-sidebar/50",
                      i === todayIdx && "bg-brand-soft text-brand font-semibold"
                    )}
                    style={{ width: DAY_W }}
                  >
                    {d.getDate()}
                    {(i === 0 || d.getDate() === 1) && (
                      <div className="text-ink-ghost">{MONTHS_SHORT[d.getMonth()]}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filas */}
          {rows.map((r) => {
            const dateVal = r.values?.[datePropertyId];
            const s = parseDay(dateVal);
            // Fin: del rango integrado ([inicio, fin]) o de una 2ª propiedad fecha.
            const e =
              parseDay(dateEnd(dateVal)) ??
              (endProp ? parseDay(r.values?.[endProp]) : null);
            const startIdx = s ? dayDiff(s, start) : null;
            let endIdx = e ? dayDiff(e, start) : startIdx;
            if (startIdx !== null && endIdx !== null && endIdx < startIdx) endIdx = startIdx;
            // Barra por defecto de 3 días si no hay fecha de fin.
            const span = startIdx !== null && endIdx !== null ? endIdx - startIdx + 1 : 3;
            const visible =
              startIdx !== null && startIdx < DAYS && startIdx + span > 0;
            const clampedLeft = Math.max(0, startIdx ?? 0);
            const clampedRight = Math.min(DAYS, (startIdx ?? 0) + span);
            const opt = colorProp ? findOption(colorProp, r.values?.[colorProp.id]) : undefined;
            const bg = opt ? `var(--tint-${opt.color})` : "var(--brand)";

            return (
              <div key={r.id} className="border-line-soft flex border-b last:border-b-0">
                <div
                  className="text-ink shrink-0 truncate px-3 py-2 text-sm"
                  style={{ width: LABEL_W, height: ROW_H }}
                >
                  {getRowTitle(r.values, schema)}
                </div>
                <div className="relative" style={{ width: trackW, height: ROW_H }}>
                  {/* findes + hoy */}
                  {days.map((d, i) => {
                    const wknd = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "border-line-soft absolute top-0 h-full border-l",
                          wknd && "bg-sidebar/40",
                          i === todayIdx && "bg-brand-soft/40"
                        )}
                        style={{ left: i * DAY_W, width: DAY_W }}
                      />
                    );
                  })}
                  {visible && (
                    <Link
                      href={`/p/${docId}/${r.id}`}
                      className="absolute top-1.5 flex items-center truncate rounded-md px-2 text-[12px] font-medium text-white shadow-sm"
                      style={{
                        left: clampedLeft * DAY_W + 2,
                        width: Math.max(DAY_W, (clampedRight - clampedLeft) * DAY_W - 4),
                        height: ROW_H - 12,
                        background: bg,
                      }}
                    >
                      <span className="truncate">{getRowTitle(r.values, schema)}</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

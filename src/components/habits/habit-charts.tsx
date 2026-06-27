"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  completionRate,
  dayPercent,
  percentSeries,
  type DoneMap,
  type HabitDTO,
} from "@/lib/habits";
import { MONTHS, WEEKDAYS, monthMatrix, isoDay } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

/** Gráfica de área del % diario sobre un rango de días. SVG propio (sin libs).
 * Los días libres (sin hábitos que tocan) se omiten (la línea los salta). */
export function HabitTrendChart({
  habits,
  done,
  days,
}: {
  habits: HabitDTO[];
  done: DoneMap;
  days: string[];
}) {
  const series = percentSeries(habits, done, days);
  const W = 720;
  const H = 180;
  const padL = 28;
  const padB = 18;
  const padT = 8;
  const innerW = W - padL - 8;
  const innerH = H - padB - padT;
  const n = series.length;
  const x = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const y = (p: number) => padT + innerH - (p / 100) * innerH;

  // Solo puntos con % (días que tocaban algún hábito).
  const pts = series
    .map((s, i) => ({ i, p: s.percent }))
    .filter((pt): pt is { i: number; p: number } => pt.p !== null);
  const line = pts.map((pt) => `${x(pt.i)},${y(pt.p)}`).join(" ");
  const area = pts.length
    ? `${x(pts[0].i)},${y(0)} ${line} ${x(pts[pts.length - 1].i)},${y(0)}`
    : "";

  // Etiquetas de fecha: primero, medio y último.
  const ticks = [0, Math.floor((n - 1) / 2), n - 1].filter(
    (v, i, a) => a.indexOf(v) === i && v >= 0
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      preserveAspectRatio="none"
      style={{ height: 200 }}
    >
      {/* Rejilla horizontal 0/50/100 */}
      {[0, 50, 100].map((p) => (
        <g key={p}>
          <line
            x1={padL}
            x2={W - 8}
            y1={y(p)}
            y2={y(p)}
            stroke="var(--line)"
            strokeWidth={1}
          />
          <text
            x={padL - 6}
            y={y(p) + 3}
            textAnchor="end"
            className="fill-[var(--ink-faint)]"
            style={{ fontSize: 9 }}
          >
            {p}
          </text>
        </g>
      ))}
      {area && <polygon points={area} fill="var(--brand)" opacity={0.12} />}
      <polyline
        points={line}
        fill="none"
        stroke="var(--brand)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map((pt) => (
        <circle key={pt.i} cx={x(pt.i)} cy={y(pt.p)} r={2} fill="var(--brand)" />
      ))}
      {ticks.map((i) => (
        <text
          key={i}
          x={x(i)}
          y={H - 4}
          textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
          className="fill-[var(--ink-faint)]"
          style={{ fontSize: 9 }}
        >
          {shortDay(series[i].day)}
        </text>
      ))}
    </svg>
  );
}

/** Analítica: % de cumplimiento por hábito en el rango, con barra de color. */
export function HabitAnalytics({
  habits,
  done,
  days,
}: {
  habits: HabitDTO[];
  done: DoneMap;
  days: string[];
}) {
  return (
    <div className="space-y-2.5">
      {habits.map((h) => {
        const pct = completionRate(done[h.id], days, h.schedule);
        return (
          <div key={h.id} className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-[14px]">
              <span className="mr-1.5">{h.emoji ?? "•"}</span>
              {h.name}
            </span>
            <div className="bg-sidebar h-2 flex-1 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: `var(--tint-${h.color})` }}
              />
            </div>
            <span className="text-ink-soft w-10 shrink-0 text-right text-[13px] font-medium">
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Heatmap mensual: cada día se tiñe según el % de hábitos hechos. Navegable. */
export function HabitHeatmap({
  habits,
  done,
  today,
}: {
  habits: HabitDTO[];
  done: DoneMap;
  today: string;
}) {
  const [ty, tm] = today.split("-").map(Number);
  const [cursor, setCursor] = useState({ year: ty, month: tm - 1 });
  const weeks = monthMatrix(cursor.year, cursor.month);

  function shift(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-ink text-[14px] font-medium capitalize">
          {MONTHS[cursor.month]} {cursor.year}
        </span>
        <div className="flex items-center gap-1">
          <NavBtn onClick={() => shift(-1)} aria-label="Mes anterior">
            <ChevronLeft className="size-4" />
          </NavBtn>
          <button
            onClick={() => setCursor({ year: ty, month: tm - 1 })}
            className="text-ink-soft hover:bg-sidebar-hover rounded-md px-2 py-1 text-xs"
          >
            Hoy
          </button>
          <NavBtn onClick={() => shift(1)} aria-label="Mes siguiente">
            <ChevronRight className="size-4" />
          </NavBtn>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-ink-faint pb-1 text-center text-[10px]">
            {w}
          </div>
        ))}
        {weeks.flat().map(({ date, inMonth }, i) => {
          const iso = isoDay(date);
          const pct = inMonth ? dayPercent(habits, done, iso) : null;
          const isToday = iso === today;
          // pct null = día libre (no tocaba nada) → celda neutra tenue.
          return (
            <div
              key={i}
              title={
                inMonth ? `${date.getDate()}: ${pct === null ? "libre" : pct + "%"}` : ""
              }
              className={cn(
                "flex aspect-square items-center justify-center rounded-md text-[11px]",
                !inMonth && "opacity-0",
                isToday ? "ring-brand ring-2" : ""
              )}
              style={
                inMonth
                  ? {
                      background:
                        pct && pct > 0
                          ? `color-mix(in srgb, var(--brand) ${pct}%, var(--sidebar))`
                          : "var(--sidebar)",
                      color: pct && pct >= 55 ? "white" : "var(--ink-faint)",
                      opacity: pct === null ? 0.4 : 1,
                    }
                  : undefined
              }
            >
              {inMonth ? date.getDate() : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NavBtn({
  onClick,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      {...rest}
      className="text-ink-soft hover:bg-sidebar-hover flex size-7 items-center justify-center rounded-md"
    >
      {children}
    </button>
  );
}

function shortDay(dayISO: string): string {
  const [, m, d] = dayISO.split("-").map(Number);
  return `${d} ${MONTHS[m - 1].slice(0, 3)}`;
}

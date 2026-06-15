"use client";

import { useMemo } from "react";
import { BarChart3, PieChart } from "lucide-react";
import type { Row } from "@/db/schema";
import type { DatabaseSchema, ViewConfig } from "@/lib/types";
import { groupRows } from "@/lib/database-view";
import { cn } from "@/lib/utils";

const tint = (color: string | undefined) =>
  color ? `var(--tint-${color})` : "var(--ink-faint)";

export function ChartView({
  schema,
  rows,
  config,
  onChange,
}: {
  schema: DatabaseSchema;
  rows: Row[];
  config: ViewConfig;
  onChange: (patch: Partial<ViewConfig>) => void;
}) {
  const groupable = useMemo(
    () => schema.properties.filter((p) => p.type === "status" || p.type === "select"),
    [schema]
  );
  const groupId = config.chartGroupBy ?? groupable[0]?.id ?? null;
  const chartType = config.chartType ?? "bar";

  const segments = useMemo(() => {
    if (!groupId) return [];
    return groupRows(rows, schema, groupId)
      .map((g) => ({
        label: g.label,
        color: g.option?.color,
        count: g.rows.length,
      }))
      .filter((s) => s.count > 0);
  }, [rows, schema, groupId]);

  const total = segments.reduce((a, s) => a + s.count, 0);

  if (!groupId) {
    return (
      <p className="text-ink-faint px-2 py-8 text-sm">
        El gráfico necesita una propiedad de selección o estado para agrupar.
      </p>
    );
  }

  return (
    <div>
      {/* Controles */}
      <div className="mb-5 flex items-center gap-3">
        <div className="border-line bg-sidebar inline-flex rounded-md border p-0.5">
          <ChartTypeButton
            active={chartType === "bar"}
            onClick={() => onChange({ chartType: "bar" })}
            icon={<BarChart3 className="size-4" />}
            label="Barras"
          />
          <ChartTypeButton
            active={chartType === "donut"}
            onClick={() => onChange({ chartType: "donut" })}
            icon={<PieChart className="size-4" />}
            label="Tarta"
          />
        </div>
        <select
          value={groupId}
          onChange={(e) => onChange({ chartGroupBy: e.target.value })}
          className="border-line bg-surface text-ink-soft rounded-md border px-2 py-1 text-[13px] outline-none"
        >
          {groupable.map((p) => (
            <option key={p.id} value={p.id}>
              Por {p.name}
            </option>
          ))}
        </select>
        <span className="text-ink-faint ml-auto text-sm">{total} en total</span>
      </div>

      {total === 0 ? (
        <p className="text-ink-faint text-sm">No hay datos para mostrar.</p>
      ) : chartType === "donut" ? (
        <Donut segments={segments} total={total} />
      ) : (
        <Bars segments={segments} total={total} />
      )}
    </div>
  );
}

type Seg = { label: string; color?: string; count: number };

function Bars({ segments, total }: { segments: Seg[]; total: number }) {
  const max = Math.max(...segments.map((s) => s.count));
  return (
    <div className="max-w-xl space-y-2.5">
      {segments.map((s) => (
        <div key={s.label} className="flex items-center gap-3 text-sm">
          <span className="text-ink-soft w-28 shrink-0 truncate">{s.label}</span>
          <div className="bg-sidebar h-5 flex-1 overflow-hidden rounded">
            <div
              className="h-full rounded"
              style={{ width: `${(s.count / max) * 100}%`, background: tint(s.color) }}
            />
          </div>
          <span className="text-ink w-20 shrink-0 text-right tabular-nums">
            {s.count}{" "}
            <span className="text-ink-faint">
              {Math.round((s.count / total) * 100)}%
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function Donut({ segments, total }: { segments: Seg[]; total: number }) {
  const r = 80;
  const sw = 28;
  const circ = 2 * Math.PI * r;
  // Sumas de prefijo (sin mutación durante el render).
  const arcs = segments.map((s, i) => {
    const prev = segments.slice(0, i).reduce((a, x) => a + x.count, 0);
    return {
      label: s.label,
      color: s.color,
      dash: (s.count / total) * circ,
      offset: (prev / total) * circ,
    };
  });

  return (
    <div className="flex flex-wrap items-center gap-10">
      <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
        {arcs.map((a) => (
          <circle
            key={a.label}
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke={tint(a.color)}
            strokeWidth={sw}
            strokeDasharray={`${a.dash} ${circ - a.dash}`}
            strokeDashoffset={-a.offset}
          />
        ))}
        <text
          x="100"
          y="100"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-ink rotate-90 text-2xl font-semibold"
          style={{ transformOrigin: "100px 100px" }}
        >
          {total}
        </text>
      </svg>

      <ul className="space-y-1.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-sm">
            <span
              className="size-3 rounded-sm"
              style={{ background: tint(s.color) }}
            />
            <span className="text-ink-soft w-28 truncate">{s.label}</span>
            <span className="text-ink tabular-nums">
              {s.count}{" "}
              <span className="text-ink-faint">
                {Math.round((s.count / total) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartTypeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-[13px]",
        active ? "bg-surface text-ink shadow-sm" : "text-ink-soft"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

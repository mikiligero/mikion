"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Plus, Trash2, Flame } from "lucide-react";
import { EmojiPickerPopover } from "@/components/editor/emoji-picker";
import { renameDoc, updateDocMeta } from "@/lib/actions/docs";
import {
  createHabit,
  updateHabit,
  deleteHabit,
  toggleHabitLog,
} from "@/lib/actions/habits";
import {
  buildDoneMap,
  countsOnDay,
  dayMessage,
  dayPercent,
  lastDays,
  streak,
  timesThisWeek,
  type HabitDTO,
} from "@/lib/habits";
import type { HabitSchedule } from "@/lib/types";
import {
  HabitTrendChart,
  HabitAnalytics,
  HabitHeatmap,
} from "@/components/habits/habit-charts";
import { WEEKDAYS } from "@/lib/calendar-utils";
import { SELECT_COLORS } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type LogRow = { habitId: string; day: string };

export function HabitContainer({
  doc,
  habits: initialHabits,
  logs: initialLogs,
  today,
  readOnly = false,
}: {
  doc: { id: string; emoji: string | null; title: string };
  habits: HabitDTO[];
  logs: LogRow[];
  today: string;
  readOnly?: boolean;
}) {
  const [emoji, setEmoji] = useState(doc.emoji);
  const [title, setTitle] = useState(doc.title);
  const [habits, setHabits] = useState<HabitDTO[]>(initialHabits);
  // done: habitId → Set<día>. Estado local optimista.
  const [done, setDone] = useState(() => buildDoneMap(initialLogs));
  const [newName, setNewName] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    document.title = `${title.trim() || "Hábitos"} · Mikion`;
  }, [title]);

  const days = useMemo(() => lastDays(today, 7), [today]);
  const days30 = useMemo(() => lastDays(today, 30), [today]);
  // Hábitos que «tocan» hoy (para el bloque Hoy) y objetivos semanales (times).
  const dueToday = habits.filter((h) => countsOnDay(h.schedule, today));
  const weeklyGoals = habits.filter((h) => h.schedule.type === "times");

  function saveTitle() {
    if (title !== doc.title) startTransition(() => renameDoc(doc.id, title));
  }
  function saveEmoji(next: string) {
    setEmoji(next);
    startTransition(() => updateDocMeta(doc.id, { emoji: next }));
  }

  function toggle(habitId: string, day: string) {
    if (readOnly) return;
    const isDone = done[habitId]?.has(day) ?? false;
    setDone((prev) => {
      const next: typeof prev = { ...prev };
      const set = new Set(next[habitId] ?? []);
      if (isDone) set.delete(day);
      else set.add(day);
      next[habitId] = set;
      return next;
    });
    void toggleHabitLog(habitId, day, !isDone);
  }

  function addHabit() {
    const name = newName.trim();
    if (!name || readOnly) return;
    setNewName("");
    startTransition(async () => {
      const created = await createHabit(doc.id, { name });
      setHabits((hs) => [...hs, created]);
    });
  }

  function removeHabit(id: string) {
    setHabits((hs) => hs.filter((h) => h.id !== id));
    setDone((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    void deleteHabit(id);
  }

  function patchHabit(id: string, patch: Partial<HabitDTO>) {
    setHabits((hs) => hs.map((h) => (h.id === id ? { ...h, ...patch } : h)));
    void updateHabit(id, patch);
  }

  const todayPct = dayPercent(habits, done, today); // null = día libre
  const todayMsg = todayPct === null ? null : dayMessage(todayPct);

  return (
    <div className="mx-auto max-w-3xl px-10 pt-10 pb-16">
      {/* Cabecera */}
      <div className="flex items-center gap-1">
        <EmojiPickerPopover
          onSelect={saveEmoji}
          trigger={
            <button className="hover:bg-sidebar-hover -ml-1 inline-flex rounded-md p-1 text-3xl leading-none">
              {emoji ?? "✅"}
            </button>
          }
        />
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value.replace(/\r?\n/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          onBlur={saveTitle}
          readOnly={readOnly}
          rows={1}
          placeholder="Hábitos"
          className="font-serif text-ink placeholder:text-ink-ghost w-full resize-none border-none bg-transparent text-[32px] font-[560] leading-[1.12] outline-none"
        />
      </div>

      {habits.length === 0 ? (
        <EmptyState onAdd={addHabit} value={newName} onChange={setNewName} readOnly={readOnly} />
      ) : (
        <>
          {/* Hoy */}
          <section className="border-line mt-8 rounded-xl border p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-ink text-[20px] font-[560]">Hoy</h2>
              <span className="text-ink-faint text-sm">{prettyDate(today)}</span>
            </div>

            {dueToday.length === 0 ? (
              <p className="text-ink-faint mt-3 text-sm">
                Hoy no toca ningún hábito. Día libre 🌙
              </p>
            ) : (
              <div className="mt-3 space-y-1.5">
                {dueToday.map((h) => {
                  const isDone = done[h.id]?.has(today) ?? false;
                  const s = streak(done[h.id], today, h.schedule);
                  return (
                    <button
                      key={h.id}
                      onClick={() => toggle(h.id, today)}
                      disabled={readOnly}
                      className={cn(
                        "group/h flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        isDone ? "" : "hover:bg-sidebar-hover"
                      )}
                      style={
                        isDone ? { background: `var(--tint-${h.color}-bg)` } : undefined
                      }
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                          isDone ? "border-transparent text-white" : "border-line"
                        )}
                        style={isDone ? { background: `var(--tint-${h.color})` } : undefined}
                      >
                        {isDone && <Check className="size-4" strokeWidth={3} />}
                      </span>
                      <span className="text-base">{h.emoji ?? "•"}</span>
                      <span className="text-ink flex-1 text-[15px] font-medium">
                        {h.name}
                      </span>
                      {s > 0 && (
                        <span className="text-ink-soft inline-flex items-center gap-1 text-[13px]">
                          <Flame className="size-3.5 text-orange-500" /> {s}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Progreso del día */}
            {todayPct !== null && (
              <div className="mt-4 flex items-center gap-3">
                <div className="bg-sidebar h-2 flex-1 overflow-hidden rounded-full">
                  <div
                    className="bg-brand h-full rounded-full transition-all"
                    style={{ width: `${todayPct}%` }}
                  />
                </div>
                <span className="text-ink-soft w-28 text-right text-sm font-medium">
                  {todayPct}%{todayMsg ? ` · ${todayMsg}` : ""}
                </span>
              </div>
            )}

            {/* Objetivos semanales (hábitos de tipo «N veces por semana») */}
            {weeklyGoals.length > 0 && (
              <div className="border-line mt-4 space-y-2 border-t pt-3">
                <p className="text-ink-faint text-[11px] font-medium uppercase tracking-[0.04em]">
                  Esta semana
                </p>
                {weeklyGoals.map((h) => {
                  const goal =
                    h.schedule.type === "times" ? h.schedule.perWeek : 0;
                  const n = timesThisWeek(done[h.id], today);
                  const pct = goal ? Math.min(100, (n / goal) * 100) : 0;
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
                      <span className="text-ink-soft w-12 shrink-0 text-right text-[13px] font-medium">
                        {n}/{goal}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Últimos 7 días */}
          <section className="mt-8">
            <h2 className="font-serif text-ink mb-3 text-[20px] font-[560]">
              Últimos 7 días
            </h2>
            <div className="border-line overflow-x-auto rounded-xl border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-line border-b">
                    <th className="w-48 px-3 py-2 text-left font-medium text-ink-faint">
                      Hábito
                    </th>
                    {days.map((d) => (
                      <th
                        key={d}
                        className={cn(
                          "px-2 py-2 text-center text-[11px] font-medium",
                          d === today ? "text-brand" : "text-ink-faint"
                        )}
                      >
                        {dayHeader(d)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {habits.map((h) => (
                    <tr key={h.id} className="border-line group/row border-b last:border-0">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <EmojiPickerPopover
                            onSelect={(e) => patchHabit(h.id, { emoji: e })}
                            trigger={
                              <button className="hover:bg-sidebar-hover rounded p-0.5 text-base leading-none">
                                {h.emoji ?? "•"}
                              </button>
                            }
                          />
                          <ColorDot
                            color={h.color}
                            onPick={(c) => patchHabit(h.id, { color: c })}
                            disabled={readOnly}
                          />
                          <input
                            defaultValue={h.name}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v && v !== h.name) patchHabit(h.id, { name: v });
                            }}
                            readOnly={readOnly}
                            className="text-ink min-w-0 flex-1 bg-transparent text-[14px] outline-none"
                          />
                          {!readOnly && (
                            <SchedulePopover
                              schedule={h.schedule}
                              onChange={(s) => patchHabit(h.id, { schedule: s })}
                            />
                          )}
                          {!readOnly && (
                            <button
                              onClick={() => removeHabit(h.id)}
                              aria-label="Eliminar hábito"
                              className="text-ink-faint shrink-0 opacity-0 hover:text-red-600 group-hover/row:opacity-100"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      {days.map((d) => {
                        const isDone = done[h.id]?.has(d) ?? false;
                        // En hábitos «weekly» los días que no tocan se atenúan
                        // (pero siguen siendo marcables como sesión extra).
                        const scheduled =
                          h.schedule.type !== "weekly" || countsOnDay(h.schedule, d);
                        return (
                          <td key={d} className="px-2 py-2 text-center">
                            <button
                              onClick={() => toggle(h.id, d)}
                              disabled={readOnly}
                              aria-label={isDone ? "Hecho" : "Marcar"}
                              className={cn(
                                "inline-flex size-5 items-center justify-center rounded-md border transition-colors",
                                isDone
                                  ? "border-transparent text-white"
                                  : scheduled
                                    ? "border-line hover:bg-sidebar-hover"
                                    : "text-ink-ghost border-transparent"
                              )}
                              style={isDone ? { background: `var(--tint-${h.color})` } : undefined}
                            >
                              {isDone ? (
                                <Check className="size-3.5" strokeWidth={3} />
                              ) : scheduled ? null : (
                                "·"
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-sidebar/40 text-ink-faint text-[12px]">
                    <td className="px-3 py-1.5 font-medium">% del día</td>
                    {days.map((d) => {
                      const pct = dayPercent(habits, done, d);
                      return (
                        <td key={d} className="px-2 py-1.5 text-center">
                          {pct === null ? "–" : `${pct}%`}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Añadir hábito */}
            {!readOnly && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addHabit()}
                  placeholder="Nuevo hábito…"
                  className="border-line bg-surface text-ink max-w-xs flex-1 rounded-md border px-3 py-1.5 text-sm outline-none"
                />
                <button
                  onClick={addHabit}
                  className="text-ink-soft hover:bg-sidebar-hover inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm"
                >
                  <Plus className="size-4" /> Añadir
                </button>
              </div>
            )}
          </section>

          {/* Evolución (últimos 30 días) */}
          <section className="mt-8">
            <h2 className="font-serif text-ink mb-3 text-[20px] font-[560]">
              Evolución
            </h2>
            <div className="border-line rounded-xl border p-4">
              <HabitTrendChart habits={habits} done={done} days={days30} />
            </div>
          </section>

          {/* Analítica por hábito (30 días) */}
          <section className="mt-8">
            <h2 className="font-serif text-ink mb-3 text-[20px] font-[560]">
              Analítica <span className="text-ink-faint text-sm font-normal">· últimos 30 días</span>
            </h2>
            <div className="border-line rounded-xl border p-5">
              <HabitAnalytics habits={habits} done={done} days={days30} />
            </div>
          </section>

          {/* Histórico (heatmap mensual) */}
          <section className="mt-8">
            <h2 className="font-serif text-ink mb-3 text-[20px] font-[560]">
              Histórico
            </h2>
            <div className="border-line rounded-xl border p-5">
              <HabitHeatmap habits={habits} done={done} today={today} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

/** Resumen corto del horario, para el botón. */
function scheduleLabel(s: HabitSchedule): string {
  if (s.type === "daily") return "Diario";
  if (s.type === "times") return `${s.perWeek}×/sem`;
  if (s.days.length === 7) return "Diario";
  if (s.days.length === 0) return "Sin días";
  return s.days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join("");
}

/** Editor de horario de un hábito: diario, días de la semana, o N por semana. */
function SchedulePopover({
  schedule,
  onChange,
}: {
  schedule: HabitSchedule;
  onChange: (s: HabitSchedule) => void;
}) {
  function toggleDay(d: number) {
    const days =
      schedule.type === "weekly" ? schedule.days : [0, 1, 2, 3, 4, 5, 6];
    const next = days.includes(d)
      ? days.filter((x) => x !== d)
      : [...days, d];
    onChange({ type: "weekly", days: next });
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Horario"
          className="text-ink-faint hover:bg-sidebar-hover shrink-0 rounded px-1.5 py-0.5 text-[11px]"
        >
          {scheduleLabel(schedule)}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="space-y-1">
          <SchedRadio
            label="Todos los días"
            active={schedule.type === "daily"}
            onClick={() => onChange({ type: "daily" })}
          />
          <SchedRadio
            label="Días de la semana"
            active={schedule.type === "weekly"}
            onClick={() =>
              onChange({ type: "weekly", days: schedule.type === "weekly" ? schedule.days : [0, 2, 4] })
            }
          />
          {schedule.type === "weekly" && (
            <div className="flex gap-1 px-1 pb-1">
              {DAY_LABELS.map((label, d) => (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-md text-[11px] font-medium",
                    schedule.days.includes(d)
                      ? "bg-brand text-paper"
                      : "bg-sidebar text-ink-soft hover:bg-sidebar-hover"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <SchedRadio
            label="N veces por semana"
            active={schedule.type === "times"}
            onClick={() =>
              onChange({
                type: "times",
                perWeek: schedule.type === "times" ? schedule.perWeek : 3,
              })
            }
          />
          {schedule.type === "times" && (
            <div className="flex items-center gap-2 px-1 pb-1">
              <input
                type="number"
                min={1}
                max={7}
                value={schedule.perWeek}
                onChange={(e) =>
                  onChange({
                    type: "times",
                    perWeek: Math.min(7, Math.max(1, Number(e.target.value) || 1)),
                  })
                }
                className="border-line bg-surface text-ink w-16 rounded-md border px-2 py-1 text-sm outline-none"
              />
              <span className="text-ink-faint text-xs">veces / semana</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SchedRadio({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
        active ? "bg-sidebar-hover text-ink font-medium" : "text-ink-soft hover:bg-sidebar-hover"
      )}
    >
      <span
        className={cn(
          "flex size-3.5 items-center justify-center rounded-full border",
          active ? "border-brand" : "border-line"
        )}
      >
        {active && <span className="bg-brand size-2 rounded-full" />}
      </span>
      {label}
    </button>
  );
}

function ColorDot({
  color,
  onPick,
  disabled,
}: {
  color: string;
  onPick: (c: string) => void;
  disabled?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          aria-label="Color"
          className="size-3 shrink-0 rounded-full ring-1 ring-black/10"
          style={{ background: `var(--tint-${color})` }}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-1.5">
        <div className="grid grid-cols-5 gap-1.5">
          {SELECT_COLORS.filter((c) => c.key !== "default").map((c) => (
            <button
              key={c.key}
              onClick={() => onPick(c.key)}
              title={c.label}
              className="size-5 rounded-full ring-1 ring-black/10"
              style={{ background: `var(--tint-${c.key})` }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function EmptyState({
  onAdd,
  value,
  onChange,
  readOnly,
}: {
  onAdd: () => void;
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
}) {
  return (
    <div className="border-line mt-8 rounded-xl border border-dashed p-10 text-center">
      <p className="text-ink-soft text-sm">
        Aún no tienes hábitos. Añade el primero para empezar a marcarlos cada día.
      </p>
      {!readOnly && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAdd()}
            placeholder="p. ej. Beber agua"
            className="border-line bg-surface text-ink w-56 rounded-md border px-3 py-1.5 text-sm outline-none"
          />
          <button
            onClick={onAdd}
            className="bg-brand text-paper inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm"
          >
            <Plus className="size-4" /> Añadir
          </button>
        </div>
      )}
    </div>
  );
}

/** "lun 23 jun" para la cabecera de columna. */
function dayHeader(dayISO: string): string {
  const [y, m, d] = dayISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const wd = WEEKDAYS[(dt.getDay() + 6) % 7];
  return `${wd} ${d}`;
}

/** "sábado, 14 de junio" para el encabezado de Hoy. */
function prettyDate(dayISO: string): string {
  const [y, m, d] = dayISO.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

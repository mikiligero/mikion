"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Filter, Plus } from "lucide-react";
import { toast } from "sonner";
import { MONTHS, WEEKDAYS, isoDay, monthMatrix } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

export type CalEvent = {
  id: string;
  docId: string;
  title: string;
  date: string; // YYYY-MM-DD
  color?: string; // clave de tint
};

const dot = (c?: string) => (c ? `var(--tint-${c})` : "var(--brand)");

export function TeamCalendar({
  title,
  events,
}: {
  title: string;
  events: CalEvent[];
}) {
  const [mode, setMode] = useState<"month" | "list">("month");

  return (
    <div className="px-10 py-8">
      <div className="flex items-center gap-2">
        <span className="text-3xl leading-none">📅</span>
        <h1 className="font-serif text-ink text-[32px] font-[560]">
          {title || "Calendario"}
        </h1>
      </div>

      <div className="border-line mt-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-1">
          {(
            [
              ["month", "Mes"],
              ["list", "Lista"],
            ] as ["month" | "list", string][]
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "border-b-2 px-2 pb-2 text-[13.5px]",
                mode === m
                  ? "border-brand text-ink font-medium"
                  : "text-ink-soft border-transparent"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 pb-1.5">
          <button
            onClick={() => toast("Filtrar · próximamente")}
            className="text-ink-soft hover:bg-sidebar-hover flex items-center gap-1.5 rounded-sm px-2 py-1 text-[13px]"
          >
            <Filter className="size-3.5" /> Filtrar
          </button>
          <button
            onClick={() => toast("Los eventos salen de las fechas de tus bases de datos")}
            className="bg-primary text-primary-foreground ml-1 flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium"
          >
            <Plus className="size-3.5" /> Evento
          </button>
        </div>
      </div>

      <div className="mt-4">
        {mode === "month" ? (
          <MonthGrid events={events} />
        ) : (
          <Agenda events={events} />
        )}
      </div>
    </div>
  );
}

function MonthGrid({ events }: { events: CalEvent[] }) {
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const list = map.get(e.date);
      if (list) list.push(e);
      else map.set(e.date, [e]);
    }
    return map;
  }, [events]);

  const weeks = monthMatrix(cursor.y, cursor.m);
  const todayIso = isoDay(today);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="font-serif text-ink text-lg font-[560] capitalize">
          {MONTHS[cursor.m]} {cursor.y}
        </h3>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))} className="text-ink-soft hover:bg-sidebar-hover flex size-7 items-center justify-center rounded-sm" aria-label="Mes anterior">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={() => setCursor({ y: today.getFullYear(), m: today.getMonth() })} className="text-ink-soft hover:bg-sidebar-hover rounded-sm px-2 py-1 text-[13px]">
            Hoy
          </button>
          <button onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))} className="text-ink-soft hover:bg-sidebar-hover flex size-7 items-center justify-center rounded-sm" aria-label="Mes siguiente">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="border-line bg-line-soft grid grid-cols-7 gap-px overflow-hidden rounded-md border">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-surface text-ink-faint px-2 py-1.5 text-[11px] font-medium uppercase">
            {w}
          </div>
        ))}
        {weeks.flat().map(({ date, inMonth }) => {
          const iso = isoDay(date);
          const evs = byDay.get(iso) ?? [];
          return (
            <div key={iso} className={cn("bg-surface min-h-[110px] p-1.5", !inMonth && "opacity-45")}>
              <span className={cn("text-xs", iso === todayIso ? "bg-brand flex size-5 items-center justify-center rounded-full font-medium text-white" : "text-ink-soft")}>
                {date.getDate()}
              </span>
              <div className="mt-1 space-y-1">
                {evs.slice(0, 3).map((e) => (
                  <Link key={e.id} href={`/p/${e.docId}/${e.id}`} className="hover:bg-sidebar-hover flex items-center gap-1.5 truncate rounded-sm px-1 py-0.5 text-[12px]">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: dot(e.color) }} />
                    <span className="text-ink truncate">{e.title}</span>
                  </Link>
                ))}
                {evs.length > 3 && <p className="text-ink-faint px-1 text-[11px]">+{evs.length - 3} más</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Agenda({ events }: { events: CalEvent[] }) {
  const todayIso = isoDay(new Date());
  const days = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of [...events].sort((a, b) => a.date.localeCompare(b.date))) {
      const list = map.get(e.date);
      if (list) list.push(e);
      else map.set(e.date, [e]);
    }
    return Array.from(map.entries());
  }, [events]);

  if (days.length === 0) {
    return (
      <p className="text-ink-faint py-10 text-center text-sm">
        No hay eventos. Añade fechas a tus bases de datos y aparecerán aquí.
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      {days.map(([date, evs]) => {
        const d = new Date(date + "T00:00:00");
        const isToday = date === todayIso;
        const past = date < todayIso;
        return (
          <div key={date} className={cn("flex gap-4", past && "opacity-55")}>
            <div className="w-14 shrink-0 text-right">
              <div className="font-serif text-ink text-2xl font-[560]">{d.getDate()}</div>
              <div className="text-ink-faint text-[11px] uppercase">
                {WEEKDAYS[(d.getDay() + 6) % 7]}
              </div>
              {isToday && (
                <div className="text-brand text-[11px] font-medium">Hoy</div>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              {evs.map((e) => (
                <Link
                  key={e.id}
                  href={`/p/${e.docId}/${e.id}`}
                  className="border-line bg-surface hover:border-line-strong flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm"
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: dot(e.color) }} />
                  <span className="text-ink truncate">{e.title}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

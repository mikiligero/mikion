"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Plus,
  Table2,
  Columns3,
  CalendarDays,
  GanttChartSquare,
  PieChart,
  Zap,
} from "lucide-react";
import type { Row } from "@/db/schema";
import type { Automation, DatabaseSchema, ViewConfig, ViewType } from "@/lib/types";
import { applyView, visibleProperties } from "@/lib/database-view";
import { updateView, createView } from "@/lib/actions/databases";
import { renameDoc, updateDocMeta } from "@/lib/actions/docs";
import { EmojiPickerPopover } from "@/components/editor/emoji-picker";
import { cn } from "@/lib/utils";
import { TableView } from "./table-view";
import { BoardView } from "./board-view";
import { CalendarView } from "./calendar-view";
import { TimelineView } from "./timeline-view";
import { ChartView } from "./chart-view";
import { DatabaseToolbar } from "./toolbar";
import { AutomationsDialog } from "./automations-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ViewMeta = {
  id: string;
  name: string;
  type: ViewType;
  config: ViewConfig;
};

export function DatabaseContainer({
  doc,
  database,
  views,
  rows,
}: {
  doc: { id: string; emoji: string | null; title: string };
  database: { id: string; schema: DatabaseSchema; automations: Automation[] };
  views: ViewMeta[];
  rows: Row[];
}) {
  const [activeId, setActiveId] = useState(views[0]?.id ?? null);
  const [autoOpen, setAutoOpen] = useState(false);
  const [emoji, setEmoji] = useState(doc.emoji);
  const [title, setTitle] = useState(doc.title);
  const [, startTransition] = useTransition();

  function saveEmoji(next: string) {
    setEmoji(next);
    startTransition(() => updateDocMeta(doc.id, { emoji: next }));
  }

  function saveTitle() {
    if (title !== doc.title) startTransition(() => renameDoc(doc.id, title));
  }
  const [configs, setConfigs] = useState<Record<string, ViewConfig>>(() =>
    Object.fromEntries(views.map((v) => [v.id, v.config]))
  );

  const activeView = views.find((v) => v.id === activeId) ?? views[0];
  const config = useMemo<ViewConfig>(
    () =>
      (activeId ? configs[activeId] : undefined) ||
      activeView?.config || { filters: [], sorts: [] },
    [activeId, configs, activeView]
  );

  function patchConfig(patch: Partial<ViewConfig>) {
    if (!activeId) return;
    setConfigs((prev) => ({ ...prev, [activeId]: { ...config, ...patch } }));
    void updateView(activeId, patch);
  }

  const viewRows = useMemo(
    () => applyView(rows, database.schema, config),
    [rows, database.schema, config]
  );

  // Para el tablero: propiedad de agrupación (config o primera select/status).
  const groupPropertyId = useMemo(() => {
    if (config.groupBy) return config.groupBy;
    return (
      database.schema.properties.find(
        (p) => p.type === "select" || p.type === "status"
      )?.id ?? null
    );
  }, [config.groupBy, database.schema]);

  // Para el calendario: propiedad de fecha (config o primera de tipo date).
  const datePropertyId = useMemo(() => {
    if (config.datePropertyId) return config.datePropertyId;
    return database.schema.properties.find((p) => p.type === "date")?.id ?? null;
  }, [config.datePropertyId, database.schema]);

  return (
    <div className="px-10 py-8">
      {/* Cabecera editable (emoji + título) */}
      <div className="flex items-center gap-1">
        <EmojiPickerPopover
          onSelect={saveEmoji}
          trigger={
            <button className="hover:bg-sidebar-hover -ml-1 inline-flex rounded-md p-1 text-3xl leading-none">
              {emoji ?? "🗂️"}
            </button>
          }
        />
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value.replace(/\r?\n/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          onBlur={saveTitle}
          rows={1}
          placeholder="Sin título"
          className="font-serif text-ink placeholder:text-ink-ghost w-full resize-none border-none bg-transparent text-[32px] font-[560] leading-[1.12] outline-none"
        />
      </div>

      {/* Pestañas + toolbar */}
      <div className="border-line mt-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-1">
          {views.map((v) => (
            <button
              key={v.id}
              onClick={() => setActiveId(v.id)}
              className={cn(
                "border-b-2 px-2 pb-2 text-[13.5px]",
                activeId === v.id
                  ? "border-brand text-ink font-medium"
                  : "text-ink-soft border-transparent"
              )}
            >
              {v.name}
            </button>
          ))}
          <AddViewMenu databaseId={database.id} />
        </div>

        <div className="flex items-center gap-0.5 pb-1.5">
          <DatabaseToolbar
            schema={database.schema}
            config={config}
            onChange={patchConfig}
          />
          <button
            onClick={() => setAutoOpen(true)}
            className="text-ink-soft hover:bg-sidebar-hover flex items-center gap-1.5 rounded-sm px-2 py-1 text-[13px]"
          >
            <Zap className="size-3.5" /> Automatizar
          </button>
        </div>
      </div>

      <AutomationsDialog
        databaseId={database.id}
        automations={database.automations}
        open={autoOpen}
        onOpenChange={setAutoOpen}
      />

      {/* Vista activa */}
      <div className="mt-3">
        {activeView?.type === "board" ? (
          <BoardView
            docId={doc.id}
            databaseId={database.id}
            schema={database.schema}
            rows={viewRows}
            groupPropertyId={groupPropertyId}
            visibleProps={visibleProperties(database.schema, config)}
          />
        ) : activeView?.type === "calendar" ? (
          <CalendarView
            docId={doc.id}
            databaseId={database.id}
            schema={database.schema}
            rows={viewRows}
            datePropertyId={datePropertyId}
          />
        ) : activeView?.type === "timeline" ? (
          <TimelineView
            docId={doc.id}
            schema={database.schema}
            rows={viewRows}
            datePropertyId={datePropertyId}
          />
        ) : activeView?.type === "chart" ? (
          <ChartView
            schema={database.schema}
            rows={viewRows}
            config={config}
            onChange={patchConfig}
          />
        ) : (
          <TableView
            docId={doc.id}
            databaseId={database.id}
            schema={database.schema}
            rows={viewRows}
            config={config}
          />
        )}
      </div>
    </div>
  );
}

function AddViewMenu({ databaseId }: { databaseId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="text-ink-faint hover:bg-sidebar-hover ml-1 flex size-6 items-center justify-center rounded-sm"
          aria-label="Añadir vista"
        >
          <Plus className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuItem onClick={() => createView(databaseId, "table")}>
          <Table2 className="size-4" /> Tabla
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => createView(databaseId, "board")}>
          <Columns3 className="size-4" /> Tablero
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => createView(databaseId, "calendar")}>
          <CalendarDays className="size-4" /> Calendario
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => createView(databaseId, "timeline")}>
          <GanttChartSquare className="size-4" /> Cronograma
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => createView(databaseId, "chart")}>
          <PieChart className="size-4" /> Gráfico
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

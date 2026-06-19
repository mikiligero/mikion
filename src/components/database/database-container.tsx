"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Plus,
  Table2,
  Columns3,
  CalendarDays,
  GanttChartSquare,
  PieChart,
  Zap,
  ChevronDown,
  Trash2,
} from "lucide-react";
import type { Row } from "@/db/schema";
import type {
  Automation,
  DatabaseSchema,
  DbTemplate,
  SelectOption,
  ViewConfig,
  ViewType,
} from "@/lib/types";
import { applyView, visibleProperties } from "@/lib/database-view";
import { updateView, createView, deleteView } from "@/lib/actions/databases";
import { renameDoc, updateDocMeta } from "@/lib/actions/docs";
import { coverBackground } from "@/lib/covers";
import { EmojiPickerPopover } from "@/components/editor/emoji-picker";
import { CoverPicker } from "@/components/editor/cover-picker";
import { CoverHeader } from "@/components/editor/cover-header";
import { ImagePlus } from "lucide-react";
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
  mentionUsers,
  people,
  readOnly = false,
}: {
  doc: {
    id: string;
    emoji: string | null;
    title: string;
    cover: string | null;
    coverPosition: number;
  };
  database: {
    id: string;
    schema: DatabaseSchema;
    automations: Automation[];
    templates: DbTemplate[];
  };
  views: ViewMeta[];
  rows: Row[];
  mentionUsers?: { id: string; name: string }[];
  people?: SelectOption[];
  /** BD compartida en modo lector: edición deshabilitada. */
  readOnly?: boolean;
}) {
  const [activeId, setActiveId] = useState(views[0]?.id ?? null);
  const [autoOpen, setAutoOpen] = useState(false);
  const [emoji, setEmoji] = useState(doc.emoji);
  const [title, setTitle] = useState(doc.title);
  const [cover, setCover] = useState(doc.cover);
  const [coverPosition, setCoverPosition] = useState(doc.coverPosition ?? 50);
  const [, startTransition] = useTransition();

  const coverBg = coverBackground(cover, coverPosition);

  // Refleja el nombre de la BD en la pestaña del navegador al renombrar.
  useEffect(() => {
    document.title = `${title.trim() || "Sin título"} · Mikion`;
  }, [title]);

  function saveEmoji(next: string) {
    setEmoji(next);
    startTransition(() => updateDocMeta(doc.id, { emoji: next }));
  }

  function saveCover(next: string | null) {
    setCover(next);
    setCoverPosition(50);
    startTransition(() =>
      updateDocMeta(doc.id, { cover: next, coverPosition: 50 })
    );
  }

  function saveCoverPosition(next: number) {
    setCoverPosition(next);
    startTransition(() => updateDocMeta(doc.id, { coverPosition: next }));
  }

  function saveTitle() {
    if (title !== doc.title) startTransition(() => renameDoc(doc.id, title));
  }

  function removeView(viewId: string) {
    const remaining = views.filter((v) => v.id !== viewId);
    if (!remaining.length) return; // nunca borrar la última
    if (activeId === viewId) setActiveId(remaining[0].id);
    startTransition(() => {
      void deleteView(viewId);
    });
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
    <div className="pb-2">
      {/* Portada (ancho completo) */}
      <CoverHeader
        cover={cover}
        coverPosition={coverPosition}
        onCoverChange={saveCover}
        onPositionChange={saveCoverPosition}
        height="h-[220px]"
      />

      <div className="px-10 pt-8 pb-8">
      {!coverBg && (
        <div className="mb-2 opacity-0 transition-opacity hover:opacity-100 [&:has(button:focus)]:opacity-100">
          <CoverPicker onPick={saveCover}>
            <button className="text-ink-faint hover:text-ink-soft flex items-center gap-1.5 text-xs">
              <ImagePlus className="size-3.5" /> Añadir portada
            </button>
          </CoverPicker>
        </div>
      )}
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
          readOnly={readOnly}
          rows={1}
          placeholder="Sin título"
          className="font-serif text-ink placeholder:text-ink-ghost w-full resize-none border-none bg-transparent text-[32px] font-[560] leading-[1.12] outline-none"
        />
        {readOnly && (
          <span className="text-ink-faint border-line ml-2 shrink-0 self-center rounded-full border px-2 py-0.5 text-xs">
            Solo lectura
          </span>
        )}
      </div>

      {/* Pestañas + toolbar */}
      <div className="border-line mt-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-1">
          {views.map((v) => {
            const active = activeId === v.id;
            return (
              <div
                key={v.id}
                className={cn(
                  "flex items-center border-b-2",
                  active ? "border-brand" : "border-transparent"
                )}
              >
                <button
                  onClick={() => setActiveId(v.id)}
                  className={cn(
                    "py-0 pb-2 pl-2 pr-1 text-[13.5px]",
                    active ? "text-ink font-medium" : "text-ink-soft"
                  )}
                >
                  {v.name}
                </button>
                {active && views.length > 1 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="text-ink-faint hover:bg-sidebar-hover mb-1.5 mr-1 rounded-sm p-0.5"
                        aria-label="Opciones de la vista"
                      >
                        <ChevronDown className="size-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => removeView(v.id)}
                      >
                        <Trash2 className="size-4" /> Eliminar vista
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
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
            templates={database.templates}
            onConfigChange={patchConfig}
            mentionUsers={mentionUsers}
            people={people}
            readOnly={readOnly}
          />
        )}
      </div>
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

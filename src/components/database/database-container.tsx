"use client";

import { useMemo, useState } from "react";
import { Plus, Table2, Columns3 } from "lucide-react";
import type { Row } from "@/db/schema";
import type { DatabaseSchema, ViewConfig, ViewType } from "@/lib/types";
import { applyView, visibleProperties } from "@/lib/database-view";
import { updateView, createView } from "@/lib/actions/databases";
import { cn } from "@/lib/utils";
import { TableView } from "./table-view";
import { BoardView } from "./board-view";
import { DatabaseToolbar } from "./toolbar";
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
  database: { id: string; schema: DatabaseSchema };
  views: ViewMeta[];
  rows: Row[];
}) {
  const [activeId, setActiveId] = useState(views[0]?.id ?? null);
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

  return (
    <div className="px-10 py-8">
      {/* Cabecera */}
      <div className="flex items-center gap-2">
        <span className="text-3xl leading-none">{doc.emoji ?? "🗂️"}</span>
        <h1 className="font-serif text-ink text-[32px] font-[560]">
          {doc.title || "Sin título"}
        </h1>
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

        <div className="pb-1.5">
          <DatabaseToolbar
            schema={database.schema}
            config={config}
            onChange={patchConfig}
          />
        </div>
      </div>

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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

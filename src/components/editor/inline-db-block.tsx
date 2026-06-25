"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createReactBlockSpec } from "@blocknote/react";
import { Plus, Maximize2, Database } from "lucide-react";
import type { Row } from "@/db/schema";
import type {
  DatabaseSchema,
  PropertyValue,
  SelectOption,
  ViewConfig,
} from "@/lib/types";
import { randomSelectColor } from "@/lib/types";
import {
  getInlineDatabase,
  createRow,
  updateCell,
  updateProperty,
} from "@/lib/actions/databases";
import { visibleProperties, applyView } from "@/lib/database-view";
import { randomId } from "@/lib/utils";
import { PropertyCell } from "../database/property-cell";
import { DatabaseToolbar } from "../database/toolbar";

export const InlineDatabase = createReactBlockSpec(
  {
    type: "inlineDatabase",
    // filters/sorts: config de filtro y orden de ESTE embed (JSON). Se guarda en
    // los props del bloque → persiste en el doc, así se recuerda por integración.
    propSchema: {
      databaseId: { default: "" },
      filters: { default: "" },
      sorts: { default: "" },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const databaseId = block.props.databaseId as string;
      const config: ViewConfig = {
        filters: parseConfig(block.props.filters as string),
        sorts: parseConfig(block.props.sorts as string),
      };
      const onConfigChange = (patch: Partial<ViewConfig>) => {
        const next = { ...config, ...patch };
        editor.updateBlock(block, {
          props: {
            filters: JSON.stringify(next.filters ?? []),
            sorts: JSON.stringify(next.sorts ?? []),
          },
        });
      };
      return (
        <div contentEditable={false} className="my-2">
          <InlineDatabaseView
            databaseId={databaseId}
            config={config}
            onConfigChange={onConfigChange}
          />
        </div>
      );
    },
  }
);

/** Parsea un array JSON guardado en props del bloque; [] si vacío/ inválido. */
function parseConfig<T>(raw: string): T[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function InlineDatabaseView({
  databaseId,
  config,
  onConfigChange,
}: {
  databaseId: string;
  config: ViewConfig;
  onConfigChange: (patch: Partial<ViewConfig>) => void;
}) {
  const [data, setData] = useState<{
    schema: DatabaseSchema;
    rows: Row[];
    docId: string;
  } | null>(null);

  const refresh = useCallback(() => {
    if (!databaseId) return;
    getInlineDatabase(databaseId).then(setData).catch(() => {});
  }, [databaseId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!databaseId) {
    return (
      <p className="text-ink-faint border-line rounded-md border border-dashed p-3 text-sm">
        Base de datos en línea no configurada.
      </p>
    );
  }
  if (!data) {
    return (
      <p className="text-ink-faint border-line rounded-md border p-3 text-sm">
        Cargando base de datos…
      </p>
    );
  }

  const props = visibleProperties(data.schema, config);
  const rows = applyView(data.rows, data.schema, config);

  async function setCell(rowId: string, propertyId: string, value: PropertyValue) {
    await updateCell(rowId, propertyId, value);
    refresh();
  }
  async function addOption(propertyId: string, name: string): Promise<string> {
    const prop = data!.schema.properties.find((p) => p.id === propertyId);
    const opt = { id: randomId(), name, color: randomSelectColor() };
    await updateProperty(databaseId, propertyId, {
      options: [...(prop?.options ?? []), opt],
    });
    refresh();
    return opt.id;
  }
  async function setOptions(propertyId: string, options: SelectOption[]) {
    await updateProperty(databaseId, propertyId, { options });
    refresh();
  }

  return (
    <div className="border-line overflow-hidden rounded-md border">
      <div className="border-line bg-sidebar/50 flex items-center gap-2 border-b px-3 py-1.5">
        <Database className="text-ink-faint size-3.5" />
        <span className="text-ink-soft text-[13px] font-medium">
          Base de datos
        </span>
        <div className="ml-auto flex items-center gap-1">
          <DatabaseToolbar
            schema={data.schema}
            config={config}
            onChange={onConfigChange}
            sections={["filter", "sort"]}
          />
          <Link
            href={`/p/${data.docId}`}
            className="text-ink-faint hover:text-brand flex items-center gap-1 text-xs"
          >
            Abrir <Maximize2 className="size-3" />
          </Link>
        </div>
      </div>

      {/* Maquetado con divs `display:table` (no <table>/<td>): si usáramos
          elementos de tabla reales, la extensión TableHandles de BlockNote los
          confundiría con una tabla del editor y fallaría al leer
          `block.content.rows` (este bloque tiene content: "none"). */}
      <div className="overflow-x-auto">
        <div className="table w-full border-collapse text-sm">
          <div className="table-header-group">
            <div className="border-line table-row border-b">
              <div className="table-cell w-7" />
              {props.map((p) => (
                <div
                  key={p.id}
                  className="text-ink-faint border-line table-cell min-w-[140px] border-r px-2 py-1.5 text-left text-[12.5px] font-medium"
                >
                  {p.name}
                </div>
              ))}
            </div>
          </div>
          <div className="table-row-group">
            {rows.map((row) => (
              <div
                key={row.id}
                className="border-line group/row table-row border-b"
              >
                <div className="table-cell w-7 align-middle">
                  <Link
                    href={`/p/${data.docId}/${row.id}`}
                    className="text-ink-faint hover:bg-sidebar-hover mx-auto flex size-5 items-center justify-center rounded-sm opacity-0 group-hover/row:opacity-100"
                    aria-label="Abrir fila"
                  >
                    <Maximize2 className="size-3" />
                  </Link>
                </div>
                {props.map((p) => (
                  <div
                    key={p.id}
                    className="border-line table-cell border-r align-top"
                  >
                    <PropertyCell
                      property={p}
                      value={row.values?.[p.id] ?? null}
                      onChange={(v) => setCell(row.id, p.id, v)}
                      onAddOption={
                        p.type === "select" || p.type === "status"
                          ? (name) => addOption(p.id, name)
                          : undefined
                      }
                      onSetOptions={
                        p.type === "multiselect" || p.type === "person"
                          ? (options) => void setOptions(p.id, options)
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={async () => {
          await createRow(databaseId);
          refresh();
        }}
        className="text-ink-faint hover:bg-sidebar-hover flex w-full items-center gap-2 px-2 py-1.5 text-sm"
      >
        <Plus className="size-4" /> Nueva fila
      </button>
    </div>
  );
}

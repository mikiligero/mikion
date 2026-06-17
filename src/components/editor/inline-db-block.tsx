"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createReactBlockSpec } from "@blocknote/react";
import { Plus, Maximize2, Database } from "lucide-react";
import type { Row } from "@/db/schema";
import type { DatabaseSchema, PropertyValue } from "@/lib/types";
import { randomSelectColor } from "@/lib/types";
import {
  getInlineDatabase,
  createRow,
  updateCell,
  updateProperty,
} from "@/lib/actions/databases";
import { visibleProperties } from "@/lib/database-view";
import { randomId } from "@/lib/utils";
import { PropertyCell } from "../database/property-cell";

export const InlineDatabase = createReactBlockSpec(
  { type: "inlineDatabase", propSchema: { databaseId: { default: "" } }, content: "none" },
  {
    render: ({ block }) => (
      <div contentEditable={false} className="my-2">
        <InlineDatabaseView databaseId={block.props.databaseId as string} />
      </div>
    ),
  }
);

function InlineDatabaseView({ databaseId }: { databaseId: string }) {
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

  const props = visibleProperties(data.schema, { filters: [], sorts: [] });

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

  return (
    <div className="border-line overflow-hidden rounded-md border">
      <div className="border-line bg-sidebar/50 flex items-center gap-2 border-b px-3 py-1.5">
        <Database className="text-ink-faint size-3.5" />
        <span className="text-ink-soft text-[13px] font-medium">
          Base de datos
        </span>
        <Link
          href={`/p/${data.docId}`}
          className="text-ink-faint hover:text-brand ml-auto flex items-center gap-1 text-xs"
        >
          Abrir <Maximize2 className="size-3" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-line border-b">
              <th className="w-7" />
              {props.map((p) => (
                <th
                  key={p.id}
                  className="text-ink-faint border-line min-w-[140px] border-r px-2 py-1.5 text-left text-[12.5px] font-medium"
                >
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id} className="border-line group/row border-b">
                <td className="w-7 align-middle">
                  <Link
                    href={`/p/${data.docId}/${row.id}`}
                    className="text-ink-faint hover:bg-sidebar-hover mx-auto flex size-5 items-center justify-center rounded-sm opacity-0 group-hover/row:opacity-100"
                    aria-label="Abrir fila"
                  >
                    <Maximize2 className="size-3" />
                  </Link>
                </td>
                {props.map((p) => (
                  <td key={p.id} className="border-line border-r align-top">
                    <PropertyCell
                      property={p}
                      value={row.values?.[p.id] ?? null}
                      onChange={(v) => setCell(row.id, p.id, v)}
                      onAddOption={
                        p.type === "select" ||
                        p.type === "status" ||
                        p.type === "multiselect"
                          ? (name) => addOption(p.id, name)
                          : undefined
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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

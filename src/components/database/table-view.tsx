"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { Plus, Maximize2 } from "lucide-react";
import type { Row } from "@/db/schema";
import type {
  DatabaseSchema,
  PropertyDef,
  PropertyType,
  PropertyValue,
  ViewConfig,
} from "@/lib/types";
import { PROPERTY_TYPES, randomSelectColor } from "@/lib/types";
import {
  groupRows,
  visibleProperties,
  type RowGroup,
} from "@/lib/database-view";
import {
  createRow,
  updateCell,
  addProperty,
  updateProperty,
} from "@/lib/actions/databases";
import { PropertyCell, Tag } from "./property-cell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const columnHelper = createColumnHelper<Row>();

export function TableView({
  docId,
  databaseId,
  schema,
  rows,
  config,
}: {
  docId: string;
  databaseId: string;
  schema: DatabaseSchema;
  rows: Row[];
  config: ViewConfig;
}) {
  const [, startTransition] = useTransition();
  const props = useMemo(() => visibleProperties(schema, config), [schema, config]);

  function setCell(rowId: string, propertyId: string, value: PropertyValue) {
    startTransition(() => updateCell(rowId, propertyId, value));
  }

  async function addOption(prop: PropertyDef, name: string): Promise<string> {
    const opt = { id: crypto.randomUUID(), name, color: randomSelectColor() };
    await updateProperty(databaseId, prop.id, {
      options: [...(prop.options ?? []), opt],
    });
    return opt.id;
  }

  // Agrupación: ordena las filas por grupo y marca la primera de cada grupo.
  const { data, groupHeaders } = useMemo(() => {
    if (!config.groupBy) return { data: rows, groupHeaders: new Map<string, RowGroup>() };
    const groups = groupRows(rows, schema, config.groupBy).filter(
      (g) => g.rows.length > 0
    );
    const ordered = groups.flatMap((g) => g.rows);
    const headers = new Map<string, RowGroup>();
    for (const g of groups) headers.set(g.rows[0].id, g);
    return { data: ordered, groupHeaders: headers };
  }, [rows, schema, config.groupBy]);

  const columns = useMemo(
    () =>
      props.map((prop) =>
        columnHelper.accessor((row) => row.values?.[prop.id] ?? null, {
          id: prop.id,
          header: prop.name,
          cell: (ctx) => (
            <PropertyCell
              property={prop}
              value={ctx.getValue() as PropertyValue}
              onChange={(v) => setCell(ctx.row.original.id, prop.id, v)}
              onAddOption={
                prop.type === "select" ||
                prop.type === "status" ||
                prop.type === "multiselect"
                  ? (name) => addOption(prop, name)
                  : undefined
              }
            />
          ),
        })
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const colCount = props.length + 2;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-line border-b">
              <th className="w-8" />
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="text-ink-faint border-line min-w-[160px] border-r px-2 py-1.5 text-left text-[12.5px] font-medium"
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </th>
              ))}
              <th className="w-10 px-1">
                <AddPropertyButton
                  onAdd={(type) =>
                    startTransition(() => {
                      void addProperty(databaseId, type);
                    })
                  }
                />
              </th>
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const header = groupHeaders.get(row.original.id);
            return (
              <FragmentRow
                key={row.id}
                header={header}
                colCount={colCount}
              >
                <tr className="border-line group/row border-b">
                  <td className="w-8 align-middle">
                    <Link
                      href={`/p/${docId}/${row.original.id}`}
                      className="text-ink-faint hover:bg-sidebar-hover mx-auto flex size-6 items-center justify-center rounded-sm opacity-0 group-hover/row:opacity-100"
                      aria-label="Abrir fila"
                    >
                      <Maximize2 className="size-3.5" />
                    </Link>
                  </td>
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="border-line hover:bg-sidebar-hover/40 border-r align-top transition-colors"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                  <td />
                </tr>
              </FragmentRow>
            );
          })}
        </tbody>
      </table>

      <button
        onClick={() => startTransition(() => void createRow(databaseId))}
        className="text-ink-faint hover:bg-sidebar-hover flex w-full items-center gap-2 px-2 py-2 text-sm"
      >
        <Plus className="size-4" /> Nueva fila
      </button>
    </div>
  );
}

function FragmentRow({
  header,
  colCount,
  children,
}: {
  header?: RowGroup;
  colCount: number;
  children: React.ReactNode;
}) {
  return (
    <>
      {header && (
        <tr className="bg-sidebar/40">
          <td colSpan={colCount} className="px-3 py-1.5">
            <span className="inline-flex items-center gap-2">
              {header.option ? (
                <Tag option={header.option} />
              ) : (
                <span className="text-ink-faint text-[13px] font-medium">
                  {header.label}
                </span>
              )}
              <span className="text-ink-faint text-xs">
                {header.rows.length}
              </span>
            </span>
          </td>
        </tr>
      )}
      {children}
    </>
  );
}

function AddPropertyButton({ onAdd }: { onAdd: (type: PropertyType) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="text-ink-faint hover:bg-sidebar-hover flex size-6 items-center justify-center rounded-sm"
          aria-label="Añadir propiedad"
        >
          <Plus className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
        {PROPERTY_TYPES.filter((t) => t.value !== "title").map((t) => (
          <DropdownMenuItem key={t.value} onClick={() => onAdd(t.value)}>
            {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

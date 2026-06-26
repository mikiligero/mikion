"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import {
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowLeftToLine,
  ArrowRightToLine,
  Rows3,
  Trash2,
  Copy,
  Link2,
  MoreVertical,
  PanelRight,
  FileText,
  Palette,
  ChevronDown,
  LayoutTemplate,
  Bookmark,
  Star,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import type { Row } from "@/db/schema";
import type {
  CalcType,
  DatabaseSchema,
  DbTemplate,
  PropertyDef,
  PropertyType,
  PropertyValue,
  SelectOption,
  ViewConfig,
} from "@/lib/types";
import { PROPERTY_TYPES, randomSelectColor, isSystemProperty } from "@/lib/types";
import {
  groupRows,
  visibleProperties,
  findOption,
  computeCalc,
  calcsForProperty,
  CALC_LABELS,
  type RowGroup,
} from "@/lib/database-view";
import {
  createRow,
  updateCell,
  addProperty,
  addPropertyAt,
  updateProperty,
  deleteProperty,
  duplicateRow,
  deleteRow,
  setRowEmoji,
  saveRowAsTemplate,
  createRowFromTemplate,
  deleteTemplate,
  setDefaultTemplate,
} from "@/lib/actions/databases";
import { addPerson, deletePerson } from "@/lib/actions/people";
import { PropertyCell, Tag, systemFieldValue } from "./property-cell";
import { propertyIcon } from "./property-icon";
import { PropertyOptionsEditor } from "./property-options-editor";
import { randomId, cn } from "@/lib/utils";
import { RowSidePeek } from "./row-side-peek";
import { EmojiPickerPopover } from "@/components/editor/emoji-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const columnHelper = createColumnHelper<Row>();

/** Fecha de hoy como DD/MM/AAAA, solo para la vista previa del diálogo (el
 * valor real lo calcula el servidor al crear la fila). */
function todayTitleDate(): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

export function TableView({
  docId,
  databaseId,
  schema,
  rows,
  config,
  templates,
  onConfigChange,
  mentionUsers,
  people,
  readOnly = false,
}: {
  docId: string;
  databaseId: string;
  schema: DatabaseSchema;
  rows: Row[];
  config: ViewConfig;
  templates?: DbTemplate[];
  onConfigChange?: (patch: Partial<ViewConfig>) => void;
  mentionUsers?: { id: string; name: string }[];
  people?: SelectOption[];
  readOnly?: boolean;
}) {
  const [, startTransition] = useTransition();
  const props = useMemo(() => visibleProperties(schema, config), [schema, config]);

  // Reordenar columnas arrastrando: persiste el orden por vista (propertyOrder).
  const canReorderColumns = !readOnly && !!onConfigChange;
  const colSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  function onColumnDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = props.map((p) => p.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onConfigChange?.({ propertyOrder: arrayMove(ids, from, to) });
  }
  // Guardamos solo el id; la fila se deriva del estado más reciente para que
  // el panel refleje los cambios de celdas hechos en la tabla.
  const [peekId, setPeekId] = useState<string | null>(null);
  const peekRow = useMemo(
    () => rows.find((r) => r.id === peekId) ?? null,
    [rows, peekId]
  );

  const userName = mentionUsers?.[0]?.name;

  function setCell(rowId: string, propertyId: string, value: PropertyValue) {
    if (readOnly) return;
    startTransition(() => updateCell(rowId, propertyId, value));
  }

  function patchProperty(propertyId: string, patch: Partial<PropertyDef>) {
    startTransition(() => updateProperty(databaseId, propertyId, patch));
  }

  async function addOption(prop: PropertyDef, name: string): Promise<string> {
    const opt = { id: randomId(), name, color: randomSelectColor() };
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
          cell: (ctx) => {
            const cellValue = isSystemProperty(prop.type)
              ? systemFieldValue(prop, ctx.row.original, {
                  index: ctx.row.index,
                  userName,
                })
              : (ctx.getValue() as PropertyValue);
            const cell = (
              <PropertyCell
                property={prop}
                value={cellValue}
                onChange={(v) => setCell(ctx.row.original.id, prop.id, v)}
                onAddOption={
                  prop.type === "select" || prop.type === "status"
                    ? (name) => addOption(prop, name)
                    : undefined
                }
                onSetOptions={
                  prop.type === "multiselect" || prop.type === "person"
                    ? (options) =>
                        startTransition(() =>
                          updateProperty(databaseId, prop.id, { options })
                        )
                    : undefined
                }
                onPropertyPatch={
                  prop.type === "date"
                    ? (patch) => patchProperty(prop.id, patch)
                    : undefined
                }
                people={prop.type === "person" ? people : undefined}
                onAddPerson={
                  prop.type === "person"
                    ? (name) => addPerson(databaseId, name)
                    : undefined
                }
                onDeletePerson={
                  prop.type === "person"
                    ? (id) => void deletePerson(databaseId, id)
                    : undefined
                }
              />
            );
            // Columna de título: icono/emoji + el título como ENLACE a la página
            // completa de la fila (cada fila es una página). El botón "Abrir"
            // sigue abriendo la vista lateral (peek).
            if (prop.type === "title") {
              const r = ctx.row.original;
              const titleText = typeof cellValue === "string" ? cellValue : "";
              return (
                <div className="flex items-center gap-1 pl-1">
                  <EmojiPickerPopover
                    onSelect={(e) =>
                      startTransition(() => setRowEmoji(r.id, e))
                    }
                    trigger={
                      <button
                        className="text-ink-faint hover:bg-sidebar-hover flex size-6 shrink-0 items-center justify-center rounded-sm text-base leading-none"
                        aria-label="Icono de la fila"
                      >
                        {r.emoji || <FileText className="size-4" />}
                      </button>
                    }
                  />
                  <Link
                    href={`/p/${docId}/${r.id}`}
                    className="text-ink min-w-0 flex-1 truncate py-1.5 hover:underline"
                    title="Abrir como página"
                  >
                    {titleText || (
                      <span className="text-ink-ghost">Sin título</span>
                    )}
                  </Link>
                  <button
                    onClick={() => setPeekId(r.id)}
                    className="text-ink-faint hover:bg-sidebar-hover ring-line mr-1 flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-medium opacity-0 ring-1 group-hover/row:opacity-100"
                  >
                    <PanelRight className="size-3" /> ABRIR
                  </button>
                </div>
              );
            }
            return cell;
          },
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
  const colorByProp = config.colorBy
    ? props.find((p) => p.id === config.colorBy)
    : undefined;
  const calculations = config.calculations ?? {};

  function setCalc(propertyId: string, calc: CalcType | null) {
    const next = { ...calculations };
    if (calc) next[propertyId] = calc;
    else delete next[propertyId];
    onConfigChange?.({ calculations: next });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <DndContext
          sensors={colSensors}
          collisionDetection={closestCenter}
          onDragEnd={onColumnDragEnd}
        >
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-line border-b">
                <th className="w-8" />
                <SortableContext
                  items={props.map((p) => p.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {hg.headers.map((header) => {
                    const prop = props.find((p) => p.id === header.id);
                    return (
                      <SortableHeader
                        key={header.id}
                        id={header.id}
                        disabled={!canReorderColumns || !prop}
                      >
                        {prop ? (
                          <ColumnHeaderMenu
                            prop={prop}
                            databaseId={databaseId}
                            config={config}
                            onConfigChange={onConfigChange}
                          />
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )
                        )}
                      </SortableHeader>
                    );
                  })}
                </SortableContext>
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
        </DndContext>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const header = groupHeaders.get(row.original.id);
            const colorOpt = colorByProp
              ? findOption(colorByProp, row.original.values?.[colorByProp.id])
              : undefined;
            return (
              <FragmentRow
                key={row.id}
                header={header}
                colCount={colCount}
              >
                <tr
                  className="border-line group/row border-b"
                  style={
                    colorOpt
                      ? { background: `var(--tint-${colorOpt.color}-bg)` }
                      : undefined
                  }
                >
                  <td className="w-8 align-middle">
                    <RowActionsMenu
                      docId={docId}
                      row={row.original}
                      onOpenPeek={() => setPeekId(row.original.id)}
                    />
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
        <tfoot>
          <tr className="border-line text-ink-faint border-t text-[12px]">
            <td className="w-8" />
            {props.map((prop) => (
              <td key={prop.id} className="border-line border-r p-0">
                <CalcFooterCell
                  prop={prop}
                  calc={calculations[prop.id]}
                  rows={data}
                  onChange={(c) => setCalc(prop.id, c)}
                />
              </td>
            ))}
            <td />
          </tr>
        </tfoot>
      </table>

      {!readOnly && (
      <div className="flex w-fit items-center">
        <button
          onClick={() => startTransition(() => void createRow(databaseId))}
          className="text-ink-faint hover:bg-sidebar-hover flex items-center gap-2 px-2 py-2 text-sm"
        >
          <Plus className="size-4" /> Nueva fila
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="text-ink-faint hover:bg-sidebar-hover flex items-center rounded-sm px-1.5 py-2"
              aria-label="Plantillas"
            >
              <ChevronDown className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="text-ink-faint px-2 py-1 text-xs font-medium">
              Plantillas
            </div>
            {(templates ?? []).length === 0 ? (
              <div className="text-ink-faint px-2 py-1 text-[13px]">
                Aún no hay plantillas. Guarda una fila como plantilla desde su
                menú.
              </div>
            ) : (
              (templates ?? []).map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onClick={() =>
                    startTransition(() =>
                      createRowFromTemplate(databaseId, t.id).then(() => {})
                    )
                  }
                  className="flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    {t.emoji || <LayoutTemplate className="size-4" />}
                    <span className="truncate">{t.name}</span>
                    {t.isDefault && (
                      <span className="text-ink-faint shrink-0 text-[10px]">
                        predet.
                      </span>
                    )}
                  </span>
                  <span className="ml-2 flex shrink-0 items-center gap-1.5">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        startTransition(() =>
                          setDefaultTemplate(databaseId, t.isDefault ? null : t.id)
                        );
                      }}
                      className={cn(
                        "hover:text-brand",
                        t.isDefault ? "text-brand" : "text-ink-faint"
                      )}
                      aria-label={
                        t.isDefault
                          ? "Quitar como predeterminada"
                          : "Marcar como predeterminada (se aplica en «Nueva fila»)"
                      }
                      title={
                        t.isDefault
                          ? "Predeterminada · se aplica en «Nueva fila»"
                          : "Marcar como predeterminada"
                      }
                    >
                      <Star
                        className={cn("size-3.5", t.isDefault && "fill-brand")}
                      />
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        startTransition(() => deleteTemplate(databaseId, t.id));
                      }}
                      className="text-ink-faint hover:text-destructive"
                      aria-label="Eliminar plantilla"
                    >
                      <Trash2 className="size-3.5" />
                    </span>
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      )}

      <RowSidePeek
        open={peekRow !== null}
        onOpenChange={(o) => !o && setPeekId(null)}
        databaseId={databaseId}
        schema={schema}
        row={peekRow}
        docId={docId}
        mentionUsers={mentionUsers}
        people={people}
        readOnly={readOnly}
      />
    </div>
  );
}

// --- Pie de columna: cálculo (contar, suma, %, etc.) ----------------------
function CalcFooterCell({
  prop,
  calc,
  rows,
  onChange,
}: {
  prop: PropertyDef;
  calc: CalcType | undefined;
  rows: Row[];
  onChange: (calc: CalcType | null) => void;
}) {
  const value = calc ? computeCalc(calc, prop, rows) : null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="hover:bg-sidebar-hover group/calc flex w-full items-center justify-end gap-1.5 px-2 py-1.5 text-right">
          {calc ? (
            <>
              <span className="text-ink-faint">{CALC_LABELS[calc]}</span>
              <span className="text-ink-soft font-medium">{value}</span>
            </>
          ) : (
            <span className="text-ink-faint opacity-0 group-hover/calc:opacity-100">
              Calcular
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 w-48 overflow-y-auto">
        <DropdownMenuItem onClick={() => onChange(null)}>
          Ninguno
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {calcsForProperty(prop).map((c) => (
          <DropdownMenuItem
            key={c}
            onClick={() => onChange(c)}
            className="flex items-center justify-between"
          >
            <span>{CALC_LABELS[c]}</span>
            <span className="text-ink-faint">{computeCalc(c, prop, rows)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// --- Menú de cabecera de columna ------------------------------------------
/** Celda de cabecera reordenable: tirador (grip) que aparece al pasar el ratón
 * y arrastra la columna a izquierda/derecha. */
function SortableHeader({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <th
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/col border-line min-w-[160px] border-r p-0 text-left",
        isDragging && "bg-sidebar z-10 opacity-70"
      )}
    >
      <div className="flex items-center">
        {!disabled && (
          <button
            {...attributes}
            {...listeners}
            aria-label="Arrastrar columna"
            className="text-ink-faint hover:text-ink flex cursor-grab touch-none items-center self-stretch px-0.5 opacity-0 group-hover/col:opacity-100 active:cursor-grabbing"
          >
            <GripVertical className="size-3.5" />
          </button>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </th>
  );
}

function ColumnHeaderMenu({
  prop,
  databaseId,
  config,
  onConfigChange,
}: {
  prop: PropertyDef;
  databaseId: string;
  config: ViewConfig;
  onConfigChange?: (patch: Partial<ViewConfig>) => void;
}) {
  const [, startTransition] = useTransition();
  const [name, setName] = useState(prop.name);
  const isGrouped = config.groupBy === prop.id;
  const isColored = config.colorBy === prop.id;

  function saveName() {
    if (name.trim() && name !== prop.name) {
      startTransition(() => updateProperty(databaseId, prop.id, { name }));
    }
  }

  function setSort(direction: "asc" | "desc") {
    onConfigChange?.({ sorts: [{ propertyId: prop.id, direction }] });
  }

  function insertAt(side: "left" | "right", type: PropertyType) {
    startTransition(() => {
      void addPropertyAt(databaseId, type, prop.id, side);
    });
  }

  const insertableTypes = PROPERTY_TYPES.filter((t) => t.value !== "title");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="text-ink-faint hover:bg-sidebar-hover flex w-full items-center gap-1.5 px-2 py-1.5 text-[12.5px] font-medium">
          {propertyIcon(prop.type)}
          <span className="truncate">{prop.name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        {/* Renombrar */}
        <div
          className="flex items-center gap-1.5 p-1"
          onKeyDown={(e) => e.stopPropagation()}
        >
          <span className="text-ink-faint flex size-7 shrink-0 items-center justify-center">
            {propertyIcon(prop.type)}
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveName();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="border-line focus:ring-ring w-full rounded-md border bg-transparent px-2 py-1 text-sm outline-none focus:ring-2"
          />
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => setSort("asc")}>
          <ArrowUp className="size-4" /> Ordenar ascendente
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setSort("desc")}>
          <ArrowDown className="size-4" /> Ordenar descendente
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            onConfigChange?.({ groupBy: isGrouped ? undefined : prop.id })
          }
        >
          <Rows3 className="size-4" />
          {isGrouped ? "Quitar agrupación" : "Agrupar"}
        </DropdownMenuItem>
        {(prop.type === "select" || prop.type === "status") && (
          <DropdownMenuItem
            onClick={() =>
              onConfigChange?.({ colorBy: isColored ? undefined : prop.id })
            }
          >
            <Palette className="size-4" />
            {isColored ? "Quitar color de fila" : "Colorear filas por esta"}
          </DropdownMenuItem>
        )}
        {prop.type === "date" && (
          <>
            <DropdownMenuCheckboxItem
              checked={!!prop.includeTime}
              onCheckedChange={(c) =>
                startTransition(() =>
                  updateProperty(databaseId, prop.id, { includeTime: c })
                )
              }
            >
              Incluir hora
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={!!prop.dateRange}
              onCheckedChange={(c) =>
                startTransition(() =>
                  updateProperty(databaseId, prop.id, { dateRange: c })
                )
              }
            >
              Rango de fechas
            </DropdownMenuCheckboxItem>
          </>
        )}

        {(prop.type === "select" ||
          prop.type === "multiselect" ||
          prop.type === "status") && (
          <PropertyOptionsEditor databaseId={databaseId} property={prop} />
        )}

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ArrowLeftToLine className="size-4" /> Insertar a la izquierda
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
            {insertableTypes.map((t) => (
              <DropdownMenuItem
                key={t.value}
                onClick={() => insertAt("left", t.value)}
              >
                {propertyIcon(t.value)} {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ArrowRightToLine className="size-4" /> Insertar a la derecha
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
            {insertableTypes.map((t) => (
              <DropdownMenuItem
                key={t.value}
                onClick={() => insertAt("right", t.value)}
              >
                {propertyIcon(t.value)} {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {prop.type !== "title" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                startTransition(() => deleteProperty(databaseId, prop.id))
              }
            >
              <Trash2 className="size-4" /> Eliminar propiedad
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// --- Menú de acciones de fila ---------------------------------------------
function RowActionsMenu({
  docId,
  row,
  onOpenPeek,
}: {
  docId: string;
  row: Row;
  onOpenPeek: () => void;
}) {
  const [, startTransition] = useTransition();
  const [tplOpen, setTplOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplDefault, setTplDefault] = useState(false);
  const [tplTitleDate, setTplTitleDate] = useState(false);

  function copyLink() {
    const url = `${window.location.origin}/p/${docId}/${row.id}`;
    void navigator.clipboard.writeText(url);
    toast.success("Enlace copiado");
  }

  function saveTemplate() {
    const name = tplName.trim();
    startTransition(() =>
      saveRowAsTemplate(row.id, name, {
        isDefault: tplDefault,
        titleFromDate: tplTitleDate,
      }).then(() => {
        toast.success("Plantilla guardada");
      })
    );
    setTplOpen(false);
    setTplName("");
    setTplDefault(false);
    setTplTitleDate(false);
  }

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="text-ink-faint hover:bg-sidebar-hover mx-auto flex size-6 items-center justify-center rounded-sm opacity-0 group-hover/row:opacity-100 data-[state=open]:opacity-100"
          aria-label="Acciones de fila"
        >
          <MoreVertical className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem onClick={onOpenPeek}>
          <PanelRight className="size-4" /> Abrir en vista lateral
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/p/${docId}/${row.id}`}>
            <ArrowRightToLine className="size-4" /> Abrir como página
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyLink}>
          <Link2 className="size-4" /> Copiar enlace
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => startTransition(() => void duplicateRow(row.id))}
        >
          <Copy className="size-4" /> Duplicar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTplOpen(true)}>
          <Bookmark className="size-4" /> Guardar como plantilla
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => startTransition(() => void deleteRow(row.id))}
        >
          <Trash2 className="size-4" /> Mover a la papelera
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Dialog open={tplOpen} onOpenChange={setTplOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Guardar como plantilla</DialogTitle>
        </DialogHeader>
        <input
          autoFocus
          value={tplName}
          onChange={(e) => setTplName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              saveTemplate();
            }
          }}
          placeholder="Nombre de la plantilla"
          className="border-line focus:ring-ring w-full rounded-md border bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-2"
        />
        <div className="flex flex-col gap-2.5 text-sm">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={tplDefault}
              onChange={(e) => setTplDefault(e.target.checked)}
              className="accent-brand size-4"
            />
            <span>
              Predeterminada
              <span className="text-ink-faint"> · se aplica en «Nueva fila»</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={tplTitleDate}
              onChange={(e) => setTplTitleDate(e.target.checked)}
              className="accent-brand size-4"
            />
            <span>
              Título con la fecha de hoy
              <span className="text-ink-faint"> · p. ej. {todayTitleDate()}</span>
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setTplOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={saveTemplate} disabled={!tplName.trim()}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
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
            {propertyIcon(t.value)} {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

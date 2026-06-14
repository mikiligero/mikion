"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import type { Row } from "@/db/schema";
import type { DatabaseSchema, PropertyDef } from "@/lib/types";
import { groupRows, findOption, type RowGroup } from "@/lib/database-view";
import { getRowTitle } from "@/lib/database-utils";
import { coverBackground } from "@/lib/covers";
import { moveRow, createRow } from "@/lib/actions/databases";
import { Tag } from "./property-cell";

const COL_PREFIX = "col:";

export function BoardView({
  docId,
  databaseId,
  schema,
  rows,
  groupPropertyId,
  visibleProps,
}: {
  docId: string;
  databaseId: string;
  schema: DatabaseSchema;
  rows: Row[];
  groupPropertyId: string | null;
  visibleProps: PropertyDef[];
}) {
  const [dragging, setDragging] = useState<Row | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  if (!groupPropertyId) {
    return (
      <p className="text-ink-faint px-2 py-8 text-sm">
        El tablero necesita una propiedad de selección/estado para agrupar.
        Añade una y agrupa por ella desde la barra de herramientas.
      </p>
    );
  }

  // Capturado en const para conservar el narrowing dentro de los closures.
  const groupProp = groupPropertyId;
  const groups = groupRows(rows, schema, groupProp);
  const chipProps = visibleProps.filter(
    (p) => p.type !== "title" && p.id !== groupProp
  );

  function onDragStart(e: DragStartEvent) {
    setDragging(rows.find((r) => r.id === e.active.id) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const rowId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId || !overId.startsWith(COL_PREFIX)) return;
    const rawValue = overId.slice(COL_PREFIX.length);
    const groupValue = rawValue === "none" ? null : rawValue;
    const row = rows.find((r) => r.id === rowId);
    if (!row || (row.values?.[groupProp] ?? null) === groupValue) return;
    void moveRow(rowId, { groupPropertyId: groupProp, groupValue });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {groups.map((group) => (
          <Column
            key={group.id ?? "none"}
            group={group}
            schema={schema}
            chipProps={chipProps}
            docId={docId}
            onAdd={() => createRow(databaseId, { [groupProp]: group.id })}
          />
        ))}
      </div>
      <DragOverlay>
        {dragging && (
          <Card row={dragging} schema={schema} chipProps={chipProps} overlay />
        )}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  group,
  schema,
  chipProps,
  docId,
  onAdd,
}: {
  group: RowGroup;
  schema: DatabaseSchema;
  chipProps: PropertyDef[];
  docId: string;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${COL_PREFIX}${group.id ?? "none"}` });
  return (
    <div className="w-[286px] shrink-0">
      <div className="mb-2 flex items-center gap-2 px-1">
        {group.option ? (
          <Tag option={group.option} />
        ) : (
          <span className="text-ink-faint text-sm font-medium">
            {group.label}
          </span>
        )}
        <span className="text-ink-faint text-xs">{group.rows.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cnCol(isOver)}
      >
        {group.rows.map((row) => (
          <DraggableCard
            key={row.id}
            row={row}
            schema={schema}
            chipProps={chipProps}
            docId={docId}
          />
        ))}
        <button
          onClick={onAdd}
          className="text-ink-faint hover:bg-sidebar-hover flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm"
        >
          <Plus className="size-4" /> Añadir
        </button>
      </div>
    </div>
  );
}

function cnCol(isOver: boolean) {
  return [
    "flex min-h-6 flex-col gap-2 rounded-md p-1 transition-colors",
    isOver ? "bg-sidebar-hover" : "",
  ].join(" ");
}

function DraggableCard({
  row,
  schema,
  chipProps,
  docId,
}: {
  row: Row;
  schema: DatabaseSchema;
  chipProps: PropertyDef[];
  docId: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: row.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={isDragging ? "opacity-40" : ""}
    >
      <Card row={row} schema={schema} chipProps={chipProps} docId={docId} />
    </div>
  );
}

function Card({
  row,
  schema,
  chipProps,
  docId,
  overlay,
}: {
  row: Row;
  schema: DatabaseSchema;
  chipProps: PropertyDef[];
  docId?: string;
  overlay?: boolean;
}) {
  const cover = coverBackground(row.cover);
  const title = getRowTitle(row.values, schema);
  const body = (
    <div
      className={`bg-surface border-line overflow-hidden rounded-md border shadow-sm ${
        overlay ? "rotate-2" : ""
      }`}
    >
      {cover && <div className="h-[76px]" style={{ background: cover }} />}
      <div className="p-3">
        <p className="text-ink text-[14.5px] font-[600]">{title}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {chipProps.map((p) => {
            const opt = findOption(p, row.values?.[p.id]);
            return opt ? <Tag key={p.id} option={opt} /> : null;
          })}
        </div>
      </div>
    </div>
  );
  // En overlay no envolvemos en Link.
  if (overlay || !docId) return body;
  return (
    <Link href={`/p/${docId}/${row.id}`} onClick={(e) => e.stopPropagation()}>
      {body}
    </Link>
  );
}

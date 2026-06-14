"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import type { PropertyDef, PropertyValue, SelectOption } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function Tag({ option }: { option: SelectOption }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[12.5px] font-medium"
      style={{
        background: `var(--tint-${option.color}-bg)`,
        color: `var(--tint-${option.color})`,
      }}
    >
      {option.name}
    </span>
  );
}

type CellProps = {
  property: PropertyDef;
  value: PropertyValue;
  onChange: (value: PropertyValue) => void;
  /** Crea una opción nueva (select/status) y devuelve su id. */
  onAddOption?: (name: string) => Promise<string> | string;
};

export function PropertyCell({
  property,
  value,
  onChange,
  onAddOption,
}: CellProps) {
  switch (property.type) {
    case "title":
    case "text":
      return <TextCell value={value} onChange={onChange} bold={property.type === "title"} />;
    case "url":
      return <TextCell value={value} onChange={onChange} link />;
    case "number":
      return <NumberCell value={value} onChange={onChange} />;
    case "checkbox":
      return <CheckboxCell value={value} onChange={onChange} />;
    case "date":
      return <DateCell value={value} onChange={onChange} />;
    case "select":
    case "status":
      return (
        <SelectCell
          property={property}
          value={value}
          onChange={onChange}
          onAddOption={onAddOption}
        />
      );
    default:
      return <span className="text-ink-ghost px-2 text-sm">—</span>;
  }
}

function TextCell({
  value,
  onChange,
  bold,
  link,
}: {
  value: PropertyValue;
  onChange: (v: PropertyValue) => void;
  bold?: boolean;
  link?: boolean;
}) {
  const [draft, setDraft] = useState(typeof value === "string" ? value : "");
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onChange(draft)}
      className={cn(
        "text-ink w-full bg-transparent px-2 py-1 text-sm outline-none",
        bold && "font-medium",
        link && draft && "text-brand underline"
      )}
    />
  );
}

function NumberCell({
  value,
  onChange,
}: {
  value: PropertyValue;
  onChange: (v: PropertyValue) => void;
}) {
  const [draft, setDraft] = useState(
    typeof value === "number" ? String(value) : ""
  );
  return (
    <input
      type="number"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const n = draft === "" ? null : Number(draft);
        if (n !== value) onChange(n);
      }}
      className="text-ink w-full bg-transparent px-2 py-1 text-sm outline-none"
    />
  );
}

function CheckboxCell({
  value,
  onChange,
}: {
  value: PropertyValue;
  onChange: (v: PropertyValue) => void;
}) {
  return (
    <div className="flex justify-center px-2 py-1">
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "flex size-[18px] items-center justify-center rounded-[4px] border-[1.6px]",
          value ? "bg-brand border-brand text-white" : "border-ink-faint"
        )}
        aria-label="Casilla"
      >
        {value ? <Check className="size-3" /> : null}
      </button>
    </div>
  );
}

function DateCell({
  value,
  onChange,
}: {
  value: PropertyValue;
  onChange: (v: PropertyValue) => void;
}) {
  const v = typeof value === "string" ? value.slice(0, 10) : "";
  return (
    <input
      type="date"
      value={v}
      onChange={(e) => onChange(e.target.value || null)}
      className="text-ink-soft w-full bg-transparent px-2 py-1 text-sm outline-none"
    />
  );
}

function SelectCell({
  property,
  value,
  onChange,
  onAddOption,
}: {
  property: PropertyDef;
  value: PropertyValue;
  onChange: (v: PropertyValue) => void;
  onAddOption?: (name: string) => Promise<string> | string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const options = property.options ?? [];
  const selected = options.find((o) => o.id === value) ?? null;

  async function add() {
    if (!onAddOption || !query.trim()) return;
    const id = await onAddOption(query.trim());
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="hover:bg-sidebar-hover flex min-h-7 w-full items-center px-2 py-1">
          {selected ? (
            <Tag option={selected} />
          ) : (
            <span className="text-ink-ghost text-sm">Vacío</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Buscar o crear…"
          className="border-line bg-surface text-ink mb-1 w-full rounded-md border px-2 py-1 text-sm outline-none"
        />
        <div className="max-h-56 overflow-y-auto">
          {value != null && (
            <button
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="text-ink-faint hover:bg-sidebar-hover flex w-full items-center gap-2 rounded-sm px-2 py-1 text-sm"
            >
              <X className="size-3.5" /> Quitar
            </button>
          )}
          {options
            .filter((o) =>
              o.name.toLowerCase().includes(query.toLowerCase())
            )
            .map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
                className="hover:bg-sidebar-hover flex w-full items-center justify-between rounded-sm px-2 py-1"
              >
                <Tag option={o} />
                {value === o.id && <Check className="text-ink-faint size-3.5" />}
              </button>
            ))}
          {onAddOption &&
            query.trim() &&
            !options.some(
              (o) => o.name.toLowerCase() === query.trim().toLowerCase()
            ) && (
              <button
                onClick={add}
                className="text-ink-soft hover:bg-sidebar-hover flex w-full items-center gap-2 rounded-sm px-2 py-1 text-sm"
              >
                <Plus className="size-3.5" /> Crear «{query.trim()}»
              </button>
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

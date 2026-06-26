"use client";

import {
  Filter as FilterIcon,
  ArrowUpDown,
  Group,
  SlidersHorizontal,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Check,
} from "lucide-react";
import type { DatabaseSchema, Filter, ViewConfig } from "@/lib/types";
import { visibleProperties, EMPTY_FILTER } from "@/lib/database-view";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Section = "filter" | "sort" | "group" | "properties";

type Props = {
  schema: DatabaseSchema;
  config: ViewConfig;
  onChange: (patch: Partial<ViewConfig>) => void;
  /** Secciones a mostrar (por defecto todas). La BD integrada solo usa
   * filtro y orden. */
  sections?: Section[];
};

export function DatabaseToolbar({
  schema,
  config,
  onChange,
  sections = ["filter", "sort", "group", "properties"],
}: Props) {
  const filterableProps = schema.properties.filter(
    (p) =>
      p.type === "select" ||
      p.type === "status" ||
      p.type === "priority" ||
      p.type === "ambito"
  );
  const groupableProps = filterableProps;
  const show = (s: Section) => sections.includes(s);

  return (
    <div className="flex items-center gap-0.5">
      {/* Filtrar */}
      {show("filter") && (
      <ToolbarPopover
        icon={<FilterIcon className="size-3.5" />}
        label="Filtrar"
        active={(config.filters ?? []).some(
          (f) => Array.isArray(f.value) && f.value.length > 0
        )}
      >
        <div className="w-64">
          {filterableProps.length === 0 && (
            <p className="text-ink-faint p-2 text-sm">
              No hay propiedades de selección que filtrar.
            </p>
          )}
          {filterableProps.map((prop) => {
            const current = (config.filters ?? []).find(
              (f) => f.propertyId === prop.id
            );
            const selected = Array.isArray(current?.value)
              ? (current!.value as string[])
              : [];
            return (
              <div key={prop.id} className="mb-2">
                <p className="text-ink-faint mb-1 px-1 text-xs font-medium">
                  {prop.name}
                </p>
                {(() => {
                  const setValue = (valueId: string) => {
                    const on = selected.includes(valueId);
                    const next = on
                      ? selected.filter((id) => id !== valueId)
                      : [...selected, valueId];
                    const others = (config.filters ?? []).filter(
                      (f) => f.propertyId !== prop.id
                    );
                    const filters: Filter[] =
                      next.length > 0
                        ? [
                            ...others,
                            {
                              propertyId: prop.id,
                              operator: "equals",
                              value: next,
                            },
                          ]
                        : others;
                    onChange({ filters });
                  };
                  return (
                    <>
                      {(prop.options ?? []).map((o) => {
                        const on = selected.includes(o.id);
                        return (
                          <button
                            key={o.id}
                            onClick={() => setValue(o.id)}
                            className="hover:bg-sidebar-hover flex w-full items-center justify-between rounded-sm px-1.5 py-1 text-sm"
                          >
                            <span style={{ color: `var(--tint-${o.color})` }}>
                              {o.name}
                            </span>
                            {on && <Check className="text-ink-faint size-3.5" />}
                          </button>
                        );
                      })}
                      {/* Filtrar por «sin valor» */}
                      <button
                        onClick={() => setValue(EMPTY_FILTER)}
                        className="hover:bg-sidebar-hover flex w-full items-center justify-between rounded-sm px-1.5 py-1 text-sm"
                      >
                        <span className="text-ink-faint italic">Vacío</span>
                        {selected.includes(EMPTY_FILTER) && (
                          <Check className="text-ink-faint size-3.5" />
                        )}
                      </button>
                    </>
                  );
                })()}
              </div>
            );
          })}
          {(config.filters ?? []).length > 0 && (
            <button
              onClick={() => onChange({ filters: [] })}
              className="text-ink-faint hover:bg-sidebar-hover mt-1 w-full rounded-sm px-1.5 py-1 text-left text-sm"
            >
              Limpiar todo
            </button>
          )}
        </div>
      </ToolbarPopover>
      )}

      {/* Ordenar */}
      {show("sort") && (
      <ToolbarPopover
        icon={<ArrowUpDown className="size-3.5" />}
        label="Ordenar"
        active={(config.sorts ?? []).length > 0}
      >
        <div className="w-60">
          {schema.properties.map((prop) => {
            const s = (config.sorts ?? []).find(
              (x) => x.propertyId === prop.id
            );
            return (
              <div
                key={prop.id}
                className="hover:bg-sidebar-hover flex items-center justify-between rounded-sm px-1.5 py-1 text-sm"
              >
                <span>{prop.name}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() =>
                      onChange({
                        sorts: [
                          { propertyId: prop.id, direction: "asc" },
                        ],
                      })
                    }
                    className={cn(
                      "rounded px-1 text-xs",
                      s?.direction === "asc"
                        ? "bg-brand-soft text-brand"
                        : "text-ink-faint"
                    )}
                  >
                    A→Z
                  </button>
                  <button
                    onClick={() =>
                      onChange({
                        sorts: [
                          { propertyId: prop.id, direction: "desc" },
                        ],
                      })
                    }
                    className={cn(
                      "rounded px-1 text-xs",
                      s?.direction === "desc"
                        ? "bg-brand-soft text-brand"
                        : "text-ink-faint"
                    )}
                  >
                    Z→A
                  </button>
                </div>
              </div>
            );
          })}
          {(config.sorts ?? []).length > 0 && (
            <button
              onClick={() => onChange({ sorts: [] })}
              className="text-ink-faint hover:bg-sidebar-hover mt-1 w-full rounded-sm px-1.5 py-1 text-left text-sm"
            >
              Quitar orden
            </button>
          )}
        </div>
      </ToolbarPopover>
      )}

      {/* Agrupar */}
      {show("group") && (
      <ToolbarPopover
        icon={<Group className="size-3.5" />}
        label="Agrupar"
        active={!!config.groupBy}
      >
        <div className="w-56">
          <button
            onClick={() => onChange({ groupBy: undefined })}
            className="hover:bg-sidebar-hover flex w-full items-center justify-between rounded-sm px-1.5 py-1 text-sm"
          >
            Sin agrupar
            {!config.groupBy && <Check className="text-ink-faint size-3.5" />}
          </button>
          {groupableProps.map((prop) => (
            <button
              key={prop.id}
              onClick={() => onChange({ groupBy: prop.id })}
              className="hover:bg-sidebar-hover flex w-full items-center justify-between rounded-sm px-1.5 py-1 text-sm"
            >
              {prop.name}
              {config.groupBy === prop.id && (
                <Check className="text-ink-faint size-3.5" />
              )}
            </button>
          ))}
        </div>
      </ToolbarPopover>
      )}

      {/* Propiedades */}
      {show("properties") && (
      <ToolbarPopover
        icon={<SlidersHorizontal className="size-3.5" />}
        label="Propiedades"
      >
        <PropertiesPanel schema={schema} config={config} onChange={onChange} />
      </ToolbarPopover>
      )}
    </div>
  );
}

function PropertiesPanel({ schema, config, onChange }: Props) {
  const ordered = visibleProperties(schema, {
    ...config,
    hiddenProperties: [],
  });
  const hidden = new Set(config.hiddenProperties ?? []);

  function move(id: string, dir: -1 | 1) {
    const ids = ordered.map((p) => p.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    onChange({ propertyOrder: ids });
  }

  function toggle(id: string) {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ hiddenProperties: [...next] });
  }

  return (
    <div className="w-60">
      {ordered.map((prop, i) => (
        <div
          key={prop.id}
          className="hover:bg-sidebar-hover flex items-center gap-1 rounded-sm px-1.5 py-1 text-sm"
        >
          <span className="flex-1 truncate">{prop.name}</span>
          <button
            onClick={() => move(prop.id, -1)}
            disabled={i === 0}
            className="text-ink-faint disabled:opacity-30"
            aria-label="Subir"
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            onClick={() => move(prop.id, 1)}
            disabled={i === ordered.length - 1}
            className="text-ink-faint disabled:opacity-30"
            aria-label="Bajar"
          >
            <ChevronDown className="size-3.5" />
          </button>
          <button
            onClick={() => toggle(prop.id)}
            disabled={prop.type === "title"}
            className="text-ink-faint disabled:opacity-30"
            aria-label={hidden.has(prop.id) ? "Mostrar" : "Ocultar"}
          >
            {hidden.has(prop.id) ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}

function ToolbarPopover({
  icon,
  label,
  active,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "hover:bg-sidebar-hover flex items-center gap-1.5 rounded-sm px-2 py-1 text-[13px]",
            active ? "text-brand" : "text-ink-soft"
          )}
        >
          {icon}
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-1.5">
        {children}
      </PopoverContent>
    </Popover>
  );
}

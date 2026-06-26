"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { HoverCard } from "radix-ui";
import {
  Check,
  Plus,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MapPin,
  Navigation,
  Loader2,
  ExternalLink,
  FileText,
  Database,
} from "lucide-react";
import type {
  DateFormat,
  PlaceValue,
  PropertyDef,
  PropertyValue,
  SelectOption,
} from "@/lib/types";
import {
  getDocTitle,
  createDoc,
  renameDoc,
} from "@/lib/actions/docs";
import { getPaletteItems, type PaletteDoc } from "@/lib/actions/search";
import {
  STATUS_GROUPS,
  DATE_FORMATS,
  isSystemProperty,
  randomSelectColor,
} from "@/lib/types";
import {
  dateStart,
  dateEnd,
  isoDay,
  dayDiff,
  monthMatrix,
  parseDay,
  MONTHS,
  WEEKDAYS,
} from "@/lib/calendar-utils";
import { cn, randomId } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function Tag({
  option,
  onRemove,
}: {
  option: SelectOption;
  onRemove?: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12.5px] font-medium"
      style={{
        background: `var(--tint-${option.color}-bg)`,
        color: `var(--tint-${option.color})`,
      }}
    >
      {option.name}
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="-mr-0.5 inline-flex opacity-60 hover:opacity-100"
          aria-label={`Quitar ${option.name}`}
        >
          <X className="size-3" />
        </span>
      )}
    </span>
  );
}

// --- Formato de presentación de fechas ------------------------------------
function relativeLabel(d: Date): string {
  const diff = dayDiff(d, new Date());
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  if (diff > 0) return `En ${diff} días`;
  return `Hace ${-diff} días`;
}

function formatOne(iso: string, fmt: DateFormat, withTime: boolean): string {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  let s: string;
  if (fmt === "relative") s = relativeLabel(d);
  else if (fmt === "short")
    s = `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
  else s = `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
  if (withTime && iso.length > 10) {
    s += `, ${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
  }
  return s;
}

/** Texto legible de un valor de fecha (string o rango), según la propiedad. */
export function formatDateValue(
  value: PropertyValue,
  prop: PropertyDef
): string {
  const fmt = prop.dateFormat ?? "full";
  const withTime = !!prop.includeTime;
  const start = dateStart(value);
  const end = dateEnd(value);
  if (!start && !end) return "";
  const a = start ? formatOne(start, fmt, withTime) : "";
  const b = end ? formatOne(end, fmt, withTime) : "";
  return b ? `${a} → ${b}` : a;
}

/** Valor de solo lectura de un campo de sistema (id / fechas / autor). */
export function systemFieldValue(
  prop: PropertyDef,
  row: { createdAt?: Date | string | null; updatedAt?: Date | string | null },
  ctx?: { index?: number; userName?: string }
): string {
  const fmtTime = (t: Date | string | null | undefined) => {
    if (!t) return "—";
    const d = t instanceof Date ? t : new Date(t);
    if (Number.isNaN(d.getTime())) return "—";
    return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}, ${String(
      d.getHours()
    ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  switch (prop.type) {
    case "id":
      return ctx?.index != null ? String(ctx.index + 1) : "";
    case "createdTime":
      return fmtTime(row.createdAt);
    case "lastEditedTime":
      return fmtTime(row.updatedAt);
    case "createdBy":
    case "lastEditedBy":
      return ctx?.userName || "—";
    default:
      return "";
  }
}

/**
 * Cierra el popover SOLO con un clic real fuera (no por re-render que roba el
 * foco). Devuelve refs para el disparador y el contenido. `onClose` se invoca
 * con la última versión gracias a un ref interno.
 */
function useOutsideClose(open: boolean, onClose: () => void) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const cb = useRef(onClose);
  useEffect(() => {
    cb.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      const t = e.target as Node | null;
      if (!t) return;
      if (contentRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      cb.current();
    }
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);
  return { triggerRef, contentRef };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** Chip de persona: avatar con iniciales + nombre. */
export function PersonChip({
  option,
  onRemove,
}: {
  option: SelectOption;
  onRemove?: () => void;
}) {
  return (
    <span className="bg-sidebar text-ink inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2 pl-0.5 text-[12.5px] font-medium">
      <span
        className="flex size-[18px] items-center justify-center rounded-full text-[9px] font-semibold text-white"
        style={{ background: `var(--tint-${option.color || "gray"})` }}
      >
        {initials(option.name)}
      </span>
      {option.name}
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="-mr-0.5 inline-flex opacity-60 hover:opacity-100"
          aria-label={`Quitar ${option.name}`}
        >
          <X className="size-3" />
        </span>
      )}
    </span>
  );
}

type CellProps = {
  property: PropertyDef;
  value: PropertyValue;
  onChange: (value: PropertyValue) => void;
  /** Crea una opción nueva (select/status) y devuelve su id. */
  onAddOption?: (name: string) => Promise<string> | string;
  /** Reemplaza la lista de opciones (multiselect/persona, guardado diferido). */
  onSetOptions?: (options: SelectOption[]) => void;
  /** Cambia ajustes de la propiedad (usado por la fecha: rango/hora/formato). */
  onPropertyPatch?: (patch: Partial<PropertyDef>) => void;
  /** Directorio de personas del ámbito (para propiedades de tipo "person"). */
  people?: SelectOption[];
  /** Crea una persona en el directorio del ámbito y la devuelve. */
  onAddPerson?: (name: string) => Promise<SelectOption | null>;
  /** Borra una persona manual (no vinculada) del directorio del ámbito. */
  onDeletePerson?: (id: string) => Promise<void> | void;
};

export function PropertyCell({
  property,
  value,
  onChange,
  onAddOption,
  onSetOptions,
  onPropertyPatch,
  people,
  onAddPerson,
  onDeletePerson,
}: CellProps) {
  // Campos de sistema: solo lectura (el valor llega ya calculado).
  if (isSystemProperty(property.type)) {
    return (
      <span className="text-ink-soft block px-2 py-1.5 text-sm">
        {typeof value === "string" && value ? value : "—"}
      </span>
    );
  }
  switch (property.type) {
    case "title":
    case "text":
      return <TextCell value={value} onChange={onChange} bold={property.type === "title"} />;
    case "url":
      return <UrlCell value={value} onChange={onChange} />;
    case "phone":
      return <TextCell value={value} onChange={onChange} type="tel" />;
    case "email":
      return <TextCell value={value} onChange={onChange} type="email" />;
    case "place":
      return <PlaceCell value={value} onChange={onChange} />;
    case "page":
      return <PageCell value={value} onChange={onChange} />;
    case "number":
      return <NumberCell value={value} onChange={onChange} />;
    case "checkbox":
      return <CheckboxCell value={value} onChange={onChange} />;
    case "date":
      return (
        <DateCell
          property={property}
          value={value}
          onChange={onChange}
          onPropertyPatch={onPropertyPatch}
        />
      );
    case "multiselect":
      return (
        <MultiSelectCell
          property={property}
          value={value}
          onChange={onChange}
          onSetOptions={onSetOptions}
        />
      );
    case "person":
      return (
        <PersonCell
          property={property}
          value={value}
          people={people ?? []}
          onChange={onChange}
          onSetOptions={onSetOptions}
          onAddPerson={onAddPerson}
          onDeletePerson={onDeletePerson}
        />
      );
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
  type,
}: {
  value: PropertyValue;
  onChange: (v: PropertyValue) => void;
  bold?: boolean;
  type?: "tel" | "email";
}) {
  const [draft, setDraft] = useState(typeof value === "string" ? value : "");
  return (
    <input
      type={type ?? "text"}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onChange(draft)}
      className={cn(
        "text-ink w-full bg-transparent px-2 py-1 text-sm outline-none",
        bold && "font-medium"
      )}
    />
  );
}

// --- URL: editable + abrir como hipervínculo -------------------------------
function UrlCell({
  value,
  onChange,
}: {
  value: PropertyValue;
  onChange: (v: PropertyValue) => void;
}) {
  const [draft, setDraft] = useState(typeof value === "string" ? value : "");
  const trimmed = draft.trim();
  const href = trimmed
    ? /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`
    : null;
  return (
    <div className="flex w-full items-center gap-1 pr-1">
      <input
        type="url"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== value && onChange(draft)}
        className={cn(
          "w-full bg-transparent px-2 py-1 text-sm outline-none",
          trimmed ? "text-brand underline decoration-brand/40" : "text-ink"
        )}
      />
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-ink-faint hover:text-brand shrink-0"
          aria-label="Abrir enlace"
          title={href}
        >
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </div>
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

// --- Fecha: popover con calendario + ajustes ------------------------------
function DateCell({
  property,
  value,
  onChange,
  onPropertyPatch,
}: {
  property: PropertyDef;
  value: PropertyValue;
  onChange: (v: PropertyValue) => void;
  onPropertyPatch?: (patch: Partial<PropertyDef>) => void;
}) {
  const [open, setOpen] = useState(false);

  // Borrador de los AJUSTES de la propiedad (rango/hora/formato/recordatorio).
  // Se editan en local mientras el popover está abierto y se guardan al cerrar,
  // para no disparar revalidaciones del servidor que cerrarían el popover.
  const [propDraft, setPropDraft] = useState({
    dateRange: !!property.dateRange,
    includeTime: !!property.includeTime,
    dateFormat: (property.dateFormat ?? "full") as DateFormat,
    reminder: property.reminder ?? "none",
  });
  const propKey = `${!!property.dateRange}|${!!property.includeTime}|${
    property.dateFormat ?? "full"
  }|${property.reminder ?? "none"}`;
  const [lastPropKey, setLastPropKey] = useState(propKey);
  const propDirtyRef = useRef(false);
  function editProp(patch: Partial<typeof propDraft>) {
    propDirtyRef.current = true;
    setPropDraft((p) => ({ ...p, ...patch }));
  }
  const range = propDraft.dateRange;
  const withTime = propDraft.includeTime;

  // Borrador local del VALOR. La clave del enfoque: mientras el popover está
  // abierto NO se llama al servidor (los clics solo tocan el borrador). Así no
  // hay revalidación que re-renderice y cierre el popover. Se guarda al cerrar.
  const externalStart = dateStart(value);
  const externalEnd = dateEnd(value);
  const [draft, setDraft] = useState<[string | null, string | null]>([
    externalStart,
    externalEnd,
  ]);
  const extKey = `${externalStart ?? ""}|${externalEnd ?? ""}`;
  const [lastKey, setLastKey] = useState(extKey);
  if (!open && extKey !== lastKey) {
    // El valor del servidor cambió (con el popover cerrado): re-sincroniza.
    setLastKey(extKey);
    setDraft([externalStart, externalEnd]);
  }
  if (!open && propKey !== lastPropKey) {
    setLastPropKey(propKey);
    setPropDraft({
      dateRange: !!property.dateRange,
      includeTime: !!property.includeTime,
      dateFormat: (property.dateFormat ?? "full") as DateFormat,
      reminder: property.reminder ?? "none",
    });
  }
  const start = draft[0];
  const end = draft[1];
  const display = formatDateValue(
    range ? ([start, end] as PropertyValue) : start,
    { ...property, includeTime: withTime, dateFormat: propDraft.dateFormat }
  );

  // Campo activo (resalta el input correspondiente).
  const [active, setActive] = useState<"start" | "end">("start");
  const ref = parseDay(start) ?? new Date();
  const [view, setView] = useState({ y: ref.getFullYear(), m: ref.getMonth() });

  // Marca cambios y guarda al cerrar (evita escrituras si solo se ha mirado).
  const dirtyRef = useRef(false);
  function edit(next: [string | null, string | null]) {
    dirtyRef.current = true;
    setDraft(next);
  }
  function valueFromDraft(d: [string | null, string | null]): PropertyValue {
    const [s, e] = d;
    if (range) return s || e ? ([s, e] as PropertyValue) : null;
    return (s || null) as PropertyValue;
  }
  function close() {
    if (dirtyRef.current) {
      onChange(valueFromDraft(draft));
      setLastKey(`${draft[0] ?? ""}|${draft[1] ?? ""}`);
      dirtyRef.current = false;
    }
    if (propDirtyRef.current && onPropertyPatch) {
      onPropertyPatch({
        dateRange: propDraft.dateRange,
        includeTime: propDraft.includeTime,
        dateFormat: propDraft.dateFormat,
        reminder: propDraft.reminder,
      });
      setLastPropKey(
        `${propDraft.dateRange}|${propDraft.includeTime}|${propDraft.dateFormat}|${propDraft.reminder}`
      );
      propDirtyRef.current = false;
    }
    setOpen(false);
  }
  // El popover NO se cierra solo: solo con un clic real fuera (inmune al
  // re-render). Radix tiene desactivado su auto-cierre más abajo.
  const { triggerRef, contentRef } = useOutsideClose(open, close);

  function buildIso(day: Date, prev: string | null): string {
    if (!withTime) return isoDay(day);
    const time = prev && prev.length > 10 ? prev.slice(11, 16) : "09:00";
    return `${isoDay(day)}T${time}`;
  }

  function pickDay(day: Date) {
    if (!range) {
      edit([buildIso(day, start), null]);
      return;
    }
    // Rango clásico: 1er clic = inicio, 2º = fin. Con rango completo (o vacío),
    // empieza uno nuevo. Nada se guarda hasta cerrar.
    if (!start || (start && end)) {
      edit([buildIso(day, start), null]);
      setActive("end");
    } else {
      const dayIso = isoDay(day);
      if (dayIso < start.slice(0, 10)) {
        // día anterior al inicio → pasa a ser el nuevo inicio
        edit([buildIso(day, start), start]);
      } else {
        edit([start, buildIso(day, end)]);
      }
      setActive("start");
    }
  }

  const matrix = monthMatrix(view.y, view.m);
  const startDay = parseDay(start);
  const endDay = parseDay(end);
  const todayIso = isoDay(new Date());

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (o) {
          dirtyRef.current = false;
          propDirtyRef.current = false;
          setOpen(true);
        } else {
          close();
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          className="hover:bg-sidebar-hover flex min-h-7 w-full items-center px-2 py-1 text-left"
        >
          {display ? (
            <span className="text-ink-soft text-sm">{display}</span>
          ) : (
            <span className="text-ink-ghost text-sm">Vacío</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        align="start"
        collisionPadding={8}
        className="w-72 overflow-y-auto p-2"
        // Limita la altura al hueco real disponible (Radix lo calcula) para que
        // nunca se corte por abajo: si no cabe, hace scroll interno.
        style={{ maxHeight: "var(--radix-popover-content-available-height)" }}
        // Desactiva el auto-cierre de Radix (foco/clic fuera); lo gestionamos a
        // mano para que ningún clic interno ni la revalidación cierren el popover.
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
      >
        {/* Inputs de inicio / fin */}
        <div className="mb-2 flex items-center gap-1.5">
          <input
            type={withTime ? "datetime-local" : "date"}
            value={(start ?? "").slice(0, withTime ? 16 : 10)}
            onFocus={() => setActive("start")}
            onChange={(e) => edit([e.target.value || null, range ? end : null])}
            className={cn(
              "border-line bg-surface text-ink min-w-0 flex-1 rounded-md border px-2 py-1 text-sm outline-none",
              active === "start" && "ring-brand ring-1"
            )}
          />
          {range && (
            <>
              <span className="text-ink-faint shrink-0">→</span>
              <input
                type={withTime ? "datetime-local" : "date"}
                value={(end ?? "").slice(0, withTime ? 16 : 10)}
                onFocus={() => setActive("end")}
                onChange={(e) => edit([start, e.target.value || null])}
                className={cn(
                  "border-line bg-surface text-ink min-w-0 flex-1 rounded-md border px-2 py-1 text-sm outline-none",
                  active === "end" && "ring-brand ring-1"
                )}
              />
            </>
          )}
        </div>

        {/* Calendario */}
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="text-ink text-sm font-medium">
            {MONTHS[view.m]} {view.y}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() =>
                setView({
                  y: new Date().getFullYear(),
                  m: new Date().getMonth(),
                })
              }
              className="text-ink-faint hover:bg-sidebar-hover rounded-sm px-1.5 py-0.5 text-xs"
            >
              Hoy
            </button>
            <button
              onClick={() =>
                setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))
              }
              className="text-ink-faint hover:bg-sidebar-hover rounded-sm p-1"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() =>
                setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))
              }
              className="text-ink-faint hover:bg-sidebar-hover rounded-sm p-1"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-ink-faint py-1 text-[11px]">
              {w.slice(0, 2)}
            </div>
          ))}
          {matrix.flat().map(({ date, inMonth }) => {
            const iso = isoDay(date);
            const isStart = startDay && isoDay(startDay) === iso;
            const isEnd = endDay && isoDay(endDay) === iso;
            const inRange =
              startDay &&
              endDay &&
              date >= startDay &&
              date <= endDay &&
              !isStart &&
              !isEnd;
            const isToday = iso === todayIso;
            return (
              <button
                key={iso}
                onClick={() => pickDay(date)}
                className={cn(
                  "mx-auto my-0.5 flex size-8 items-center justify-center rounded-md text-[13px]",
                  !inMonth && "text-ink-ghost",
                  inMonth && "text-ink",
                  inRange && "bg-tint-blue-bg rounded-none",
                  (isStart || isEnd) && "bg-brand font-medium text-white",
                  isToday && !isStart && !isEnd && "ring-brand ring-1",
                  !isStart && !isEnd && "hover:bg-sidebar-hover"
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        {/* Ajustes de la propiedad */}
        {onPropertyPatch && (
          <div className="border-line mt-2 space-y-0.5 border-t pt-2 text-sm">
            <ToggleRow
              label="Fecha de finalización"
              checked={range}
              onChange={(c) => {
                editProp({ dateRange: c });
                if (!c && end) edit([start, null]); // al quitar rango, conserva inicio
                if (c) setActive(start ? "end" : "start");
              }}
            />
            <SelectRow
              label="Formato de fecha"
              value={propDraft.dateFormat}
              options={DATE_FORMATS}
              onChange={(v) => editProp({ dateFormat: v as DateFormat })}
            />
            <ToggleRow
              label="Incluir hora"
              checked={withTime}
              onChange={(c) => {
                editProp({ includeTime: c });
                // conserva la fecha al cambiar de formato (añade/quita la hora)
                const adj = (v: string | null) =>
                  !v ? v : c ? (v.length > 10 ? v : `${v}T09:00`) : v.slice(0, 10);
                if (start || end) edit([adj(start), adj(end)]);
              }}
            />
            <SelectRow
              label="Recordatorio"
              value={propDraft.reminder}
              options={REMINDERS}
              onChange={(v) => editProp({ reminder: v })}
            />
          </div>
        )}
        {(start || end) && (
          <button
            onClick={() => {
              edit([null, null]);
              setActive("start");
            }}
            className="text-ink-faint hover:bg-sidebar-hover mt-1 flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
          >
            <Trash2 className="size-3.5" /> Borrar
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

const REMINDERS = [
  { value: "none", label: "Ninguno" },
  { value: "onDay", label: "El día (9:00)" },
  { value: "1day", label: "1 día antes" },
  { value: "2days", label: "2 días antes" },
  { value: "1week", label: "1 semana antes" },
];

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (c: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-1 py-1">
      <span className="text-ink-soft">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-[18px] w-8 rounded-full transition-colors",
          checked ? "bg-brand" : "bg-line-strong"
        )}
        role="switch"
        aria-checked={checked}
        aria-label={label}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3.5 rounded-full bg-white transition-all",
            checked ? "left-[15px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <div className="flex items-center justify-between px-1 py-1">
      <span className="text-ink-soft">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-ink-soft hover:bg-sidebar-hover cursor-pointer rounded-sm bg-transparent py-0.5 pl-1.5 text-sm outline-none"
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {/* fallback de etiqueta para entornos sin estilizar el select */}
      <span className="sr-only">{current.label}</span>
    </div>
  );
}

// --- Lugar: búsqueda de ubicación (OpenStreetMap) --------------------------
function parsePlace(value: PropertyValue): PlaceValue | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const o = JSON.parse(value);
    if (o && typeof o === "object" && typeof o.name === "string")
      return o as PlaceValue;
  } catch {
    /* valor antiguo en texto plano */
  }
  return { name: value };
}

// Mapa embebido de OpenStreetMap centrado en el punto (sin API key).
function mapEmbedUrl(lat: number, lon: number): string {
  const d = 0.004;
  const bbox = `${lon - d},${lat - d},${lon + d},${lat + d}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik&marker=${lat},${lon}`;
}

function googleMapsUrl(p: PlaceValue): string {
  const q =
    p.lat != null && p.lon != null ? `${p.lat},${p.lon}` : p.address || p.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function PlaceCell({
  value,
  onChange,
}: {
  value: PropertyValue;
  onChange: (v: PropertyValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceValue[]>([]);
  const [loading, setLoading] = useState(false);
  const place = parsePlace(value);

  // Búsqueda con debounce mientras el popover está abierto. Todas las
  // actualizaciones de estado ocurren dentro del timeout (no de forma síncrona).
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    const ctrl = new AbortController();
    const t = setTimeout(
      async () => {
        if (q.length < 3) {
          setResults([]);
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
            signal: ctrl.signal,
          });
          const data = await res.json();
          setResults(data.places ?? []);
        } catch {
          /* abortado o error de red */
        } finally {
          setLoading(false);
        }
      },
      q.length < 3 ? 0 : 400
    );
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, open]);

  function pick(p: PlaceValue) {
    onChange(JSON.stringify(p));
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function useCurrent() {
    if (!navigator.geolocation) {
      toast.error("Geolocalización no disponible");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `/api/geocode?lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          pick(
            data.places?.[0] ?? {
              name: "Ubicación actual",
              lat: latitude,
              lon: longitude,
            }
          );
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        toast.error("No se pudo obtener tu ubicación");
      }
    );
  }

  // Vista previa al pasar el ratón (mini-mapa + Google Maps), oculta al editar.
  const [hoverOpen, setHoverOpen] = useState(false);
  const hasCoords = place?.lat != null && place?.lon != null;

  return (
    <HoverCard.Root
      open={hoverOpen && !open && !!place}
      onOpenChange={setHoverOpen}
      openDelay={250}
      closeDelay={120}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <HoverCard.Trigger asChild>
          <PopoverTrigger asChild>
            <button className="hover:bg-sidebar-hover flex min-h-7 w-full items-center px-2 py-1 text-left">
              {place ? (
                <span className="text-ink-soft inline-flex items-center gap-1 text-sm">
                  <MapPin className="text-ink-faint size-3.5 shrink-0" />
                  <span className="truncate">{place.name}</span>
                </span>
              ) : (
                <span className="text-ink-ghost text-sm">Vacío</span>
              )}
            </button>
          </PopoverTrigger>
        </HoverCard.Trigger>
        <PopoverContent align="start" className="w-72 p-1">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar una ubicación…"
          className="border-line bg-surface text-ink mb-1 w-full rounded-md border px-2 py-1 text-sm outline-none"
        />
        <div className="max-h-64 overflow-y-auto">
          <button
            onClick={useCurrent}
            className="hover:bg-sidebar-hover text-ink flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
          >
            <Navigation className="text-ink-faint size-4 shrink-0" />
            Ubicación actual
          </button>
          {loading && (
            <div className="text-ink-faint flex items-center gap-2 px-2 py-1.5 text-sm">
              <Loader2 className="size-3.5 animate-spin" /> Buscando…
            </div>
          )}
          {results.map((p, i) => (
            <button
              key={i}
              onClick={() => pick(p)}
              className="hover:bg-sidebar-hover flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left"
            >
              <span className="text-ink text-sm font-medium">{p.name}</span>
              {p.address && (
                <span className="text-ink-faint w-full truncate text-xs">
                  {p.address}
                </span>
              )}
            </button>
          ))}
          {place && (
            <button
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="text-ink-faint hover:bg-sidebar-hover flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
            >
              <X className="size-3.5" /> Quitar ubicación
            </button>
          )}
        </div>
        <div className="text-ink-ghost px-2 py-1 text-[10px]">
          Datos © OpenStreetMap
        </div>
        </PopoverContent>
      </Popover>
      {place && (
        <HoverCard.Portal>
          <HoverCard.Content
            side="bottom"
            align="start"
            sideOffset={6}
            className="border-line bg-surface z-50 w-64 overflow-hidden rounded-lg border shadow-md"
          >
            {hasCoords && (
              <iframe
                title={`Mapa de ${place.name}`}
                src={mapEmbedUrl(place.lat!, place.lon!)}
                loading="lazy"
                className="h-36 w-full border-0"
              />
            )}
            <div className="flex items-center justify-between gap-2 p-2">
              <div className="min-w-0">
                <div className="text-ink truncate text-sm font-medium">
                  {place.name}
                </div>
                {place.address && (
                  <div className="text-ink-faint truncate text-xs">
                    {place.address}
                  </div>
                )}
              </div>
              <a
                href={googleMapsUrl(place)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-faint hover:bg-sidebar-hover hover:text-ink flex size-7 shrink-0 items-center justify-center rounded-md"
                aria-label="Abrir en Google Maps"
                title="Abrir en Google Maps"
              >
                <ExternalLink className="size-4" />
              </a>
            </div>
          </HoverCard.Content>
        </HoverCard.Portal>
      )}
    </HoverCard.Root>
  );
}

// --- Enlace a página / base de datos ---------------------------------------
function PageCell({
  value,
  onChange,
}: {
  value: PropertyValue;
  onChange: (v: PropertyValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<PaletteDoc[]>([]);
  const [linked, setLinked] = useState<{
    title: string;
    emoji: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const docId = typeof value === "string" && value ? value : null;

  // Resuelve el título/emoji del doc enlazado (se mantiene si se renombra).
  useEffect(() => {
    if (!docId) return;
    let alive = true;
    getDocTitle(docId)
      .then((d) => alive && setLinked(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [docId]);

  // Carga la lista de docs (páginas y BBDD) al abrir el selector.
  useEffect(() => {
    if (!open) return;
    getPaletteItems()
      .then((r) => setDocs(r.docs))
      .catch(() => {});
  }, [open]);

  function pick(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  async function createPage() {
    setBusy(true);
    try {
      const name = query.trim() || "Nueva página";
      const { id } = await createDoc({ section: "team" });
      await renameDoc(id, name);
      pick(id);
    } finally {
      setBusy(false);
    }
  }

  const q = query.trim().toLowerCase();
  const filtered = docs.filter((d) =>
    (d.title || "Sin título").toLowerCase().includes(q)
  );
  const docIcon = (kind: PaletteDoc["kind"], emoji: string | null) =>
    emoji ? (
      <span className="text-sm leading-none">{emoji}</span>
    ) : kind === "database" ? (
      <Database className="text-ink-faint size-4" />
    ) : (
      <FileText className="text-ink-faint size-4" />
    );

  const content = (
    <PopoverContent align="start" className="w-72 p-1">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar una página o base de datos…"
        className="border-line bg-surface text-ink mb-1 w-full rounded-md border px-2 py-1 text-sm outline-none"
      />
      <div className="max-h-64 overflow-y-auto">
        {filtered.map((d) => (
          <button
            key={d.id}
            onClick={() => pick(d.id)}
            className="hover:bg-sidebar-hover flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left"
          >
            {docIcon(d.kind, d.emoji)}
            <span className="text-ink truncate text-sm">
              {d.title || "Sin título"}
            </span>
            {d.id === docId && (
              <Check className="text-ink-faint ml-auto size-3.5 shrink-0" />
            )}
          </button>
        ))}
        {q && !docs.some((d) => (d.title || "").toLowerCase() === q) && (
          <button
            onClick={createPage}
            disabled={busy}
            className="text-ink-soft hover:bg-sidebar-hover flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm disabled:opacity-50"
          >
            <Plus className="size-3.5" /> Crear página «{query.trim()}»
          </button>
        )}
        {docId && (
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="text-ink-faint hover:bg-sidebar-hover flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
          >
            <X className="size-3.5" /> Quitar enlace
          </button>
        )}
      </div>
    </PopoverContent>
  );

  if (docId) {
    return (
      <div className="group/pl flex w-full items-center gap-1 px-1">
        <Link
          href={`/p/${docId}`}
          className="text-ink inline-flex min-w-0 items-center gap-1 rounded px-1 py-1 text-sm hover:underline"
        >
          {linked?.emoji ? (
            <span className="shrink-0 leading-none">{linked.emoji}</span>
          ) : (
            <FileText className="text-ink-faint size-3.5 shrink-0" />
          )}
          <span className="truncate">{linked?.title || "Sin título"}</span>
        </Link>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className="text-ink-faint hover:bg-sidebar-hover ml-auto shrink-0 rounded-sm p-0.5 opacity-0 group-hover/pl:opacity-100 data-[state=open]:opacity-100"
              aria-label="Cambiar enlace"
            >
              <ChevronDown className="size-3.5" />
            </button>
          </PopoverTrigger>
          {content}
        </Popover>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="hover:bg-sidebar-hover flex min-h-7 w-full items-center px-2 py-1 text-left">
          <span className="text-ink-ghost text-sm">Vacío</span>
        </button>
      </PopoverTrigger>
      {content}
    </Popover>
  );
}

// --- Selección múltiple / Persona: chips -----------------------------------
function MultiSelectCell({
  property,
  value,
  onChange,
  onSetOptions,
  person,
}: {
  property: PropertyDef;
  value: PropertyValue;
  onChange: (v: PropertyValue) => void;
  /** Reemplaza la lista de opciones (guardado diferido al cerrar). */
  onSetOptions?: (options: SelectOption[]) => void;
  /** Modo persona: chips con avatar de iniciales en vez de etiqueta de color. */
  person?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Borrador local de opciones y selección: mientras el popover está abierto no
  // se llama al servidor, así puedes añadir/elegir varias sin que se cierre. Se
  // guarda al cerrar (clic fuera).
  const extOptions = property.options ?? [];
  const extIds = Array.isArray(value) ? (value as string[]) : [];
  const [opts, setOpts] = useState<SelectOption[]>(extOptions);
  const [ids, setIds] = useState<string[]>(extIds);
  const optsKey = extOptions.map((o) => `${o.id}:${o.name}:${o.color}`).join("|");
  const idsKey = extIds.join(",");
  const [lastOptsKey, setLastOptsKey] = useState(optsKey);
  const [lastIdsKey, setLastIdsKey] = useState(idsKey);
  if (!open && optsKey !== lastOptsKey) {
    setLastOptsKey(optsKey);
    setOpts(extOptions);
  }
  if (!open && idsKey !== lastIdsKey) {
    setLastIdsKey(idsKey);
    setIds(extIds);
  }

  const selected = ids
    .map((id) => opts.find((o) => o.id === id))
    .filter((o): o is SelectOption => !!o);

  const chip = (o: SelectOption, onRemove?: () => void) =>
    person ? (
      <PersonChip key={o.id} option={o} onRemove={onRemove} />
    ) : (
      <Tag key={o.id} option={o} onRemove={onRemove} />
    );
  const createLabel = person ? "Añadir persona" : "Crear";
  const hint = person
    ? "Elige o escribe un nombre"
    : "Selecciona una opción o crea una";

  function toggle(id: string) {
    setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  }
  function remove(id: string) {
    setIds(ids.filter((x) => x !== id));
  }
  function add() {
    const name = query.trim();
    if (!name) return;
    const existing = opts.find((o) => o.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!ids.includes(existing.id)) toggle(existing.id);
      setQuery("");
      return;
    }
    const opt: SelectOption = { id: randomId(), name, color: randomSelectColor() };
    setOpts([...opts, opt]);
    setIds([...ids, opt.id]);
    setQuery("");
  }

  // Guarda al cerrar lo que haya cambiado respecto al valor del servidor.
  function close() {
    const nextOptsKey = opts.map((o) => `${o.id}:${o.name}:${o.color}`).join("|");
    if (nextOptsKey !== optsKey && onSetOptions) {
      onSetOptions(opts);
      setLastOptsKey(nextOptsKey);
    }
    const nextIdsKey = ids.join(",");
    if (nextIdsKey !== idsKey) {
      onChange(ids.length ? ids : null);
      setLastIdsKey(nextIdsKey);
    }
    setOpen(false);
  }

  const { triggerRef, contentRef } = useOutsideClose(open, close);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => (o ? setOpen(true) : close())}
    >
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          className="hover:bg-sidebar-hover flex min-h-7 w-full flex-wrap items-center gap-1 px-2 py-1 text-left"
        >
          {selected.length ? (
            selected.map((o) => chip(o))
          ) : (
            <span className="text-ink-ghost text-sm">Vacío</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        align="start"
        collisionPadding={8}
        className="flex w-60 flex-col overflow-hidden p-1"
        // Limita la altura al hueco real disponible para que no se corte abajo.
        style={{ maxHeight: "var(--radix-popover-content-available-height)" }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
      >
        {selected.length > 0 && (
          <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto p-1">
            {selected.map((o) => chip(o, () => remove(o.id)))}
          </div>
        )}
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={person ? "Buscar o añadir persona…" : "Buscar o crear…"}
          className="border-line bg-surface text-ink mb-1 w-full rounded-md border px-2 py-1 text-sm outline-none"
        />
        <div className="text-ink-faint px-2 py-1 text-xs">{hint}</div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {opts
            .filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
            .map((o) => (
              <button
                key={o.id}
                onClick={() => toggle(o.id)}
                className="hover:bg-sidebar-hover flex w-full items-center justify-between rounded-sm px-2 py-1"
              >
                {chip(o)}
                {ids.includes(o.id) && (
                  <Check className="text-ink-faint size-3.5" />
                )}
              </button>
            ))}
          {onSetOptions &&
            query.trim() &&
            !opts.some(
              (o) => o.name.toLowerCase() === query.trim().toLowerCase()
            ) && (
              <button
                onClick={add}
                className="text-ink-soft hover:bg-sidebar-hover flex w-full items-center gap-2 rounded-sm px-2 py-1 text-sm"
              >
                <Plus className="size-3.5" /> {createLabel} «{query.trim()}»
              </button>
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// --- Persona: chips desde el DIRECTORIO común del espacio ------------------
// A diferencia de `multiselect`, las personas no viven en la propiedad sino en
// un directorio por ámbito (equipo/privado). La propiedad solo MATERIALIZA en
// su `options` las personas a las que apunta alguna fila (para pintarlas sin
// cargar el directorio). El popover ofrece todo el directorio; crear una nueva
// la añade al directorio (común a todas las BBDD del ámbito).
function PersonCell({
  property,
  value,
  people,
  onChange,
  onSetOptions,
  onAddPerson,
  onDeletePerson,
}: {
  property: PropertyDef;
  value: PropertyValue;
  /** Directorio del ámbito (lista de selección común). */
  people: SelectOption[];
  onChange: (v: PropertyValue) => void;
  /** Materializa en property.options las personas referenciadas (diferido). */
  onSetOptions?: (options: SelectOption[]) => void;
  /** Crea una persona en el directorio y la devuelve. */
  onAddPerson?: (name: string) => Promise<SelectOption | null>;
  /** Borra una persona manual (no vinculada) del directorio. */
  onDeletePerson?: (id: string) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const propOptions = property.options ?? [];
  const extIds = Array.isArray(value) ? (value as string[]) : [];
  const [ids, setIds] = useState<string[]>(extIds);
  // Personas creadas en esta sesión que aún no están en el `people` que llega
  // por props (hasta que el servidor revalide).
  const [extra, setExtra] = useState<SelectOption[]>([]);
  // Borradas del directorio en esta sesión (el servidor no revalida; las ocultamos
  // en local hasta la próxima carga).
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const idsKey = extIds.join(",");
  const [lastIdsKey, setLastIdsKey] = useState(idsKey);
  if (!open && idsKey !== lastIdsKey) {
    setLastIdsKey(idsKey);
    setIds(extIds);
  }

  // Candidatos = directorio ∪ creadas en sesión ∪ ya materializadas. El
  // directorio manda en nombre/color (propaga renombrados).
  const byId = new Map<string, SelectOption>();
  for (const o of propOptions) byId.set(o.id, o);
  for (const o of extra) byId.set(o.id, o);
  for (const o of people) byId.set(o.id, o);
  const candidates = [...byId.values()].filter((o) => !removed.has(o.id));

  const selected = ids
    .map((id) => byId.get(id))
    .filter((o): o is SelectOption => !!o);

  function toggle(id: string) {
    setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  }
  function remove(id: string) {
    setIds(ids.filter((x) => x !== id));
  }
  async function del(id: string) {
    setRemoved((r) => new Set(r).add(id));
    setIds((cur) => cur.filter((x) => x !== id));
    setExtra((e) => e.filter((o) => o.id !== id));
    await onDeletePerson?.(id);
  }
  async function add() {
    const name = query.trim();
    if (!name) return;
    const existing = candidates.find(
      (o) => o.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      if (!ids.includes(existing.id)) setIds([...ids, existing.id]);
      setQuery("");
      return;
    }
    if (!onAddPerson) return;
    const created = await onAddPerson(name);
    if (created) {
      setExtra((e) => [...e, created]);
      setIds((cur) => [...cur, created.id]);
    }
    setQuery("");
  }

  // Al cerrar: persiste la selección y materializa options con los nombres/
  // colores frescos del directorio + las personas recién referenciadas.
  function close() {
    const nextIdsKey = ids.join(",");
    if (nextIdsKey !== idsKey) {
      onChange(ids.length ? ids : null);
      setLastIdsKey(nextIdsKey);
    }
    if (onSetOptions) {
      const merged = new Map<string, SelectOption>();
      for (const o of propOptions) merged.set(o.id, byId.get(o.id) ?? o);
      for (const id of ids) {
        const c = byId.get(id);
        if (c) merged.set(id, c);
      }
      const nextOptions = [...merged.values()];
      const a = nextOptions.map((o) => `${o.id}:${o.name}:${o.color}`).join("|");
      const b = propOptions.map((o) => `${o.id}:${o.name}:${o.color}`).join("|");
      if (a !== b) onSetOptions(nextOptions);
    }
    setOpen(false);
  }

  const { triggerRef, contentRef } = useOutsideClose(open, close);

  return (
    <Popover open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          className="hover:bg-sidebar-hover flex min-h-7 w-full flex-wrap items-center gap-1 px-2 py-1 text-left"
        >
          {selected.length ? (
            selected.map((o) => <PersonChip key={o.id} option={o} />)
          ) : (
            <span className="text-ink-ghost text-sm">Vacío</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        align="start"
        collisionPadding={8}
        className="flex w-60 flex-col overflow-hidden p-1"
        style={{ maxHeight: "var(--radix-popover-content-available-height)" }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
      >
        {selected.length > 0 && (
          <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto p-1">
            {selected.map((o) => (
              <PersonChip key={o.id} option={o} onRemove={() => remove(o.id)} />
            ))}
          </div>
        )}
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Buscar o añadir persona…"
          className="border-line bg-surface text-ink mb-1 w-full rounded-md border px-2 py-1 text-sm outline-none"
        />
        <div className="text-ink-faint px-2 py-1 text-xs">
          Elige del directorio o escribe un nombre nuevo
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {candidates
            .filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
            .map((o) => (
              <div
                key={o.id}
                className="group/p hover:bg-sidebar-hover flex w-full items-center rounded-sm"
              >
                <button
                  onClick={() => toggle(o.id)}
                  className="flex min-w-0 flex-1 items-center justify-between px-2 py-1 text-left"
                >
                  <PersonChip option={o} />
                  {ids.includes(o.id) && (
                    <Check className="text-ink-faint size-3.5 shrink-0" />
                  )}
                </button>
                {onDeletePerson && !o.isUser && (
                  <button
                    onClick={() => del(o.id)}
                    aria-label="Eliminar del directorio"
                    title="Eliminar del directorio"
                    className="text-ink-faint shrink-0 px-1.5 opacity-0 group-hover/p:opacity-100 hover:text-red-600"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          {onAddPerson &&
            query.trim() &&
            !candidates.some(
              (o) => o.name.toLowerCase() === query.trim().toLowerCase()
            ) && (
              <button
                onClick={add}
                className="text-ink-soft hover:bg-sidebar-hover flex w-full items-center gap-2 rounded-sm px-2 py-1 text-sm"
              >
                <Plus className="size-3.5" /> Añadir persona «{query.trim()}»
              </button>
            )}
        </div>
      </PopoverContent>
    </Popover>
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
  const isStatus = property.type === "status";

  async function add() {
    if (!onAddOption || !query.trim()) return;
    const id = await onAddOption(query.trim());
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(query.toLowerCase())
  );

  function optionButton(o: SelectOption) {
    return (
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
    );
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
          {isStatus
            ? STATUS_GROUPS.map((g) => {
                const groupOpts = filtered.filter((o) => (o.group ?? "todo") === g.value);
                if (!groupOpts.length) return null;
                return (
                  <div key={g.value} className="mb-1">
                    <div className="text-ink-faint px-2 py-1 text-[11px] font-medium">
                      {g.label}
                    </div>
                    {groupOpts.map(optionButton)}
                  </div>
                );
              })
            : filtered.map(optionButton)}
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

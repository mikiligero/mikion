"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check, Flag, Plus, Trash2 } from "lucide-react";
import type { PropertyDef, SelectOption } from "@/lib/types";
import {
  SELECT_COLORS,
  groupsForType,
  hasOptionGroups,
  randomSelectColor,
} from "@/lib/types";
import { updateProperty } from "@/lib/actions/databases";
import { randomId } from "@/lib/utils";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

/** Punto de color de una opción. */
function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="size-3.5 shrink-0 rounded-[4px] border"
      style={{
        background: `var(--tint-${color}-bg)`,
        borderColor: `var(--tint-${color})`,
      }}
    />
  );
}

/**
 * Editor de opciones de una propiedad select/multiselect/status, pensado para
 * incrustarse en el menú de cabecera de columna. Persiste con `updateProperty`.
 */
export function PropertyOptionsEditor({
  databaseId,
  property,
}: {
  databaseId: string;
  property: PropertyDef;
}) {
  const [, startTransition] = useTransition();
  const options = property.options ?? [];
  const groups = groupsForType(property.type); // status / priority
  const grouped = hasOptionGroups(property.type);
  const isPerson = property.type === "person";

  function patch(p: Partial<PropertyDef>) {
    startTransition(() => updateProperty(databaseId, property.id, p));
  }

  function updateOption(id: string, op: Partial<SelectOption>) {
    patch({ options: options.map((o) => (o.id === id ? { ...o, ...op } : o)) });
  }

  function removeOption(id: string) {
    patch({
      options: options.filter((o) => o.id !== id),
      ...(property.defaultOptionId === id ? { defaultOptionId: undefined } : {}),
    });
  }

  function addOption() {
    const opt: SelectOption = {
      id: randomId(),
      name: isPerson
        ? `Persona ${options.length + 1}`
        : `Opción ${options.length + 1}`,
      color: randomSelectColor(),
      ...(grouped ? { group: groups[0].value } : {}),
    };
    patch({ options: [...options, opt] });
  }

  return (
    <>
      <DropdownMenuSeparator />
      <div className="text-ink-faint px-2 py-1 text-[11px] font-medium">
        {isPerson ? "Personas" : "Opciones"}
      </div>
      {options.length === 0 && (
        <div className="text-ink-faint px-2 py-1 text-[12px]">
          {isPerson ? "Aún no hay personas." : "Aún no hay opciones."}
        </div>
      )}
      {options.map((o) => (
        <DropdownMenuSub key={o.id}>
          <DropdownMenuSubTrigger>
            <ColorDot color={o.color} />
            <span className="truncate">{o.name}</span>
            {property.defaultOptionId === o.id && (
              <Flag className="text-ink-faint ml-auto size-3" />
            )}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            {/* Renombrar */}
            <div className="p-1" onKeyDown={(e) => e.stopPropagation()}>
              <input
                defaultValue={o.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== o.name) updateOption(o.id, { name: v });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="border-line focus:ring-ring w-full rounded-md border bg-transparent px-2 py-1 text-sm outline-none focus:ring-2"
              />
            </div>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => removeOption(o.id)}
            >
              <Trash2 className="size-4" /> Eliminar
            </DropdownMenuItem>
            {!isPerson &&
              (() => {
                const isDefault = property.defaultOptionId === o.id;
                return (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      patch({ defaultOptionId: isDefault ? undefined : o.id });
                      toast.success(
                        isDefault
                          ? "Se quitó el valor predeterminado"
                          : `«${o.name}» es ahora el valor de las filas nuevas`
                      );
                    }}
                  >
                    <Flag className="size-4" />
                    <span className="flex-1">
                      {isDefault
                        ? "Quitar predeterminado"
                        : "Fijar como predeterminado"}
                    </span>
                    {isDefault && <Check className="text-ink-faint size-3.5" />}
                  </DropdownMenuItem>
                );
              })()}

            {grouped && (
              <>
                <DropdownMenuSeparator />
                <div className="text-ink-faint px-2 py-1 text-[11px] font-medium">
                  {property.type === "priority" ? "Nivel" : "Grupo"}
                </div>
                {groups.map((g) => (
                  <DropdownMenuItem
                    key={g.value}
                    onSelect={(e) => {
                      e.preventDefault();
                      updateOption(o.id, { group: g.value });
                    }}
                  >
                    <span className="flex-1">{g.label}</span>
                    {(o.group ?? groups[0].value) === g.value && (
                      <Check className="text-ink-faint size-3.5" />
                    )}
                  </DropdownMenuItem>
                ))}
              </>
            )}

            <DropdownMenuSeparator />
            <div className="text-ink-faint px-2 py-1 text-[11px] font-medium">
              Colores
            </div>
            <div className="max-h-48 overflow-y-auto">
              {SELECT_COLORS.map((c) => (
                <DropdownMenuItem
                  key={c.key}
                  onSelect={(e) => {
                    e.preventDefault();
                    updateOption(o.id, { color: c.key });
                  }}
                >
                  <ColorDot color={c.key} />
                  <span className="flex-1">{c.label}</span>
                  {o.color === c.key && (
                    <Check className="text-ink-faint size-3.5" />
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      ))}
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          addOption();
        }}
      >
        <Plus className="size-4" /> {isPerson ? "Añadir persona" : "Añadir opción"}
      </DropdownMenuItem>
    </>
  );
}

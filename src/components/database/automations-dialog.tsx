"use client";

import { useState } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import {
  AUTOMATION_TRIGGERS,
  AUTOMATION_ACTIONS,
  type Automation,
  type AutomationTrigger,
  type AutomationAction,
} from "@/lib/types";
import { setAutomations } from "@/lib/actions/databases";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const triggerLabel = (t: AutomationTrigger) =>
  AUTOMATION_TRIGGERS.find((x) => x.value === t)?.label ?? t;
const actionLabel = (a: AutomationAction) =>
  AUTOMATION_ACTIONS.find((x) => x.value === a)?.label ?? a;

export function AutomationsDialog({
  databaseId,
  automations,
  open,
  onOpenChange,
}: {
  databaseId: string;
  automations: Automation[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [rules, setRules] = useState<Automation[]>(automations);
  const [adding, setAdding] = useState(false);
  const [when, setWhen] = useState<AutomationTrigger>("status_done");
  const [then, setThen] = useState<AutomationAction>("set_end_date");

  function save(next: Automation[]) {
    setRules(next);
    void setAutomations(databaseId, next);
  }

  function create() {
    save([
      ...rules,
      { id: crypto.randomUUID(), when, then, enabled: true },
    ]);
    setAdding(false);
    setWhen("status_done");
    setThen("set_end_date");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl font-[560]">
            Automatizaciones
          </DialogTitle>
          <DialogDescription>
            Cuando ocurra algo, Mikion hará una acción por ti.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {rules.length === 0 && !adding && (
            <p className="text-ink-faint py-2 text-sm">
              Aún no hay automatizaciones.
            </p>
          )}

          {rules.map((r) => (
            <div
              key={r.id}
              className="border-line flex items-center gap-3 rounded-md border p-3"
            >
              <Zap className="text-brand size-4 shrink-0" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-ink">
                  <span className="text-ink-faint">Cuando</span>{" "}
                  {triggerLabel(r.when)}
                </p>
                <p className="text-ink">
                  <span className="text-ink-faint">Entonces</span>{" "}
                  {actionLabel(r.then)}
                </p>
              </div>
              <Switch
                checked={r.enabled}
                onCheckedChange={(c) =>
                  save(rules.map((x) => (x.id === r.id ? { ...x, enabled: c } : x)))
                }
              />
              <button
                onClick={() => save(rules.filter((x) => x.id !== r.id))}
                className="text-ink-faint hover:text-destructive p-1"
                aria-label="Eliminar"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}

          {adding ? (
            <div className="border-line space-y-2 rounded-md border border-dashed p-3">
              <div>
                <p className="text-ink-faint mb-1 text-xs font-medium">Cuando</p>
                <Select value={when} onValueChange={(v) => setWhen(v as AutomationTrigger)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTOMATION_TRIGGERS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-ink-faint mb-1 text-xs font-medium">Entonces</p>
                <Select value={then} onValueChange={(v) => setThen(v as AutomationAction)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTOMATION_ACTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setAdding(false)}
                  className="text-ink-soft hover:bg-sidebar-hover rounded-md px-3 py-1 text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={create}
                  className="bg-primary text-primary-foreground rounded-md px-3 py-1 text-sm font-medium"
                >
                  Crear
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="text-ink-soft hover:bg-sidebar-hover flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-line py-2 text-sm"
            >
              <Plus className="size-4" /> Nueva automatización
            </button>
          )}
        </div>

        <p className="text-ink-faint text-xs">
          Las reglas se guardan; el motor que las ejecuta llegará en Fase 3.
        </p>
      </DialogContent>
    </Dialog>
  );
}

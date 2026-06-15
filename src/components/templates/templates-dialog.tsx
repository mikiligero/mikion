"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  type TemplateCategory,
} from "@/lib/templates";
import { createPageFromTemplate } from "@/lib/actions/docs";
import { cn } from "@/lib/utils";

export function TemplatesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [cat, setCat] = useState<TemplateCategory>("Básico");

  function use(id: string) {
    const tpl = TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    const { title, emoji, blocks } = tpl.build();
    onOpenChange(false);
    startTransition(async () => {
      const { id: docId } = await createPageFromTemplate({ title, emoji, blocks });
      router.push(`/p/${docId}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl font-[560]">
            Plantillas
          </DialogTitle>
          <DialogDescription>
            Empieza una página nueva con una estructura predefinida.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1">
          {TEMPLATE_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[13px]",
                cat === c
                  ? "bg-sidebar-hover text-ink font-medium"
                  : "text-ink-soft hover:bg-sidebar-hover"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid max-h-[50vh] grid-cols-2 gap-2 overflow-y-auto">
          {TEMPLATES.filter((t) => t.category === cat).map((t) => (
            <button
              key={t.id}
              onClick={() => use(t.id)}
              className="border-line bg-surface hover:border-line-strong flex items-start gap-3 rounded-lg border p-3 text-left transition-colors"
            >
              <span className="text-2xl leading-none">{t.emoji}</span>
              <div className="min-w-0">
                <p className="text-ink text-sm font-medium">{t.name}</p>
                <p className="text-ink-faint text-xs">{t.description}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

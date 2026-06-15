"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  getVersions,
  restoreVersion,
  type VersionItem,
} from "@/lib/actions/versions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VersionHistoryDialog({
  docId,
  open,
  onOpenChange,
}: {
  docId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [items, setItems] = useState<VersionItem[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    getVersions(docId).then((v) => {
      if (active) setItems(v);
    });
    return () => {
      active = false;
    };
  }, [open, docId]);

  async function restore(id: string) {
    await restoreVersion(id);
    window.location.reload();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Historial de versiones</DialogTitle>
          <DialogDescription>
            Se guardan automáticamente mientras editas. Restaura una versión
            anterior de esta página.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-1.5 overflow-y-auto">
          {items === null && (
            <p className="text-ink-faint py-6 text-center text-sm">Cargando…</p>
          )}
          {items !== null && items.length === 0 && (
            <p className="text-ink-faint py-6 text-center text-sm">
              Sin versiones todavía.
            </p>
          )}
          {items?.map((v) => (
            <div
              key={v.id}
              className="border-line hover:border-line-strong group/v flex items-start gap-3 rounded-md border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-ink text-sm font-medium">
                  {formatDateTime(v.createdAt)}
                </p>
                <p className="text-ink-faint text-xs">{v.authorName ?? "—"}</p>
                <p className="text-ink-soft mt-1 line-clamp-2 text-[13px]">
                  {v.preview || "(sin texto)"}
                </p>
              </div>
              <button
                onClick={() => restore(v.id)}
                className="text-ink-soft hover:bg-sidebar-hover flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[13px]"
              >
                <RotateCcw className="size-3.5" /> Restaurar
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

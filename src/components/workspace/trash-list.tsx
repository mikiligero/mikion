"use client";

import { useTransition } from "react";
import { RotateCcw, Trash2, Rows3 } from "lucide-react";
import { restoreDoc, deleteDocPermanently, emptyTrash } from "@/lib/actions/docs";
import { restoreRow, deleteRowPermanently } from "@/lib/actions/databases";
import { docIcon } from "@/components/sidebar/doc-icon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type TrashItem = {
  id: string;
  type: "doc" | "row";
  title: string;
  emoji: string | null;
  kind?: "page" | "database" | "calendar";
  deletedAt: string;
};

function relTime(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function TrashList({ items }: { items: TrashItem[] }) {
  const [, startTransition] = useTransition();

  const restore = (it: TrashItem) =>
    startTransition(() => (it.type === "row" ? restoreRow(it.id) : restoreDoc(it.id)));
  const removeForever = (it: TrashItem) =>
    startTransition(() =>
      it.type === "row" ? deleteRowPermanently(it.id) : deleteDocPermanently(it.id)
    );

  return (
    <div className="mx-auto max-w-2xl px-8 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-ink text-[32px] font-[560]">Papelera</h1>
        {items.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-destructive hover:bg-destructive/10 flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px]">
                <Trash2 className="size-4" /> Vaciar papelera
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Vaciar la papelera?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se borrará definitivamente todo lo que hay en la papelera. Esta
                  acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => startTransition(() => emptyTrash())}>
                  Vaciar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="mt-5 space-y-1">
        {items.length === 0 && (
          <p className="text-ink-faint py-10 text-center text-sm">
            La papelera está vacía.
          </p>
        )}
        {items.map((it) => (
          <div
            key={`${it.type}:${it.id}`}
            className="border-line group/t hover:border-line-strong flex items-center gap-3 rounded-md border p-3"
          >
            <span className="flex size-[18px] items-center justify-center text-[15px]">
              {it.type === "row" ? (
                <Rows3 className="text-ink-faint size-4" />
              ) : (
                docIcon(it.kind ?? "page", it.emoji)
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-ink truncate text-sm">{it.title || "Sin título"}</p>
              <p className="text-ink-faint text-xs">
                {it.type === "row" ? "Fila · eliminada" : "Eliminado"} {relTime(it.deletedAt)}
              </p>
            </div>
            <button
              onClick={() => restore(it)}
              className="text-ink-soft hover:bg-sidebar-hover flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px]"
            >
              <RotateCcw className="size-3.5" /> Restaurar
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="text-ink-faint hover:text-destructive p-1"
                  aria-label="Borrar definitivamente"
                >
                  <Trash2 className="size-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Borrar definitivamente?</AlertDialogTitle>
                  <AlertDialogDescription>
                    «{it.title || "Sin título"}»
                    {it.type === "row" ? " se borrará" : " y su contenido se borrarán"}{" "}
                    para siempre. No se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => removeForever(it)}>
                    Borrar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </div>
  );
}

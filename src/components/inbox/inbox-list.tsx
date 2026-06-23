"use client";

import { useTransition } from "react";
import Link from "next/link";
import { AtSign, MessageSquare, Bell, CheckCheck } from "lucide-react";
import { markRead, markAllRead, type NotificationItem } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";

function icon(type: string) {
  if (type === "mention") return <AtSign className="size-4" />;
  if (type === "comment" || type === "reply") return <MessageSquare className="size-4" />;
  return <Bell className="size-4" />;
}

function relTime(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function InboxList({ items }: { items: NotificationItem[] }) {
  const [, startTransition] = useTransition();
  const hasUnread = items.some((n) => !n.read);

  return (
    <div className="mx-auto max-w-2xl px-8 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-ink text-[32px] font-[560]">
          Bandeja de entrada
        </h1>
        {hasUnread && (
          <button
            onClick={() => startTransition(() => markAllRead())}
            className="text-ink-soft hover:bg-sidebar-hover flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px]"
          >
            <CheckCheck className="size-4" /> Marcar todo como leído
          </button>
        )}
      </div>

      <div className="mt-5 space-y-1">
        {items.length === 0 && (
          <p className="text-ink-faint py-10 text-center text-sm">
            No tienes notificaciones.
          </p>
        )}
        {items.map((n) => {
          const inner = (
            <div
              className={cn(
                "border-line flex items-start gap-3 rounded-md border p-3",
                !n.read && "bg-brand-tint/40"
              )}
            >
              <span className="text-ink-faint mt-0.5">{icon(n.type)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-ink text-sm font-medium">{n.title}</p>
                {n.body && (
                  <p
                    className={cn(
                      "text-ink-soft mt-0.5 text-[13px]",
                      // Los resúmenes (digest) conservan los saltos de línea y se
                      // muestran enteros, agrupados por día; el resto se recorta.
                      n.type === "reminder"
                        ? "whitespace-pre-line"
                        : "line-clamp-2"
                    )}
                  >
                    {n.body}
                  </p>
                )}
                <p className="text-ink-faint mt-0.5 text-xs">{relTime(n.createdAt)}</p>
              </div>
              {!n.read && <span className="bg-brand mt-1.5 size-2 shrink-0 rounded-full" />}
            </div>
          );
          const onClick = () => {
            if (!n.read) startTransition(() => markRead(n.id));
          };
          return n.docId ? (
            <Link
              key={n.id}
              href={n.rowId ? `/p/${n.docId}/${n.rowId}` : `/p/${n.docId}`}
              onClick={onClick}
            >
              {inner}
            </Link>
          ) : (
            <button key={n.id} onClick={onClick} className="block w-full text-left">
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
}

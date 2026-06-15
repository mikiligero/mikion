"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Check, RotateCcw, Trash2, Send, Quote } from "lucide-react";
import {
  getComments,
  addComment,
  addReply,
  resolveComment,
  deleteComment,
  type CommentItem,
} from "@/lib/actions/comments";
import { cn } from "@/lib/utils";

export type CommentAnchor = { blockId: string; anchoredText: string };

/** Lleva el foco al bloque anclado dentro del editor y lo resalta un instante. */
function scrollToBlock(blockId: string) {
  const el = document.querySelector<HTMLElement>(`[data-id="${blockId}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("comment-flash");
  window.setTimeout(() => el.classList.remove("comment-flash"), 1200);
}

function relTime(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function CommentsPanel({
  docId,
  anchor,
  onClearAnchor,
  onClose,
}: {
  docId: string;
  anchor: CommentAnchor | null;
  onClearAnchor: () => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [text, setText] = useState("");

  const refresh = useCallback(() => {
    getComments(docId).then(setItems).catch(() => {});
  }, [docId]);
  useEffect(() => refresh(), [refresh]);

  const roots = items.filter((c) => !c.parentId);
  const open = roots.filter((c) => !c.resolved);
  const resolved = roots.filter((c) => c.resolved);
  const repliesOf = (id: string) => items.filter((c) => c.parentId === id);

  async function add() {
    if (!text.trim()) return;
    const value = text.trim();
    const a = anchor;
    setText("");
    onClearAnchor();
    await addComment(
      docId,
      value,
      a ? { blockId: a.blockId, anchoredText: a.anchoredText } : undefined
    );
    refresh();
  }

  return (
    <aside className="border-line bg-surface flex h-full w-80 shrink-0 flex-col border-l">
      <div className="border-line flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-ink text-sm font-medium">Comentarios</span>
        <button onClick={onClose} className="text-ink-faint hover:bg-sidebar-hover rounded-sm p-1" aria-label="Cerrar">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {open.length === 0 && resolved.length === 0 && (
          <p className="text-ink-faint text-sm">Sin comentarios todavía.</p>
        )}
        {open.map((c) => (
          <Thread key={c.id} comment={c} replies={repliesOf(c.id)} onChange={refresh} />
        ))}

        {resolved.length > 0 && (
          <div className="mt-4">
            <p className="text-ink-faint mb-1 text-[11px] font-semibold uppercase tracking-wider">
              Resueltos
            </p>
            {resolved.map((c) => (
              <Thread key={c.id} comment={c} replies={repliesOf(c.id)} onChange={refresh} />
            ))}
          </div>
        )}
      </div>

      <div className="border-line border-t p-3">
        {anchor && (
          <div className="border-line bg-paper mb-2 flex items-start gap-1.5 rounded-md border px-2 py-1.5">
            <Quote className="text-brand mt-0.5 size-3.5 shrink-0" />
            <span className="text-ink-soft min-w-0 flex-1 truncate text-[12px] italic">
              {anchor.anchoredText || "Bloque"}
            </span>
            <button
              onClick={onClearAnchor}
              className="text-ink-faint hover:text-ink shrink-0"
              aria-label="Quitar ancla"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add();
          }}
          rows={2}
          placeholder="Escribe un comentario… (⌘+Enter)"
          className="border-line bg-paper text-ink placeholder:text-ink-faint w-full resize-none rounded-md border px-2.5 py-1.5 text-sm outline-none"
        />
        <button
          onClick={add}
          disabled={!text.trim()}
          className="bg-primary text-primary-foreground mt-2 flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium disabled:opacity-50"
        >
          <Send className="size-3.5" /> Comentar
        </button>
      </div>
    </aside>
  );
}

function Thread({
  comment,
  replies,
  onChange,
}: {
  comment: CommentItem;
  replies: CommentItem[];
  onChange: () => void;
}) {
  const [reply, setReply] = useState("");

  async function sendReply() {
    if (!reply.trim()) return;
    const value = reply.trim();
    setReply("");
    await addReply(comment.id, value);
    onChange();
  }

  return (
    <div className={cn("border-line mb-2 rounded-md border p-2.5", comment.resolved && "opacity-60")}>
      <CommentRow c={comment} onChange={onChange} canResolve />
      {replies.map((r) => (
        <div key={r.id} className="border-line mt-2 border-l pl-2.5">
          <CommentRow c={r} onChange={onChange} />
        </div>
      ))}
      {!comment.resolved && (
        <div className="mt-2 flex items-center gap-1">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendReply()}
            placeholder="Responder…"
            className="border-line bg-paper text-ink placeholder:text-ink-faint flex-1 rounded-md border px-2 py-1 text-[13px] outline-none"
          />
          <button onClick={sendReply} className="text-ink-faint hover:text-brand p-1" aria-label="Responder">
            <Send className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function CommentRow({
  c,
  onChange,
  canResolve,
}: {
  c: CommentItem;
  onChange: () => void;
  canResolve?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">
          {c.authorName.charAt(0).toUpperCase()}
        </div>
        <span className="text-ink text-[13px] font-medium">{c.authorName}</span>
        <span className="text-ink-faint text-[11px]">{relTime(c.createdAt)}</span>
        <div className="ml-auto flex items-center gap-0.5">
          {canResolve && (
            <button
              onClick={async () => {
                await resolveComment(c.id, !c.resolved);
                onChange();
              }}
              className="text-ink-faint hover:text-brand p-0.5"
              aria-label={c.resolved ? "Reabrir" : "Resolver"}
              title={c.resolved ? "Reabrir" : "Resolver"}
            >
              {c.resolved ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" />}
            </button>
          )}
          <button
            onClick={async () => {
              await deleteComment(c.id);
              onChange();
            }}
            className="text-ink-faint hover:text-destructive p-0.5"
            aria-label="Eliminar"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      {c.blockId && c.anchoredText && (
        <button
          onClick={() => scrollToBlock(c.blockId!)}
          className="border-brand/40 text-ink-faint hover:text-ink mt-1 ml-7 flex w-[calc(100%-1.75rem)] items-start gap-1.5 border-l-2 pl-2 text-left text-[12px] italic"
          title="Ir al bloque"
        >
          <span className="truncate">{c.anchoredText}</span>
        </button>
      )}
      <p className="text-ink-soft mt-1 whitespace-pre-wrap pl-7 text-sm">{c.body}</p>
    </div>
  );
}

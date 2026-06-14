"use client";

import { useState, useTransition } from "react";
import { Check, Plus, X } from "lucide-react";
import type { HomeTask } from "@/db/schema";
import { addHomeTask, toggleHomeTask, deleteHomeTask } from "@/lib/actions/home";
import { cn } from "@/lib/utils";

export function HomeTasks({ tasks }: { tasks: HomeTask[] }) {
  const [text, setText] = useState("");
  const [, startTransition] = useTransition();

  function add() {
    if (!text.trim()) return;
    const value = text.trim();
    setText("");
    startTransition(() => addHomeTask(value));
  }

  return (
    <div>
      <ul className="space-y-0.5">
        {tasks.map((t) => (
          <li
            key={t.id}
            className="group/task hover:bg-sidebar-hover flex items-center gap-2.5 rounded-sm px-1.5 py-1"
          >
            <button
              onClick={() => startTransition(() => toggleHomeTask(t.id))}
              className={cn(
                "flex size-[18px] shrink-0 items-center justify-center rounded-[4px] border-[1.6px]",
                t.done ? "bg-brand border-brand text-white" : "border-ink-faint"
              )}
              aria-label="Completar"
            >
              {t.done && <Check className="size-3" />}
            </button>
            <span
              className={cn(
                "flex-1 text-sm",
                t.done && "text-ink-faint line-through"
              )}
            >
              {t.text}
            </span>
            {t.tag && (
              <span className="text-ink-faint text-xs">{t.tag}</span>
            )}
            <button
              onClick={() => startTransition(() => deleteHomeTask(t.id))}
              className="text-ink-faint hover:text-ink opacity-0 group-hover/task:opacity-100"
              aria-label="Eliminar"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
        {tasks.length === 0 && (
          <li className="text-ink-ghost px-1.5 py-1 text-sm">
            No hay tareas. Añade la primera.
          </li>
        )}
      </ul>

      <div className="text-ink-faint mt-2 flex items-center gap-2 px-1.5">
        <Plus className="size-4" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nueva tarea…"
          className="text-ink placeholder:text-ink-ghost flex-1 bg-transparent text-sm outline-none"
        />
      </div>
    </div>
  );
}

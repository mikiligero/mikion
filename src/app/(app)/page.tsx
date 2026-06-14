import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { docs, homeTasks } from "@/db/schema";
import { requireWorkspace } from "@/lib/session";
import { coverBackground } from "@/lib/covers";
import { QuickActions } from "@/components/home/quick-actions";
import { HomeTasks } from "@/components/home/home-tasks";

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buenos días";
  if (h < 21) return "Buenas tardes";
  return "Buenas noches";
}

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.round(h / 24);
  if (days < 7) return `hace ${days} d`;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export default async function HomePage() {
  const { session, workspace } = await requireWorkspace();

  const [tasks, recent] = await Promise.all([
    db
      .select()
      .from(homeTasks)
      .where(eq(homeTasks.workspaceId, workspace.id))
      .orderBy(homeTasks.orderKey),
    db
      .select({
        id: docs.id,
        title: docs.title,
        emoji: docs.emoji,
        cover: docs.cover,
        kind: docs.kind,
        updatedAt: docs.updatedAt,
      })
      .from(docs)
      .where(and(eq(docs.workspaceId, workspace.id), isNull(docs.deletedAt)))
      .orderBy(desc(docs.updatedAt))
      .limit(6),
  ]);

  const now = new Date();
  const pending = tasks.filter((t) => !t.done).length;
  const dateLabel = now.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const firstName = session.user.name.split(" ")[0];

  return (
    <div className="page-w mx-auto max-w-4xl px-8 py-14">
      <p className="text-ink-faint text-sm capitalize">{dateLabel}</p>
      <h1 className="font-serif text-ink mt-1 text-[34px] font-[540]">
        {greeting(now)}, {firstName} 👋
      </h1>
      <p className="text-ink-soft mt-1 text-[14.5px]">
        {pending > 0
          ? `Tienes ${pending} ${pending === 1 ? "tarea pendiente" : "tareas pendientes"}.`
          : "No tienes tareas pendientes."}
      </p>

      <QuickActions />

      {/* Visitado recientemente */}
      {recent.length > 0 && (
        <section className="mt-10">
          <h2 className="text-ink-soft text-[13px] font-semibold uppercase tracking-[0.03em]">
            Visitado recientemente
          </h2>
          <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(186px,1fr))] gap-3">
            {recent.map((d) => {
              const cover = coverBackground(d.cover);
              return (
                <Link
                  key={d.id}
                  href={`/p/${d.id}`}
                  className="border-line bg-surface hover:border-line-strong overflow-hidden rounded-lg border shadow-sm transition-colors"
                >
                  <div
                    className="h-16"
                    style={{ background: cover ?? "var(--sidebar)" }}
                  />
                  <div className="px-3 pb-3">
                    <div className="-mt-3 text-[22px] leading-none">
                      {d.emoji ?? (d.kind === "database" ? "🗂️" : "📄")}
                    </div>
                    <p className="text-ink mt-1 truncate text-sm font-[600]">
                      {d.title || "Sin título"}
                    </p>
                    <p className="text-ink-faint text-xs">
                      {relativeTime(new Date(d.updatedAt))}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Dos columnas */}
      <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-ink-soft text-[13px] font-semibold uppercase tracking-[0.03em]">
            Mis tareas
          </h2>
          <div className="mt-3">
            <HomeTasks tasks={tasks} />
          </div>
        </section>
        <section>
          <h2 className="text-ink-soft text-[13px] font-semibold uppercase tracking-[0.03em]">
            Próximamente
          </h2>
          <p className="text-ink-ghost mt-3 text-sm">
            Los próximos eventos del calendario aparecerán aquí (Fase 2).
          </p>
        </section>
      </div>
    </div>
  );
}

import Link from "next/link";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { docs, databases, rows, homeTasks } from "@/db/schema";
import { requireWorkspace } from "@/lib/session";
import { coverBackground } from "@/lib/covers";
import { findOption } from "@/lib/database-view";
import { getRowTitle } from "@/lib/database-utils";
import { isoDay } from "@/lib/calendar-utils";
import { QuickActions } from "@/components/home/quick-actions";
import { HomeTasks } from "@/components/home/home-tasks";

type Upcoming = {
  id: string;
  docId: string;
  title: string;
  date: string;
  color?: string;
};

async function getUpcoming(
  workspaceId: string,
  todayIso: string
): Promise<Upcoming[]> {
  const dbs = await db
    .select({ id: databases.id, schema: databases.schema, docId: databases.docId })
    .from(databases)
    .innerJoin(docs, eq(databases.docId, docs.id))
    .where(and(eq(docs.workspaceId, workspaceId), isNull(docs.deletedAt)));
  if (!dbs.length) return [];

  const allRows = await db
    .select()
    .from(rows)
    .where(
      and(
        inArray(
          rows.databaseId,
          dbs.map((d) => d.id)
        ),
        isNull(rows.deletedAt)
      )
    );
  const dbById = new Map(dbs.map((d) => [d.id, d]));
  const out: Upcoming[] = [];
  for (const r of allRows) {
    const parent = dbById.get(r.databaseId)!;
    const dateProp = parent.schema.properties.find((p) => p.type === "date");
    const v = dateProp ? r.values?.[dateProp.id] : null;
    if (typeof v !== "string" || v.slice(0, 10) < todayIso) continue;
    const colorProp = parent.schema.properties.find(
      (p) => p.type === "status" || p.type === "select"
    );
    const opt = colorProp ? findOption(colorProp, r.values?.[colorProp.id]) : undefined;
    out.push({
      id: r.id,
      docId: parent.docId,
      title: getRowTitle(r.values, parent.schema),
      date: v.slice(0, 10),
      color: opt?.color,
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
}

function formatEventDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

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
  const upcoming = await getUpcoming(workspace.id, isoDay(now));
  const pending = tasks.filter((t) => !t.done).length;
  const dateLabelRaw = now.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const dateLabel = dateLabelRaw.charAt(0).toUpperCase() + dateLabelRaw.slice(1);
  const firstName = session.user.name.split(" ")[0];

  return (
    <div className="page-w mx-auto max-w-4xl px-8 py-14">
      <p className="text-ink-faint text-sm">{dateLabel}</p>
      <h1 className="font-serif text-ink mt-1 text-[2.267em] font-[540]">
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
          <div className="mt-3 space-y-1">
            {upcoming.length === 0 ? (
              <p className="text-ink-ghost text-sm">
                No hay eventos próximos. Añade fechas en tus bases de datos.
              </p>
            ) : (
              upcoming.map((e) => (
                <Link
                  key={e.id}
                  href={`/p/${e.docId}/${e.id}`}
                  className="hover:bg-sidebar-hover flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: e.color ? `var(--tint-${e.color})` : "var(--brand)" }}
                  />
                  <span className="text-ink min-w-0 flex-1 truncate">{e.title}</span>
                  <span className="text-ink-faint shrink-0 text-xs">
                    {formatEventDate(e.date)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

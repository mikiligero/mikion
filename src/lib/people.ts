import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { people, users } from "@/db/schema";
import { randomSelectColor } from "@/lib/types";
import type { SelectOption } from "@/lib/types";

/**
 * Siembra (idempotente) una fila `people` por cada usuario del sistema en el
 * ámbito dado, vinculada a su `userId`. Así las cuentas existentes aparecen por
 * defecto en cualquier selector de persona, sin pisar a las personas manuales
 * (userId = null). Solo inserta las que falten; no escribe si ya están todas.
 */
export async function ensureUserPeople(
  workspaceId: string,
  scope: "team" | "private"
): Promise<void> {
  const [allUsers, seeded] = await Promise.all([
    db.select({ id: users.id, name: users.name }).from(users),
    db
      .select({ userId: people.userId })
      .from(people)
      .where(and(eq(people.workspaceId, workspaceId), eq(people.scope, scope))),
  ]);

  const have = new Set(seeded.map((p) => p.userId).filter(Boolean));
  const missing = allUsers.filter((u) => !have.has(u.id));
  if (missing.length === 0) return;

  await db
    .insert(people)
    .values(
      missing.map((u) => ({
        workspaceId,
        scope,
        userId: u.id,
        name: u.name,
        color: randomSelectColor(),
      }))
    )
    // Carrera entre renders concurrentes: el índice único (ws, scope, userId)
    // evita duplicados.
    .onConflictDoNothing();
}

/**
 * Directorio de personas de un ámbito (equipo/privado) del workspace. Se carga
 * en los Server Components y se pasa a las celdas de tipo "person" como lista
 * de selección común a todas las BBDD de ese ámbito. Incluye a los usuarios del
 * sistema (sembrados con su userId) y las personas manuales añadidas a mano.
 */
export async function listPeople(
  workspaceId: string,
  scope: "team" | "private"
): Promise<SelectOption[]> {
  await ensureUserPeople(workspaceId, scope);
  const rows = await db
    .select({ id: people.id, name: people.name, color: people.color })
    .from(people)
    .where(and(eq(people.workspaceId, workspaceId), eq(people.scope, scope)))
    .orderBy(asc(people.name));
  return rows;
}

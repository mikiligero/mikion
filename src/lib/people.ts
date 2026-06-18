import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { people } from "@/db/schema";
import type { SelectOption } from "@/lib/types";

/**
 * Directorio de personas de un ámbito (equipo/privado) del workspace. Se carga
 * en los Server Components y se pasa a las celdas de tipo "person" como lista
 * de selección común a todas las BBDD de ese ámbito.
 */
export async function listPeople(
  workspaceId: string,
  scope: "team" | "private"
): Promise<SelectOption[]> {
  const rows = await db
    .select({ id: people.id, name: people.name, color: people.color })
    .from(people)
    .where(and(eq(people.workspaceId, workspaceId), eq(people.scope, scope)))
    .orderBy(asc(people.name));
  return rows;
}

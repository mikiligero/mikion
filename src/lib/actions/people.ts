"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { docs, people } from "@/db/schema";
import { randomSelectColor } from "@/lib/types";
import type { SelectOption } from "@/lib/types";
import { assertDatabaseAccess } from "./helpers";

/**
 * Añade una persona al directorio común del ámbito (equipo/privado) al que
 * pertenece la BD. Si ya existe una con el mismo nombre en ese ámbito, la
 * devuelve en vez de duplicar. Devuelve la opción {id,name,color} para que la
 * celda la seleccione al instante.
 */
export async function addPerson(
  databaseId: string,
  rawName: string
): Promise<SelectOption | null> {
  const name = rawName.trim();
  if (!name) return null;

  const { docId } = await assertDatabaseAccess(databaseId);
  const [doc] = await db
    .select({ workspaceId: docs.workspaceId, section: docs.section })
    .from(docs)
    .where(eq(docs.id, docId));
  if (!doc) return null;

  // Reutiliza si ya existe (insensible a mayúsculas/acentos básicos por nombre).
  const [existing] = await db
    .select({ id: people.id, name: people.name, color: people.color })
    .from(people)
    .where(
      and(
        eq(people.workspaceId, doc.workspaceId),
        eq(people.scope, doc.section),
        sql`lower(${people.name}) = lower(${name})`
      )
    )
    .limit(1);
  if (existing) return existing;

  const color = randomSelectColor();
  const [created] = await db
    .insert(people)
    .values({
      workspaceId: doc.workspaceId,
      scope: doc.section,
      name,
      color,
    })
    .returning({ id: people.id, name: people.name, color: people.color });

  // No revalidamos aquí a propósito: hacerlo refrescaría el árbol y cerraría el
  // popover perdiendo la selección en curso. La celda ya añade la persona en
  // local y la materializa en options al cerrar (eso sí persiste y revalida);
  // otras BBDD del ámbito la ven en su próxima carga vía listPeople.
  return created;
}

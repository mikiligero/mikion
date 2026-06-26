"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { databases, docs, people } from "@/db/schema";
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

/**
 * Borra una persona MANUAL del directorio del ámbito de la BD. Solo elimina las
 * que no están vinculadas a una cuenta (userId IS NULL): las de usuario se
 * resembrarían solas. No revalida (la celda la oculta en local; otras BBDD la
 * dejan de ver en su próxima carga). Las celdas que la tuvieran asignada
 * simplemente dejan de pintarla.
 */
export async function deletePerson(
  databaseId: string,
  personId: string
): Promise<{ ok: boolean }> {
  const { docId } = await assertDatabaseAccess(databaseId);
  const [doc] = await db
    .select({ workspaceId: docs.workspaceId })
    .from(docs)
    .where(eq(docs.id, docId));
  if (!doc) return { ok: false };

  const deleted = await db
    .delete(people)
    .where(
      and(
        eq(people.id, personId),
        eq(people.workspaceId, doc.workspaceId),
        isNull(people.userId)
      )
    )
    .returning({ id: people.id });
  if (deleted.length === 0) return { ok: false };

  // Quita la persona de las `options` materializadas de las propiedades persona
  // de TODAS las BD del workspace. Si no, al refrescar reaparece como candidata
  // (la celda reconstruye el directorio desde options ∪ people).
  const dbs = await db
    .select({ id: databases.id, schema: databases.schema })
    .from(databases)
    .innerJoin(docs, eq(docs.id, databases.docId))
    .where(eq(docs.workspaceId, doc.workspaceId));

  for (const d of dbs) {
    let changed = false;
    const properties = d.schema.properties.map((p) => {
      if (p.type !== "person" || !p.options) return p;
      const options = p.options.filter((o) => o.id !== personId);
      if (options.length !== p.options.length) {
        changed = true;
        return { ...p, options };
      }
      return p;
    });
    if (changed) {
      await db
        .update(databases)
        .set({ schema: { ...d.schema, properties } })
        .where(eq(databases.id, d.id));
    }
  }

  return { ok: true };
}

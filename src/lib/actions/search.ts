"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { docs, databases, rows } from "@/db/schema";
import { getRowTitle } from "@/lib/database-utils";
import { prefixTsQuery, leadTrim } from "@/lib/search-utils";
import { getUserWorkspace } from "./helpers";

export type PaletteDoc = {
  id: string;
  title: string;
  emoji: string | null;
  kind: "page" | "database" | "calendar";
};
export type PaletteRow = { id: string; docId: string; title: string };

export async function getPaletteItems(): Promise<{
  docs: PaletteDoc[];
  rows: PaletteRow[];
}> {
  const ws = await getUserWorkspace();

  const docRows = await db
    .select({
      id: docs.id,
      title: docs.title,
      emoji: docs.emoji,
      kind: docs.kind,
    })
    .from(docs)
    .where(and(eq(docs.workspaceId, ws.id), isNull(docs.deletedAt)));

  const dbRows = await db
    .select({
      id: databases.id,
      docId: databases.docId,
      schema: databases.schema,
    })
    .from(databases)
    .innerJoin(docs, eq(databases.docId, docs.id))
    .where(eq(docs.workspaceId, ws.id));

  let rowItems: PaletteRow[] = [];
  if (dbRows.length) {
    const dbById = new Map(dbRows.map((d) => [d.id, d]));
    const allRows = await db
      .select()
      .from(rows)
      .where(
        and(
          inArray(
            rows.databaseId,
            dbRows.map((d) => d.id)
          ),
          isNull(rows.deletedAt)
        )
      );
    rowItems = allRows.map((r) => {
      const parent = dbById.get(r.databaseId)!;
      return {
        id: r.id,
        docId: parent.docId,
        title: getRowTitle(r.values, parent.schema),
      };
    });
  }

  return { docs: docRows, rows: rowItems };
}

export type ContentResult = {
  id: string;
  title: string;
  emoji: string | null;
  kind: "page" | "database" | "calendar";
  snippet: string;
};

/** Búsqueda full-text sobre título + contenido de las páginas (índice GIN). */
export async function searchContent(query: string): Promise<ContentResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // Búsqueda por prefijo (as-you-type), saneada para to_tsquery.
  const tsqueryStr = prefixTsQuery(q);
  if (!tsqueryStr) return [];

  const ws = await getUserWorkspace();
  const tsv = sql`to_tsvector('es_unaccent', coalesce(${docs.title}, '') || ' ' || coalesce(${docs.textContent}, ''))`;
  const tsq = sql`to_tsquery('es_unaccent', ${tsqueryStr})`;

  // ts_headline centra el fragmento en la coincidencia y la marca con <b>…</b>
  // (el cliente la resalta; no se inyecta HTML, se parsea).
  const result = await db.execute<ContentResult>(sql`
    SELECT ${docs.id} AS id, ${docs.title} AS title, ${docs.emoji} AS emoji,
           ${docs.kind} AS kind,
           ts_headline('es_unaccent', coalesce(${docs.textContent}, ''), ${tsq},
             'MaxFragments=1,MaxWords=18,MinWords=7') AS snippet
    FROM ${docs}
    WHERE ${docs.workspaceId} = ${ws.id}
      AND ${docs.deletedAt} IS NULL
      AND ${tsv} @@ ${tsq}
    ORDER BY ts_rank(${tsv}, ${tsq}) DESC
    LIMIT 8
  `);

  // Recorta el contexto previo para que la palabra resaltada quede al inicio
  // del fragmento (si no, una línea con truncate la deja fuera de pantalla).
  return Array.from(result).map((r) => ({
    ...r,
    snippet: leadTrim(r.snippet ?? ""),
  })) as ContentResult[];
}

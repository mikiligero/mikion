// Utilidades puras de búsqueda (sin acceso a BD), separadas de la server
// action para poder testearlas y reutilizarlas.

/** Minúsculas + sin acentos/diacríticos (para comparar títulos en cliente). */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** ¿`text` contiene `query` ignorando mayúsculas y acentos? */
export function looseIncludes(text: string, query: string): boolean {
  return normalize(text).includes(normalize(query));
}

/**
 * Construye la cadena de un `to_tsquery` por prefijo a partir de texto libre:
 * cada término se sanea a letras/dígitos y se le añade `:*`, unidos por ` & `.
 * Devuelve null si no quedan términos válidos.
 */
export function prefixTsQuery(query: string): string | null {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (!terms.length) return null;
  return terms.map((t) => `${t}:*`).join(" & ");
}

/**
 * Recorta el contexto previo de un fragmento de `ts_headline` para que la
 * primera coincidencia (`<b>…</b>`) quede cerca del inicio (si no, una línea
 * con truncate la deja fuera de pantalla). Conserva hasta 3 palabras de
 * contexto previo precedidas de «…».
 */
export function leadTrim(snippet: string): string {
  const i = snippet.indexOf("<b>");
  if (i <= 0) return snippet;
  const before = snippet.slice(0, i).trimStart();
  const words = before.split(/\s+/).filter(Boolean);
  if (words.length <= 4) return snippet;
  return "… " + words.slice(-3).join(" ") + " " + snippet.slice(i);
}

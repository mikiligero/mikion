import type { Doc } from "@/db/schema";

// Campos mínimos que el árbol/sidebar necesita de cada doc.
export type TreeDoc = Pick<
  Doc,
  "id" | "parentId" | "section" | "kind" | "emoji" | "title" | "isFavorite" | "orderKey"
>;

export type TreeNode = TreeDoc & { children: TreeNode[] };

const byOrderKey = (a: TreeDoc, b: TreeDoc) =>
  a.orderKey < b.orderKey ? -1 : a.orderKey > b.orderKey ? 1 : 0;

/** Construye el árbol jerárquico de una sección a partir de docs planos. */
export function buildTree(
  docs: TreeDoc[],
  section: "team" | "private"
): TreeNode[] {
  const childrenOf = new Map<string | null, TreeDoc[]>();
  for (const d of docs) {
    if (d.section !== section) continue;
    const key = d.parentId ?? null;
    const list = childrenOf.get(key);
    if (list) list.push(d);
    else childrenOf.set(key, [d]);
  }

  const build = (parentId: string | null): TreeNode[] =>
    (childrenOf.get(parentId) ?? [])
      .slice()
      .sort(byOrderKey)
      .map((d) => ({ ...d, children: build(d.id) }));

  return build(null);
}

/** Cadena de ancestros (de raíz a hijo) de un doc, incluido él mismo. */
export function ancestorChain(docs: TreeDoc[], docId: string): TreeDoc[] {
  const byId = new Map(docs.map((d) => [d.id, d]));
  const chain: TreeDoc[] = [];
  let current = byId.get(docId);
  while (current) {
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

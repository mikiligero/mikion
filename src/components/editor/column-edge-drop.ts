// Soltar un bloque ENCIMA (o DEBAJO) de una lista de columnas.
//
// `multiColumnDropCursor` de BlockNote solo gestiona soltar a IZQUIERDA/DERECHA
// (meter el bloque dentro de una columna). Al arrastrar sobre las columnas el
// puntero siempre cae dentro de una, así que no hay forma de soltar un bloque
// encima de TODA la lista (problema típico cuando las columnas son el primer
// bloque de la página). Aquí añadimos esa zona:
//   - franja superior de la lista  → soltar ANTES de la lista
//   - franja inferior de la lista  → soltar DESPUÉS de la lista
//
// Son dos piezas: el dropcursor (la línea visual) y una extensión con un plugin
// `handleDrop` que hace el movimiento real (el dropcursor es solo visual; el
// soltado lo decide ProseMirror por coordenadas, por eso hace falta el plugin).

import { createExtension } from "@blocknote/core";
import { multiColumnDropCursor } from "@blocknote/xl-multi-column";
import { Plugin } from "prosemirror-state";

/** Altura (px) de la franja superior/inferior de la lista que cuenta como
 * «borde». Fija en px (no %) para que no robe zona en listas altas. */
const EDGE_PX = 24;

type Side = "before" | "after";

/** Si el puntero está en la franja superior/inferior de una lista de columnas,
 * devuelve el elemento y el lado (antes/después de toda la lista). Si no, null.
 *
 * Localizamos la lista por COORDENADAS (no por `event.target`): al soltar fuera
 * de los límites del editor (p. ej. encima de unas columnas que son el primer
 * bloque), el side menu de BlockNote re-despacha un drop sintético con las
 * coordenadas recortadas al editor y `target` = el editor, así que `event.target`
 * ya no apunta a la lista. `elementFromPoint` con las coords (recortadas) sí. */
function columnListEdge(
  event: { clientX: number; clientY: number }
): { el: HTMLElement; side: Side } | null {
  const hit = document.elementFromPoint(event.clientX, event.clientY);
  const el =
    hit instanceof Element
      ? (hit.closest(".bn-block-column-list") as HTMLElement | null)
      : null;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.height === 0) return null;
  if (event.clientY - rect.top <= EDGE_PX) return { el, side: "before" };
  if (rect.bottom - event.clientY <= EDGE_PX) return { el, side: "after" };
  return null; // zona central → multi-columna (izquierda/derecha)
}

/** Índice del elemento entre sus hermanos (incluye nodos no-elemento, como
 * espera `posAtDOM`). */
function domIndex(el: Element): number {
  let i = 0;
  let n: Node | null = el;
  while ((n = n.previousSibling)) i++;
  return i;
}

/** Dropcursor: línea horizontal a todo el ancho encima/debajo de la lista de
 * columnas cuando el puntero está en su franja; si no, delega en el multi-
 * columna (izquierda/derecha dentro de las columnas). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const columnEdgeDropCursor: any = {
  hooks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    computeDropPosition: (ctx: any) => {
      const edge = columnListEdge(ctx.event);
      if (edge && edge.el.parentElement) {
        try {
          const idx = domIndex(edge.el) + (edge.side === "after" ? 1 : 0);
          const pos = ctx.view.posAtDOM(edge.el.parentElement, idx);
          return { pos, orientation: "block-horizontal" };
        } catch {
          /* si falla, cae al delegado */
        }
      }
      return (
        multiColumnDropCursor.hooks?.computeDropPosition?.(ctx) ??
        ctx.defaultPosition
      );
    },
  },
};

/** Extensión que realiza el movimiento real: al soltar en la franja superior/
 * inferior de una lista de columnas, mueve el/los bloque(s) arrastrado(s) a
 * antes/después de TODA la lista. */
export const columnEdgeDropExtension = createExtension(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ editor }: any) => ({
    key: "mikionColumnEdgeDrop",
    prosemirrorPlugins: [
      new Plugin({
        props: {
          handleDrop(_view, event, slice) {
            if (!editor.isEditable) return false;
            const edge = columnListEdge(event as DragEvent);
            if (!edge) return false;
            const colListId = edge.el.getAttribute("data-id");
            if (!colListId) return false;
            // ids de los bloques arrastrados (el slice del arrastre del tirador
            // es un fragmento de blockContainers, cada uno con attrs.id).
            const ids: string[] = [];
            slice.content.forEach((node) => {
              const id = node.attrs?.id;
              if (typeof id === "string") ids.push(id);
            });
            if (ids.length === 0 || ids.includes(colListId)) return false;
            // Capturamos los bloques ANTES de borrarlos (preserva su id).
            const blocks = ids
              .map((id) => editor.getBlock(id))
              .filter(Boolean);
            if (blocks.length === 0) return false;
            editor.removeBlocks(ids);
            editor.insertBlocks(blocks, colListId, edge.side);
            return true;
          },
        },
      }),
    ],
  })
);

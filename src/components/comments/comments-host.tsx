"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CommentsPanel, type CommentAnchor } from "./comments-panel";

export const OPEN_COMMENTS_EVENT = "mikion:comments";
export const COMMENT_BLOCK_EVENT = "mikion:comment-block";

// Drawer de comentarios montado a la derecha del shell. Escucha el botón de la
// topbar (abre/cierra) y el evento de "Comentar" de la barra de formato del
// editor (abre pre-anclado a un bloque). Usa el docId de la ruta actual.
export function CommentsHost() {
  const pathname = usePathname();
  const docId = pathname.startsWith("/p/") ? pathname.split("/")[2] : null;
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<CommentAnchor | null>(null);

  useEffect(() => {
    function toggle() {
      setAnchor(null);
      setOpen((o) => !o);
    }
    function onBlock(e: Event) {
      const detail = (e as CustomEvent<{ blockId: string; text: string }>).detail;
      if (!detail?.blockId) return;
      setAnchor({ blockId: detail.blockId, anchoredText: detail.text });
      setOpen(true);
    }
    window.addEventListener(OPEN_COMMENTS_EVENT, toggle);
    window.addEventListener(COMMENT_BLOCK_EVENT, onBlock);
    return () => {
      window.removeEventListener(OPEN_COMMENTS_EVENT, toggle);
      window.removeEventListener(COMMENT_BLOCK_EVENT, onBlock);
    };
  }, []);

  // Si no hay página (docId), el panel no se muestra (se oculta solo).
  if (!open || !docId) return null;
  return (
    <CommentsPanel
      docId={docId}
      anchor={anchor}
      onClearAnchor={() => setAnchor(null)}
      onClose={() => setOpen(false)}
    />
  );
}

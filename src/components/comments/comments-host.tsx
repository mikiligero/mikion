"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CommentsPanel } from "./comments-panel";

export const OPEN_COMMENTS_EVENT = "mikion:comments";

// Drawer de comentarios montado a la derecha del shell. Escucha el evento del
// botón de la topbar y usa el docId de la ruta actual.
export function CommentsHost() {
  const pathname = usePathname();
  const docId = pathname.startsWith("/p/") ? pathname.split("/")[2] : null;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function toggle() {
      setOpen((o) => !o);
    }
    window.addEventListener(OPEN_COMMENTS_EVENT, toggle);
    return () => window.removeEventListener(OPEN_COMMENTS_EVENT, toggle);
  }, []);

  // Si no hay página (docId), el panel no se muestra (se oculta solo).
  if (!open || !docId) return null;
  return <CommentsPanel docId={docId} onClose={() => setOpen(false)} />;
}

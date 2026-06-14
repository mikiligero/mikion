import { FileText, Database, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

// Icono de un doc en el árbol: las BD y calendarios muestran icono en vez de
// emoji; las páginas normales muestran su emoji (o un icono por defecto).
export function docIcon(
  kind: "page" | "database" | "calendar",
  emoji: string | null,
  active = false
) {
  const iconClass = cn("size-4", active ? "text-brand" : "text-ink-faint");
  if (kind === "database") return <Database className={iconClass} />;
  if (kind === "calendar") return <Calendar className={iconClass} />;
  if (emoji) return <span>{emoji}</span>;
  return <FileText className={iconClass} />;
}

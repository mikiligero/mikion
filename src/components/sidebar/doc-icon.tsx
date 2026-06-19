import { FileText, Database, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

// Icono de un doc en el árbol: si tiene emoji propio se muestra (también en BD y
// calendarios); si no, se usa el icono por tipo.
export function docIcon(
  kind: "page" | "database" | "calendar",
  emoji: string | null,
  active = false
) {
  const iconClass = cn("size-4", active ? "text-brand" : "text-ink-faint");
  if (emoji) return <span>{emoji}</span>;
  if (kind === "database") return <Database className={iconClass} />;
  if (kind === "calendar") return <Calendar className={iconClass} />;
  return <FileText className={iconClass} />;
}

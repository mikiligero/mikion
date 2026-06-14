"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Database, Calendar } from "lucide-react";
import { toast } from "sonner";
import { createDoc } from "@/lib/actions/docs";

export function QuickActions() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function create(kind: "page" | "database") {
    startTransition(async () => {
      const { id } = await createDoc({ section: "team", kind });
      router.push(`/p/${id}`);
    });
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Action
        icon={<FileText className="size-4" />}
        label="Página en blanco"
        onClick={() => create("page")}
      />
      <Action
        icon={<Database className="size-4" />}
        label="Nueva base de datos"
        onClick={() => create("database")}
      />
      <Action
        icon={<Calendar className="size-4" />}
        label="Ver calendario"
        onClick={() => toast("Calendario del equipo · Fase 2")}
      />
    </div>
  );
}

function Action({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="border-line bg-surface hover:border-line-strong flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-[540] shadow-sm transition-colors"
    >
      <span className="text-brand">{icon}</span>
      {label}
    </button>
  );
}

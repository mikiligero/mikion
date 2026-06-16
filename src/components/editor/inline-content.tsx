"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { createReactInlineContentSpec } from "@blocknote/react";
import { getDocPreview } from "@/lib/actions/docs";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";

// Mención (@persona)
export const Mention = createReactInlineContentSpec(
  {
    type: "mention",
    propSchema: { userId: { default: "" }, name: { default: "" } },
    content: "none",
  },
  {
    render: ({ inlineContent }) => (
      <span className="bg-brand-soft text-brand rounded px-1 font-medium">
        @{inlineContent.props.name}
      </span>
    ),
  }
);

// Fecha en línea
function formatDate(iso: string): string {
  if (!iso) return "fecha";
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Enlace a una subpágina creada desde el editor (comando "/página").
// Resuelve título/emoji/ruta/fragmento en vivo (la página enlazada puede
// renombrarse o cambiar de contenido); los props guardados son el valor inicial.
type PreviewMeta = {
  title: string;
  emoji: string;
  path: string[];
  snippet: string;
};

function PageLinkChip({
  docId,
  title,
  emoji,
}: {
  docId: string;
  title: string;
  emoji: string;
}) {
  const [meta, setMeta] = useState<PreviewMeta>({
    title,
    emoji,
    path: [],
    snippet: "",
  });

  useEffect(() => {
    if (!docId) return;
    let active = true;
    getDocPreview(docId)
      .then((d) => {
        if (active)
          setMeta({
            title: d.title,
            emoji: d.emoji ?? "",
            path: d.path,
            snippet: d.snippet,
          });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [docId]);

  const label = meta.title || "Nueva página";

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Link
          href={`/p/${docId}`}
          contentEditable={false}
          className="page-link-chip text-ink hover:text-brand inline-flex items-center gap-1 align-middle font-medium"
        >
          <span className="shrink-0">
            {meta.emoji || <FileText className="size-3.5" />}
          </span>
          <span>{label}</span>
        </Link>
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="mb-1.5 text-2xl leading-none">
          {meta.emoji || <FileText className="text-ink-faint size-6" />}
        </div>
        {meta.path.length > 0 && (
          <div className="text-ink-faint mb-0.5 flex items-center gap-0.5 text-xs">
            {meta.path.map((p, i) => (
              <span key={i} className="flex items-center gap-0.5">
                {i > 0 && <ChevronRight className="size-3 shrink-0" />}
                <span className="truncate">{p}</span>
              </span>
            ))}
          </div>
        )}
        <div className="text-ink font-semibold">{label}</div>
        {meta.snippet ? (
          <p className="text-ink-soft mt-1 line-clamp-3 text-[13px]">
            {meta.snippet}
          </p>
        ) : (
          <p className="text-ink-faint mt-1 text-[13px] italic">Página vacía</p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

export const PageLink = createReactInlineContentSpec(
  {
    type: "pageLink",
    propSchema: { docId: { default: "" }, title: { default: "" }, emoji: { default: "" } },
    content: "none",
  },
  {
    render: ({ inlineContent }) => (
      <PageLinkChip
        docId={inlineContent.props.docId as string}
        title={inlineContent.props.title as string}
        emoji={inlineContent.props.emoji as string}
      />
    ),
  }
);

export const DateChip = createReactInlineContentSpec(
  {
    type: "date",
    propSchema: { date: { default: "" } },
    content: "none",
  },
  {
    render: ({ inlineContent }) => (
      <span className="bg-sidebar text-ink-soft rounded px-1">
        📅 {formatDate(inlineContent.props.date as string)}
      </span>
    ),
  }
);

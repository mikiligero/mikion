"use client";

import { createReactInlineContentSpec } from "@blocknote/react";

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

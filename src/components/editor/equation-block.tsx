"use client";

import "katex/dist/katex.min.css";
import { useState } from "react";
import katex from "katex";
import { createReactBlockSpec } from "@blocknote/react";
import { Sigma } from "lucide-react";

export const Equation = createReactBlockSpec(
  { type: "equation", propSchema: { latex: { default: "" } }, content: "none" },
  {
    render: ({ block, editor }) => (
      <EquationView
        latex={block.props.latex as string}
        onChange={(latex) => editor.updateBlock(block, { props: { latex } })}
      />
    ),
  }
);

function EquationView({
  latex,
  onChange,
}: {
  latex: string;
  onChange: (latex: string) => void;
}) {
  const [editing, setEditing] = useState(!latex);
  const [draft, setDraft] = useState(latex);

  if (editing) {
    return (
      <div
        contentEditable={false}
        className="border-line bg-sidebar my-1 flex items-center gap-2 rounded-md border p-2"
      >
        <Sigma className="text-ink-faint size-4 shrink-0" />
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            onChange(draft);
            if (draft) setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onChange(draft);
              if (draft) setEditing(false);
            }
          }}
          placeholder="Escribe LaTeX, p. ej. \frac{a}{b} = c^2"
          className="text-ink placeholder:text-ink-faint flex-1 bg-transparent font-mono text-sm outline-none"
        />
      </div>
    );
  }

  let html = "";
  try {
    html = katex.renderToString(latex, { throwOnError: false, displayMode: true });
  } catch {
    html = latex;
  }

  return (
    <div
      contentEditable={false}
      onClick={() => {
        setDraft(latex);
        setEditing(true);
      }}
      className="hover:bg-sidebar-hover my-1 cursor-pointer overflow-x-auto rounded-md px-2 py-2 text-center"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

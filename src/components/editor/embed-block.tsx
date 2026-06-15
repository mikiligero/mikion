"use client";

import { useState } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import { Link2, ExternalLink } from "lucide-react";
import { embedInfo, embedHeight } from "@/lib/embed";

export const Embed = createReactBlockSpec(
  { type: "embed", propSchema: { url: { default: "" } }, content: "none" },
  {
    render: ({ block, editor }) => {
      const url = block.props.url as string;
      return (
        <div contentEditable={false} className="my-1 w-full">
          {url ? (
            <EmbedContent url={url} />
          ) : (
            <UrlForm
              onSubmit={(value) =>
                editor.updateBlock(block, { props: { url: value } })
              }
            />
          )}
        </div>
      );
    },
  }
);

function UrlForm({ onSubmit }: { onSubmit: (url: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="border-line bg-sidebar flex items-center gap-2 rounded-md border p-2">
      <Link2 className="text-ink-faint size-4 shrink-0" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) onSubmit(value.trim());
        }}
        placeholder="Pega un enlace (YouTube, Spotify, Maps, Figma, Loom…) o cualquier URL"
        className="text-ink placeholder:text-ink-faint flex-1 bg-transparent text-sm outline-none"
      />
      <button
        onClick={() => value.trim() && onSubmit(value.trim())}
        disabled={!value.trim()}
        className="bg-primary text-primary-foreground rounded-md px-2.5 py-1 text-[13px] font-medium disabled:opacity-50"
      >
        Insertar
      </button>
    </div>
  );
}

function EmbedContent({ url }: { url: string }) {
  const info = embedInfo(url);
  if (!info) return null;

  if (info.kind === "iframe") {
    const h = embedHeight(info.provider);
    const isAspect = h === "aspect-video";
    return (
      <div
        className={`border-line overflow-hidden rounded-md border ${isAspect ? "aspect-video" : ""}`}
        style={isAspect ? undefined : { height: h }}
      >
        <iframe
          src={info.src}
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  // Marcador (bookmark)
  return (
    <a
      href={info.src}
      target="_blank"
      rel="noreferrer"
      className="border-line bg-surface hover:border-line-strong flex items-center gap-3 rounded-md border px-3 py-2.5 no-underline"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- favicon externo diminuto */}
      <img
        src={`https://www.google.com/s2/favicons?domain=${info.domain}&sz=32`}
        alt=""
        width={16}
        height={16}
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-ink truncate text-sm font-medium">{info.domain}</p>
        <p className="text-ink-faint truncate text-xs">{info.src}</p>
      </div>
      <ExternalLink className="text-ink-faint size-4 shrink-0" />
    </a>
  );
}

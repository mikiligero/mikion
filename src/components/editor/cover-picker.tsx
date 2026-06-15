"use client";

import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import {
  COVER_KEYS,
  COVERS,
  IMAGE_COVERS,
} from "@/lib/covers";
import type { CoverPhoto } from "@/app/api/unsplash/route";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Tab = "gallery" | "upload" | "link" | "unsplash";

export function CoverPicker({
  onPick,
  children,
}: {
  onPick: (cover: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("gallery");

  function pick(cover: string) {
    onPick(cover);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-[420px] p-0">
        <div className="border-line flex items-center gap-3 border-b px-3">
          {(
            [
              ["gallery", "Galería"],
              ["upload", "Subir"],
              ["link", "Enlace"],
              ["unsplash", "Unsplash"],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "border-b-2 py-2 text-[13px]",
                tab === t
                  ? "border-brand text-ink font-medium"
                  : "text-ink-soft border-transparent"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-3">
          {tab === "gallery" && <GalleryTab onPick={pick} />}
          {tab === "upload" && <UploadTab onPick={pick} />}
          {tab === "link" && <LinkTab onPick={pick} />}
          {tab === "unsplash" && <UnsplashTab onPick={pick} />}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function GalleryTab({ onPick }: { onPick: (c: string) => void }) {
  return (
    <div className="max-h-[320px] overflow-y-auto">
      <p className="text-ink-faint mb-2 text-xs font-medium">Imágenes</p>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {IMAGE_COVERS.map((img) => (
          <button
            key={img.url}
            onClick={() => onPick(img.url)}
            className="border-line h-14 rounded-md border bg-cover bg-center"
            style={{ backgroundImage: `url("${img.url}")` }}
            title={img.label}
            aria-label={img.label}
          />
        ))}
      </div>
      <p className="text-ink-faint mb-2 text-xs font-medium">Gradientes</p>
      <div className="grid grid-cols-4 gap-2">
        {COVER_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => onPick(key)}
            className="border-line h-10 rounded-md border"
            style={{ background: COVERS[key] }}
            aria-label={key}
          />
        ))}
      </div>
    </div>
  );
}

function UploadTab({ onPick }: { onPick: (c: string) => void }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/files", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.url) onPick(data.url);
      else toast.error(data.error ?? "No se pudo subir la imagen");
    } catch {
      toast.error("No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <label className="border-line text-ink-soft hover:bg-sidebar-hover flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed py-8 text-sm">
      <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <Upload className="size-5" />
      {uploading ? "Subiendo…" : "Subir una imagen"}
      <span className="text-ink-faint text-xs">PNG, JPG, WebP · máx 10 MB</span>
    </label>
  );
}

function LinkTab({ onPick }: { onPick: (c: string) => void }) {
  const [url, setUrl] = useState("");
  return (
    <div className="space-y-2">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && url.trim() && onPick(url.trim())}
        placeholder="Pega el enlace de una imagen…"
        className="border-line bg-surface text-ink w-full rounded-md border px-2.5 py-1.5 text-sm outline-none"
      />
      <button
        onClick={() => url.trim() && onPick(url.trim())}
        disabled={!url.trim()}
        className="bg-primary text-primary-foreground w-full rounded-md py-1.5 text-sm font-medium disabled:opacity-50"
      >
        Usar imagen
      </button>
    </div>
  );
}

function UnsplashTab({ onPick }: { onPick: (c: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CoverPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/unsplash?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => {
          setConfigured(d.configured !== false);
          setResults(d.results ?? []);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function choose(p: CoverPhoto) {
    // Notifica la descarga a Unsplash (requisito de su licencia) y usa la URL.
    void fetch("/api/unsplash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ downloadLocation: p.downloadLocation }),
    });
    onPick(p.url);
  }

  if (!configured) {
    return (
      <p className="text-ink-faint py-6 text-center text-sm">
        Configura <code className="text-ink-soft">UNSPLASH_ACCESS_KEY</code> en
        el entorno para buscar en Unsplash.
      </p>
    );
  }

  return (
    <div>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar una imagen…"
        className="border-line bg-surface text-ink mb-3 w-full rounded-md border px-2.5 py-1.5 text-sm outline-none"
      />
      <div className="grid max-h-[300px] grid-cols-2 gap-2 overflow-y-auto">
        {loading && results.length === 0 && (
          <p className="text-ink-faint col-span-2 py-6 text-center text-sm">
            Cargando…
          </p>
        )}
        {!loading && results.length === 0 && (
          <p className="text-ink-faint col-span-2 py-6 text-center text-sm">
            Sin resultados.
          </p>
        )}
        {results.map((p) => (
          <div key={p.id}>
            <button
              onClick={() => choose(p)}
              className="border-line block h-16 w-full rounded-md border bg-cover bg-center"
              style={{ backgroundImage: `url("${p.thumb}")` }}
              aria-label={`Foto de ${p.author}`}
            />
            <a
              href={p.authorLink}
              target="_blank"
              rel="noreferrer"
              className="text-ink-faint hover:text-ink-soft mt-0.5 block truncate text-[11px]"
            >
              por {p.author}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

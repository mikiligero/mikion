// Autodetección de proveedor para incrustar URLs (puro, testeable).

export type EmbedProvider =
  | "youtube"
  | "vimeo"
  | "spotify"
  | "maps"
  | "loom"
  | "figma"
  | "bookmark";

export type EmbedInfo = {
  provider: EmbedProvider;
  kind: "iframe" | "bookmark";
  src: string; // URL del iframe, o la URL original para marcador
  domain: string;
};

function safeUrl(raw: string): URL | null {
  try {
    return new URL(raw.trim());
  } catch {
    try {
      return new URL("https://" + raw.trim());
    } catch {
      return null;
    }
  }
}

export function embedInfo(raw: string): EmbedInfo | null {
  const u = safeUrl(raw);
  if (!u) return null;
  const host = u.hostname.replace(/^www\./, "");
  const domain = host;
  const iframe = (provider: EmbedProvider, src: string): EmbedInfo => ({
    provider,
    kind: "iframe",
    src,
    domain,
  });

  // YouTube
  if (host === "youtu.be") {
    const id = u.pathname.slice(1);
    if (id) return iframe("youtube", `https://www.youtube.com/embed/${id}`);
  }
  if (host.endsWith("youtube.com")) {
    const id = u.searchParams.get("v") ?? u.pathname.split("/").pop();
    if (id) return iframe("youtube", `https://www.youtube.com/embed/${id}`);
  }

  // Vimeo
  if (host.endsWith("vimeo.com")) {
    const id = u.pathname.split("/").filter(Boolean).pop();
    if (id && /^\d+$/.test(id))
      return iframe("vimeo", `https://player.vimeo.com/video/${id}`);
  }

  // Spotify
  if (host === "open.spotify.com") {
    return iframe(
      "spotify",
      `https://open.spotify.com/embed${u.pathname}`
    );
  }

  // Loom
  if (host.endsWith("loom.com")) {
    const id = u.pathname.split("/").filter(Boolean).pop();
    if (id) return iframe("loom", `https://www.loom.com/embed/${id}`);
  }

  // Figma
  if (host.endsWith("figma.com")) {
    return iframe(
      "figma",
      `https://www.figma.com/embed?embed_host=mikion&url=${encodeURIComponent(u.href)}`
    );
  }

  // Google Maps
  if (host.endsWith("google.com") && u.pathname.includes("/maps")) {
    const sep = u.href.includes("?") ? "&" : "?";
    return iframe("maps", `${u.href}${sep}output=embed`);
  }
  if (host === "maps.google.com" || host === "maps.app.goo.gl") {
    const sep = u.href.includes("?") ? "&" : "?";
    return iframe("maps", `${u.href}${sep}output=embed`);
  }

  // Resto → marcador
  return { provider: "bookmark", kind: "bookmark", src: u.href, domain };
}

/** Altura/aspecto recomendado por proveedor para el iframe. */
export function embedHeight(provider: EmbedProvider): string {
  if (provider === "spotify") return "352px";
  return "aspect-video"; // 16:9 (clase Tailwind)
}

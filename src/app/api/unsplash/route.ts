import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const KEY = process.env.UNSPLASH_ACCESS_KEY;
const UTM = "?utm_source=mikion&utm_medium=referral";

type UnsplashPhoto = {
  id: string;
  urls: { thumb: string; small: string; regular: string };
  user: { name: string; links: { html: string } };
  links: { download_location: string };
};

export type CoverPhoto = {
  id: string;
  thumb: string;
  url: string;
  author: string;
  authorLink: string;
  downloadLocation: string;
};

function mapPhoto(p: UnsplashPhoto): CoverPhoto {
  return {
    id: p.id,
    thumb: p.urls.thumb,
    url: p.urls.regular,
    author: p.user.name,
    authorLink: p.user.links.html + UTM,
    downloadLocation: p.links.download_location,
  };
}

// Búsqueda de imágenes en Unsplash (o destacadas si no hay query).
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!KEY) {
    return NextResponse.json(
      { error: "Unsplash no configurado", configured: false, results: [] },
      { status: 200 }
    );
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const endpoint = q
    ? `https://api.unsplash.com/search/photos?per_page=24&orientation=landscape&query=${encodeURIComponent(q)}`
    : `https://api.unsplash.com/photos?per_page=24&order_by=popular`;

  const res = await fetch(endpoint, {
    headers: { Authorization: `Client-ID ${KEY}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: "Error de Unsplash", results: [] },
      { status: 502 }
    );
  }
  const data = await res.json();
  const list: UnsplashPhoto[] = q ? data.results : data;
  return NextResponse.json({ configured: true, results: list.map(mapPhoto) });
}

// Unsplash exige notificar la "descarga" cuando se usa una imagen.
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!KEY) return NextResponse.json({ ok: false });

  const { downloadLocation } = await req.json().catch(() => ({}));
  if (typeof downloadLocation === "string" && downloadLocation) {
    // No bloqueamos la UI por esto; basta con dispararlo.
    await fetch(downloadLocation, {
      headers: { Authorization: `Client-ID ${KEY}` },
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}

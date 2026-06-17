import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { PlaceValue } from "@/lib/types";

// Proxy a Nominatim (OpenStreetMap): búsqueda de lugares y geocodificación
// inversa. Va por el servidor para fijar el User-Agent que exige su política
// de uso y evitar problemas de CORS. Gratis y sin API key.
const NOMINATIM = "https://nominatim.openstreetmap.org";
const UA = "Mikion/1.0 (https://github.com/mikiligero/mikion)";

type NominatimResult = {
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
};

function toPlace(r: NominatimResult): PlaceValue {
  const name = r.name || r.display_name?.split(",")[0] || "Lugar";
  return {
    name,
    address: r.display_name,
    lat: r.lat ? Number(r.lat) : undefined,
    lon: r.lon ? Number(r.lon) : undefined,
  };
}

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  try {
    // Geocodificación inversa (ubicación actual).
    if (lat && lon) {
      const url = `${NOMINATIM}/reverse?lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lon)}&format=json&accept-language=es`;
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`reverse ${res.status}`);
      const data = (await res.json()) as NominatimResult;
      return NextResponse.json({ places: data?.display_name ? [toPlace(data)] : [] });
    }

    // Búsqueda por texto.
    if (q) {
      const url = `${NOMINATIM}/search?q=${encodeURIComponent(
        q
      )}&format=json&addressdetails=1&limit=6&accept-language=es`;
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`search ${res.status}`);
      const data = (await res.json()) as NominatimResult[];
      return NextResponse.json({ places: data.map(toPlace) });
    }

    return NextResponse.json({ places: [] });
  } catch {
    return NextResponse.json(
      { error: "No se pudo buscar la ubicación" },
      { status: 502 }
    );
  }
}

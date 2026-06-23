import { NextResponse } from "next/server";
import { runDigest } from "@/lib/digest-runner";
import { type DigestSlot } from "@/lib/digest";

// Disparador de los resúmenes de tareas. Pensado para llamarse desde el cron del
// host (LXC) a las 08:00 y 18:00 (Europe/Madrid):
//
//   curl -fsS "http://localhost:3000/api/cron/digest?slot=morning&secret=$CRON_SECRET"
//   curl -fsS "http://localhost:3000/api/cron/digest?slot=evening&secret=$CRON_SECRET"
//
// Protegido con CRON_SECRET (cabecera Authorization: Bearer … o ?secret=…).
// Nunca se cachea.
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sin secreto configurado, deshabilitado
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("secret");
  const fromHeader = req.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  return fromQuery === secret || fromHeader === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const slot = new URL(req.url).searchParams.get("slot");
  if (slot !== "morning" && slot !== "evening") {
    return NextResponse.json(
      { error: "Parámetro 'slot' debe ser 'morning' o 'evening'" },
      { status: 400 }
    );
  }
  const result = await runDigest(slot as DigestSlot);
  return NextResponse.json({ ok: true, slot, ...result });
}

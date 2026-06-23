import { NextResponse } from "next/server";
import { runDigest, runScheduledDigests } from "@/lib/digest-runner";
import { type DigestSlot } from "@/lib/digest";

// Disparador de los resúmenes de tareas. Pensado para llamarse desde el cron del
// host (LXC) cada 30 minutos:
//
//   curl -fsS "http://localhost:3000/api/cron/digest?secret=$CRON_SECRET"
//
// En cada tic decide, por usuario y franja, si toca enviar según la hora/días
// que cada uno ha configurado en Ajustes (una vez al día por franja).
//
// Modo forzado (opcional, para pruebas): añade &slot=morning|evening y se envía
// esa franja a todos ignorando el horario.
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
  // Modo forzado: ?slot=morning|evening → envía esa franja a todos.
  if (slot === "morning" || slot === "evening") {
    const result = await runDigest(slot as DigestSlot);
    return NextResponse.json({ ok: true, mode: "forced", slot, ...result });
  }
  if (slot) {
    return NextResponse.json(
      { error: "Parámetro 'slot' debe ser 'morning' o 'evening'" },
      { status: 400 }
    );
  }
  // Modo planificado (por defecto): respeta el horario de cada usuario.
  const result = await runScheduledDigests();
  return NextResponse.json({ ok: true, mode: "scheduled", ...result });
}

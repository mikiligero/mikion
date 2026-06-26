import { NextResponse } from "next/server";
import { runDigestNow, runScheduledDigests } from "@/lib/digest-runner";

// Disparador de los resúmenes de tareas. Pensado para llamarse desde el cron del
// host (LXC) cada 30 minutos:
//
//   curl -fsS "http://localhost:3000/api/cron/digest?secret=$CRON_SECRET"
//
// En cada tic decide, por cada aviso, si toca enviar según la hora/días que el
// usuario ha configurado en Ajustes (una vez al día por aviso).
//
// Modo forzado (opcional, para pruebas): añade &force=1 y se entregan todos los
// avisos activos ignorando el horario.
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
  // Modo forzado: ?force=1 → entrega todos los avisos activos ya.
  if (new URL(req.url).searchParams.get("force") === "1") {
    const result = await runDigestNow();
    return NextResponse.json({ ok: true, mode: "forced", ...result });
  }
  // Modo planificado (por defecto): respeta el horario de cada aviso.
  const result = await runScheduledDigests();
  return NextResponse.json({ ok: true, mode: "scheduled", ...result });
}

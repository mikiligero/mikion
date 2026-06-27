import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";

// Marca una notificación como leída. Es un route handler (no un server action)
// a propósito: al pulsar un enlace de una notificación, un server action pasa por
// la cola de acciones/render del router de Next y CANCELA la navegación del
// <Link> (síntoma: «los enlaces no funcionan hasta que está leída»). Un fetch no
// toca el router, así que la navegación nunca se interrumpe. El estado de leído se
// refleja de forma optimista en el cliente; la insignia del sidebar se corrige en
// la siguiente navegación.
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) {
    return NextResponse.json({ error: "Falta el id" }, { status: 400 });
  }

  await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(eq(notifications.id, id), eq(notifications.userId, session.user.id))
    );

  return NextResponse.json({ ok: true });
}

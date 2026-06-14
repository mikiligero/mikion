import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workspaces } from "@/db/schema";

/** Devuelve la sesión actual o redirige a /login. */
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}

/**
 * Sesión + workspace del usuario (modelo Personal: exactamente uno).
 * Redirige a /login si no hay sesión.
 */
export async function requireWorkspace() {
  const session = await requireSession();
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerId, session.user.id),
  });
  // El workspace se crea en el hook de registro; si faltara, algo va mal.
  if (!workspace) redirect("/login");
  return { session, workspace };
}

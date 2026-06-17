import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { workspaces, preferences } from "@/db/schema";

// Orígenes de confianza para la verificación CSRF de Better Auth. Tras un
// proxy con HTTPS, el navegador envía Origin=https://dominio mientras la app
// recibe HTTP interno; sin esto, el login se rechaza. Se configuran por entorno
// (BETTER_AUTH_URL es además la baseURL pública; admite lista separada por comas
// en BETTER_AUTH_TRUSTED_ORIGINS para varios hosts, p. ej. IP de LAN + dominio).
const trustedOrigins = (
  process.env.BETTER_AUTH_TRUSTED_ORIGINS ||
  process.env.BETTER_AUTH_URL ||
  ""
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const auth = betterAuth({
  ...(process.env.BETTER_AUTH_URL
    ? { baseURL: process.env.BETTER_AUTH_URL }
    : {}),
  ...(trustedOrigins.length ? { trustedOrigins } : {}),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Registro cerrado salvo que se active explícitamente por entorno. Bloquea
    // también el endpoint /api/auth/sign-up (no solo la página /register).
    disableSignUp: process.env.MIKION_ALLOW_SIGNUP !== "true",
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Cada usuario nuevo recibe su workspace por defecto y sus
          // preferencias iniciales (modelo Personal: un workspace por usuario).
          await db.insert(workspaces).values({
            name: `Estudio de ${user.name}`,
            ownerId: user.id,
          });
          await db.insert(preferences).values({ userId: user.id });
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;

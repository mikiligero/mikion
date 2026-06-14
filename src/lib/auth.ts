import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { workspaces, preferences } from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
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

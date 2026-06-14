import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof postgres> | undefined;
};

// Reutiliza la conexión entre recargas en desarrollo (HMR).
const client =
  globalForDb.client ?? postgres(process.env.DATABASE_URL!, { max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, { schema });

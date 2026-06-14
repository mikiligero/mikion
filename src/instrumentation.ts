// Se ejecuta una vez al arrancar el servidor Next.js.
// En producción (RUN_MIGRATIONS=1) aplica las migraciones pendientes de Drizzle.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.RUN_MIGRATIONS !== "1") return;

  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const postgres = (await import("postgres")).default;

  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  try {
    await migrate(drizzle(client), {
      migrationsFolder: process.env.MIGRATIONS_DIR ?? "./migrations",
    });
    console.log("[migraciones] aplicadas correctamente");
  } finally {
    await client.end();
  }
}

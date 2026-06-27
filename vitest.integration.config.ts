import { defineConfig } from "vitest/config";
import path from "node:path";

// Tests de integración (*.itest.ts): ejercitan el runner del digest contra la
// BD de dev (Postgres :5433). Se ejecutan con `npm run test:integration`.
process.env.DATABASE_URL ??=
  "postgres://notion:notion@localhost:5433/notion";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "src/test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.itest.ts"],
    // Las inserciones/limpiezas comparten la conexión global; sin paralelismo.
    fileParallelism: false,
  },
});

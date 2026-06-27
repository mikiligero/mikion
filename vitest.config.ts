import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` lo provee Next en runtime; en tests lo neutralizamos para
      // poder importar módulos de servidor y testear sus funciones puras.
      "server-only": path.resolve(__dirname, "src/test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    // Los *.itest.ts son de integración (tocan la BD de dev) y se ejecutan
    // aparte con `npm run test:integration`; fuera de la suite de regresión.
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/*.itest.ts"],
  },
});

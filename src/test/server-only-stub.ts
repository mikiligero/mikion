// Stub de `server-only` para los tests: el paquete real (provisto por Next) lanza
// si se importa fuera de un componente de servidor, y no está instalado de forma
// independiente. En vitest lo aliasamos aquí para poder importar módulos
// marcados con `import "server-only"` y testear sus funciones puras.
export {};

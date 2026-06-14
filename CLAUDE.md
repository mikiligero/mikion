# CLAUDE.md — Mikion

> Contexto persistente para Claude Code. Léelo al empezar cualquier sesión en este repo.

## Qué es Mikion
Workspace tipo Notion (un solo producto): barra lateral con árbol de páginas, editor de bloques, base de datos con 5 vistas (tabla/tablero/calendario/cronograma/gráfico), calendario de equipo, paleta de comandos, ajustes, y apps Calendar/Mail. Multi-usuario, **sin colaboración en tiempo real**.

La especificación funcional completa está en `design_handoff_mikion_workspace/funciones.md` y los tokens de diseño en `design_handoff_mikion_workspace/README.md`. **Son la fuente de verdad.** Los `.html`/`.jsx` del handoff son prototipos de referencia (look & behavior), **no** código a copiar.

## Stack (no cambiar sin avisar)
- **Next.js 16.2.9** (App Router, full-stack) · **React 19.2.4** · **TypeScript 5**
- **PostgreSQL** (driver `postgres` 3.4.9) · **Drizzle ORM 0.45.2** + `drizzle-kit` 0.31.10 (migraciones)
- **Better Auth 1.6.18** (auth multi-usuario)
- **BlockNote 0.51.4** (`core`/`react`/`shadcn`) — editor de bloques
- **@dnd-kit** (core/sortable/utilities) — drag & drop (kanban, reordenar bloques/filas)
- **@tanstack/react-table 8.21.3** — vista de tabla
- **fractional-indexing 3.2.0** — orden de bloques/filas sin reindexar
- **Tailwind CSS v4** (`@tailwindcss/postcss`) + `tw-animate-css`
- **shadcn 4.11.0** + **Radix UI 1.5.0** — primitivos de componentes
- **lucide-react** (iconos) · **next-themes** (claro/oscuro) · **sonner** (toasts) · **cmdk** (paleta) · **frimousse** (emoji picker)
- **clsx · tailwind-merge · class-variance-authority** — utilidades de clases
- **Zod 4.4.3** — validación
- **Docker** (`docker-compose.prod.yml`); Postgres dev en Docker (**puerto 5433**); dev server en **puerto 3001**. Despliegue pendiente en LXC de Proxmox.

## ⚠️ Next.js 16 — leer antes de tocar código de Next
Esta versión tiene **breaking changes** respecto a versiones conocidas. **Antes** de modificar rutas, server components, `fetch`/caché, params, middleware o config de App Router, **lee las guías en `node_modules/next/dist/docs/`** y sigue lo que digan ahí, no la memoria de versiones anteriores.

## Mapeo diseño → stack (usar los primitivos existentes, no reinventar)
| Pieza | Construir con |
|---|---|
| Editor de bloques, menú «/», barra de formato | **BlockNote** (mapear tipos de bloque; el slash menu es nativo). No usar contentEditable a mano. |
| Tabla de BD | **@tanstack/react-table** |
| Kanban + reordenar bloques/filas | **@dnd-kit** + orden con **fractional-indexing** |
| Paleta de comandos (⌘K) | **cmdk** |
| Emoji picker (icono de página, callouts) | **frimousse** |
| Iconos | **lucide-react** (los nombres del prototipo ya coinciden) |
| Tema claro/oscuro | **next-themes** (estrategia `class` → `.dark` en `<html>`) |
| Toasts | **sonner** |
| Modales/popovers/selects/switches/segmentados | **Radix UI** vía **shadcn** |
| Validación de formularios/inputs | **Zod** |
| Datos (docs, bloques, filas, esquema, comentarios, favoritos, preferencias) | **Drizzle + Postgres**, por usuario con **Better Auth** |

## Tokens de diseño (resumen — detalle en README del handoff)
- Tipografía: **Newsreader** (serif, títulos), **Hanken Grotesk** (sans, UI/cuerpo, base 15px), **JetBrains Mono** (código). Self-host con `next/font`.
- Acento terracota `#c75c37`; superficies «papel» cálidas (`--paper #faf8f5`, `--surface #fff`). Tints semánticos por estado/área.
- Radios: `5 / 8 / 12 / 18px`. Sombras suaves (ver README).
- Portar estos valores al theme de Tailwind v4 en vez de aproximarlos.

## Modelo de datos (Drizzle) — por usuario
- `preferences`: `theme`, `textScale` (núm., def. 1), `defaultFont`, `fullWidthDefault`, `language`, `startupView`.
- `docs`: `id, emoji, title, cover, font, fullWidth, smallText, blocks(JSON BlockNote)`.
- `tree` / `privateTree`: nodos jerárquicos (`id, emoji, title, kind?, parentId, orderKey`) — orden con fractional-indexing.
- `database`: `schema[]` (propiedades tipadas) + `rows[]` (valores). 12 tipos de propiedad (title/text/number/select/multiselect/status/person/date/checkbox/url/formula/relation/rollup).
- `rowDocs`: contenido de página por fila.
- `comments`: por doc → hilos → respuestas, con `resolved` (ancla a página o a bloque).
- `favorites`: `docId[]`. `homeTasks`: tareas del dashboard.

## Convenciones
- **Tamaño de texto**: preferencia que escala SOLO el contenido (no la barra lateral/superior). Variable CSS `--text-scale` en `<html>`; aplicar en primer render (sin parpadeo) + espejo en `localStorage`. Niveles 0.9 / 1 / 1.15 / 1.3.
- Tema: clase `.dark` en `<html>` vía next-themes; aplicar también antes del primer paint para evitar flash.
- Persistencia: cada cambio del editor/BD guarda en servidor; espejo local opcional para latencia.
- Idioma de la UI: **español** (copys del prototipo).
- IA: en producción la llamada al modelo va por una **ruta server de Next** (no `window.claude`). Prompts por modo ya definidos en el prototipo (`buildPrompt`).
- No introducir colores/tipografías/radios fuera de los tokens del handoff.

## Orden de trabajo sugerido (ver checklist en funciones.md §10)
**Fase 1 (núcleo):** auth + modelo Drizzle → shell (sidebar/topbar/rutas/tema/tamaño de texto) → editor BlockNote → BD (tabla + kanban + filtros) → inicio + paleta + ajustes.
**Fase 2:** vistas calendario/cronograma/gráfico + calendario de equipo (mes/lista) → bloques avanzados → comentarios/plantillas/automatizaciones/IA.
**Fase 3:** historial de versiones, Mikion Calendar, Mikion Mail, bandeja, conexiones/API/offline.

Propón siempre un plan corto antes de implementar; ve por partes y confirma.

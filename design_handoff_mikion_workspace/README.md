# Handoff: Mikion — Notion-style Workspace

## Overview
Mikion is a Notion-style personal/team workspace: a collapsible sidebar with a page tree, a
block editor for documents, a multi-view database (table / board / calendar), command palette
search, a settings modal, standalone Mail & Calendar mini-apps, and light/dark theming. This
bundle is the **hi-fi design reference** for that product. It also includes a newly added
**adjustable text size** preference (Settings → Account → Preferences) that scales page content.

## About the Design Files
The files in this bundle are **design references built in HTML/CSS/React-via-Babel** — runnable
prototypes that show the intended look, layout, copy, and interactions. **They are not production
code to copy.** Your task is to **recreate these designs inside the existing Next.js codebase**,
using its established libraries and patterns (see "Mapping to your stack" below). Treat the HTML
as the source of truth for *visuals and behavior*, and your codebase as the source of truth for
*architecture*.

Open `Mikion.html` to run the prototype. State persists to `localStorage` under the key
`mikion_v2` (theme, text scale, docs, database rows, favorites, comments).

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, radii, shadows, and interaction
states are all specified below and in `styles.css`. Recreate the UI pixel-faithfully using your
existing component primitives (shadcn/Radix) and design tokens. Where this design's tokens differ
from your app's, port these token *values* into your Tailwind v4 theme rather than approximating.

---

## Mapping to your stack
Your stack already contains the right primitives — use them rather than reinventing what the
prototype hand-rolls:

| Design area (in prototype) | Build with (your stack) |
|---|---|
| Block editor (`editor.jsx`, `blocks.jsx`) — headings, text, todo, quote, callout, code, image, divider, slash menu | **BlockNote 0.51** (`@blocknote/react` + `@blocknote/shadcn`). Map the prototype's block types to BlockNote blocks; the slash menu is BlockNote's native suggestion menu. Do **not** hand-roll contentEditable. |
| Database table view (`dbviews.jsx`, `database.jsx`) | **@tanstack/react-table 8** |
| Board / kanban + block & row reordering | **@dnd-kit** (core/sortable). Persist order with **fractional-indexing** instead of integer reindex |
| Command palette / search (`palette.jsx`) | **cmdk** |
| Emoji picker (page icons, callouts) | **frimousse** |
| Icons (`icons.jsx`) | **lucide-react** — the prototype's icon names already mirror Lucide (search, star, moon, bell, users, grid, code, etc.) |
| Light/dark theme (`Store.toggleTheme`, `.dark` class) | **next-themes** (`class` strategy → toggles `.dark` on `<html>`, exactly as the prototype does) |
| Toasts (e.g. "Copiado", invites) | **sonner** |
| Modals / popovers / selects / toggles / segmented controls | **Radix UI** primitives via **shadcn** |
| Forms (invite, account, schema editing) | **Zod 4** for validation |
| Data model (docs, blocks, rows, schema, comments, favorites) | **Drizzle ORM + Postgres**; gate per-user with **Better Auth** |
| Class utilities | **clsx / tailwind-merge / cva** |

> **Next.js 16 caution (from your AGENTS.md):** this Next version has breaking changes vs. earlier
> releases. Read the guides in `node_modules/next/dist/docs/` before touching App Router / server
> code. The design is client-driven UI; most of it lives in client components.

---

## Screens / Views

### 1. App shell
- **Layout:** flex row, full viewport height, `overflow: hidden`. Sidebar (fixed width
  `--sidebar-w: 268px`) + main column (`flex: 1`). Main column = top bar (fixed height) +
  scrolling content region.
- **Top bar:** breadcrumbs (left, clickable except last crumb), spacer, then a row of actions:
  Search button, favorite star (only on docs), theme toggle (moon/smile icon), notifications
  bell, "Compartir" button (accent text + users icon), and a "more" (⋯) menu. Buttons are
  `13px`, `--ink-soft`, hover bg `--sidebar-hover`, radius `--r-sm`.
- **More menu (popover):** Plantillas, Historial de versiones (docs only), Duplicar página,
  Copiar enlace, separator, Mover a la papelera (danger/red).
- **Mobile (<720px):** sidebar collapses behind a scrim; a `panelLeftOpen` button reveals it.

### 2. Sidebar (`sidebar.jsx`)
- Background `--sidebar`, hover rows `--sidebar-hover`.
- Workspace switcher header ("Estudio Mikion") with a small accent logo tile.
- Quick rows: Buscar, Inicio, Bandeja de entrada, Mikion AI.
- Sections with uppercase labels (`11.5px`, weight 600, letter-spacing `.04em`, color
  `--ink-faint`): **Favoritos**, **Espacio de equipo** (collapsible page tree), **Privado**.
- Tree rows: `14px`, `--ink-soft`; emoji icon `15px` in an 18px box; chevron toggles children;
  active row uses accent icon. Hover reveals add/more affordances.
- Footer: Plantillas, Papelera, Configuración (opens settings modal), an "Apps" launcher
  (Calendar / Mail).

### 3. Document editor (`editor.jsx`, `blocks.jsx`)
- **Cover:** optional full-width cover image band.
- **Icon:** large emoji, `70px`, pulled up over the content (`margin-top: -52px`).
- **Title:** serif (`--serif`), `42px`, weight 560, line-height 1.12, letter-spacing -0.018em.
- **Meta row:** `13px` `--ink-faint`, bottom border `--line-soft` — properties / last-edited.
- **Blocks** (`.editor`, base `16px`, line-height 1.62):
  - `h1` serif 28px / w580; `h2` serif 22px / w580; `h3` sans 17.5px / w680
  - `quote` — 3px accent left border, serif italic 18px, `--ink-soft`
  - `code` — mono 13.5px, bg `#f3efe8` (dark `#2a2723`), border `--line`
  - `callout` — tinted box, emoji 18px + body text 15px
  - `todo` — checkbox 17px (1.6px `--ink-faint` border, radius 4px); checked uses accent
  - `divider`, `image` (placeholder gradient block)
- **Slash menu (`/`):** popover `300px`, categorized list; item title 14px/550, desc 12px
  `--ink-faint`, leading icon tile; active item gets accent icon + `--accent-soft` border.

### 4. Database (`database.jsx`, `dbviews.jsx`, `dbprops.jsx`)
- **Header:** serif title 32px, description 14px `--ink-faint`, then a tab strip (Tabla / Tablero /
  Calendario) with a toolbar (Filtrar, accent "+ Evento/Fila") on the right. Tabs: 13.5px,
  active tab has 2px accent bottom border.
- **Table:** `font-size 14px`; header cells 12.5px `--ink-faint`, weight 500, bottom border
  `--line`. Title cell shows emoji + name (hover → accent); a faint "open" affordance appears on
  row hover. Inline cell editors per property type.
- **Schema/property types:** title, status, select, person, date, formula (e.g. `daysLeft`).
  Status & select render as **tags/pills** (`12.5px`, weight 500, radius 20px) colored from the
  semantic tint tokens.
- **Board (kanban):** columns `width 286px`; cards (`.kcard`) with optional cover band (76px),
  title 14.5px/600, tag chips, footer meta 12.5px. Drag between columns via dnd-kit.
- **Calendar:** 7-col grid, day cells `min-height 118px`, dow headers 12px uppercase.

### 5. Home (`home.jsx`)
- Serif greeting `34px`/w540, subtitle 14.5px `--ink-faint`.
- Uppercase section headers (13px/600 `--ink-soft`).
- "Recientes" card grid (`minmax(186px, 1fr)`): cover 64px, icon 22px pulled up, title 14px/600,
  meta 12px. Quick-action chips, and a two-column tasks/events area.

### 6. Settings modal (`settings.jsx`)
- **Layout:** backdrop (`--overlay`) + centered modal with a left rail (sections) and a right
  panel. Rail header shows the workspace + plan ("Plan Free · 5 miembros"). Sections:
  - **Cuenta:** Mi cuenta, **Preferencias**
  - **Espacio de trabajo:** Miembros y roles, Espacios de equipo
  - **Avanzado:** API y desarrolladores
  - (Also implemented as panels: Planes, IA y agentes, Conexiones, Sin conexión.)
- **Preferences panel** rows (label left, control right):
  - **Apariencia** — segmented control Claro / Oscuro (drives `Store.setTheme`).
  - **Fuente predeterminada** — Sans / Serif / Mono.
  - **Ancho de página completo** — toggle.
  - **Tamaño del texto** — *(new)* segmented control of four "A" buttons of increasing size:
    Pequeño (0.9) / Normal (1) / Grande (1.15) / Enorme (1.3). See "Text size feature" below.
  - **Idioma**, **Abrir al iniciar** — selects.
- **Reusable controls:** `Toggle` (pill switch + knob), `Row` (title + optional desc + control),
  `seg`/`seg-btn` (segmented control, active = `.on`). Recreate with Radix Switch / a segmented
  control built on Radix Toggle Group.

### 7. Standalone apps (`apps.jsx`)
- **Mikion Calendar** and **Mikion Mail** — full-height app views (`.app-view`) with their own top
  bar (`.app-bar`) and bodies (`.cal-app-body`, mail layout). Secondary to the core workspace.

---

## Text size feature (newly added — implement this)
A user preference that scales **page content** (editor, database, home) while leaving the app
chrome (sidebar, top bar) at a fixed size — matching Notion's behavior.

**Prototype implementation (reference):**
- State: `textScale` (number, default `1`) in the store, with action `setTextScale(n)`. Persisted
  in `localStorage` under `mikion_v2`.
- Applied as a CSS custom property on `<html>`: `--text-scale`. Set on first paint (inline head
  script, to avoid flash) and via an effect on change.
- CSS:
  ```css
  .content-scroll { font-size: calc(15px * var(--text-scale, 1)); }
  .content-scroll > * { zoom: var(--text-scale, 1); } /* scales fixed-px block sizes too */
  ```
- UI: segmented control of four buttons in Preferences; values `0.9 / 1 / 1.15 / 1.3`.

**Recommended in your stack:**
- Store the preference per user (Better Auth user → Drizzle `preferences` table/column) and/or
  mirror to `localStorage` for instant, flash-free application.
- Apply via a CSS variable on the content wrapper. `zoom` is the simplest way to scale BlockNote's
  fixed sizes uniformly; alternatively set a base `font-size`/`rem` scale on the content root if
  your content styles are rem-based. Keep the sidebar/top bar outside the scaled wrapper.
- Render the control with your segmented control (Radix Toggle Group). Persist via your normal
  preferences mutation; debounce if writing server-side on every change.

---

## Interactions & Behavior
- **Theme toggle:** toggles `.dark` on `<html>` (next-themes `class` strategy). Both palettes are
  fully specified under Design Tokens.
- **Command palette:** `⌘K` / `Ctrl+K` opens; fuzzy list of pages & actions; arrow-key navigation;
  Enter navigates. Build with cmdk.
- **Keyboard:** `⌘N` new page, `⌘[` back, `⌘K` search, `/` slash menu in a block.
- **Navigation:** internal history stack with back support; mobile auto-collapses sidebar on nav.
- **Drag & drop:** reorder blocks, reorder rows, move kanban cards across columns (dnd-kit +
  fractional-indexing for order keys).
- **Inline editing:** title, block text, and database cells edit in place and persist immediately.
- **Comments:** threads per doc/block with replies and resolve toggle.
- **Favorites:** star in top bar adds/removes a doc from the Favoritos section.
- **Transitions:** popovers use a `popIn` animation (opacity + `translateY(-8px) scale(.98)`,
  ~`.14s`). Hover states throughout use `--sidebar-hover` backgrounds and `.14s` transitions.
- **Responsive:** sidebar collapses below 720px; home two-column layout collapses below 760px.

## State Management
Prototype keeps everything in one client store persisted to `localStorage`. In your app, model as:
- **User & auth:** Better Auth (multi-user, no realtime collaboration).
- **Pages/docs:** id, emoji, title, cover, ordered blocks (BlockNote JSON), parent (tree).
- **Trees:** team-space tree + private tree (parent/child, ordered via fractional index).
- **Database:** `schema` (property defs: id, name, type, icon, options/formula) + `rows`
  (per-property values). Views: table / board / calendar are renderings of the same rows.
- **Comments:** per doc → threads → replies, with `resolved` flag.
- **Favorites:** array of doc ids per user.
- **Preferences:** `theme`, `textScale`, default font, full-width, language, startup view.

## Design Tokens

### Light (`:root`)
```
Surfaces   --paper #faf8f5  --surface #ffffff  --sidebar #f4f1ec  --sidebar-hover #ece8e1
           --overlay rgba(34,30,26,.34)
Ink        --ink #232019  --ink-soft #6c655b  --ink-faint #9a9388  --ink-ghost #c2bbb0
Lines      --line #e7e2d9  --line-soft #f0ece4  --line-strong #d8d2c6
Accent     --accent #c75c37  --accent-deep #ab4a2a  --accent-soft #f8eae3  --accent-tint #fcf4ef
Tints      green  #2f7d56 / bg #e6f1ea     blue   #2f6bb0 / bg #e6eef7
           amber  #b9802a / bg #f6edd8     purple #7a51c2 / bg #efe9f9
           rose   #c14b73 / bg #fae8ee     teal   #1f8a82 / bg #e0f0ee
           gray   #6c655b / bg #eeeae3
```

### Dark (`.dark`)
```
Surfaces   --paper #1b1916  --surface #242120  --sidebar #1e1c19  --sidebar-hover #2c2926
           --overlay rgba(0,0,0,.55)
Ink        --ink #ece6dd  --ink-soft #a79f93  --ink-faint #7b736a  --ink-ghost #564f48
Lines      --line #322e29  --line-soft #28251f  --line-strong #423c34
Accent     --accent #e3784f  --accent-deep #ef875f  --accent-soft #3a281f  --accent-tint #281f1a
Tints      green #6ec394/bg #1c2c23   blue #6fa6e3/bg #1a2634   amber #d8ab5c/bg #2f2819
           purple #ab8de3/bg #251e33  rose #e381a4/bg #2f1d27   teal #5ec4ba/bg #182c2a
           gray #a79f93/bg #2c2926
```

### Typography
```
--serif "Newsreader", Georgia, "Times New Roman", serif      (titles, h1/h2, quotes)
--sans  "Hanken Grotesk", -apple-system, "Segoe UI", sans-serif   (UI + body, base 15px)
--mono  "JetBrains Mono", "SFMono-Regular", Menlo, monospace  (code)
```
Key sizes: body 15px · editor 16px (lh 1.62) · doc title serif 42px/560 · h1 28px · h2 22px ·
h3 17.5px · db title serif 32px · home greeting serif 34px · sidebar rows 14px · section labels
11.5px/600.

### Radius
```
--r-sm 5px   --r-md 8px   --r-lg 12px   --r-xl 18px
```

### Shadow (light)
```
--shadow-sm 0 1px 2px rgba(34,30,26,.06), 0 1px 3px rgba(34,30,26,.05)
--shadow-md 0 4px 14px rgba(34,30,26,.09), 0 1px 4px rgba(34,30,26,.06)
--shadow-lg 0 18px 50px rgba(34,30,26,.18), 0 4px 14px rgba(34,30,26,.10)
```
(Dark variants are darker — see `.dark` in `styles.css`.)

### Misc
```
--sidebar-w 268px   ·   ::selection bg --accent-soft   ·   custom 11px scrollbars
```

## Assets
- **Fonts:** Newsreader, Hanken Grotesk, JetBrains Mono — loaded from Google Fonts in
  `Mikion.html`. In your app, self-host (e.g. `next/font`) for performance/offline.
- **Icons:** inline SVGs in `icons.jsx`; names mirror **lucide-react** — use Lucide directly.
- **Cover/illustration images:** the prototype uses CSS gradient placeholders (`D.COVERS`), not
  real image files. Substitute your own assets or an upload flow.
- No raster brand assets are bundled.

## Files (in this bundle)
- `Mikion.html` — entry point; loads fonts, React (via CDN/Babel), and all modules.
- `styles.css` — **the full design system** (all tokens above + every component style).
- `data.js` — seed data (docs, projects/rows, trees, covers, people).
- `store.js` — client store + localStorage persistence + domain actions (incl. `setTextScale`).
- `icons.jsx` — icon set (maps to Lucide).
- `shared.jsx` — shared helpers/components (`useStore`, `Tag`, `Avatar`, date utils…).
- `sidebar.jsx` — sidebar + page tree.
- `blocks.jsx`, `editor.jsx` — block editor (→ BlockNote).
- `dbprops.jsx`, `dbviews.jsx`, `database.jsx` — database schema, views, table/board/calendar.
- `home.jsx` — home dashboard.
- `palette.jsx` — command palette (→ cmdk).
- `modals.jsx` — comments panel, version history, templates gallery.
- `settings.jsx` — settings modal incl. **Preferences → Tamaño del texto**.
- `apps.jsx` — standalone Calendar & Mail mini-apps.
- `app.jsx` — app shell, routing, keyboard shortcuts, theme & text-scale application.

To run the reference: open `Mikion.html` in a browser.

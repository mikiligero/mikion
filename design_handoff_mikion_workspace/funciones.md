# Mikion — Especificación funcional completa (`funciones.md`)

> Documento de referencia exhaustivo de **todas las funciones** de la aplicación Mikion y de **todo lo que hay que implementar** al recrearla en el stack real (Next.js 16 / React 19 / Drizzle / Postgres / Better Auth / BlockNote / shadcn). El prototipo HTML adjunto es la fuente de verdad del comportamiento y los visuales; este documento traduce cada pieza a requisitos de implementación.
>
> **Leyenda de prioridad:** 🟢 núcleo (imprescindible v1) · 🟡 importante · ⚪ secundario / pulido posterior.

---

## 0. Arquitectura general

La app es un **workspace tipo Notion** de un solo producto con tres grandes zonas:
1. **Shell** — barra lateral + barra superior + región de contenido.
2. **Contenido** — Inicio, editor de páginas, base de datos (5 vistas), calendario de equipo, bandeja de entrada.
3. **Apps independientes** — Mikion Calendar y Mikion Mail (pantalla completa, con su propia barra).

Más una capa de **modales/paneles**: Ajustes, Plantillas, Historial de versiones, Automatizaciones, Comentarios, Paleta de comandos.

### Estado global (lo que persiste)
En el prototipo todo vive en un store cliente persistido en `localStorage` (`mikion_v2`). En producción este es el **modelo de datos** a llevar a Postgres/Drizzle, por usuario (Better Auth):

| Entidad | Campos | Notas |
|---|---|---|
| `preferences` | `theme` (`light`/`dark`), `textScale` (núm., def. 1), `defaultFont` (`default`/`serif`/`mono`), `fullWidthDefault` (bool), `language`, `startupView` | Por usuario. Espejo en `localStorage` para aplicar sin parpadeo. |
| `docs` (páginas) | `id`, `emoji`, `title`, `cover`, `font`, `fullWidth`, `smallText`, `blocks[]` | `blocks[]` = documento BlockNote. |
| `tree` / `privateTree` | árbol jerárquico de nodos `{id, emoji, title, kind?, children[]}` | `kind`: `database`/`calendar`. Orden con fractional-indexing. |
| `database` | `schema[]` (definición de propiedades) + `rows[]` (filas) | Una BD «Proyectos» de ejemplo; el modelo debe ser genérico. |
| `rowDocs` | contenido de página por fila (`blocks[]`) | Cada fila de BD abre como página. |
| `comments` | por doc → hilos → respuestas, con `resolved` | Anclados a página o a un bloque concreto. |
| `favorites` | array de `docId` | Aparece en la sección Favoritos. |
| `homeTasks` | tareas del dashboard | Lista simple con `done` + `tag`. |

**Acciones de store a implementar** (todas persisten y notifican a la UI): `setTheme`, `toggleTheme`, `setTextScale`, `persistDoc`, `renameDoc`, `setDocMeta`, `createPage(parentId, tpl?)`, `setRows`, `addRow`, `addRowWith`, `setCell`, `addProperty`, `updateProperty`, `deleteProperty`, `addSelectOption`, `setHomeTasks`, `toggleFavorite`, `addComment`, `addReply`, `resolveComment`, `reset`.

---

## 1. Shell de la aplicación 🟢

### 1.1 Barra lateral (`Sidebar`)
- **Cabecera de workspace:** logo + «Estudio Mikion» + chevron. Al hacer clic abre el **lanzador de Apps** (popover): Mikion (notas/BD), Mikion Calendar, Mikion Mail, + Ajustes e «Invitar miembros». Marca con check la app activa.
- **Botón contraer** barra (icono chevrons-left). En móvil (<720px) la barra se superpone con un *scrim* y se autocontrae al navegar.
- **Accesos rápidos:** Buscar (abre paleta, atajo ⌘K), Inicio, Bandeja de entrada (con badge «3»).
- **Sección Favoritos** (solo si hay): páginas marcadas con estrella.
- **Sección Espacio de equipo:** árbol de páginas con nodos expandibles. Los nodos `database`/`calendar` muestran icono en vez de emoji. Cada fila al hover muestra acciones: **«⋯ Más»** y **«+ Nueva subpágina»** (crea hija y expande).
- **Sección Privado:** árbol propio del usuario.
- **«+ Nueva página»** al final.
- **Pie:** Ajustes, Papelera, Ayuda.
- **Implementación:** árbol recursivo (`TreeNode`); estado abierto/cerrado por nodo; reordenar con dnd-kit + fractional-indexing; navegación controlada por el shell.

### 1.2 Barra superior (`topbar`) 🟢
- **Migas de pan** (breadcrumbs) calculadas según la vista actual (raíces: Inicio, Bandeja, Espacio de equipo › …, Privado › …). La primera miga es clicable → vuelve a Inicio.
- **Acciones derechas:** Buscar, ⭐ favorito (solo en páginas; alterna con `toggleFavorite`), 🌙/☺ tema (`toggleTheme`), 🔔 notificaciones (→ Bandeja), «Compartir», y **⋯ Más**.
- **Menú ⋯ Más:** Plantillas, Historial de versiones (solo páginas), Duplicar página, Copiar enlace, separador, Mover a la papelera (rojo).
- En las apps independientes (calendar/mail) la barra superior se sustituye por la barra propia de la app; si la lateral está contraída aparece un botón para reabrirla.

### 1.3 Enrutado / navegación 🟢
- Vistas posibles: `home`, `inbox`, `db-proyectos`, `cal-equipo`, `app-calendar`, `app-mail`, `settings`, cualquier `docId`, o `row` (página de una fila de BD).
- **Pila de historial** propia con **«atrás»** (atajo ⌘[). Crear página (⌘N) navega a ella. En móvil, navegar contrae la barra.
- En producción: mapear a rutas del **App Router** de Next.js 16 (cuidado con los breaking changes — leer `node_modules/next/dist/docs/`). Las páginas son client components con datos cargados por servidor.

### 1.4 Tamaño de texto (preferencia) 🟢 *(implementado en el prototipo)*
- `textScale` (0.9 / 1 / 1.15 / 1.3) escala **el contenido** (editor, BD, inicio) dejando intacta la barra lateral y superior.
- Aplicación: variable CSS `--text-scale` en `<html>` (en primer render + efecto al cambiar). CSS: `.content-scroll > * { zoom: var(--text-scale,1) }`.
- Control: segmentado de cuatro «A» de tamaño creciente en Ajustes › Preferencias.
- Producción: guardar en `preferences` por usuario + espejo en `localStorage`.

---

## 2. Editor de bloques (`Editor`) — el corazón 🟢

> En producción **debe construirse sobre BlockNote** (`@blocknote/react` + `@blocknote/shadcn`). No reimplementar contentEditable. Lo que sigue describe el comportamiento esperado; muchos puntos son nativos de BlockNote y solo hay que configurarlos/extenderlos.

### 2.1 Cabecera de página
- **Portada (cover):** banda de imagen/gradiente a sangre completa. Botones «Cambiar portada» / «Quitar». Si no hay, botón «Añadir portada». Selector de 8 portadas (`COVERS`: clay, sage, dusk, sand, slate, rose, teal, night).
- **Icono (emoji):** grande (70px) sobre el contenido; clic abre selector de emojis (en producción: **frimousse**).
- **Título:** editable en línea; al perder foco hace `renameDoc` (propaga al árbol) o `persistDoc` si es fila de BD.
- **Meta:** «Editado hace 2 h», autor, nº de bloques, **Comentarios** (abre panel), **Estilo** (abre popover de estilo de página: fuente Sans/Serif/Mono, ancho completo, texto pequeño — guardado por página con `setDocMeta`).

### 2.2 Edición de bloques
- Escritura de texto enriquecido por bloque. **Enter** divide el bloque en el cursor; en listas/tareas continúa el tipo; Enter en bloque de lista vacío lo convierte en texto.
- **Backspace** al inicio fusiona con el bloque anterior (si es fusionable).
- **Navegación con flechas** entre bloques (arriba/abajo respetando posición del cursor).
- **⌘D** duplica el bloque; atajo de barra lateral del bloque (gutter) para añadir/duplicar/comentar/eliminar/convertir.
- **Atajo `---`** crea un divisor.
- **Reordenar arrastrando** desde el «grip» del gutter (indicadores arriba/abajo). En producción: dnd-kit.
- **Plegar encabezados:** los H1–H3 ocultan/expanden su sección.
- **Persistencia:** cada cambio guarda el documento (`persistDoc`), omitiendo el primer render.

### 2.3 Menú «/» (slash) 🟢
Popover categorizado y filtrable por título/keywords. **Categorías y tipos** (todos a soportar):
- **Básico:** Texto, Página (crea subpágina + enlace), Título 1/2/3, Lista de tareas, Lista con viñetas, Lista numerada, Lista desplegable (toggle), Cita, Llamada (callout), Divisor, Tabla de contenidos, Ruta de navegación (breadcrumb).
- **Multimedia:** Imagen, Vídeo (YouTube), Audio, Archivo, PDF, Marcador web, **Insertar/embed** (YouTube, Spotify, Maps, Figma, GitHub, Loom, Miro, Drive — con autodetección por URL).
- **Bases de datos:** BD en línea · Tabla / Tablero / Galería; Tabla simple (editable).
- **Código y fórmulas:** Código, Ecuación (LaTeX → render legible), Mención (@persona), Fecha, Recordatorio.
- **Organización:** Enlace a página, Botón (acción + toast), Botón de plantilla (inserta bloques predefinidos), Bloque sincronizado.
- **Diseño:** 2 columnas, 3 columnas.
- **Propiedades:** Estado, Personas, Hora de creación, Última edición.
- **IA:** Preguntar a la IA, Resumir, Traducir, Mejorar redacción, Continuar escribiendo, Lluvia de ideas.

Navegación del menú con ↑/↓/Enter/Esc. Búsqueda por `title`+`kw`.

### 2.4 Barra de formato flotante (`FormatBar`) 🟡
Aparece al seleccionar texto: **Negrita, Cursiva, Subrayado, Tachado, Código en línea, Enlace**, y **Color/Resaltado** (6 colores de texto + 6 de resaltado + «quitar formato»). En producción: usar el toolbar de selección de BlockNote.

### 2.5 Bloques avanzados (renderers) — comportamiento por tipo
- **Toggle:** título + cuerpo expandible.
- **Tabla de contenidos:** lista automática de H1–H3, clic hace scroll al encabezado.
- **Breadcrumb:** migas de la página.
- **Enlace a página:** selector de página existente; muestra emoji+título; clic navega.
- **Vídeo / Embed:** input de URL; YouTube/Spotify/Maps embeben iframe; resto cae a tarjeta de marcador con color de marca.
- **Archivo / PDF:** «chip» con icono, nombre, tamaño y descarga.
- **Audio:** reproductor con play/pausa y pista.
- **Marcador (bookmark):** input URL → tarjeta con título/desc/thumb.
- **Ecuación:** entrada LaTeX → render «bonito» (fracciones, raíces, símbolos griegos, sub/superíndices). En producción: KaTeX/MathLive.
- **Chips en línea:** Mención (selector de persona), Estado (selector), Personas, Creado/Última edición (fechas), Fecha/Recordatorio.
- **Tabla simple:** celdas editables, añadir fila/columna.
- **BD en línea (`InlineDB`):** mini-tabla/tablero/galería de «Proyectos» con conmutador de vista; clic abre la fila.
- **Botón / Botón de plantilla:** ejecuta acción (toast) o inserta bloques predefinidos.
- **Bloque sincronizado:** contenido reutilizable (badge «Sincronizado»).
- **Columnas:** 2/3 columnas editables.
- **Bloque IA (`AIBlock`):** ver §7.

---

## 3. Bases de datos (`DatabaseView`) 🟢

Una base de datos genérica con **esquema de propiedades** + **filas**, presentada en **5 vistas**. La BD de ejemplo es «Proyectos».

### 3.1 Esquema de propiedades (12 tipos) 🟢
`title, text, number, select, multiselect, status, person, date, checkbox, url, formula, relation, rollup`.
- **Editor de propiedades (`PropHeader`):** renombrar, **cambiar tipo**, editar opciones (select/multiselect/status), elegir **fórmula**, configurar **rollup** (origen=relación), eliminar propiedad.
- **Añadir propiedad** (`AddPropCell`, botón «+» en la cabecera): elige tipo.
- **Fórmulas disponibles:** `daysLeft` (días hasta entrega), `overdue` (¿vencido?), `priorityScore`, `done` (¿completado?). Calculadas respecto a «hoy».
- **Rollup:** agrega desde una propiedad de relación (p.ej. contar).
- **Celdas editables en línea** según tipo: texto/número/URL inline; select/status/multiselect/person/date/relation con popover; checkbox con toggle. Crear opciones nuevas sobre la marcha.
- **Implementación:** `@tanstack/react-table` para la tabla; el esquema y las filas en Postgres (tabla de propiedades + valores tipados, o JSONB por fila).

### 3.2 Barra de herramientas de BD 🟢
- **Filtrar** (por Estado y Área, multi-check; chips de filtros activos + «Limpiar todo»).
- **Ordenar** (Nombre, Estado, Prioridad, Entrega; asc/desc; quitar orden).
- **Agrupar** (por propiedades select/status/person; «sin agrupar»).
- **Propiedades** (solo tabla: mostrar/ocultar y **reordenar** columnas).
- **Automatizar** (abre modal de Automatizaciones, §6.4).
- **Nuevo ▾** (crea fila desde plantilla: En blanco, Reunión semanal, Bug, Idea — con bloques predefinidos).

### 3.3 Vistas 🟢
1. **Tabla (`TableView`):** filas con celdas editables; agrupación opcional con cabeceras de grupo y conteo; «+ Nueva fila». Cada fila tiene «Abrir» → página de la fila.
2. **Tablero / Kanban (`KanbanView`):** columnas por la propiedad de agrupación (estado por defecto, o persona). **Arrastrar tarjetas entre columnas** cambia el valor (dnd-kit). Tarjetas con portada, prioridad, área, fecha relativa y avatar. «+ Añadir» por columna.
3. **Calendario (`CalendarView`):** rejilla mensual (lun–dom) con eventos por día (máx 3 + «+N más»); navegación de mes y «Hoy»; eventos de fila + eventos del calendario.
4. **Cronograma / Timeline (`TimelineView`):** Gantt de 30 días; barra por fila con duración según prioridad; fines de semana y «hoy» marcados; clic abre fila.
5. **Gráfico (`ChartView`):** **barras** o **tarta (donut SVG)**; agrupar por Estado/Prioridad/Área; conteos y porcentajes con leyenda.

> **Nota:** la BD añade también una **vista Lista** en el «Calendario del equipo» (ver §4) — `CalendarAgendaView`.

### 3.4 Página de fila 🟢
Cada fila de BD se abre como una **página editora completa** (mismo `Editor`) con un callout de cabecera (área, estado, prioridad, responsable, entrega) + secciones (resumen/tareas/notas). El contenido se guarda en `rowDocs`.

---

## 4. Calendario del equipo (`TeamCalendar`) 🟢
Página dedicada con dos modos conmutables (pestañas):
- **Mes** → `CalendarView` (rejilla mensual).
- **Lista** → `CalendarAgendaView` *(implementado)*: agenda agrupada por día, con número de día en serif, etiqueta «Hoy» resaltada, días pasados atenuados, etiqueta de estado por evento y filas clicables que abren el proyecto. Vacío → mensaje.
- Toolbar: Filtrar y «+ Evento».

---

## 5. Inicio / Dashboard (`Home`) 🟢
- Saludo con fecha y resumen de tareas pendientes.
- **Acciones rápidas:** Página en blanco, Nueva base de datos, Ver calendario.
- **Visitado recientemente:** grid de tarjetas (portada + emoji + título + meta) → navega.
- **Dos columnas:** «Mis tareas» (toggle de completado, persistente en `homeTasks`) y «Próximamente» (eventos futuros → calendario).

---

## 6. Modales y paneles

### 6.1 Paleta de comandos (`CommandPalette`, ⌘K) 🟢
- Input de búsqueda con foco automático; navegación ↑/↓/Enter/Esc.
- Resultados en grupos: **Acciones** (nueva página, nueva BD, ir a Inicio/Bandeja, abrir Ajustes, cambiar tema), **Páginas** (todas las docs + BD + calendario, por título), **En el contenido** (búsqueda full-text del cuerpo de las páginas) y **Proyectos** (filas de la BD).
- Sin query: muestra accesos por defecto. En producción: **cmdk** con `shouldFilter={false}` (filtrado de títulos/acciones en cliente; el contenido se consulta en servidor).
- **Búsqueda full-text de contenido** *(implementado, ampliación sobre el prototipo)*: a partir de 2 caracteres, una ruta server (`searchContent`) consulta el índice **GIN** sobre `to_tsvector(title + textContent)` de `docs`, ordena por `ts_rank` y devuelve un fragmento con `ts_headline`. El grupo «En el contenido» muestra esas coincidencias (deduplicadas frente a las de título), con la palabra resaltada y el fragmento centrado en ella.
  - **Insensible a acentos y ñ**: config de texto `es_unaccent` (extensión `unaccent` + `simple`) aplicada al índice y a la consulta, así «parrafo» encuentra «párrafo».
  - **Por prefijo (as-you-type)**: la consulta se construye como `to_tsquery('es_unaccent', 'term:*' & …)`, así «encont» encuentra «encontrada» y «señor» encuentra «señorita».

### 6.2 Ajustes (`Settings`) 🟢
> *Estado:* implementado en Fase 1 como **página `/settings`** (rail + panel) con Cuenta (nombre editable, correo, cerrar sesión) y Preferencias (apariencia, fuente predeterminada, ancho completo, tamaño de texto, idioma, abrir al iniciar), persistidas en `preferences`. El resto de secciones (Miembros y roles, Espacios de equipo, API/desarrolladores, Planes, IA, Conexiones, Sin conexión) y la presentación como **modal** quedan para fases posteriores.

Modal con rail de secciones + panel:
- **Cuenta › Mi cuenta:** foto, nombre, correo, verificación en dos pasos, cerrar sesiones, eliminar cuenta.
- **Cuenta › Preferencias:** **Apariencia** (claro/oscuro), **Fuente predeterminada** (Sans/Serif/Mono), **Ancho de página completo**, **Tamaño del texto** (4 niveles, §1.4), **Idioma**, **Abrir al iniciar**.
- **Espacio de trabajo › Miembros y roles:** invitar por correo, lista de miembros con selector de rol (Propietario/Admin/Miembro/Invitado), upsell Enterprise.
- **Espacio de trabajo › Espacios de equipo:** lista con emoji, miembros, visibilidad (Abierto/Cerrado/Privado), nuevo espacio.
- **Avanzado › API y desarrolladores:** clave de API (mostrar/ocultar/copiar/regenerar), ejemplo REST, webhooks, SDK JS, sync de BD externas.
- *(Implementados como paneles también:* Planes y facturación, IA y agentes, Conexiones, Sin conexión — ver código de `settings.jsx`.*)*
- Controles reutilizables: `Toggle` (switch), `Row`, segmentado `seg/seg-btn`. En producción: Radix Switch / Toggle Group.

### 6.3 Plantillas de página (`TemplatesGallery`) 🟡
Galería por categoría (Básico/Trabajo/Personal): Página en blanco, Notas de reunión, PRD, Wiki de equipo, Planificador semanal, Lista de lecturas. Cada una crea la página con bloques predefinidos.

### 6.4 Automatizaciones (`AutomationsModal`) 🟡 *(panel nuevo implementado)*
- Lista de reglas **Cuando → Entonces** con toggle de activación y **botón eliminar**.
- **«Nueva automatización»** abre un **panel inline** con selector **Cuando** (6 disparadores) y **Entonces** (6 acciones), + Crear/Cancelar. Crear añade la regla activa.
- Disparadores: estado cambia a «Hecho», se añade un elemento, entrega en 2 días, cambia prioridad, se asigna responsable, pasa la fecha de entrega.
- Acciones: marcar fecha de fin, autoasignarme, recordatorio a Slack, cambiar estado a «En revisión», notificar al responsable, crear subtarea.
- Producción: persistir reglas por BD; motor de ejecución en backend (jobs/triggers).

### 6.5 Historial de versiones (`VersionHistoryModal`) ⚪
Lista de versiones (autor/fecha/nota) + vista previa + «Restaurar esta versión». Producción: versionado de documentos (snapshots).

### 6.6 Panel de comentarios (`CommentsPanel`) 🟡
- Panel lateral; comentar en **página** o en **bloque** concreto (muestra el texto anclado).
- Hilos con **respuestas** y **resolver/reabrir**; separa abiertos de resueltos.
- Acciones de store: `addComment`, `addReply`, `resolveComment`.

---

## 7. IA (Mikion AI) 🟡
- **Bloque IA** (`AIBlock`) con modos: preguntar, resumir, traducir, mejorar, continuar, lluvia de ideas. Input + «Generar»; chips de modos rápidos; estados de carga; resultado con «Insertar debajo» / «Descartar».
- **Integración real:** en el prototipo usa `window.claude.complete(prompt)` con *fallback* offline. En producción, conectar a tu proveedor (la skill «Claude API in prototypes» describe `window.claude.complete`, pero en la app real será una ruta server de Next que llame al modelo). Los prompts ya están construidos por modo (`buildPrompt`).
- **Mail con IA:** «Resumir con IA» y «Responder con IA» en Mikion Mail.
- **Ajustes › IA y agentes:** activar IA global, notas de reunión automáticas, autocompletado de propiedades, **agentes personalizados** (toggle), Workers (beta).

---

## 8. Apps independientes

### 8.1 Mikion Calendar (`CalendarApp`) ⚪
- Barra propia: Día/Semana/Mes, navegación, «Hoy», «+ Evento».
- Lateral: **mini-mes**, lista de calendarios con toggles de color, tarjeta de **disponibilidad** («crear enlace de reserva»).
- **Vista semana:** rejilla por horas (8–18h), eventos posicionados por hora/duración, **línea de hora actual**.

### 8.2 Mikion Mail (`MailApp`) ⚪
- Carpetas (Recibidos/Destacados/Enviados/Borradores/Archivados) con contadores + categorías de color.
- Lista de correos (avatar, remitente, asunto, preview, hora, no-leído, estrella).
- Lectura: cabecera, **resumen IA**, cuerpo, acciones (Responder, Reenviar, **Responder con IA**).

### 8.3 Bandeja de entrada (`Inbox`) 🟡
Menciones, actualizaciones y recordatorios (lista de notificaciones con avatar/emoji/tiempo).

---

## 9. Sistema de diseño (resumen)
Tokens completos (claro + oscuro), tipografía, radios, sombras y mapeo de componentes a tu stack están en **`README.md`** del handoff. Puntos clave:
- Tipografía: Newsreader (serif, títulos), Hanken Grotesk (sans, UI/cuerpo), JetBrains Mono (código).
- Acento terracota `#c75c37`; superficies «papel» cálidas; tints semánticos por estado/área.
- Tema oscuro vía clase `.dark` en `<html>` (next-themes).
- Iconos = lucide-react (los nombres del prototipo ya coinciden).

---

## 10. Checklist de implementación (orden sugerido)

**Fase 1 — Núcleo 🟢 ✅ COMPLETADA**
1. ✅ Auth (Better Auth) + modelo Drizzle. *Notas de implementación:* el árbol (`tree`/`privateTree`) se modela como la propia tabla `docs` (columnas `section`/`parentId`/`kind`/`orderKey`) — «todo es página». **Favoritos** = booleano `isFavorite` en `docs` (no array aparte). `comments` existe como tabla pero su UI es Fase 2.
2. ✅ Shell: sidebar con árbol recursivo (crear/navegar/expandir/favorito/papelera), topbar (breadcrumbs + acciones + menú ⋯), App Router (rutas **sin** `workspaceId`, modelo Personal), tema (next-themes) y tamaño de texto (var `--text-scale` + script anti-flash). *Pendiente:* reordenar nodos por drag&drop en el sidebar.
3. ✅ Editor BlockNote: bloques, menú «/» y barra de formato (nativos), portada (8 gradientes) / icono (frimousse) / título, autosave. *Pendiente:* localizar el slash menu/labels de BlockNote al español.
4. ✅ Base de datos: esquema (12 tipos) + filas, **Tabla** (TanStack) y **Tablero** (dnd-kit), celdas editables (con crear opciones al vuelo), filtrar/ordenar/agrupar/propiedades (persistidos en la vista), añadir vista, **página de fila**. *Pendiente:* reordenar tarjetas dentro de una columna del tablero.
5. ✅ Inicio (saludo + acciones rápidas + recientes + Mis tareas), Paleta de comandos (cmdk, con búsqueda full-text de contenido §6.1), Ajustes. *Nota:* Ajustes está implementado como **página `/settings`** (rail + panel), no como modal; cubre Cuenta (nombre, correo, cerrar sesión) y Preferencias (tema, fuente, ancho completo, tamaño de texto, idioma, abrir al iniciar) persistidas. El estilo **por página** (fuente/ancho/texto pequeño individual) y el modal quedan como pulido/Fase 2.

> **Pendientes de Fase 1 (pulido):** localización del editor BlockNote al español · gestión de papelera (restaurar / vaciar; ahora `/trash` es placeholder y `moveToTrash` funciona) · drag&drop de reordenar en sidebar y dentro de columnas del tablero.

**Fase 2 — Importante 🟡**
6. Vistas Calendario / Cronograma / Gráfico + Calendario del equipo (Mes + **Lista**).
7. Bloques avanzados (toggle, toc, embeds, tabla simple, BD en línea, columnas, chips, ecuación).
8. Comentarios, Plantillas, **Automatizaciones** (con panel de nueva automatización), IA (bloque + endpoint).

**Fase 3 — Secundario ⚪**
9. Historial de versiones, Mikion Calendar, Mikion Mail, Bandeja, conexiones/API/offline en Ajustes.

> **Recordatorio Next.js 16:** hay breaking changes respecto a versiones conocidas; antes de tocar código de Next, leer las guías en `node_modules/next/dist/docs/` (según el `AGENTS.md` del repo).

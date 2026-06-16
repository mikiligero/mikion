# Plan de pruebas de UI — Mikion

> Checklist vivo para confirmar que la interfaz está OK antes de cada release o tras
> tocar el shell, el editor o la base de datos. Marca `[x]` lo verificado.
> Probar siempre en **`localhost:3001`** (ver nota en §13 sobre `127.0.0.1`), en
> tema claro **y** oscuro, y con la ventana a tamaño normal salvo que se indique.

**¿Dónde quedan los resultados?** En [`testing/ejecuciones/`](ejecuciones/) — un archivo
por ejecución (`YYYY-MM-DD_HHMM_<alcance>.md`) con el resumen, y capturas en
`testing/assets/`. Esos resultados **no se versionan** (están en `.gitignore`); solo se
versionan este plan, [`regresion-media.md`](regresion-media.md), el `README.md` y la
plantilla `ejecuciones/_TEMPLATE.md`. Para empezar una ejecución:

```sh
cp testing/ejecuciones/_TEMPLATE.md "testing/ejecuciones/$(date +%Y-%m-%d_%H%M)_smoke.md"
```

Para el checklist corto de cada redespliegue, usa en su lugar
[`regresion-media.md`](regresion-media.md).

Niveles de prueba (de menos a más profundo):

1. [UI](#1-ui--interfaz) — detalles de interfaz: posición, solapamientos, estados.
2. [Funcional básico](#2-funcional-básico-smoke) — cada flujo hace lo esperado.
3. [Funcional profundo](#3-funcional-profundo) — casos límite y combinaciones.
4. [Regresión](#4-regresión-bugs-ya-corregidos) — bugs ya corregidos.
5. [Estados vacíos y límites](#5-estados-vacíos-y-límites)
6. [Persistencia y recarga](#6-persistencia-y-recarga)
7. [Tema claro/oscuro](#7-tema-cla--oscuro)
8. [Accesibilidad](#8-accesibilidad-a11y)
9. [Responsive](#9-responsive-y-tamaños-de-ventana)
10. [Rendimiento](#10-rendimiento)
11. [Errores y resiliencia](#11-errores-y-resiliencia)
12. [Seguridad y permisos](#12-seguridad-y-permisos)
13. [Compatibilidad de navegador](#13-compatibilidad-de-navegador)
14. [i18n y formato](#14-i18n-y-formato)

---

## 1. UI — interfaz

Detalles finos de interfaz: posición de controles, que **nada se muestre sobre otro
contenido** indebidamente, estados visuales y fidelidad a los tokens de diseño.

### 1.1 Tokens de diseño
- [ ] Tipografía: títulos en **Newsreader** (serif), UI/cuerpo en **Hanken Grotesk**, código en **JetBrains Mono**.
- [ ] Acento terracota `#c75c37` en elementos activos, enlaces y botón primario.
- [ ] Superficies «papel» cálidas (fondo `--paper`, tarjetas `--surface`).
- [ ] Radios coherentes (5/8/12/18px); sombras suaves, sin bordes duros.
- [ ] No aparecen colores/tipografías/radios fuera de los tokens del handoff.

### 1.2 Posición y solapamiento (z-index / overflow)
- [ ] Sidebar y topbar fijos; el contenido scrollea por debajo, no por encima de ellos.
- [ ] La barra de formato del editor (selección de texto) flota **sobre** el contenido sin tapar el bloque editado y sin salirse del viewport.
- [ ] El menú «/» (slash) y el de menciones «@» se abren cerca del cursor y **no** se cortan en los bordes.
- [ ] Popovers, dropdowns, selects y el emoji picker se renderizan por encima de todo y se cierran al hacer clic fuera o `Esc`.
- [ ] La paleta ⌘K aparece centrada, con overlay, y por encima del resto.
- [ ] El panel de comentarios se ancla a la derecha sin tapar el contenido (este se reajusta).
- [ ] Los toasts (sonner) salen en una esquina, apilados, sin tapar controles clave.
- [ ] Tooltips no quedan recortados ni persisten tras mover el ratón.
- [ ] El gutter de bloque (`+ ⠿`) aparece a la izquierda del bloque al hacer hover y **no** invade la sidebar.
- [ ] Diálogos modales (plantillas, automatizaciones, historial, confirmaciones) centrados, con foco atrapado y cierre por overlay/`Esc`.

### 1.3 Truncado y desborde
- [ ] Títulos largos de página en sidebar y breadcrumbs se truncan con `…`, no rompen el layout.
- [ ] Celdas de tabla con texto/tags largos no desbordan la columna.
- [ ] Tarjetas de kanban y de «Visitado recientemente» mantienen tamaño con títulos largos.

### 1.4 Estados visuales
- [ ] Hover en filas de sidebar, ítems de menú, botones y celdas.
- [ ] Estado activo: página actual resaltada en sidebar; vista activa subrayada en BD.
- [ ] Foco de teclado visible (anillo) en inputs, botones y enlaces.
- [ ] Botones deshabilitados (p. ej. «Comentar» sin texto) se ven y no responden.
- [ ] Iconos de acción ocultos (opacity 0) aparecen al hacer hover sobre su fila/sección.

### 1.5 Posición de controles clave
- [ ] Topbar: breadcrumbs a la izquierda; a la derecha buscar, favorito, comentarios, tema, campana, Compartir, «···».
- [ ] Sidebar: switcher de workspace arriba; Buscar/Inicio/Bandeja; Favoritos; Espacio de equipo; Privado; Ajustes y Papelera abajo.
- [ ] BD: pestañas de vista + «+», y a la derecha Filtrar/Ordenar/Agrupar/Propiedades/Automatizaciones.

---

## 2. Funcional básico (smoke)

Que cada flujo principal **funcione**.

### 2.1 Auth y sesión
- [ ] Registro crea cuenta + workspace + preferencias y entra.
- [ ] Login con credenciales válidas entra; con inválidas muestra error (toast).
- [ ] La sesión persiste al recargar; cerrar sesión vuelve a `/login`.

### 2.2 Shell y navegación
- [ ] Crear página en Espacio de equipo y en Privado.
- [ ] Renombrar (título) y cambiar emoji de página.
- [ ] Expandir/colapsar nodos del árbol; navegar a una página por clic.
- [ ] Breadcrumbs reflejan la jerarquía y navegan al hacer clic.
- [ ] Marcar/desmarcar favorito; aparece/desaparece en «Favoritos».
- [ ] Cambiar tema claro/oscuro desde topbar.

### 2.3 Editor
- [ ] Escribir texto; autosave (sin pulsar guardar).
- [ ] Menú «/»: insertar encabezado, lista, to-do, cita, callout, código, divisor, tabla.
- [ ] Barra de formato: negrita, cursiva, subrayado, tachado, color, enlace.
- [ ] Mención «@usuario».
- [ ] Pegar un enlace de YouTube/Spotify/Maps → se incrusta como embed.
- [ ] Añadir portada (predefinida) y emoji de icono.

### 2.4 Base de datos
- [ ] Crear BD; añadir fila; editar celdas de cada tipo (texto, número, select, status, fecha, checkbox, url…).
- [ ] Cambiar entre las 5 vistas: Tabla, **Tablero**, Calendario, Cronograma, Gráfico.
- [ ] Abrir la página de una fila (contenido propio + propiedades).
- [ ] Filtrar, ordenar y agrupar.

### 2.5 Inicio, paleta y ajustes
- [ ] Inicio: saludo, acciones rápidas, «Visitado recientemente», «Mis tareas», «Próximamente».
- [ ] ⌘K abre la paleta, filtra páginas y navega al elegir.
- [ ] Ajustes: cambiar tema, tamaño de texto, fuente, ancho completo, idioma, vista de inicio.

### 2.6 Comentarios, plantillas, papelera, notificaciones
- [ ] Comentar a nivel de página; responder; resolver; eliminar.
- [ ] Comentar a nivel de **bloque** (botón «Comentar» en barra de formato) → panel pre-anclado con la cita.
- [ ] Insertar una plantilla.
- [ ] Mover a papelera; restaurar; borrar definitivo; vaciar papelera.
- [ ] La bandeja de entrada muestra notificaciones (mención/comentario) y se marcan como leídas.

---

## 3. Funcional profundo

Casos límite, combinaciones y comportamientos no triviales.

### 3.1 Árbol y orden
- [ ] **Drag&drop sidebar**: reordenar hermanos; mover a otro padre; mover a raíz (zona de sección); no permite soltarse dentro de un descendiente (sin ciclos).
- [ ] El orden se mantiene tras recargar (orden fraccional, sin reindexar todo).
- [ ] Duplicar página copia subárbol completo (subpáginas + BD con vistas y filas).
- [ ] Mover a papelera arrastra también a los descendientes; restaurar respeta padre (si el padre sigue borrado, va a raíz).

### 3.2 Editor avanzado
- [ ] Columnas: crear layout multi-columna; el contenido se reparte sin descuadre; redimensionar.
- [ ] Callout, índice (TOC), ecuación (KaTeX), embed y bloque de BD incrustada.
- [ ] Reordenar bloques con drag (gutter).
- [ ] Menciones múltiples: notifican solo a las **nuevas** al guardar (no reenvían las previas).
- [ ] Historial de versiones: se crea snapshot (throttle 5 min), se podan a 15, restaurar respalda la versión actual antes de sustituir. Funciona en páginas **y** en filas de BD.

### 3.3 Base de datos a fondo
- [ ] 12 tipos de propiedad: crear/editar cada uno; fórmula y rollup calculan; relación enlaza filas.
- [ ] **Kanban**: arrastrar tarjeta entre columnas cambia el valor de agrupación; reordenar dentro de la columna mantiene posición exacta (afterId/beforeId); persiste tras recargar.
- [ ] Filtros compuestos (varios), combinados con orden y agrupación.
- [ ] Calendario: eventos en su fecha; navegación mes anterior/siguiente/«Hoy»; hoy resaltado.
- [ ] Cronograma: barras por rango de fechas; eje y columna de hoy correctos.
- [ ] Gráfico: barras y tarta; cambio de propiedad de agrupación; porcentajes y totales correctos.
- [ ] Añadir/eliminar/duplicar vistas; cada vista recuerda su config.
- [ ] Automatizaciones: configurar regla en el diálogo y verla persistida.

### 3.4 Búsqueda
- [ ] Búsqueda por **título sin acentos** (p. ej. «proximamente» encuentra «Próximamente»; «n» encuentra «ñ»).
- [ ] Búsqueda en **contenido** insensible a acentos/ñ (config `es_unaccent`).
- [ ] Resultados enlazan a la página/fila correcta.

### 3.5 Comentarios anclados
- [ ] El comentario de bloque muestra la **cita** del texto anclado.
- [ ] Clic en la cita hace scroll al bloque y lo resalta (flash).
- [ ] Si se borra el bloque anclado, el comentario sigue accesible (no rompe la UI).

---

## 4. Regresión (bugs ya corregidos)

Verificar que **no reaparecen** fallos ya resueltos.

- [ ] **Hidratación dnd-kit**: sin warning de hidratación en consola con sidebar + kanban montados (cada `DndContext` con `id` estable).
- [ ] **Login no va por GET**: el formulario hace POST por JS; el botón está deshabilitado hasta hidratar; nunca aparece `?password=` en la URL. Igual en registro.
- [ ] **Páginas de fila (404)**: abrir la página de una fila funciona (no usar `db.query.rows` por la columna reservada `values`).
- [ ] **Columnas**: layout multi-columna sin descuadre ni solapamiento.
- [ ] **Gutter de bloque**: el control `+ ⠿` no invade la sidebar.
- [ ] **Paleta ⌘K**: sin warning de «two children with the same key» ni contexto de Command faltante.
- [ ] **rm -rf .next con dev activo**: tras limpiar `.next`, reiniciar dev (no quedan 500/ENOENT).

---

## 5. Estados vacíos y límites

- [ ] Workspace recién creado: árbol vacío muestra hints, no se rompe.
- [ ] Sección sin páginas → «Vacío»; Favoritos vacío; sin comentarios → «Sin comentarios todavía».
- [ ] BD sin filas; vista de gráfico/calendario/cronograma sin datos.
- [ ] Tablero sin propiedad de agrupación → mensaje guía (no error).
- [ ] «Próximamente» sin eventos futuros → mensaje guía.
- [ ] Títulos muy largos, muchos tags, emojis y caracteres especiales (ñ, tildes, RTL, emojis compuestos).
- [ ] Papelera vacía.

---

## 6. Persistencia y recarga

- [ ] Autosave del editor: editar, esperar, recargar → cambios presentes.
- [ ] Cambios de BD (celdas, orden, vistas) persisten tras recargar.
- [ ] Preferencias (tema, tamaño de texto, idioma) persisten por usuario.
- [ ] **Sin parpadeo (FOUC)**: tema y tamaño de texto se aplican antes del primer paint (no flash de claro→oscuro ni de tamaño).
- [ ] Espejo local (localStorage) coherente con el servidor; no «revierte» valores al recargar.

---

## 7. Tema claro / oscuro

- [ ] Toda la UI conmuta (sidebar, topbar, editor, BD, modales, toasts).
- [ ] Tints semánticos (estado/prioridad/área) legibles y con contraste en ambos temas.
- [ ] Gráficos (donut/barras) adaptan colores.
- [ ] Portadas e imágenes no quedan «quemadas» en oscuro.
- [ ] El acento terracota se mantiene reconocible en ambos.

---

## 8. Accesibilidad (a11y)

- [ ] Navegación completa por **teclado**: Tab/Shift+Tab por controles, `Enter`/`Space` activan, `Esc` cierra overlays.
- [ ] Foco visible en todos los interactivos; orden de tabulación lógico.
- [ ] Foco atrapado dentro de modales; al cerrarse vuelve al disparador.
- [ ] `aria-label`/roles en botones de solo icono (favorito, tema, más, cerrar…).
- [ ] Contraste de texto suficiente (AA) en ambos temas.
- [ ] La selección de iconos/emoji y la paleta son operables por teclado.
- [ ] Sin dependencia exclusiva del color para transmitir estado (status también con texto).

---

## 9. Responsive y tamaños de ventana

- [ ] Ventana estrecha: el contenido se reajusta; nada se solapa ni se corta.
- [ ] Ancho completo vs. ancho fijo de página (preferencia) se respeta.
- [ ] Tablas y kanban con scroll horizontal cuando no caben (sin romper el layout).
- [ ] Zoom del navegador 80–150% sin descuadres graves.
- [ ] Panel de comentarios + contenido conviven en anchos medios.

---

## 10. Rendimiento

- [ ] Página con muchos bloques (cientos): escritura fluida, sin lag perceptible.
- [ ] BD con muchas filas (cientos): tabla y kanban responsivos; scroll suave.
- [ ] Drag&drop fluido (sidebar/kanban/bloques) sin saltos.
- [ ] Cambiar de vista de BD no recarga toda la página.
- [ ] Autosave no dispara en cada tecla (debounce); sin tirones al guardar.

---

## 11. Errores y resiliencia

- [ ] Acción de servidor que falla → toast de error claro, la UI no se queda «colgada».
- [ ] Pérdida de red al guardar: se informa; al volver, reintenta o conserva el cambio local.
- [ ] Validación de formularios (Zod): mensajes claros en login/registro/ajustes.
- [ ] Navegar a un `docId` inexistente o sin permiso → 404/redirección, sin pantalla rota.
- [ ] Subir portada con archivo inválido → error controlado.

---

## 12. Seguridad y permisos

- [ ] Un usuario **no** puede acceder a páginas/BD/filas/comentarios de otro (probar IDs ajenos → 404/denegado).
- [ ] Toda server action exige sesión y comprueba pertenencia al workspace.
- [ ] No se filtran credenciales en la URL (ver §4, login).
- [ ] `.env` real no se sube (en `.gitignore`); `docker-compose.prod.yml` exige `POSTGRES_PASSWORD` y `BETTER_AUTH_SECRET`.
- [ ] Integración Telegram: el token va por servidor (env), nunca al cliente.

---

## 13. Compatibilidad de navegador

- [ ] Chrome, Safari y Firefox: shell, editor y BD funcionan igual.
- [ ] **`localhost` vs `127.0.0.1`**: confirmar que la app hidrata en el host esperado (con `127.0.0.1` se observó fallo de hidratación → el form caía a GET). Revisar `BETTER_AUTH_URL`/base URL si se quiere soportar ambos.
- [ ] Sin extensiones que rompan la hidratación (probar también en incógnito).
- [ ] Atajos de teclado (⌘K) funcionan en cada navegador/OS.

---

## 14. i18n y formato

- [ ] Toda la UI en **español** (copys del prototipo), sin textos en inglés colados.
- [ ] Locales de BlockNote (`es`) y multi-columna en español.
- [ ] Fechas formateadas en español (días, meses, «hace X min»).
- [ ] Buscador de emojis usable en español.
- [ ] Pluralización correcta («1 tarea pendiente» vs «N tareas pendientes»).

---

## Plantilla de reporte de incidencia

```
Título:
Nivel (UI / Funcional / …):
Área (sidebar / editor / BD / …):
Tema (claro / oscuro / ambos):
Navegador + tamaño de ventana:
Pasos para reproducir:
Resultado esperado:
Resultado actual:
Captura/console/network:
```

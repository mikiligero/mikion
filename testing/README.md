# testing/ — juegos de pruebas y ejecuciones

## Juegos de pruebas (versionados)

- [`qa-completo.md`](qa-completo.md) — plan de QA exhaustivo (136 ítems, 14 secciones).
  Para auditorías a fondo, no para cada deploy.
- [`regresion-media.md`](regresion-media.md) — checklist de regresión media
  (48 ítems, ~20-25 min). **Este es el que se ejecuta antes de cada redespliegue.**

## Ejecuciones (`ejecuciones/`, no versionadas)

Aquí se guardan los **resultados** de ejecutar alguno de los juegos de pruebas
de arriba. Son artefactos locales y no se versionan (ver `.gitignore`). Solo
se versiona la plantilla `ejecuciones/_TEMPLATE.md`, para que el formato sea
reproducible en cualquier clon.

### Convención

- **Un archivo por ejecución**, en `ejecuciones/`:
  `YYYY-MM-DD_HHMM_<alcance>.md`
  - Ejemplos: `2026-06-16_0900_regresion.md`, `2026-06-15_1730_smoke.md`, `2026-06-16_full.md`.
  - `<alcance>`: `regresion` (el checklist medio), `full` (qa-completo), o el área probada (`editor`, `db-vistas`, `sidebar-dnd`…).
- **Capturas y adjuntos** en `testing/assets/<mismo-nombre-sin-extensión>/`
  (p. ej. `testing/assets/2026-06-16_0900_regresion/01-login.png`). También ignorados.
- Para empezar una ejecución, **copia `ejecuciones/_TEMPLATE.md`** al nombre del run y ve rellenándolo.

```sh
cp testing/ejecuciones/_TEMPLATE.md "testing/ejecuciones/$(date +%Y-%m-%d_%H%M)_regresion.md"
```

### Qué anotar

- Estado de cada sección/ítem del plan: ✅ pasa · ❌ falla · ⚠️ con reparo · ⏭️ no probado.
- Toda incidencia, con la **plantilla de reporte** del final de la plantilla.
- Entorno (navegador, tamaño de ventana, tema, commit) para poder reproducir.

# Ejecución de pruebas — <alcance>

> Copia de `_TEMPLATE.md`. Renómbralo a `YYYY-MM-DD_HHMM_<alcance>.md`.
> Plan de referencia: [`../qa-completo.md`](../qa-completo.md) (completo) o
> [`../regresion-media.md`](../regresion-media.md) (regresión de cada deploy).

## Metadatos

| Campo | Valor |
|---|---|
| Fecha / hora | YYYY-MM-DD HH:MM |
| Ejecutor | (persona o agente) |
| Alcance | smoke / full / <área> |
| Commit (git rev-parse --short HEAD) | `xxxxxxx` |
| Rama | main |
| Entorno | localhost:3001 · Chrome NN · 1512×794 |
| Tema(s) | claro / oscuro / ambos |
| Usuario de prueba | test@mikion.dev |

## Resumen

| Resultado | Nº |
|---|---|
| ✅ Pasa | |
| ❌ Falla | |
| ⚠️ Con reparo | |
| ⏭️ No probado | |
| **Total ítems** | |

**Veredicto:** 🟢 OK para deploy / 🟡 OK con reparos menores / 🔴 Bloqueado

## Resultado por sección

> Marca cada nivel/sección del plan. Detalla solo lo que no sea ✅.

| § | Sección | Estado | Notas |
|---|---|---|---|
| 1 | UI — interfaz | | |
| 2 | Funcional básico | | |
| 3 | Funcional profundo | | |
| 4 | Regresión | | |
| 5 | Estados vacíos y límites | | |
| 6 | Persistencia y recarga | | |
| 7 | Tema claro/oscuro | | |
| 8 | Accesibilidad | | |
| 9 | Responsive | | |
| 10 | Rendimiento | | |
| 11 | Errores y resiliencia | | |
| 12 | Seguridad y permisos | | |
| 13 | Compatibilidad de navegador | | |
| 14 | i18n y formato | | |

## Incidencias

> Una entrada por fallo (❌/⚠️). Capturas en `assets/<run>/`.

### #1 — <título>
- **Nivel / Área:** (UI / Funcional / …) · (sidebar / editor / BD / …)
- **Tema / Navegador / Ventana:**
- **Pasos para reproducir:**
- **Esperado:**
- **Actual:**
- **Evidencia:** `assets/<run>/xx.png` · consola · network
- **Severidad:** P0 (bloqueante) / P1 (importante) / P2 (menor)

## Seguimiento

- [ ] Incidencias P0/P1 abiertas como issues o tareas.
- [ ] Re-test tras corregir.

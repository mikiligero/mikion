# Regresión media — antes de cada redespliegue

> ~20-25 min. Punto medio entre el smoke test (5 min) y el QA completo
> ([`qa-completo.md`](qa-completo.md), 136 ítems). Cubre los caminos críticos +
> todo lo que ya rompió alguna vez (marcado 🔁) + seguridad básica (no negociable).
>
> Si algo falla aquí, no se despliega.

---

## 0. Arranque limpio
- [ ] `npm run build` sin errores
- [ ] Consola del navegador limpia al cargar Inicio (sin warnings de hidratación) 🔁
- [ ] Migraciones de Drizzle aplicadas sin error

---

## 1. Auth y sesión
- [ ] Login válido entra; sesión persiste al recargar
- [ ] Login inválido → toast en español, no en inglés 🔁
- [ ] Logout → redirige a `/login`
- [ ] Login es por POST, no GET (sin `?password=` en la URL) 🔁
- [ ] Registro crea cuenta + workspace y entra

## 2. Shell y navegación
- [ ] Sidebar y topbar fijos; contenido scrollea por debajo
- [ ] Crear página, renombrar, cambiar emoji
- [ ] Breadcrumbs navegan al hacer clic
- [ ] Tema claro/oscuro conmuta toda la UI, terracota reconocible en ambos
- [ ] Drawer móvil (<768px): botón hamburguesa abre/cierra la sidebar, overlay cierra al tocar fuera 🔁

## 3. Editor
- [ ] Escribir texto; autosave (1 sola petición tras dejar de teclear, no una por tecla)
- [ ] Menú "/": opciones en español (Encabezado, Cita, Callout…) 🔁
- [ ] Columnas multi-columna sin descuadre (flex-row, no apiladas) 🔁
- [ ] Pegar enlace YouTube → embed
- [ ] Recargar página → cambios siguen ahí

## 4. Base de datos
- [ ] Crear fila; editar celdas (texto, select, fecha, checkbox)
- [ ] Cambiar entre vistas (Tabla/Tablero/Gráfico) sin recargar la página
- [ ] Abrir página de una fila (no 404) 🔁
- [ ] Filtrar/ordenar funciona
- [ ] Kanban: arrastrar tarjeta entre columnas persiste tras recargar

## 5. Sidebar / árbol
- [ ] DnD: reordenar páginas hermanas; orden persiste tras recargar
- [ ] Papelera: mover a papelera, restaurar
- [ ] Paleta ⌘K: abre, filtra, navega; sin warning de "two children with same key" 🔁

## 6. Comentarios y notificaciones
- [ ] Comentar en página; responder; resolver
- [ ] Bandeja de notificaciones: marcar como leída

## 7. Estados vacíos (rápido)
- [ ] Papelera vacía → mensaje, no pantalla rota
- [ ] Próximamente sin eventos → mensaje guía

## 8. Errores y resiliencia
- [ ] docId inexistente → 404 en español con shell intacto, no pantalla rota 🔁
- [ ] Acción de servidor con datos inválidos → toast de error, UI no se cuelga
- [ ] Validación Zod en login/registro: mensajes en español, claros

## 9. Responsive (rápido)
- [ ] Ventana estrecha (375-768px): nada se solapa ni se corta
- [ ] Tabla de BD con scroll horizontal cuando no caben las columnas
- [ ] Zoom 80% y 150%: sin descuadres graves

## 10. Accesibilidad (rápido)
- [ ] Tab navega los controles principales; foco visible (anillo terracota) 🔁
- [ ] Botones solo-icono tienen `aria-label`
- [ ] Esc cierra modales/popovers

## 11. Seguridad (no negociable)
- [ ] `.env` no está en el repo (`git status` limpio, `.gitignore` cubre `.env*`)
- [ ] `docker-compose.prod.yml` exige `POSTGRES_PASSWORD` y `BETTER_AUTH_SECRET` (sin defaults)
- [ ] Una server action sin sesión → rechazada, no expone datos
- [ ] Acceder a un docId de otro workspace → 404/denegado, no fuga de datos

## 12. i18n
- [ ] Toda la UI visible en español (sin textos en inglés colados) 🔁
- [ ] Fechas en formato español (ej. "16 de junio")

---

## Tras pasar todo

| Resultado | Acción |
|---|---|
| Todo ✅ | Desplegar |
| Algún 🔁 falla | **No desplegar.** Es una regresión de un bug ya corregido — prioridad alta |
| Algo nuevo falla (sin 🔁) | Evaluar gravedad; si es menor, anotar y desplegar con incidencia conocida |

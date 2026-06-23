# Notificaciones — Mikion

Documentación del sistema de notificaciones: canales, tipos, los resúmenes de
tareas («digest»), configuración (Telegram + cron) y arquitectura.

> Fuente de verdad: el código. Este documento describe lo implementado a fecha
> de la última actualización; si cambia el código, actualiza esto.

---

## 1. Visión general

Cada notificación se entrega por **dos canales**:

- **Bandeja de entrada** (`/inbox`) — siempre. Suma al badge de no leídas de la
  barra lateral.
- **Telegram** — solo si el usuario tiene su `chat_id` configurado en Ajustes.

Ambos canales se disparan desde un único punto: `createNotification()`
([src/lib/actions/helpers.ts](src/lib/actions/helpers.ts)). Inserta la fila en la
tabla `notifications` (bandeja) y, si el destinatario tiene `chat_id`, envía el
mensaje por Telegram.

```
evento  ──►  createNotification({ userId, type, title, body })
                 │
                 ├─► INSERT en notifications      (bandeja)
                 └─► sendTelegramMessage(chatId)   (Telegram, si hay chat_id)
```

---

## 2. Tipos de notificación y cuándo saltan

| Tipo | Cuándo | A quién | Disparador |
|---|---|---|---|
| `mention` | Al guardar una página aparece un `@usuario` nuevo en el cuerpo | Al mencionado | [src/lib/actions/docs.ts](src/lib/actions/docs.ts) |
| `comment` | Nuevo comentario en un doc | **Al dueño del workspace** del doc | [src/lib/actions/comments.ts](src/lib/actions/comments.ts) |
| `reply` | Respuesta en un hilo | **Al dueño del workspace** | [src/lib/actions/comments.ts](src/lib/actions/comments.ts) |
| `share` | Se comparte una página/BD con alguien | Al destinatario | [src/lib/actions/shares.ts](src/lib/actions/shares.ts) |
| `reminder` | Resúmenes de tareas (mañana/tarde) | A cada usuario (dueño de workspace) | cron → `runDigest` |

**Instantáneas vs programadas:**

- `mention`, `comment`, `reply`, `share` saltan **en el momento** del evento. No
  necesitan cron.
- `reminder` (los resúmenes) son **programados**: los dispara el cron del host
  (ver §5).

---

## 3. Resúmenes de tareas (digest)

Dos resúmenes diarios, en zona horaria **Europe/Madrid**:

- **Mañana — 08:00** → «Tu día»: tareas con fecha **HOY**.
- **Tarde — 18:00** → «Lo que viene»: **MAÑANA** + resto de la semana (hasta el
  domingo; si hoy es domingo, hasta el domingo siguiente).

### ¿Qué cuenta como «tarea que caduca»?

Una **fila de una base de datos** tal que:

1. La BD tiene una **propiedad de fecha** (se usa la **primera** de tipo `date`).
2. El valor de esa fecha (el **fin** del rango si es rango, si no la fecha) cae
   dentro de la ventana.
3. Su **estado no está en el grupo «Completado»** (`option.group === "done"`).
   Si la fila no tiene propiedad de estado, se incluye igualmente.

Si un día no hay ninguna tarea, **no se envía** nada (no se molesta con «hoy no
tienes nada»).

### Formato del aviso

- **Título:** `☀️ Tu día: N tareas para hoy` / `🌙 Lo que viene: N tareas`.
- **Cuerpo:** agrupado por día (`Hoy` / `Mañana` / `mié 25 jun`), una tarea por
  línea con su BD y estado:
  ```
  Hoy
  • Llamar al proveedor (Tareas · En curso)
  • Pagar la factura de la luz (Tareas · Por hacer)
  ```

En la **bandeja**, los `reminder` conservan los saltos de línea y se muestran
completos (el resto de tipos se recortan a 2 líneas). En **Telegram** se ve igual
(respeta los saltos de línea).

---

## 4. Configuración de Telegram (un único bot)

Modelo: **un solo bot** para toda la app (un token) + **un `chat_id` por
usuario**. El mismo bot envía a cada usuario su contenido a su chat. No hace
falta un token por usuario.

### 4.1. Crear el bot y obtener el token

1. En Telegram, abre **@BotFather** (el oficial, con tick azul).
2. Envía `/newbot`.
3. Dale un **nombre** (visible, p. ej. «Mikion») y un **username** que acabe en
   `bot` (p. ej. `mikion_avisos_bot`).
4. BotFather responde con el **token** (`123456789:AAH...`). Es el
   `TELEGRAM_BOT_TOKEN`. Trátalo como una contraseña; si se filtra, `/revoke` en
   BotFather genera uno nuevo.

### 4.2. Ponerlo en la app (LXC)

En el `.env` de producción:

```
TELEGRAM_BOT_TOKEN=123456789:AAH...
```

Redesplegar (`update.sh`).

### 4.3. Cada usuario conecta su chat_id

1. Abre el bot (`t.me/tu_username_bot`) y pulsa **Iniciar/Start** (o escríbele
   algo). **Obligatorio**: Telegram no permite que el bot escriba a quien no le
   ha hablado antes.
2. Consigue tu `chat_id` (p. ej. escribiendo a **@userinfobot**).
3. En Mikion → **Ajustes › Preferencias › Notificaciones por Telegram**, pega el
   número y usa el botón de **prueba**.

Guardado en `preferences.telegramChatId`
([src/lib/actions/preferences.ts](src/lib/actions/preferences.ts)).

---

## 5. Programación de los resúmenes (cron)

El crontab es el **temporizador** de los resúmenes. **No es algo «de Telegram»**:
dispara `runDigest`, que crea la notificación de **bandeja Y** envía Telegram.
Sin crontab, los resúmenes no llegan a **ningún** canal (las menciones y
comentarios sí, porque son instantáneos).

### 5.1. Endpoint

`GET /api/cron/digest?slot=morning|evening&secret=<CRON_SECRET>`
([src/app/api/cron/digest/route.ts](src/app/api/cron/digest/route.ts))

- Protegido con `CRON_SECRET` (por query `?secret=` o cabecera
  `Authorization: Bearer ...`). Sin secreto configurado → 401.
- `runDigest` recorre **todos los usuarios** (dueños de workspace) y envía a cada
  uno **su** resumen. Un solo cron cubre a todos.

### 5.2. Variable de entorno

En el `.env`:

```
CRON_SECRET=<aleatorio>     # p. ej.  openssl rand -hex 24
```

(Ya pasado al contenedor en `docker-compose.prod.yml`.)

### 5.3. Crontab del host (LXC)

`crontab -e` y añadir (cron interno del contenedor escucha en el puerto 3000):

```cron
CRON_TZ=Europe/Madrid
0 8  * * * curl -fsS "http://localhost:3000/api/cron/digest?slot=morning&secret=TU_CRON_SECRET" >/dev/null
0 18 * * * curl -fsS "http://localhost:3000/api/cron/digest?slot=evening&secret=TU_CRON_SECRET" >/dev/null
```

### 5.4. Probar a mano

```bash
curl "http://localhost:3000/api/cron/digest?slot=morning&secret=TU_CRON_SECRET"
# → {"ok":true,"slot":"morning","usersNotified":N}
```

Luego mira la bandeja (`/inbox`) y/o Telegram.

---

## 6. Variables de entorno (resumen)

| Variable | Para qué | Si falta |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | El bot (canal Telegram) | Todo llega a **bandeja**, no a Telegram |
| `CRON_SECRET` | Proteger el endpoint del digest | El cron da 401: no se envían resúmenes |
| (chat_id por usuario) | Destinatario en Telegram (en Ajustes) | Ese usuario no recibe Telegram |

---

## 7. Arquitectura / archivos

| Archivo | Rol |
|---|---|
| [src/db/schema.ts](src/db/schema.ts) | Tabla `notifications` y `preferences.telegramChatId` |
| [src/lib/actions/helpers.ts](src/lib/actions/helpers.ts) | `createNotification` (bandeja + Telegram) |
| [src/lib/telegram.ts](src/lib/telegram.ts) | `sendTelegramMessage`, `telegramConfigured` |
| [src/lib/actions/notifications.ts](src/lib/actions/notifications.ts) | `getNotifications`, `markRead`, `markAllRead` |
| [src/lib/actions/preferences.ts](src/lib/actions/preferences.ts) | Guardar chat_id + `testTelegram` |
| [src/components/settings/settings-form.tsx](src/components/settings/settings-form.tsx) | UI de Telegram en Ajustes |
| [src/components/inbox/inbox-list.tsx](src/components/inbox/inbox-list.tsx) | UI de la bandeja |
| [src/lib/digest.ts](src/lib/digest.ts) | Lógica **pura** del digest (ventanas, agrupación, formato) + tests |
| [src/lib/digest-runner.ts](src/lib/digest-runner.ts) | Reúne tareas del workspace y entrega (`computeUserDigest`, `runDigest`) |
| [src/app/api/cron/digest/route.ts](src/app/api/cron/digest/route.ts) | Endpoint del cron |
| [src/lib/__tests__/digest.test.ts](src/lib/__tests__/digest.test.ts) | Tests de la lógica pura del digest |

---

## 8. Limitaciones conocidas / mejoras futuras

- **Comentarios/respuestas** solo notifican al **dueño del workspace**, no a
  todos los participantes del hilo ni al autor del comentario original.
- **Menciones**: solo se detectan en el **cuerpo** de la página, no dentro de los
  comentarios.
- **Sin tiempo real**: la bandeja y el badge se actualizan al recargar/navegar
  (no hay websockets ni polling ni toast al llegar).
- **Digest**: usa la **primera** propiedad de fecha de cada BD como vencimiento;
  si una BD tiene varias fechas (inicio/fin) podría no ser la deseada. La
  notificación del resumen **no enlaza** a una página concreta.
- **Recordatorios por fecha** individuales (el campo `reminder` de las
  propiedades de fecha) están marcados «solo UI, sin disparo»: no generan aviso.
- **Sin email** ni push de navegador.
- **Sin preferencias** de notificación (silenciar tipos, etc.).

# Notas — tu Notion personal auto-alojado

Clon de Notion para uso personal: páginas anidadas con editor de bloques,
bases de datos con vistas de tabla y Kanban, búsqueda global, favoritos,
papelera, subida de imágenes, modo oscuro y multi-usuario.

## Stack

- **Next.js 16** (App Router, Server Actions) + TypeScript + React 19
- **BlockNote** — editor de bloques estilo Notion (menú `/`, atajos markdown, drag & drop)
- **PostgreSQL 16** + **Drizzle ORM**
- **Better Auth** — registro/login con email y contraseña
- Tailwind CSS v4 + shadcn/ui · TanStack Table · dnd-kit

## Desarrollo

```bash
cp .env.example .env          # rellena BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up -d          # PostgreSQL en localhost:5433
npm install
npx drizzle-kit migrate       # aplica las migraciones
npm run dev                   # http://localhost:3001
```

Crea una cuenta en `/register`; cada usuario recibe su workspace automáticamente.

## Producción (LXC de Proxmox)

Requisitos en el LXC: Docker + Docker Compose.

```bash
cp .env.example .env
# Edita .env:
#   BETTER_AUTH_SECRET=<openssl rand -base64 32>
#   BETTER_AUTH_URL=http://<ip-o-dominio>:3000
#   POSTGRES_PASSWORD=<contraseña fuerte>
docker compose -f docker-compose.prod.yml up -d --build
```

- Las migraciones se aplican solas al arrancar el contenedor (`RUN_MIGRATIONS=1`).
- Los datos viven en los volúmenes `notion-db-data` (PostgreSQL) y
  `notion-uploads` (archivos subidos).

### Copias de seguridad

```bash
docker compose -f docker-compose.prod.yml exec db pg_dump -U notion notion > backup.sql
docker run --rm -v notion_notion-uploads:/data -v "$PWD":/backup alpine tar czf /backup/uploads.tar.gz -C /data .
```

## Estructura

```
src/
├── app/                # rutas: (auth)/login|register, (app)/w/[workspaceId]/...
├── components/         # sidebar, editor, database (tabla/kanban), page, search
├── db/                 # schema.ts (Drizzle) + migraciones
└── lib/                # auth, server actions, tipos, utilidades
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL |
| `BETTER_AUTH_SECRET` | Secreto de sesiones (obligatorio) |
| `BETTER_AUTH_URL` | URL pública de la app |
| `UPLOADS_DIR` | Carpeta de archivos subidos (por defecto `./uploads`) |
| `RUN_MIGRATIONS` | `1` para migrar al arrancar (ya activo en Docker) |

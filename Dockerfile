# --- Dependencias ---
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Build ---
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Runtime ---
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV RUN_MIGRATIONS=1
ENV MIGRATIONS_DIR=/app/migrations
ENV UPLOADS_DIR=/app/uploads

RUN addgroup -S app && adduser -S app -G app \
  && mkdir -p /app/uploads && chown app:app /app/uploads

COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/src/db/migrations ./migrations

USER app
EXPOSE 3000
CMD ["node", "server.js"]

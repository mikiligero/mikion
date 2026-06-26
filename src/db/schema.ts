import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  real,
  index,
  uniqueIndex,
  pgEnum,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type {
  Automation,
  Block,
  DatabaseSchema,
  DbTemplate,
  PropertyValues,
  ViewConfig,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Tablas de Better Auth
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Enums del dominio
// ---------------------------------------------------------------------------

export const docSection = pgEnum("doc_section", ["team", "private"]);
export const docKind = pgEnum("doc_kind", ["page", "database", "calendar"]);
export const viewType = pgEnum("view_type", [
  "table",
  "board",
  "calendar",
  "timeline",
  "chart",
]);
export const themePref = pgEnum("theme_pref", ["light", "dark"]);
export const fontPref = pgEnum("font_pref", ["default", "serif", "mono"]);
// Rol de un usuario invitado sobre un doc compartido (y su subárbol).
export const shareRole = pgEnum("share_role", ["viewer", "editor"]);

// ---------------------------------------------------------------------------
// Workspace (uno por usuario en el modelo Personal; con ownerId para facilitar
// una futura migración a multi-tenant).
// ---------------------------------------------------------------------------

export const workspaces = pgTable("workspaces", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Preferencias por usuario (espejo en localStorage para aplicar sin parpadeo).
export const preferences = pgTable("preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: themePref("theme").notNull().default("light"),
  textScale: real("text_scale").notNull().default(1),
  defaultFont: fontPref("default_font").notNull().default("default"),
  fullWidthDefault: boolean("full_width_default").notNull().default(false),
  language: text("language").notNull().default("es"),
  startupView: text("startup_view").notNull().default("home"),
  telegramChatId: text("telegram_chat_id"),
  // Resúmenes de tareas (digest). Hora "HH:MM" (pasos de 30 min) y días de la
  // semana (lun=0 … dom=6) en que aplica cada franja. `sentDate` ("YYYY-MM-DD")
  // marca el último día enviado para no duplicar dentro de un mismo día.
  digestMorningEnabled: boolean("digest_morning_enabled").notNull().default(true),
  digestMorningTime: text("digest_morning_time").notNull().default("08:00"),
  digestMorningDays: jsonb("digest_morning_days")
    .$type<number[]>()
    .notNull()
    .default([0, 1, 2, 3, 4, 5, 6]),
  digestMorningSentDate: text("digest_morning_sent_date"),
  digestEveningEnabled: boolean("digest_evening_enabled").notNull().default(true),
  digestEveningTime: text("digest_evening_time").notNull().default("18:00"),
  digestEveningDays: jsonb("digest_evening_days")
    .$type<number[]>()
    .notNull()
    .default([0, 1, 2, 3, 4, 5, 6]),
  digestEveningSentDate: text("digest_evening_sent_date"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// docs: nodo del árbol + contenido de página a la vez ("todo es página").
// Las filas de base de datos NO van aquí (ver tabla `rows`).
// ---------------------------------------------------------------------------

export const docs = pgTable(
  "docs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    section: docSection("section").notNull(),
    parentId: text("parent_id").references((): AnyPgColumn => docs.id, {
      onDelete: "cascade",
    }),
    kind: docKind("kind").notNull().default("page"),
    emoji: text("emoji"),
    title: text("title").notNull().default(""),
    cover: text("cover"),
    coverPosition: integer("cover_position").notNull().default(50),
    coverZoom: integer("cover_zoom").notNull().default(100),
    blocks: jsonb("blocks").$type<Block[]>(),
    // Texto plano extraído de los bloques, para búsqueda full-text.
    textContent: text("text_content").notNull().default(""),
    font: fontPref("font").notNull().default("default"),
    fullWidth: boolean("full_width").notNull().default(false),
    smallText: boolean("small_text").notNull().default(false),
    isFavorite: boolean("is_favorite").notNull().default(false),
    orderKey: text("order_key").notNull().default("a0"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("docs_tree_idx").on(t.workspaceId, t.section, t.parentId),
    index("docs_favorite_idx").on(t.workspaceId, t.isFavorite),
    // Config 'es_unaccent' (unaccent + simple) → búsqueda insensible a acentos.
    // La configuración se crea en la migración antes de este índice.
    index("docs_search_idx").using(
      "gin",
      sql`to_tsvector('es_unaccent', coalesce(${t.title}, '') || ' ' || coalesce(${t.textContent}, ''))`
    ),
  ]
);

// Una BD por cada doc de kind='database'.
export const databases = pgTable("databases", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  docId: text("doc_id")
    .notNull()
    .unique()
    .references(() => docs.id, { onDelete: "cascade" }),
  schema: jsonb("schema").$type<DatabaseSchema>().notNull(),
  automations: jsonb("automations")
    .$type<Automation[]>()
    .notNull()
    .default([]),
  templates: jsonb("templates")
    .$type<DbTemplate[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const views = pgTable("views", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  databaseId: text("database_id")
    .notNull()
    .references(() => databases.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: viewType("type").notNull().default("table"),
  config: jsonb("config").$type<ViewConfig>().notNull(),
  orderKey: text("order_key").notNull().default("a0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Filas de una BD. Cada fila abre como página (blocks).
export const rows = pgTable(
  "rows",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    databaseId: text("database_id")
      .notNull()
      .references(() => databases.id, { onDelete: "cascade" }),
    emoji: text("emoji"),
    values: jsonb("values").$type<PropertyValues>(),
    blocks: jsonb("blocks").$type<Block[]>(),
    cover: text("cover"),
    coverPosition: integer("cover_position").notNull().default(50),
    coverZoom: integer("cover_zoom").notNull().default(100),
    orderKey: text("order_key").notNull().default("a0"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("rows_database_idx").on(t.databaseId)]
);

// Comentarios: hilos por doc/fila → respuestas, con resolver/reabrir.
export const comments = pgTable(
  "comments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    docId: text("doc_id").references(() => docs.id, { onDelete: "cascade" }),
    rowId: text("row_id").references(() => rows.id, { onDelete: "cascade" }),
    parentId: text("parent_id").references((): AnyPgColumn => comments.id, {
      onDelete: "cascade",
    }),
    blockId: text("block_id"), // ancla a un bloque concreto (opcional)
    anchoredText: text("anchored_text"),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    resolved: boolean("resolved").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("comments_doc_idx").on(t.docId)]
);

// Tareas del dashboard de Inicio.
export const homeTasks = pgTable("home_tasks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  done: boolean("done").notNull().default(false),
  tag: text("tag"),
  orderKey: text("order_key").notNull().default("a0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Notificaciones (bandeja de entrada): menciones, comentarios, recordatorios.
export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // mention | comment | reply | reminder
    title: text("title").notNull(),
    body: text("body"),
    docId: text("doc_id").references(() => docs.id, { onDelete: "set null" }),
    rowId: text("row_id").references(() => rows.id, { onDelete: "set null" }),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.read, t.createdAt)]
);

// Historial de versiones: snapshots del contenido de un doc.
export const versions = pgTable(
  "versions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    docId: text("doc_id").references(() => docs.id, { onDelete: "cascade" }),
    rowId: text("row_id").references(() => rows.id, { onDelete: "cascade" }),
    blocks: jsonb("blocks").$type<Block[]>(),
    textContent: text("text_content").notNull().default(""),
    authorId: text("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("versions_doc_idx").on(t.docId, t.createdAt),
    index("versions_row_idx").on(t.rowId, t.createdAt),
  ]
);

// ---------------------------------------------------------------------------
// people: directorio de personas COMÚN al espacio. Dos ámbitos por workspace
// (equipo / privado, vía `scope`). Las propiedades de tipo "person" eligen de
// aquí; cada propiedad materializa en su `options` las personas que usa (para
// que tabla/tablero/chips las pinten sin cargar el directorio).
// ---------------------------------------------------------------------------
export const people = pgTable(
  "people",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    scope: docSection("scope").notNull(),
    // userId: persona vinculada a una cuenta del sistema (se siembran solas en
    // cada ámbito). Null = persona manual añadida a mano (sin cuenta).
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("people_dir_idx").on(t.workspaceId, t.scope),
    // Una sola fila por usuario en cada ámbito (sembrado idempotente).
    uniqueIndex("people_user_idx").on(t.workspaceId, t.scope, t.userId),
  ]
);

// ---------------------------------------------------------------------------
// doc_shares: invitaciones a compartir un doc (página o BD) con otro usuario.
// El grant es sobre el doc RAÍZ; el acceso se hereda a todos sus descendientes
// (se resuelve subiendo por la cadena de ancestros). Cada usuario conserva su
// propio workspace; lo compartido aparece en su sección "Compartido conmigo".
// ---------------------------------------------------------------------------
export const docShares = pgTable(
  "doc_shares",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    docId: text("doc_id")
      .notNull()
      .references(() => docs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: shareRole("role").notNull(),
    invitedBy: text("invited_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("doc_shares_doc_user_idx").on(t.docId, t.userId),
    index("doc_shares_user_idx").on(t.userId),
  ]
);

// digest_rules: avisos de tareas que el usuario crea (lista; vacía por defecto).
// Cada uno: hora + días de la semana, qué tramos incluir (retrasados/hoy/mañana/
// próximos 10 días) y filtros por grupo de estado y de prioridad. `lastSentDate`
// evita duplicar dentro del mismo día.
// ---------------------------------------------------------------------------
export const digestRules = pgTable(
  "digest_rules",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    time: text("time").notNull().default("08:00"),
    days: jsonb("days").$type<number[]>().notNull().default([0, 1, 2, 3, 4, 5, 6]),
    buckets: jsonb("buckets").$type<string[]>().notNull().default(["today"]),
    statusGroups: jsonb("status_groups")
      .$type<string[]>()
      .notNull()
      .default(["todo", "inProgress"]),
    priorityGroups: jsonb("priority_groups").$type<string[]>().notNull().default([]),
    // ambitos: nombres de opción de una columna «Ámbito» (select) a incluir.
    ambitos: jsonb("ambitos").$type<string[]>().notNull().default([]),
    // oldestCount: nº de tareas más antiguas a añadir (0 = no). Saltan los tramos
    // pero respetan los demás filtros.
    oldestCount: integer("oldest_count").notNull().default(0),
    enabled: boolean("enabled").notNull().default(true),
    lastSentDate: text("last_sent_date"),
    orderKey: text("order_key").notNull().default("a0"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("digest_rules_user_idx").on(t.userId)]
);

// ---------------------------------------------------------------------------
// Tipos inferidos
// ---------------------------------------------------------------------------
export type Workspace = typeof workspaces.$inferSelect;
export type Person = typeof people.$inferSelect;
export type DocShare = typeof docShares.$inferSelect;
export type DigestRule = typeof digestRules.$inferSelect;
export type Preferences = typeof preferences.$inferSelect;
export type Doc = typeof docs.$inferSelect;
export type DbDatabase = typeof databases.$inferSelect;
export type View = typeof views.$inferSelect;
export type Row = typeof rows.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type HomeTask = typeof homeTasks.$inferSelect;
export type Version = typeof versions.$inferSelect;
export type Notification = typeof notifications.$inferSelect;

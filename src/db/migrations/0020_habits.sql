-- Páginas de tipo «hábito» + sus tablas.
ALTER TYPE "doc_kind" ADD VALUE IF NOT EXISTS 'habit';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "habits" (
  "id" text PRIMARY KEY NOT NULL,
  "doc_id" text NOT NULL,
  "name" text DEFAULT '' NOT NULL,
  "emoji" text,
  "color" text DEFAULT 'green' NOT NULL,
  "order_key" text DEFAULT 'a0' NOT NULL,
  "archived_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "habit_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "habit_id" text NOT NULL,
  "day" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "habits" ADD CONSTRAINT "habits_doc_id_docs_id_fk"
    FOREIGN KEY ("doc_id") REFERENCES "public"."docs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_habit_id_habits_id_fk"
    FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habits_doc_idx" ON "habits" USING btree ("doc_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "habit_logs_habit_day_idx" ON "habit_logs" USING btree ("habit_id","day");

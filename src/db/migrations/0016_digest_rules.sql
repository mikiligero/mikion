CREATE TABLE "digest_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"time" text DEFAULT '08:00' NOT NULL,
	"days" jsonb DEFAULT '[0,1,2,3,4,5,6]'::jsonb NOT NULL,
	"buckets" jsonb DEFAULT '["today"]'::jsonb NOT NULL,
	"status_groups" jsonb DEFAULT '["todo","inProgress"]'::jsonb NOT NULL,
	"priority_groups" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_sent_date" text,
	"order_key" text DEFAULT 'a0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "digest_rules" ADD CONSTRAINT "digest_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "digest_rules_user_idx" ON "digest_rules" USING btree ("user_id");--> statement-breakpoint
-- Migración de datos: convierte las franjas mañana/tarde activas en avisos.
INSERT INTO "digest_rules" ("id","user_id","time","days","buckets","status_groups","priority_groups","enabled","order_key")
SELECT gen_random_uuid(), p.user_id, p.digest_morning_time, p.digest_morning_days, '["today"]'::jsonb, '["todo","inProgress"]'::jsonb, '[]'::jsonb, true, 'a0'
FROM "preferences" p WHERE p.digest_morning_enabled = true;--> statement-breakpoint
INSERT INTO "digest_rules" ("id","user_id","time","days","buckets","status_groups","priority_groups","enabled","order_key")
SELECT gen_random_uuid(), p.user_id, p.digest_evening_time, p.digest_evening_days, '["tomorrow","week"]'::jsonb, '["todo","inProgress"]'::jsonb, '[]'::jsonb, true, 'a1'
FROM "preferences" p WHERE p.digest_evening_enabled = true;
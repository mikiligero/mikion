ALTER TABLE "preferences" ADD COLUMN "digest_morning_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "preferences" ADD COLUMN "digest_morning_time" text DEFAULT '08:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "preferences" ADD COLUMN "digest_morning_days" jsonb DEFAULT '[0,1,2,3,4,5,6]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "preferences" ADD COLUMN "digest_morning_sent_date" text;--> statement-breakpoint
ALTER TABLE "preferences" ADD COLUMN "digest_evening_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "preferences" ADD COLUMN "digest_evening_time" text DEFAULT '18:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "preferences" ADD COLUMN "digest_evening_days" jsonb DEFAULT '[0,1,2,3,4,5,6]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "preferences" ADD COLUMN "digest_evening_sent_date" text;
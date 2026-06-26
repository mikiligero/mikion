ALTER TABLE "people" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "people_user_idx" ON "people" USING btree ("workspace_id","scope","user_id");
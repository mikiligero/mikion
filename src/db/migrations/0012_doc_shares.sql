CREATE TYPE "public"."share_role" AS ENUM('viewer', 'editor');--> statement-breakpoint
CREATE TABLE "doc_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"doc_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "share_role" NOT NULL,
	"invited_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "doc_shares" ADD CONSTRAINT "doc_shares_doc_id_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."docs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_shares" ADD CONSTRAINT "doc_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_shares" ADD CONSTRAINT "doc_shares_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "doc_shares_doc_user_idx" ON "doc_shares" USING btree ("doc_id","user_id");--> statement-breakpoint
CREATE INDEX "doc_shares_user_idx" ON "doc_shares" USING btree ("user_id");
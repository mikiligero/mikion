ALTER TABLE "versions" ALTER COLUMN "doc_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "versions" ADD COLUMN "row_id" text;--> statement-breakpoint
ALTER TABLE "versions" ADD CONSTRAINT "versions_row_id_rows_id_fk" FOREIGN KEY ("row_id") REFERENCES "public"."rows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "versions_row_idx" ON "versions" USING btree ("row_id","created_at");
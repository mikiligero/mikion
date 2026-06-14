CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'es_unaccent') THEN
    CREATE TEXT SEARCH CONFIGURATION es_unaccent ( COPY = simple );
    ALTER TEXT SEARCH CONFIGURATION es_unaccent
      ALTER MAPPING FOR hword, hword_part, word WITH unaccent, simple;
  END IF;
END $$;--> statement-breakpoint
DROP INDEX "docs_search_idx";--> statement-breakpoint
CREATE INDEX "docs_search_idx" ON "docs" USING gin (to_tsvector('es_unaccent', coalesce("title", '') || ' ' || coalesce("text_content", '')));

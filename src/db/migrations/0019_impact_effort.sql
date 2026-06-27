-- Sustituye «Prioridad» por «Impacto» y añade «Esfuerzo».
-- 1) Avisos: renombra la columna de filtro y añade la de esfuerzo.
ALTER TABLE "digest_rules" RENAME COLUMN "priority_groups" TO "impact_groups";
--> statement-breakpoint
ALTER TABLE "digest_rules" ADD COLUMN "effort_groups" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
-- 2) Datos: en los esquemas de BD existentes, las propiedades de tipo
--    «priority» pasan a tipo «impact» (sin tocar opciones ni valores; las
--    claves de nivel low/medium/high/urgent se conservan). Si la propiedad
--    tenía el nombre por defecto «Prioridad», pasa a «Impacto» (los nombres
--    personalizados se respetan).
UPDATE "databases" SET "schema" = jsonb_set(
  "schema",
  '{properties}',
  (
    SELECT jsonb_agg(
      CASE WHEN prop->>'type' = 'priority' THEN
        jsonb_set(
          jsonb_set(prop, '{type}', '"impact"'),
          '{name}',
          CASE WHEN prop->>'name' = 'Prioridad' THEN '"Impacto"' ELSE to_jsonb(prop->>'name') END
        )
      ELSE prop END
    )
    FROM jsonb_array_elements("schema"->'properties') AS prop
  )
)
WHERE "schema"->'properties' @> '[{"type":"priority"}]';

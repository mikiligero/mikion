-- Horario por hábito (rutina semanal / objetivos de frecuencia).
ALTER TABLE "habits" ADD COLUMN IF NOT EXISTS "schedule" jsonb DEFAULT '{"type":"daily"}'::jsonb NOT NULL;

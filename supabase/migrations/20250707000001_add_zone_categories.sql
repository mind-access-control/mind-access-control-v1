-- Migration to add zone categories
-- This adds a category field to zones for better organization

-- up migration
BEGIN;

-- Add category column to zones table IF NOT EXISTS
-- ¡CAMBIO CLAVE! Usar ADD COLUMN IF NOT EXISTS
ALTER TABLE "public"."zones"
ADD COLUMN IF NOT EXISTS "category" "text" DEFAULT 'Employee';

-- Si la columna ya existía pero no tenía un valor por defecto,
-- puedes añadir una actualización para los valores existentes si es necesario.
-- UPDATE "public"."zones" SET "category" = 'Employee' WHERE "category" IS NULL;


COMMIT;

-- down migration
BEGIN;

-- Drop category column from zones table IF EXISTS
-- ¡CAMBIO CLAVE! Usar DROP COLUMN IF EXISTS
ALTER TABLE "public"."zones"
DROP COLUMN IF EXISTS "category";

COMMIT;

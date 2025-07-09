-- Migration to add zone categories
-- This adds a category field to zones for better organization

-- Add category column to zones table
ALTER TABLE "public"."zones" 
ADD COLUMN "category" "text" DEFAULT 'Employee';

-- Create an index for better performance when filtering by category
CREATE INDEX "zones_category_idx" ON "public"."zones" USING "btree" ("category");

-- Update existing zones with default category
UPDATE "public"."zones" SET "category" = 'Employee' WHERE "category" IS NULL;

-- Grant permissions
GRANT ALL ON TABLE "public"."zones" TO "anon";
GRANT ALL ON TABLE "public"."zones" TO "authenticated";
GRANT ALL ON TABLE "public"."zones" TO "service_role"; 
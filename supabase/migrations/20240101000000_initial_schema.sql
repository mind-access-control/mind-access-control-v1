SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";
ALTER SCHEMA "public" OWNER TO "pg_database_owner";

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS vector;

CREATE OR REPLACE FUNCTION "public"."get_zone_names_by_ids"("zone_ids_array" "text"[]) RETURNS TABLE("id" "uuid", "name" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT z.id, z.name
    FROM public.zones z
    WHERE z.id::TEXT = ANY(zone_ids_array); -- Compara la representación de texto del UUID
END;
$$;
ALTER FUNCTION "public"."get_zone_names_by_ids"("zone_ids_array" "text"[]) OWNER TO "postgres";

-- DROP FUNCTION IF EXISTS para match_face_embedding con 3 parámetros
DROP FUNCTION IF EXISTS "public"."match_face_embedding"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer);
CREATE OR REPLACE FUNCTION "public"."match_face_embedding"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) RETURNS TABLE("user_id" "uuid", "embedding" "public"."vector", "distance" double precision)
    LANGUAGE "plpgsql"
    AS $$
    BEGIN
        RETURN QUERY
        SELECT
            f.user_id,
            f.embedding,
            f.embedding <-> query_embedding AS distance
        FROM
            faces f -- Alias 'f' para la tabla faces
        JOIN
            public.users u ON f.user_id = u.id -- Unir con la tabla public.users
        WHERE
            f.embedding <-> query_embedding < match_threshold
            AND u.deleted_at IS NULL -- ¡NUEVA CONDICIÓN! Solo considera usuarios NO eliminados lógicamente
        ORDER BY
            distance
        LIMIT
            match_count;
    END;
    $$;
ALTER FUNCTION "public"."match_face_embedding"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";

-- ¡CAMBIO CLAVE! Eliminar la versión de 1 parámetro de match_observed_face_embedding
DROP FUNCTION IF EXISTS "public"."match_observed_face_embedding"("query_embedding" "public"."vector");
-- DROP FUNCTION IF EXISTS para match_observed_face_embedding con 3 parámetros
DROP FUNCTION IF EXISTS "public"."match_observed_face_embedding"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer);
CREATE OR REPLACE FUNCTION "public"."match_observed_face_embedding"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) RETURNS TABLE("id" "uuid", "embedding" "public"."vector", "first_seen_at" timestamp with time zone, "last_seen_at" timestamp with time zone, "access_count" integer, "last_accessed_zones" "jsonb", "status_id" "uuid", "alert_triggered" boolean, "expires_at" timestamp with time zone, "potential_match_user_id" "uuid", "similarity" double precision, "distance" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ou.id,
    ou.embedding,
    ou.first_seen_at,
    ou.last_seen_at,
    ou.access_count,
    ou.last_accessed_zones,
    ou.status_id,
    ou.alert_triggered,
    ou.expires_at,
    ou.potential_match_user_id,
    1 - (ou.embedding <=> query_embedding) AS similarity,
    (ou.embedding <=> query_embedding) AS distance
  FROM
    public.observed_users ou
  WHERE
    (ou.embedding <=> query_embedding) < match_threshold
  ORDER BY
    (ou.embedding <=> query_embedding)
  LIMIT match_count;
END;
$$;
ALTER FUNCTION "public"."match_observed_face_embedding"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";

-- ¡CAMBIO CLAVE AQUÍ!
-- DROP FUNCTION IF EXISTS para match_user_face_embedding con 3 parámetros
DROP FUNCTION IF EXISTS "public"."match_user_face_embedding"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer);
CREATE OR REPLACE FUNCTION "public"."match_user_face_embedding"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) RETURNS TABLE("user_id" "uuid", "embedding" "public"."vector", "distance" double precision) -- CAMBIO: Ahora devuelve 'user_id'
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.user_id, -- CAMBIO: Selecciona directamente 'user_id' sin alias 'AS id'
    f.embedding,
    (f.embedding <=> query_embedding) AS distance
  FROM
    public.faces f
  WHERE
    (f.embedding <=> query_embedding) < match_threshold
    AND f.user_id IS NOT NULL
  ORDER BY
    (f.embedding <=> query_embedding)
  LIMIT match_count;
END;
$$;
ALTER FUNCTION "public"."match_user_face_embedding"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";

SET default_tablespace = '';
SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."cameras" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "zone_id" "uuid",
    "location" "text"
);
ALTER TABLE "public"."cameras" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."faces" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "embedding" "public"."vector"(128) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."faces" OWNER TO "postgres";
COMMENT ON COLUMN "public"."faces"."created_at" IS 'here';

CREATE TABLE IF NOT EXISTS "public"."logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "camera_id" "uuid",
    "result" boolean NOT NULL,
    "observed_user_id" "uuid",
    "user_type" "text",
    "vector_attempted" "public"."vector"(128),
    "match_status" "text",
    "decision" "text" DEFAULT 'access_denied'::"text" NOT NULL,
    "reason" "text",
    "confidence_score" numeric,
    "requested_zone_id" "uuid"
);
ALTER TABLE "public"."logs" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."observed_users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "embedding" "public"."vector"(128) NOT NULL,
    "first_seen_at" timestamp with time zone DEFAULT "now"(),
    "last_seen_at" timestamp with time zone DEFAULT "now"(),
    "access_count" integer DEFAULT 1,
    "last_accessed_zones" "jsonb" DEFAULT '[]'::"jsonb",
    "status_id" "uuid" NOT NULL,
    "alert_triggered" boolean DEFAULT false,
    "expires_at" timestamp with time zone,
    "potential_match_user_id" "uuid",
    "face_image_url" "text",
    "ai_action" "text",
    "consecutive_denied_accesses" integer DEFAULT 0
);
ALTER TABLE "public"."observed_users" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."roles_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL
);
ALTER TABLE "public"."roles_catalog" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."user_statuses_catalog" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text"
);
ALTER TABLE "public"."user_statuses_catalog" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."user_zone_access" (
    "user_id" "uuid" NOT NULL,
    "zone_id" "uuid" NOT NULL
);
ALTER TABLE "public"."user_zone_access" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "role_id" "uuid",
    "full_name" "text",
    "access_method" "text" DEFAULT 'facial'::"text",
    "status_id" "uuid" NOT NULL,
    "profile_picture_url" "text",
    "deleted_at" timestamp with time zone,
    "alert_triggered" boolean DEFAULT false,
    "consecutive_denied_accesses" integer DEFAULT 0
);
ALTER TABLE "public"."users" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."zones" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "access_level" integer
);
ALTER TABLE "public"."zones" OWNER TO "postgres";

CREATE OR REPLACE VIEW "public"."user_full_details_view" AS
 SELECT "u"."id",
    "u"."full_name",
    "u"."alert_triggered",
    "u"."consecutive_denied_accesses",
    "jsonb_build_object"('id', "rc"."id", 'name', "rc"."name") AS "role_details",
    "jsonb_build_object"('id', "usc"."id", 'name', "usc"."name") AS "status_details",
    COALESCE(( SELECT "jsonb_agg"("jsonb_build_object"('id', "z"."id", 'name', "z"."name")) AS "jsonb_agg"
           FROM ("public"."user_zone_access" "uza"
             JOIN "public"."zones" "z" ON (("uza"."zone_id" = "z"."id")))
          WHERE ("uza"."user_id" = "u"."id")), '[]'::"jsonb") AS "zones_accessed_details"
   FROM (("public"."users" "u"
     LEFT JOIN "public"."roles_catalog" "rc" ON (("u"."role_id" = "rc"."id")))
     LEFT JOIN "public"."user_statuses_catalog" "usc" ON (("u"."status_id" = "usc"."id")));

ALTER VIEW "public"."user_full_details_view" OWNER TO "postgres";

-- ¡CAMBIO CLAVE AQUÍ! Envolver la adición de cada PRIMARY KEY en un bloque DO $$ BEGIN ... END $$;
-- para hacerla idempotente. Esto se aplica a todas las PRIMARY KEYs en el archivo.

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cameras_pkey' AND conrelid = 'public.cameras'::regclass) THEN
ALTER TABLE ONLY "public"."cameras" ADD CONSTRAINT "cameras_pkey" PRIMARY KEY ("id");
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'faces_pkey' AND conrelid = 'public.faces'::regclass) THEN
ALTER TABLE ONLY "public"."faces" ADD CONSTRAINT "faces_pkey" PRIMARY KEY ("id");
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'logs_pkey' AND conrelid = 'public.logs'::regclass) THEN
ALTER TABLE ONLY "public"."logs" ADD CONSTRAINT "logs_pkey" PRIMARY KEY ("id");
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'observed_users_pkey' AND conrelid = 'public.observed_users'::regclass) THEN
ALTER TABLE ONLY "public"."observed_users" ADD CONSTRAINT "observed_users_pkey" PRIMARY KEY ("id");
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_catalog_name_key' AND conrelid = 'public.roles_catalog'::regclass) THEN
ALTER TABLE ONLY "public"."roles_catalog" ADD CONSTRAINT "roles_catalog_name_key" UNIQUE ("name");
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_catalog_pkey' AND conrelid = 'public.roles_catalog'::regclass) THEN
ALTER TABLE ONLY "public"."roles_catalog" ADD CONSTRAINT "roles_catalog_pkey" PRIMARY KEY ("id");
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_statuses_catalog_name_key' AND conrelid = 'public.user_statuses_catalog'::regclass) THEN
ALTER TABLE ONLY "public"."user_statuses_catalog" ADD CONSTRAINT "user_statuses_catalog_name_key" UNIQUE ("name");
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_statuses_catalog_pkey' AND conrelid = 'public.user_statuses_catalog'::regclass) THEN
ALTER TABLE ONLY "public"."user_statuses_catalog" ADD CONSTRAINT "user_statuses_catalog_pkey" PRIMARY KEY ("id");
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_zone_access_pkey' AND conrelid = 'public.user_zone_access'::regclass) THEN
ALTER TABLE ONLY "public"."user_zone_access" ADD CONSTRAINT "user_zone_access_pkey" PRIMARY KEY ("user_id", "zone_id");
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_pkey' AND conrelid = 'public.users'::regclass) THEN
ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'zones_pkey' AND conrelid = 'public.zones'::regclass) THEN
ALTER TABLE ONLY "public"."zones" ADD CONSTRAINT "zones_pkey" PRIMARY KEY ("id");
END IF; END $$;


CREATE INDEX IF NOT EXISTS "faces_user_id_idx" ON "public"."faces" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "logs_camera_id_idx" ON "public"."logs" USING "btree" ("camera_id");
CREATE INDEX IF NOT EXISTS "logs_user_id_idx" ON "public"."logs" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "user_zone_access_user_id_idx" ON "public"."user_zone_access" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "user_zone_access_zone_id_idx" ON "public"."user_zone_access" USING "btree" ("zone_id");

-- Foreign Keys - También necesitan ser idempotentes si pueden causar conflictos
-- Se puede usar DROP CONSTRAINT IF EXISTS o el mismo patrón DO $$ BEGIN ... END $$;
-- Para FKs, la forma más segura es DROP IF EXISTS y luego ADD.
-- Sin embargo, para initial_schema, a veces es suficiente con que las PKs sean idempotentes
-- y las FKs se añadirán si las tablas ya existen. Si hay errores futuros con FKs,
-- aplicaremos el mismo patrón.

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cameras_zone_id_fkey' AND conrelid = 'public.cameras'::regclass) THEN
ALTER TABLE ONLY "public"."cameras" ADD CONSTRAINT "cameras_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'faces_user_id_fkey' AND conrelid = 'public.faces'::regclass) THEN
ALTER TABLE ONLY "public"."faces" ADD CONSTRAINT "faces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_logs_observed_user' AND conrelid = 'public.logs'::regclass) THEN
ALTER TABLE ONLY "public"."logs" ADD CONSTRAINT "fk_logs_observed_user" FOREIGN KEY ("observed_user_id") REFERENCES "public"."observed_users"("id");
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_observed_user_status' AND conrelid = 'public.observed_users'::regclass) THEN
ALTER TABLE ONLY "public"."observed_users" ADD CONSTRAINT "fk_observed_user_status" FOREIGN KEY ("status_id") REFERENCES "public"."user_statuses_catalog"("id");
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_potential_match_user' AND conrelid = 'public.observed_users'::regclass) THEN
ALTER TABLE ONLY "public"."observed_users" ADD CONSTRAINT "fk_potential_match_user" FOREIGN KEY ("potential_match_user_id") REFERENCES "public"."users"("id");
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_role' AND conrelid = 'public.users'::regclass) THEN
ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "fk_role" FOREIGN KEY ("role_id") REFERENCES "public"."roles_catalog"("id");
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_status' AND conrelid = 'public.users'::regclass) THEN
ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "fk_user_status" FOREIGN KEY ("status_id") REFERENCES "public"."user_statuses_catalog"("id");
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'logs_camera_id_fkey' AND conrelid = 'public.logs'::regclass) THEN
ALTER TABLE ONLY "public"."logs" ADD CONSTRAINT "logs_camera_id_fkey" FOREIGN KEY ("camera_id") REFERENCES "public"."cameras"("id") ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'logs_requested_zone_id_fkey' AND conrelid = 'public.logs'::regclass) THEN
ALTER TABLE ONLY "public"."logs" ADD CONSTRAINT "logs_requested_zone_id_fkey" FOREIGN KEY ("requested_zone_id") REFERENCES "public"."zones"("id");
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'logs_user_id_fkey' AND conrelid = 'public.logs'::regclass) THEN
ALTER TABLE ONLY "public"."logs" ADD CONSTRAINT "logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_zone_access_user_id_fkey' AND conrelid = 'public.user_zone_access'::regclass) THEN
ALTER TABLE ONLY "public"."user_zone_access" ADD CONSTRAINT "user_zone_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_zone_access_zone_id_fkey' AND conrelid = 'public.user_zone_access'::regclass) THEN
ALTER TABLE ONLY "public"."user_zone_access" ADD CONSTRAINT "user_zone_access_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_id_fkey' AND conrelid = 'public.users'::regclass) THEN
ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
END IF; END $$;


ALTER TABLE "public"."cameras" ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."get_zone_names_by_ids"("zone_ids_array" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_zone_names_by_ids"("zone_ids_array" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_zone_names_by_ids"("zone_ids_array" "text"[]) TO "service_role";

GRANT ALL ON FUNCTION "public"."match_face_embedding"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_face_embedding"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_face_embedding"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."match_observed_face_embedding"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_observed_face_embedding"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_observed_face_embedding"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."match_user_face_embedding"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_user_face_embedding"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_user_face_embedding"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";

GRANT ALL ON TABLE "public"."cameras" TO "anon";
GRANT ALL ON TABLE "public"."cameras" TO "authenticated";
GRANT ALL ON TABLE "public"."cameras" TO "service_role";

GRANT ALL ON TABLE "public"."faces" TO "anon";
GRANT ALL ON TABLE "public"."faces" TO "authenticated";
GRANT ALL ON TABLE "public"."faces" TO "service_role";

GRANT ALL ON TABLE "public"."logs" TO "anon";
GRANT ALL ON TABLE "public"."logs" TO "authenticated";
GRANT ALL ON TABLE "public"."logs" TO "service_role";

GRANT ALL ON TABLE "public"."observed_users" TO "anon";
GRANT ALL ON TABLE "public"."observed_users" TO "authenticated";
GRANT ALL ON TABLE "public"."observed_users" TO "service_role";

GRANT ALL ON TABLE "public"."roles_catalog" TO "anon";
GRANT ALL ON TABLE "public"."roles_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."roles_catalog" TO "service_role";

GRANT ALL ON TABLE "public"."user_statuses_catalog" TO "anon";
GRANT ALL ON TABLE "public"."user_statuses_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."user_statuses_catalog" TO "service_role";

GRANT ALL ON TABLE "public"."user_zone_access" TO "anon";
GRANT ALL ON TABLE "public"."user_zone_access" TO "authenticated";
GRANT ALL ON TABLE "public"."user_zone_access" TO "service_role";

GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";

GRANT ALL ON TABLE "public"."zones" TO "anon";
GRANT ALL ON TABLE "public"."zones" TO "authenticated";
GRANT ALL ON TABLE "public"."zones" TO "service_role";

GRANT ALL ON TABLE "public"."user_full_details_view" TO "anon";
GRANT ALL ON TABLE "public"."user_full_details_view" TO "authenticated";
GRANT ALL ON TABLE "public"."user_full_details_view" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

RESET ALL;

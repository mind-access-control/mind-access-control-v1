create extension if not exists "http" with schema "extensions";


set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.send_observed_user_alert_to_n8n()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
    DECLARE
        webhook_url TEXT := 'https://primary-production-674a.up.railway.app/webhook-test/59ac3df8-7fd3-4970-976b-829ba2188253';
        payload JSONB;
    BEGIN
        -- Añadido: Asegurar que 'extensions' esté en el search_path
        SET search_path = public, extensions, pg_temp;

        payload := jsonb_build_object(
            'old_record', OLD,
            'new_record', NEW
        );

        PERFORM extensions.http_post(
            webhook_url,
            payload::text,
            '{"Content-Type": "application/json"}'::jsonb
        );

        RETURN NEW;
    END;
    $function$
;

CREATE OR REPLACE FUNCTION public.get_zone_names_by_ids(zone_ids_array text[])
 RETURNS TABLE(id uuid, name text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- ** AÑADIDO: Fija el search_path para la función **
    -- Esto asegura que la función siempre opere en los esquemas 'public'
    -- y 'pg_temp', evitando problemas de seguridad y comportamiento inesperado.
    SET search_path = public, pg_temp;

    RETURN QUERY
    SELECT z.id, z.name
    FROM public.zones z
    WHERE z.id::TEXT = ANY(zone_ids_array); -- Compara la representación de texto del UUID
END;
$function$
;

CREATE OR REPLACE FUNCTION public.match_user_face_embedding(query_embedding vector, match_threshold double precision, match_count integer)
 RETURNS TABLE(user_id uuid, embedding vector, distance double precision)
 LANGUAGE plpgsql
AS $function$
    BEGIN
      RETURN QUERY
      SELECT
        f.user_id,
        f.embedding,
        (f.embedding <=> query_embedding) AS distance
      FROM
        public.faces f
      WHERE
        (f.embedding <=> query_embedding) < match_threshold
        AND f.user_id IS NOT NULL
        AND f.embedding IS NOT NULL -- ¡NUEVA CONDICIÓN AÑADIDA AQUÍ!
      ORDER BY
        (f.embedding <=> query_embedding)
      LIMIT match_count;
    END;
    $function$
;

create or replace view "public"."user_full_details_view" as  SELECT u.id,
    u.full_name,
    u.alert_triggered,
    u.consecutive_denied_accesses,
    jsonb_build_object('id', rc.id, 'name', rc.name) AS role_details,
    jsonb_build_object('id', usc.id, 'name', usc.name) AS status_details,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', z.id, 'name', z.name)) AS jsonb_agg
           FROM (user_zone_access uza
             JOIN zones z ON ((uza.zone_id = z.id)))
          WHERE (uza.user_id = u.id)), '[]'::jsonb) AS zones_accessed_details,
    u.profile_picture_url
   FROM ((users u
     LEFT JOIN roles_catalog rc ON ((u.role_id = rc.id)))
     LEFT JOIN user_statuses_catalog usc ON ((u.status_id = usc.id)));


CREATE TRIGGER observed_users_after_update_n8n_trigger AFTER UPDATE ON public.observed_users FOR EACH ROW EXECUTE FUNCTION send_observed_user_alert_to_n8n();
ALTER TABLE "public"."observed_users" DISABLE TRIGGER "observed_users_after_update_n8n_trigger";



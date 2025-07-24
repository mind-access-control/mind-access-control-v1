drop trigger if exists "observed_users_after_update_n8n_trigger" on "public"."observed_users";

set check_function_bodies = off;

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

CREATE OR REPLACE FUNCTION public.send_observed_user_alert_to_n8n()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
    DECLARE
        webhook_url TEXT := 'https://primary-production-674a.up.railway.app/webhook/59ac3df8-7fd3-4970-976b-829ba2188253';
        payload JSONB;
    BEGIN
        -- LOG: Indicar que el trigger se ejecutó
        RAISE NOTICE 'TRIGGER EJECUTADO: observed_users_after_update_n8n_trigger para ID %', NEW.id;
        
        -- Asegurar que 'extensions' esté en el search_path
        SET search_path = public, extensions, pg_temp;
        
        payload := jsonb_build_object(
            'old_record', OLD,
            'new_record', NEW
        );
        
        -- LOG: Mostrar el payload que se enviará
        RAISE NOTICE 'PAYLOAD A ENVIAR: %', payload::text;
        
        -- CORREGIDO: Usar la signature que sí existe (3 parámetros, todos text/varchar)
        PERFORM extensions.http_post(
            webhook_url,                    -- url (character varying)
            payload::text,                  -- content (character varying)
            'application/json'              -- content_type (character varying)
        );
        
        -- LOG: Confirmar que la llamada HTTP se realizó
        RAISE NOTICE 'HTTP POST COMPLETADO a: %', webhook_url;
        
        RETURN NEW;
    END;
    $function$
;

CREATE TRIGGER observed_users_after_update_n8n_trigger AFTER UPDATE ON public.observed_users FOR EACH ROW EXECUTE FUNCTION send_observed_user_alert_to_n8n();



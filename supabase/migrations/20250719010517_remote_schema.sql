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

CREATE TRIGGER observed_users_after_update_n8n_trigger AFTER UPDATE ON public.observed_users FOR EACH ROW EXECUTE FUNCTION send_observed_user_alert_to_n8n();
ALTER TABLE "public"."observed_users" DISABLE TRIGGER "observed_users_after_update_n8n_trigger";



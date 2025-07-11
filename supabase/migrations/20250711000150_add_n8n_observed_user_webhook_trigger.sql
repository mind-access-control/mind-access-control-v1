-- Este archivo de migración añade una función y un trigger a la base de datos
-- para enviar un webhook a n8n cada vez que un usuario observado es actualizado.

-- up migration
BEGIN;

-- Función para enviar el webhook a n8n
-- Usamos CREATE OR REPLACE FUNCTION para hacerla idempotente
CREATE OR REPLACE FUNCTION public.send_observed_user_alert_to_n8n()
RETURNS TRIGGER AS $$
DECLARE
    -- URL del Webhook de n8n. ¡Asegúrate de que esta URL sea la correcta de tu instancia de n8n!
    webhook_url TEXT := 'https://primary-production-674a.up.railway.app/webhook/59ac3df8-7fd3-4970-976b-829ba2188253';
    payload JSONB;
BEGIN
    -- Construye el payload JSON con los registros OLD y NEW.
    payload := jsonb_build_object(
        'old_record', OLD,
        'new_record', NEW
    );

    -- Envía la solicitud HTTP POST al webhook de n8n.
    PERFORM http_post(
        webhook_url,
        payload::text,
        'application/json'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ¡CAMBIO CLAVE! Eliminar el trigger si ya existe antes de crearlo
DROP TRIGGER IF EXISTS observed_users_after_update_n8n_trigger ON public.observed_users;

-- Crea el trigger que llama a la función después de cada actualización en la tabla observed_users
CREATE TRIGGER observed_users_after_update_n8n_trigger
AFTER UPDATE ON public.observed_users
FOR EACH ROW EXECUTE FUNCTION public.send_observed_user_alert_to_n8n();

COMMIT;

-- down migration
BEGIN;

-- Elimina el trigger si existe
DROP TRIGGER IF EXISTS observed_users_after_update_n8n_trigger ON public.observed_users;

-- Elimina la función si existe
DROP FUNCTION IF EXISTS public.send_observed_user_alert_to_n8n();

COMMIT;

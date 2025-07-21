CREATE OR REPLACE VIEW access_logs_view AS
SELECT 
  l.id,
  l.timestamp,
  l.user_id,
  l.observed_user_id,
  l.camera_id,
  l.result,
  l.user_type,
  l.match_status,
  l.decision,
  l.reason,
  l.confidence_score,
  l.requested_zone_id,
  u.full_name,
  u.profile_picture_url,
  au.email,
  rc.name AS role_name,
  usc.name AS status_name,
  z.name AS zone_name
FROM public.logs l
LEFT JOIN public.users u ON l.user_id = u.id AND u.deleted_at IS NULL
LEFT JOIN auth.users au ON u.id = au.id
LEFT JOIN public.roles_catalog rc ON u.role_id = rc.id
LEFT JOIN public.user_statuses_catalog usc ON u.status_id = usc.id
LEFT JOIN public.zones z ON l.requested_zone_id = z.id
WHERE l.user_id IS NOT NULL; 

ALTER VIEW "public"."access_logs_view" OWNER TO "postgres";

GRANT ALL ON TABLE "public"."access_logs_view" TO "anon";
GRANT ALL ON TABLE "public"."access_logs_view" TO "authenticated";
GRANT ALL ON TABLE "public"."access_logs_view" TO "service_role";
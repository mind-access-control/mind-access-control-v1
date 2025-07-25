drop function if exists "public"."match_observed_face_embedding"(query_embedding vector, match_threshold double precision, match_count integer);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.match_observed_face_embedding(query_embedding vector, match_threshold double precision, match_count integer)
 RETURNS TABLE(id uuid, embedding vector, first_seen_at timestamp with time zone, last_seen_at timestamp with time zone, access_count integer, last_accessed_zones jsonb, status_id uuid, alert_triggered boolean, expires_at timestamp with time zone, potential_match_user_id uuid, consecutive_denied_accesses integer, similarity double precision, distance double precision)
 LANGUAGE plpgsql
AS $function$
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
    ou.consecutive_denied_accesses,
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
$function$
;



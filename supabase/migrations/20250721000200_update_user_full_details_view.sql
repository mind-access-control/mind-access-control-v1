DROP VIEW IF EXISTS user_full_details_view;
CREATE OR REPLACE VIEW user_full_details_view AS
    SELECT
    u.id,
    u.full_name,
    u.alert_triggered,
    u.consecutive_denied_accesses,
    u.profile_picture_url,
    u.access_method,
    u.created_at,
    u.updated_at,
    au.email,
    rc.id AS role_id,
    rc.name AS role,
    usc.id AS status_id,
    usc.name as status,
    COALESCE(
        ARRAY(
            SELECT z.id
            FROM user_zone_access uza
            JOIN zones z ON uza.zone_id = z.id
            WHERE uza.user_id = u.id
        ),
        ARRAY[]::uuid[]
    ) AS zone_ids,
    jsonb_build_object('id', rc.id, 'name', rc.name) AS roles,
    jsonb_build_object('id', usc.id, 'name', usc.name) AS statuses,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', z.id, 'name', z.name)) AS jsonb_agg
               FROM (user_zone_access uza
                   JOIN zones z ON ((uza.zone_id = z.id)))
               WHERE (uza.user_id = u.id)), '[]'::jsonb) AS zones,
    -- Face embeddings (only the latest one)
    COALESCE(
        ARRAY(
            SELECT f.embedding
            FROM faces f
            WHERE f.user_id = u.id
            ORDER BY f.created_at DESC
            LIMIT 1
        ),
        ARRAY[]::vector[]
    ) AS face_embeddings
    FROM users u
    LEFT JOIN auth.users au ON u.id = au.id
    LEFT JOIN roles_catalog rc ON u.role_id = rc.id
    LEFT JOIN user_statuses_catalog usc ON u.status_id = usc.id;
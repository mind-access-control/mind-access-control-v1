-- Seed data for Mind Access Control System
-- This file populates the database with initial data including default admin user

-- Insert default roles
INSERT INTO roles_catalog (id, name) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'Admin'),
    ('550e8400-e29b-41d4-a716-446655440002', 'User')    
ON CONFLICT (name) DO NOTHING;

-- Insert default user statuses
INSERT INTO user_statuses_catalog (id, name) VALUES 
    ('660e8400-e29b-41d4-a716-446655440001', 'active'),
    ('660e8400-e29b-41d4-a716-446655440002', 'blocked'),
    ('660e8400-e29b-41d4-a716-446655440003', 'inactive'),
    ('660e8400-e29b-41d4-a716-446655440004', 'pending_approval'),
    ('660e8400-e29b-41d4-a716-446655440005', 'active_temporal'),
    ('660e8400-e29b-41d4-a716-446655440006', 'expired')
ON CONFLICT (name) DO NOTHING;

-- Insert default zones (note: zones table only has id, name, access_level - no description column)
INSERT INTO zones (id, name, access_level) VALUES 
    ('770e8400-e29b-41d4-a716-446655440001', 'Main Entrance', 1),
    ('770e8400-e29b-41d4-a716-446655440002', 'Zone A', 2),
    ('770e8400-e29b-41d4-a716-446655440003', 'Zone B', 3),
    ('770e8400-e29b-41d4-a716-446655440004', 'Zone C', 4),
    ('770e8400-e29b-41d4-a716-446655440005', 'Zone D', 5),
    ('770e8400-e29b-41d4-a716-446655440006', 'Zone E', 6)
ON CONFLICT (id) DO NOTHING;

-- Create default admin user in auth.users (simplified version)
DO $$
BEGIN
    -- Check if admin user already exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@mindaccess.com') THEN         
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            confirmation_token,
            confirmation_sent_at,
            recovery_token,
            recovery_sent_at,
            email_change_token_new,
            email_change,
            email_change_sent_at,
            last_sign_in_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin
            ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            '880e8400-e29b-41d4-a716-446655440001', -- Your admin UUID
            'authenticated',
            'authenticated',
            'admin@mindaccess.com',
            -- Password hash (real bcrypt hash for 'admin123')
            '$2a$10$mAWo.lWSeZqQj/1dZECsv.I3UJO8elYSh/35LASEDuE1J8ZnqYgEq',            
            now(),
            '',
            now(),
            '',
            now(),
            '',
            '',
            now(),
            now(),
            now(),
            now(),
            '{"provider": "email", "providers": ["email"]}',
            '{"email_verified": true}',
            false
        );

            
    END IF;
END $$;

-- Insert admin user profile (only after auth user exists)
INSERT INTO users (
    id,
    full_name,
    profile_picture_url,
    access_method,
    role_id,
    status_id
) VALUES (
    '880e8400-e29b-41d4-a716-446655440001', -- admin user id
    'System Administrator',
    'https://i.pravatar.cc/150?img=1',
    'facial',
    (SELECT id FROM roles_catalog WHERE lower(name) = lower('Admin')),
    (SELECT id FROM user_statuses_catalog WHERE lower(name) = lower('active'))
) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    profile_picture_url = EXCLUDED.profile_picture_url,
    access_method = EXCLUDED.access_method,
    role_id = EXCLUDED.role_id,
    status_id = EXCLUDED.status_id;

-- Give admin access to all zones
INSERT INTO user_zone_access (user_id, zone_id)
SELECT 
    '880e8400-e29b-41d4-a716-446655440001' as user_id,
    id as zone_id
FROM zones
ON CONFLICT (user_id, zone_id) DO NOTHING;

-- Insert sample face embedding for admin user (dummy data for testing)
-- Note: In production, these would be actual face embeddings from face-api.js
-- Only insert if no face embedding exists for this user
INSERT INTO faces (user_id, embedding)
SELECT 
    '880e8400-e29b-41d4-a716-446655440001' as user_id,
    ARRAY[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 
           0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18, 0.19, 0.20,
           0.21, 0.22, 0.23, 0.24, 0.25, 0.26, 0.27, 0.28, 0.29, 0.30,
           0.31, 0.32, 0.33, 0.34, 0.35, 0.36, 0.37, 0.38, 0.39, 0.40,
           0.41, 0.42, 0.43, 0.44, 0.45, 0.46, 0.47, 0.48, 0.49, 0.50,
           0.51, 0.52, 0.53, 0.54, 0.55, 0.56, 0.57, 0.58, 0.59, 0.60,
           0.61, 0.62, 0.63, 0.64, 0.65, 0.66, 0.67, 0.68, 0.69, 0.70,
           0.71, 0.72, 0.73, 0.74, 0.75, 0.76, 0.77, 0.78, 0.79, 0.80,
           0.81, 0.82, 0.83, 0.84, 0.85, 0.86, 0.87, 0.88, 0.89, 0.90,
           0.91, 0.92, 0.93, 0.94, 0.95, 0.96, 0.97, 0.98, 0.99, 1.00,
           0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10,
           0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18, 0.19, 0.20,
           0.21, 0.22, 0.23, 0.24, 0.25, 0.26, 0.27, 0.28]::vector
WHERE NOT EXISTS (
    SELECT 1 FROM faces WHERE user_id = '880e8400-e29b-41d4-a716-446655440001'
);

-- Display summary of created data
SELECT 'Seed data created successfully!' as message;
SELECT 'Default admin user: admin@mindaccess.com (password: admin123)' as admin_info;
SELECT 'Total roles created: ' || COUNT(*) as roles_count FROM roles_catalog;
SELECT 'Total user statuses created: ' || COUNT(*) as statuses_count FROM user_statuses_catalog;
SELECT 'Total zones created: ' || COUNT(*) as zones_count FROM zones;
SELECT 'Total users created: ' || COUNT(*) as users_count FROM users;
SELECT 'Total zone access records: ' || COUNT(*) as access_count FROM user_zone_access;
SELECT 'Total face embeddings: ' || COUNT(*) as faces_count FROM faces;
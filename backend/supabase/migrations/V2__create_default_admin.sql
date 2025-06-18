-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create admin role if it doesn't exist
INSERT INTO public.roles (name, description)
VALUES ('admin', 'Administrator with full access')
ON CONFLICT (name) DO NOTHING;

-- Create default admin user in auth.users and public.users
DO $$
DECLARE
    admin_user_id uuid;
    admin_role_id uuid;
BEGIN
    -- Check if admin user already exists
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'admin@example.com';

    -- If admin user doesn't exist, create it
    IF admin_user_id IS NULL THEN
        -- Generate a new UUID for the user
        admin_user_id := uuid_generate_v4();

        -- Create user in auth.users
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            admin_user_id,
            'authenticated',
            'authenticated',
            'admin@example.com',
            crypt('admin123', gen_salt('bf')), -- This is a temporary password, should be changed immediately
            now(),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Admin User"}',
            now(),
            now(),
            '',
            '',
            '',
            ''
        );

        -- Create user in public.users
        INSERT INTO public.users (
            id,
            email,
            password_hash,
            first_name,
            last_name,
            created_at,
            updated_at
        ) VALUES (
            admin_user_id,
            'admin@example.com',
            crypt('admin123', gen_salt('bf')),
            'Admin',
            'User',
            now(),
            now()
        );
    END IF;

    -- Get the admin role's ID
    SELECT id INTO admin_role_id
    FROM public.roles
    WHERE name = 'admin';

    -- Assign admin role to the user
    IF admin_user_id IS NOT NULL AND admin_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (admin_user_id, admin_role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
END $$; 
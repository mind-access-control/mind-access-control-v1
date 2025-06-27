-- Initial database schema for Mind Access Control System
-- This migration creates all necessary tables for user management

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Create roles_catalog table
CREATE TABLE IF NOT EXISTS roles_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_statuses_catalog table
CREATE TABLE IF NOT EXISTS user_statuses_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create zones table
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    profile_picture_url TEXT,
    access_method VARCHAR(50) DEFAULT 'facial',
    role_id UUID REFERENCES roles_catalog(id),
    status_id UUID REFERENCES user_statuses_catalog(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_zone_access table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_zone_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, zone_id)
);

-- Create faces table for facial embeddings
CREATE TABLE IF NOT EXISTS faces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    embedding vector(128), -- 128-dimensional face embedding
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status_id ON users(status_id);
CREATE INDEX IF NOT EXISTS idx_user_zone_access_user_id ON user_zone_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_zone_access_zone_id ON user_zone_access(zone_id);
CREATE INDEX IF NOT EXISTS idx_faces_user_id ON faces(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_zone_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE faces ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_statuses_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - Updated for edge function compatibility
-- Allow service role to access all tables
CREATE POLICY "Allow all operations for service role" ON users 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow all operations for service role" ON user_zone_access 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow all operations for service role" ON faces 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all data" ON roles_catalog 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all data" ON user_statuses_catalog 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all data" ON zones 
FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read their own data
CREATE POLICY "Users can read their own data" ON users 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can read their own zone access" ON user_zone_access 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read their own face data" ON faces 
FOR SELECT USING (auth.uid() = user_id);

-- Allow public read access to catalogs and zones (for dropdowns, etc.)
CREATE POLICY "Public can read roles catalog" ON roles_catalog 
FOR SELECT USING (true);

CREATE POLICY "Public can read user statuses catalog" ON user_statuses_catalog 
FOR SELECT USING (true);

CREATE POLICY "Public can read zones" ON zones 
FOR SELECT USING (true);

-- Additional policies to allow edge functions to insert data
CREATE POLICY "Allow edge functions to insert users" ON users 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow edge functions to insert zone access" ON user_zone_access 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow edge functions to insert faces" ON faces 
FOR INSERT WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_roles_catalog_updated_at BEFORE UPDATE ON roles_catalog FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_statuses_catalog_updated_at BEFORE UPDATE ON user_statuses_catalog FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON zones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 
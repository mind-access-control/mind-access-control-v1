-- Create zones table
CREATE TABLE IF NOT EXISTS public.zones (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    description text,
    access_level integer NOT NULL DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create trigger for updated_at
CREATE TRIGGER update_zones_updated_at
    BEFORE UPDATE ON public.zones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some default zones
INSERT INTO public.zones (name, description, access_level) VALUES
    ('Main Entrance', 'Primary building entrance', 1),
    ('Office Area', 'General office workspace', 2),
    ('Server Room', 'IT infrastructure area', 3),
    ('Executive Suite', 'Senior management offices', 4),
    ('Parking Garage', 'Employee parking area', 1)
ON CONFLICT (name) DO NOTHING; 
-- Create access_logs table
CREATE TABLE IF NOT EXISTS public.access_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    zone text NOT NULL,
    method text NOT NULL,
    status text NOT NULL,
    timestamp timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for access logs
CREATE POLICY "Users can view their own access logs" ON public.access_logs
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- Create policy for admins to view all access logs
CREATE POLICY "Admins can view all access logs" ON public.access_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name = 'admin'
        )
    ); 
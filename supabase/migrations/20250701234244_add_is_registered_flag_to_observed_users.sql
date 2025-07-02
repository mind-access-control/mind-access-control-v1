-- Add the is_registered column to the public.observed_users table
ALTER TABLE public.observed_users
ADD COLUMN is_registered BOOLEAN DEFAULT FALSE;

-- Optionally, you can add an index for performance if you expect
-- a very large number of observed users and frequent filtering by this column.
-- CREATE INDEX idx_observed_users_is_registered ON public.observed_users (is_registered);
-- Add the observed_user_source_id column to the public.users table
ALTER TABLE public.users
ADD COLUMN observed_user_source_id UUID;

-- Optionally, add a foreign key constraint if you want to enforce
-- that observed_user_source_id must exist in public.observed_users.id
-- This might be tricky if you have existing users in 'users' that didn't
-- originate from 'observed_users'. Consider adding it after careful review.
-- ALTER TABLE public.users
-- ADD CONSTRAINT fk_observed_user_source
-- FOREIGN KEY (observed_user_source_id) REFERENCES public.observed_users(id);

-- Also, consider adding an index for performance if you plan to frequently
-- query users based on their observed_user_source_id
-- CREATE INDEX idx_users_observed_user_source_id ON public.users (observed_user_source_id);
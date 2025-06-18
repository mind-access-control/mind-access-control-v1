-- Create user_faces table to store face images and embeddings for users
CREATE TABLE IF NOT EXISTS public.user_faces (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    image_url text NOT NULL, -- URL to the face image in object storage
    embedding float8[] NOT NULL, -- Array of floats for the face embedding
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Optional: Add an index for faster lookup by user_id
CREATE INDEX IF NOT EXISTS user_faces_user_id_idx ON public.user_faces(user_id); 
-- Add face matching function for facial recognition
-- This function compares face embeddings and returns matches based on similarity threshold

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS match_face_embedding(vector(128), FLOAT, INTEGER);

-- Ensure vector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

CREATE OR REPLACE FUNCTION match_face_embedding(
    query_embedding vector(128),
    match_threshold FLOAT DEFAULT 0.6,
    match_count INTEGER DEFAULT 1
)
RETURNS TABLE (
    user_id UUID,
    distance FLOAT,
    full_name TEXT,
    email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.user_id,
        (f.embedding <=> query_embedding)::float AS distance,
        u.full_name::text AS full_name,
        u.id::TEXT AS email
    FROM faces f
    JOIN users u ON f.user_id = u.id
    WHERE (f.embedding <=> query_embedding) < match_threshold
    ORDER BY distance ASC
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Create a simple index for better performance on face matching
-- Using a regular index instead of ivfflat to avoid compatibility issues
CREATE INDEX IF NOT EXISTS idx_faces_embedding_simple ON faces USING btree (user_id); 
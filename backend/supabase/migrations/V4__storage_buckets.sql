-- Create storage bucket for user photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-photos', 'user-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the user-photos bucket
CREATE POLICY "Allow public read access to user photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-photos');

CREATE POLICY "Allow authenticated users to upload their own photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-photos' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow users to update their own photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-photos' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow users to delete their own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-photos' AND
  auth.role() = 'authenticated'
); 
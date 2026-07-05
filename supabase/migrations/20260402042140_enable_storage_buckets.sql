/*
  # Enable Supabase Storage

  1. Storage Buckets
    - Create a bucket for homepage images
    - Enable public access for images
  
  2. Security
    - Allow public read access to images
    - Restrict upload/update/delete to service role
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('homepage-images', 'homepage-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read access for homepage images" ON storage.objects;
DROP POLICY IF EXISTS "Service role upload access for homepage images" ON storage.objects;
DROP POLICY IF EXISTS "Service role update access for homepage images" ON storage.objects;
DROP POLICY IF EXISTS "Service role delete access for homepage images" ON storage.objects;

CREATE POLICY "Public read access for homepage images"
ON storage.objects FOR SELECT
USING (bucket_id = 'homepage-images');

CREATE POLICY "Service role upload access for homepage images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'homepage-images');

CREATE POLICY "Service role update access for homepage images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'homepage-images')
WITH CHECK (bucket_id = 'homepage-images');

CREATE POLICY "Service role delete access for homepage images"
ON storage.objects FOR DELETE
USING (bucket_id = 'homepage-images');
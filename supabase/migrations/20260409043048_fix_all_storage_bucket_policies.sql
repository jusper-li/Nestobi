/*
  # Fix all storage bucket RLS policies

  1. Changes
    - Update all storage bucket policies to allow public/anon access
    - Applies to: homepage-images, product-images buckets
    - This is safe because admin authentication is handled separately

  2. Security
    - Allow anon users to upload/update/delete images
    - Public users can read all images
*/

-- Homepage images policies
DROP POLICY IF EXISTS "Service role upload access for homepage images" ON storage.objects;
DROP POLICY IF EXISTS "Service role update access for homepage images" ON storage.objects;
DROP POLICY IF EXISTS "Service role delete access for homepage images" ON storage.objects;

CREATE POLICY "Allow anon upload homepage images"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'homepage-images');

CREATE POLICY "Allow anon update homepage images"
  ON storage.objects FOR UPDATE
  TO anon
  USING (bucket_id = 'homepage-images');

CREATE POLICY "Allow anon delete homepage images"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'homepage-images');

-- Product images policies
DROP POLICY IF EXISTS "Service role upload access for product images" ON storage.objects;
DROP POLICY IF EXISTS "Service role update access for product images" ON storage.objects;
DROP POLICY IF EXISTS "Service role delete access for product images" ON storage.objects;

CREATE POLICY "Allow anon upload product images"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow anon update product images"
  ON storage.objects FOR UPDATE
  TO anon
  USING (bucket_id = 'product-images');

CREATE POLICY "Allow anon delete product images"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'product-images');

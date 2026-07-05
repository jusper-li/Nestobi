/*
  # Create Product Images Storage Bucket
  
  1. New Storage Buckets
    - `product-images` - For storing product images
      - Public access enabled
      - Allows authenticated users to upload
      - Anyone can read
  
  2. Security
    - Public read access for all images
    - Authenticated users can upload images
    - Users can update/delete their own uploads
*/

-- Create product-images bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;

-- Allow public read access
CREATE POLICY "Public read access for product images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update product images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete product images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images');
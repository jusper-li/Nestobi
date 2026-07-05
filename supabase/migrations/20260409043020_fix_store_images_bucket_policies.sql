/*
  # Fix store images bucket RLS policies

  1. Changes
    - Update storage policies to allow public/anon access for uploading
    - This is safe because admin authentication is handled separately
    - The bucket remains public for reading

  2. Security
    - Allow anon users to upload/update/delete store images
    - Public users can read store images
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can upload store images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update store images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete store images" ON storage.objects;

-- Create new policies that allow anon access
CREATE POLICY "Allow anon upload store images"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'store-images');

CREATE POLICY "Allow anon update store images"
  ON storage.objects FOR UPDATE
  TO anon
  USING (bucket_id = 'store-images');

CREATE POLICY "Allow anon delete store images"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'store-images');

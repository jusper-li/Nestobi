/*
  # Create store images storage bucket

  1. New Storage Bucket
    - `store-images` bucket for store photos
  
  2. Security
    - Enable public access for reading store images
    - Authenticated users can upload/update/delete images
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('store-images', 'store-images', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access for store images'
  ) THEN
    CREATE POLICY "Public read access for store images"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'store-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload store images'
  ) THEN
    CREATE POLICY "Authenticated users can upload store images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'store-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update store images'
  ) THEN
    CREATE POLICY "Authenticated users can update store images"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'store-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete store images'
  ) THEN
    CREATE POLICY "Authenticated users can delete store images"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'store-images');
  END IF;
END $$;
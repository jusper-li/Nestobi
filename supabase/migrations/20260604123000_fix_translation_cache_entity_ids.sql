/*
  # Fix translation cache entity ids

  content_translations is shared by rooms, products, blog posts, categories,
  stores, and other translated entities. Some entity ids are UUIDs, while blog
  category ids can be stable slugs. Store entity_id as text so all entity types
  can use the same translation cache.
*/

DO $$
BEGIN
  IF to_regclass('public.content_translations') IS NOT NULL THEN
    ALTER TABLE public.content_translations
      ALTER COLUMN entity_id TYPE text
      USING entity_id::text;

    GRANT SELECT ON TABLE public.content_translations TO anon, authenticated;
    GRANT INSERT, UPDATE ON TABLE public.content_translations TO authenticated;

    DROP POLICY IF EXISTS "Authenticated cache content translations" ON public.content_translations;
    CREATE POLICY "Authenticated cache content translations"
      ON public.content_translations
      FOR INSERT
      TO authenticated
      WITH CHECK (is_manual = false);

    DROP POLICY IF EXISTS "Authenticated update cached content translations" ON public.content_translations;
    CREATE POLICY "Authenticated update cached content translations"
      ON public.content_translations
      FOR UPDATE
      TO authenticated
      USING (is_manual = false)
      WITH CHECK (is_manual = false);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.translation_cache') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.translation_cache TO anon, authenticated;
    GRANT INSERT, UPDATE ON TABLE public.translation_cache TO authenticated;

    DROP POLICY IF EXISTS "Authenticated write translation cache" ON public.translation_cache;
    CREATE POLICY "Authenticated write translation cache"
      ON public.translation_cache
      FOR INSERT
      TO authenticated
      WITH CHECK (true);

    DROP POLICY IF EXISTS "Authenticated update translation cache" ON public.translation_cache;
    CREATE POLICY "Authenticated update translation cache"
      ON public.translation_cache
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

/*
  # Harden legacy RLS policies

  Removes unrestricted legacy write policies reported by Supabase advisors,
  keeps public read where the product needs it, and fixes translation helper
  function search_path / execute exposure.
*/

CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tbl_user_auth ua
    WHERE ua.user_id = _uid
      AND ua.role IN ('admin', 'superadmin')
      AND ua.is_active = true
  );
$$;

DO $$
BEGIN
  IF to_regclass('public.app_secrets') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.app_secrets FROM anon, authenticated;
    DROP POLICY IF EXISTS "Deny client access to app secrets" ON public.app_secrets;
    CREATE POLICY "Deny client access to app secrets"
      ON public.app_secrets
      FOR SELECT
      TO anon, authenticated
      USING (false);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.content_translations') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON TABLE public.content_translations FROM anon;
    GRANT SELECT ON TABLE public.content_translations TO anon, authenticated;
    GRANT INSERT, UPDATE, DELETE ON TABLE public.content_translations TO authenticated;

    DROP POLICY IF EXISTS "Public insert content translations" ON public.content_translations;
    DROP POLICY IF EXISTS "Public write content translations" ON public.content_translations;
    DROP POLICY IF EXISTS "Public update content translations" ON public.content_translations;
    DROP POLICY IF EXISTS "Superadmin update content translations" ON public.content_translations;
    DROP POLICY IF EXISTS "Superadmin delete content translations" ON public.content_translations;
    DROP POLICY IF EXISTS "Admins manage content translations" ON public.content_translations;

    CREATE POLICY "Admins manage content translations"
      ON public.content_translations
      FOR ALL
      TO authenticated
      USING (public.is_admin_or_superadmin((SELECT auth.uid())))
      WITH CHECK (public.is_admin_or_superadmin((SELECT auth.uid())));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.translation_cache') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON TABLE public.translation_cache FROM anon;
    GRANT SELECT ON TABLE public.translation_cache TO anon, authenticated;
    GRANT INSERT, UPDATE, DELETE ON TABLE public.translation_cache TO authenticated;

    DROP POLICY IF EXISTS "Public write translation cache" ON public.translation_cache;
    DROP POLICY IF EXISTS "Public update translation cache" ON public.translation_cache;
    DROP POLICY IF EXISTS "Admins manage translation cache" ON public.translation_cache;

    CREATE POLICY "Admins manage translation cache"
      ON public.translation_cache
      FOR ALL
      TO authenticated
      USING (public.is_admin_or_superadmin((SELECT auth.uid())))
      WITH CHECK (public.is_admin_or_superadmin((SELECT auth.uid())));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.properties') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.properties TO anon, authenticated;
    GRANT INSERT, UPDATE, DELETE ON TABLE public.properties TO authenticated;

    DROP POLICY IF EXISTS "Authenticated users can insert properties" ON public.properties;
    DROP POLICY IF EXISTS "Authenticated users can update properties" ON public.properties;
    DROP POLICY IF EXISTS "Authenticated users can delete properties" ON public.properties;
    DROP POLICY IF EXISTS "Admins can insert properties" ON public.properties;
    DROP POLICY IF EXISTS "Admins can update properties" ON public.properties;
    DROP POLICY IF EXISTS "Admins can delete properties" ON public.properties;

    CREATE POLICY "Admins can insert properties"
      ON public.properties
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin_or_superadmin((SELECT auth.uid())));

    CREATE POLICY "Admins can update properties"
      ON public.properties
      FOR UPDATE
      TO authenticated
      USING (public.is_admin_or_superadmin((SELECT auth.uid())))
      WITH CHECK (public.is_admin_or_superadmin((SELECT auth.uid())));

    CREATE POLICY "Admins can delete properties"
      ON public.properties
      FOR DELETE
      TO authenticated
      USING (public.is_admin_or_superadmin((SELECT auth.uid())));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.verification_codes') IS NOT NULL THEN
    REVOKE SELECT, UPDATE, DELETE ON TABLE public.verification_codes FROM anon, authenticated;
    GRANT INSERT ON TABLE public.verification_codes TO anon, authenticated;

    DROP POLICY IF EXISTS "Anyone can insert verification codes" ON public.verification_codes;
    DROP POLICY IF EXISTS "Anyone can read verification codes by email" ON public.verification_codes;
    DROP POLICY IF EXISTS "Anyone can update verification codes" ON public.verification_codes;
    DROP POLICY IF EXISTS "Constrained public insert verification codes" ON public.verification_codes;

    CREATE POLICY "Constrained public insert verification codes"
      ON public.verification_codes
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
        AND code ~ '^[0-9]{6}$'
        AND expires_at > now()
        AND expires_at <= now() + interval '15 minutes'
        AND coalesce(used, false) = false
        AND coalesce(attempts, 0) = 0
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enqueue_translation_job(
  _entity_type text,
  _entity_id uuid,
  _source_payload jsonb,
  _source_lang text DEFAULT 'zh-TW',
  _target_langs text[] DEFAULT '{en,ja,th,ms}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _source_hash text;
BEGIN
  _source_hash := encode(digest(coalesce(_source_payload::text, ''), 'sha256'), 'hex');

  INSERT INTO public.translation_jobs (
    entity_type,
    entity_id,
    source_hash,
    source_payload,
    source_lang,
    target_langs,
    status
  )
  VALUES (
    _entity_type,
    _entity_id,
    _source_hash,
    coalesce(_source_payload, '{}'::jsonb),
    _source_lang,
    _target_langs,
    'pending'
  )
  ON CONFLICT (entity_type, entity_id, source_hash, status)
  WHERE status IN ('pending', 'processing')
  DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_translation_job(text, uuid, jsonb, text, text[]) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_translation_job(text, uuid, jsonb, text, text[]) TO postgres, service_role;

CREATE OR REPLACE FUNCTION public.trg_enqueue_product_translation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.enqueue_translation_job(
    'product',
    new.id,
    jsonb_build_object(
      'name', coalesce(new.name, ''),
      'description', coalesce(new.description, ''),
      'origin', coalesce(new.origin, ''),
      'roast_level', coalesce(new.roast_level, ''),
      'processing_method', coalesce(new.processing_method, ''),
      'flavor_notes', coalesce(to_jsonb(new.flavor_notes), '[]'::jsonb),
      'tags', coalesce(to_jsonb(new.tags), '[]'::jsonb)
    )
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_enqueue_category_translation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.enqueue_translation_job(
    'category',
    new.id,
    jsonb_build_object('name', coalesce(new.name, ''))
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_enqueue_room_translation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.enqueue_translation_job(
    'room',
    new.id,
    jsonb_build_object(
      'name', coalesce(new.name, ''),
      'description', coalesce(new.description, ''),
      'location', coalesce(new.location, ''),
      'amenities', coalesce(to_jsonb(new.amenities), '[]'::jsonb)
    )
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_enqueue_blog_translation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.enqueue_translation_job(
    'blog_post',
    new.id,
    jsonb_build_object(
      'title', coalesce(new.title, ''),
      'excerpt', coalesce(new.excerpt, ''),
      'content', coalesce(new.content, ''),
      'category', coalesce(new.category, ''),
      'author_name', coalesce(new.author_name, ''),
      'tags', coalesce(to_jsonb(new.tags), '[]'::jsonb)
    )
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_enqueue_static_page_translation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.enqueue_translation_job(
    'static_page',
    new.id,
    jsonb_build_object(
      'title', coalesce(new.title, ''),
      'content', coalesce(new.content, ''),
      'meta_description', coalesce(new.meta_description, '')
    )
  );
  RETURN new;
END;
$$;

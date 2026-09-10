/* Fixed, opaque QR entry point for each store. */
CREATE TABLE IF NOT EXISTS public.store_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_location_id uuid NOT NULL UNIQUE REFERENCES public.store_locations(id) ON DELETE CASCADE,
  public_token text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_qr_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_qr_codes FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS store_qr_codes_active_token_idx ON public.store_qr_codes(public_token) WHERE is_active;

CREATE OR REPLACE FUNCTION public.ensure_store_qr_code(p_store_location_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE v_token text; v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_manage_store(p_store_location_id, 'info') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT id, public_token INTO v_id, v_token FROM public.store_qr_codes WHERE store_location_id = p_store_location_id AND is_active FOR UPDATE;
  IF v_id IS NULL THEN
    v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    INSERT INTO public.store_qr_codes(store_location_id, public_token) VALUES (p_store_location_id, v_token) RETURNING id INTO v_id;
  END IF;
  RETURN jsonb_build_object('success', true, 'id', v_id, 'storeId', p_store_location_id, 'publicToken', v_token);
END;
$$;

CREATE OR REPLACE FUNCTION public.regenerate_store_qr_code(p_store_location_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''); v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_manage_store(p_store_location_id, 'info') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.store_qr_codes(store_location_id, public_token, is_active) VALUES (p_store_location_id, v_token, true)
  ON CONFLICT (store_location_id) DO UPDATE SET public_token = EXCLUDED.public_token, is_active = true, updated_at = now()
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id, 'storeId', p_store_location_id, 'publicToken', v_token);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_store_by_qr_token(p_public_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_store public.store_locations%ROWTYPE;
BEGIN
  SELECT s.* INTO v_store FROM public.store_qr_codes q JOIN public.store_locations s ON s.id = q.store_location_id WHERE q.public_token = trim(p_public_token) AND q.is_active AND s.is_active;
  IF v_store.id IS NULL THEN RAISE EXCEPTION 'Store QR code is invalid'; END IF;
  RETURN jsonb_build_object('success', true, 'storeId', v_store.id, 'storeName', v_store.name, 'storeImageUrl', v_store.image_url, 'city', v_store.city, 'district', v_store.district, 'address', v_store.address, 'phone', v_store.phone, 'hours', v_store.hours);
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_store_qr_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_store_qr_code(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.regenerate_store_qr_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regenerate_store_qr_code(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_store_by_qr_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_store_by_qr_token(text) TO anon, authenticated;

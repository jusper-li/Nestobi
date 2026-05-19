/*
  # Create store locations

  Adds structured store locator data for the public store page and the
  superadmin store-location management screen.

  Supabase Data API access is explicit here: GRANT controls table reachability,
  while RLS policies control row-level access.
*/

CREATE TABLE IF NOT EXISTS public.store_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text NOT NULL DEFAULT '',
  slug text NOT NULL UNIQUE,
  city text NOT NULL DEFAULT '',
  district text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_url text NOT NULL DEFAULT '',
  map_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  source_url text NOT NULL DEFAULT '',
  source_image_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_locations_active_sort
  ON public.store_locations (is_active, sort_order, name);

ALTER TABLE public.store_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active store locations" ON public.store_locations;
CREATE POLICY "Public can read active store locations"
  ON public.store_locations FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Superadmins can read all store locations" ON public.store_locations;
CREATE POLICY "Superadmins can read all store locations"
  ON public.store_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role = 'superadmin'
        AND tbl_user_auth.is_active = true
    )
  );

DROP POLICY IF EXISTS "Superadmins can insert store locations" ON public.store_locations;
CREATE POLICY "Superadmins can insert store locations"
  ON public.store_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role = 'superadmin'
        AND tbl_user_auth.is_active = true
    )
  );

DROP POLICY IF EXISTS "Superadmins can update store locations" ON public.store_locations;
CREATE POLICY "Superadmins can update store locations"
  ON public.store_locations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role = 'superadmin'
        AND tbl_user_auth.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role = 'superadmin'
        AND tbl_user_auth.is_active = true
    )
  );

DROP POLICY IF EXISTS "Superadmins can delete store locations" ON public.store_locations;
CREATE POLICY "Superadmins can delete store locations"
  ON public.store_locations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role = 'superadmin'
        AND tbl_user_auth.is_active = true
    )
  );

GRANT SELECT ON TABLE public.store_locations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.store_locations TO authenticated;
GRANT ALL ON TABLE public.store_locations TO service_role;

INSERT INTO public.store_locations (
  name, name_en, slug, city, district, address, phone, hours, image_url, map_url,
  sort_order, is_active, source_url, source_image_url
) VALUES
(
  '信義官方旗艦店',
  'Xinyi Official Flagship Store',
  'xinyi-official-flagship-store',
  '台北市',
  '信義區',
  'No. 4-1, Aly. 22, Ln. 553, Sec.4, Zhongxiao E. Rd., Xinyi Dist., Taipei City, Taiwan',
  '+886-2-2756-5663',
  '{"primary":"Sunday to Thursday 09:00-20:00","secondary":"Friday & Saturday 10:00-21:00"}'::jsonb,
  '/stores/dlal-xinyi-flagship.webp',
  'https://www.google.com/maps/search/?api=1&query=No.%204-1%2C%20Aly.%2022%2C%20Ln.%20553%2C%20Sec.4%2C%20Zhongxiao%20E.%20Rd.%2C%20Xinyi%20Dist.%2C%20Taipei%20City%2C%20Taiwan',
  0,
  true,
  'https://www.dlalshop.com/pages/store-locator',
  'https://shoplineimg.com/6007e2477c614a00198d7b0f/662e01f842d018002394672a/750x.webp?source_format=jpg'
),
(
  '長春門市',
  'Changchun Store',
  'changchun-store',
  '台北市',
  '中山區',
  'No. 7, Ln. 137, Changchun Rd., Zhongshan Dist., Taipei City, Taiwan',
  '+886-2-2562-7670',
  '{"primary":"Monday to Friday 08:00-18:00","secondary":"Saturday & Sunday 09:00-18:00"}'::jsonb,
  '/stores/dlal-changchun.webp',
  'https://www.google.com/maps/search/?api=1&query=No.%207%2C%20Ln.%20137%2C%20Changchun%20Rd.%2C%20Zhongshan%20Dist.%2C%20Taipei%20City%2C%20Taiwan',
  1,
  true,
  'https://www.dlalshop.com/pages/store-locator',
  'https://shoplineimg.com/6007e2477c614a00198d7b0f/662e035725224ebb70cc5051/750x.webp?source_format=jpg'
),
(
  '南港中信金融園區門市',
  'Nangang CTBC Financial Park Store',
  'nangang-ctbc-financial-park-store',
  '台北市',
  '南港區',
  '(Counter B101) 1F., No. 188, Jingmao 2nd Rd., Nangang Dist., Taipei City, Taiwan',
  '+886-2-2789-0188',
  '{"primary":"Monday to Sunday 08:00-20:00"}'::jsonb,
  '/stores/dlal-nangang-ctbc.webp',
  'https://www.google.com/maps/search/?api=1&query=1F.%2C%20No.%20188%2C%20Jingmao%202nd%20Rd.%2C%20Nangang%20Dist.%2C%20Taipei%20City%2C%20Taiwan',
  2,
  true,
  'https://www.dlalshop.com/pages/store-locator',
  'https://shoplineimg.com/6007e2477c614a00198d7b0f/662e04e451874900179f71ad/750x.webp?source_format=jpg'
),
(
  '內湖昇恆昌門市',
  'Neihu Sheng Hengchang Store',
  'neihu-sheng-hengchang-store',
  '台北市',
  '內湖區',
  'No. 129, Jinzhuang Road, Neihu District, Taipei City, Taiwan',
  '+886-2-2794-9796',
  '{"primary":"Monday to Sunday 10:00-21:00"}'::jsonb,
  '/stores/dlal-neihu-ever-rich.webp',
  'https://www.google.com/maps/search/?api=1&query=No.%20129%2C%20Jinzhuang%20Road%2C%20Neihu%20District%2C%20Taipei%20City%2C%20Taiwan',
  3,
  true,
  'https://www.dlalshop.com/pages/store-locator',
  'https://shoplineimg.com/6007e2477c614a00198d7b0f/662e061b456b1c001d9392ad/750x.webp?source_format=jpg'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  city = EXCLUDED.city,
  district = EXCLUDED.district,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  hours = EXCLUDED.hours,
  image_url = EXCLUDED.image_url,
  map_url = EXCLUDED.map_url,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  source_url = EXCLUDED.source_url,
  source_image_url = EXCLUDED.source_image_url,
  updated_at = now();

NOTIFY pgrst, 'reload schema';

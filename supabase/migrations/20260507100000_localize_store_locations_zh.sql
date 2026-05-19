/*
  # Localize store locations to Traditional Chinese

  The first import was pulled from the English locale. This migration restores
  the Traditional Chinese store names, Taiwanese address format, phone numbers,
  and business hours from the DLAL store-locator page.
*/

DO $$
BEGIN
  IF to_regclass('public.store_locations') IS NOT NULL THEN
    INSERT INTO public.store_locations (
      name, name_en, slug, city, district, address, phone, hours, image_url, map_url,
      sort_order, is_active, source_url, source_image_url
    ) VALUES
    (
      '信義品牌概念店',
      '',
      'xinyi-official-flagship-store',
      '台北市',
      '信義區',
      '台北市信義區忠孝東路四段553巷22弄4-1號',
      '02-2756-5663',
      '{"primary":"週日至週四 09:00-20:00","secondary":"週五＆週六 10:00-21:00"}'::jsonb,
      '/stores/dlal-xinyi-flagship.webp',
      'https://www.google.com/maps/search/?api=1&query=%E5%8F%B0%E5%8C%97%E5%B8%82%E4%BF%A1%E7%BE%A9%E5%8D%80%E5%BF%A0%E5%AD%9D%E6%9D%B1%E8%B7%AF%E5%9B%9B%E6%AE%B5553%E5%B7%B722%E5%BC%844-1%E8%99%9F',
      0,
      true,
      'https://www.dlalshop.com/pages/store-locator',
      'https://shoplineimg.com/6007e2477c614a00198d7b0f/662e01f842d018002394672a/750x.webp?source_format=jpg'
    ),
    (
      '長春店',
      '',
      'changchun-store',
      '台北市',
      '中山區',
      '台北市中山區長春路137巷7號',
      '02-2562-7670',
      '{"primary":"週一至週五 08:00-17:30","secondary":"週六＆週日 10:00-17:30"}'::jsonb,
      '/stores/dlal-changchun.webp',
      'https://www.google.com/maps/search/?api=1&query=%E5%8F%B0%E5%8C%97%E5%B8%82%E4%B8%AD%E5%B1%B1%E5%8D%80%E9%95%B7%E6%98%A5%E8%B7%AF137%E5%B7%B77%E8%99%9F',
      1,
      true,
      'https://www.dlalshop.com/pages/store-locator',
      'https://shoplineimg.com/6007e2477c614a00198d7b0f/662e035725224ebb70cc5051/750x.webp?source_format=jpg'
    ),
    (
      '南港中信店',
      '',
      'nangang-ctbc-financial-park-store',
      '台北市',
      '南港區',
      '台北市南港區經貿二路188號1樓(B101櫃位)',
      '02-2789-0188',
      '{"primary":"平日 07:30-19:00","secondary":"假日 08:30-19:00"}'::jsonb,
      '/stores/dlal-nangang-ctbc.webp',
      'https://www.google.com/maps/search/?api=1&query=%E5%8F%B0%E5%8C%97%E5%B8%82%E5%8D%97%E6%B8%AF%E5%8D%80%E7%B6%93%E8%B2%BF%E4%BA%8C%E8%B7%AF188%E8%99%9F1%E6%A8%93B101%E6%AB%83%E4%BD%8D',
      2,
      true,
      'https://www.dlalshop.com/pages/store-locator',
      'https://shoplineimg.com/6007e2477c614a00198d7b0f/662e04e451874900179f71ad/750x.webp?source_format=jpg'
    ),
    (
      '內湖昇恆昌店',
      '',
      'neihu-sheng-hengchang-store',
      '台北市',
      '內湖區',
      '台北市內湖區金莊路129號',
      '02-27949796',
      '{"primary":"週一到週五 10:30-19:30","secondary":"週六＆週日 10:00-21:00"}'::jsonb,
      '/stores/dlal-neihu-ever-rich.webp',
      'https://www.google.com/maps/search/?api=1&query=%E5%8F%B0%E5%8C%97%E5%B8%82%E5%85%A7%E6%B9%96%E5%8D%80%E9%87%91%E8%8E%8A%E8%B7%AF129%E8%99%9F',
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
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

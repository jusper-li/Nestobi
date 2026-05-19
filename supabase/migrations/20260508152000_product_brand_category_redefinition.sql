/*
  # Product brand category redefinition

  Rebuilds the DLAL brand facet from the official brand/category pages.
  Tea at all is restricted to the products listed on /categories/tea-at-all,
  while imported products that do not have a matching official child node are
  assigned to supplemental brand nodes so the brand filter can classify every
  listed item.
*/

CREATE TEMP TABLE _brand_defs (
  name text NOT NULL,
  slug text PRIMARY KEY,
  parent_slug text NOT NULL
) ON COMMIT DROP;

INSERT INTO _brand_defs (name, slug, parent_slug) VALUES
  ('Tea at all 茶根本', 'brand-tea-at-all', 'dlal-all-brands'),
  ('LIWEI COFFEE STAND', 'brand-liwei-coffee-stand', 'dlal-all-brands'),
  ('ABOUT US COFFEE', 'brand-about-us-coffee', 'dlal-all-brands'),
  ('WEEKENDERS COFFEE', 'brand-weekenders-coffee', 'dlal-all-brands'),
  ('LiLo Coffee Roasters', 'brand-lilo-coffee-roasters', 'dlal-all-brands'),
  ('Mel Coffee Roasters', 'brand-mel-coffee-roasters', 'dlal-all-brands'),
  ('Marumi Coffee', 'brand-marumi-coffee', 'dlal-all-brands'),
  ('MAME POLEPOLE 豆ポレポレ', 'brand-mame-polepole', 'dlal-all-brands'),
  ('Okinawa Cerrado Coffee', 'brand-okinawa-cerrado-coffee', 'dlal-all-brands'),
  ('Yoshiaki Imamura', 'brand-yoshiaki-imamura', 'dlal-all-brands'),
  ('SAZA COFFEE', 'brand-saza-coffee', 'dlal-all-brands'),
  ('WAKOYA', 'brand-wakoya', 'dlal-all-brands'),
  ('Bespoke Coffee Roasters', 'brand-bespoke-coffee-roasters', 'dlal-all-brands'),
  ('CACAOCAT', 'brand-cacaocat', 'dlal-all-brands'),
  ('FLAP COFFEE', 'brand-flap-coffee', 'dlal-all-brands'),
  ('GLITCH COFFEE & ROASTERS', 'brand-glitch-coffee-roasters', 'dlal-all-brands'),
  ('ITUKA COFFEE', 'brand-ituka-coffee', 'dlal-all-brands'),
  ('K COFFEE', 'brand-k-coffee', 'dlal-all-brands'),
  ('Wakamizu Brew', 'brand-wakamizu-brew', 'dlal-all-brands'),
  ('TOKADO COFFEE', 'brand-tokado-coffee', 'dlal-all-brands'),
  ('Gion Kitagawa Hanbee', 'brand-gion-kitagawa-hanbee', 'dlal-all-brands'),
  ('LANDMADE', 'brand-landmade', 'dlal-all-brands'),
  ('Rootopia', 'brand-rootopia', 'dlal-all-brands'),
  ('HARIO', 'brand-hario', 'dlal-all-brands'),
  ('TOAST', 'brand-toast', 'dlal-all-brands'),
  ('TRSC X ORIGAMI', 'brand-trsc-origami', 'dlal-all-brands'),
  ('LUMI UMI', 'brand-lumi-umi', 'dlal-all-brands'),
  ('台灣山系列', 'brand-taiwan-mountain-series', 'dlal-all-brands'),
  ('根本在旅行', 'brand-drink-like-a-local', 'dlal-all-brands'),
  ('DLAL 選品', 'brand-dlal-select', 'dlal-all-brands')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    parent_slug = EXCLUDED.parent_slug;

UPDATE categories
SET name = 'DLAL 品牌分類',
    updated_at = now()
WHERE slug = 'dlal-all-brands';

INSERT INTO categories (name, slug, parent_id, updated_at)
SELECT d.name, d.slug, p.id, now()
FROM _brand_defs d
JOIN categories p ON p.slug = d.parent_slug
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    updated_at = now();

WITH official_tea AS (
  SELECT p.id
  FROM products p
  WHERE lower(coalesce(p.source_url, '')) LIKE '%/products/tea-at-all-%'
     OR p.name LIKE '茶根本 - %'
),
rootopia AS (
  SELECT p.id
  FROM products p
  WHERE lower(coalesce(p.source_url, '')) LIKE '%rootopia%'
     OR p.name ILIKE 'Rootopia%'
),
primary_updates AS (
  SELECT
    p.id,
    CASE
      WHEN r.id IS NOT NULL THEN 'brand-rootopia'
      ELSE 'brand-tea-at-all'
    END AS category_slug
  FROM products p
  LEFT JOIN official_tea t ON t.id = p.id
  LEFT JOIN rootopia r ON r.id = p.id
  WHERE t.id IS NOT NULL OR r.id IS NOT NULL
)
UPDATE products p
SET category_id = c.id,
    updated_at = now()
FROM primary_updates u
JOIN categories c ON c.slug = u.category_slug
WHERE p.id = u.id;

WITH dlal_products AS (
  SELECT id
  FROM products
  WHERE lower(coalesce(source_url, '')) LIKE 'https://www.dlalshop.com/%'
)
DELETE FROM product_category_links pcl
USING dlal_products p, categories c
WHERE pcl.product_id = p.id
  AND pcl.category_id = c.id
  AND (c.slug = 'dlal-all-brands' OR c.slug LIKE 'brand-%');

WITH dlal_products AS (
  SELECT
    p.id,
    lower(coalesce(p.source_url, '')) AS source_url,
    coalesce(p.name, '') AS name
  FROM products p
  WHERE lower(coalesce(p.source_url, '')) LIKE 'https://www.dlalshop.com/%'
),
brand_assignments AS (
  SELECT
    id AS product_id,
    CASE
      WHEN source_url LIKE '%rootopia%' OR name ILIKE 'Rootopia%' THEN 'brand-rootopia'
      WHEN source_url LIKE '%/products/tea-at-all-%' OR name LIKE '茶根本 - %' THEN 'brand-tea-at-all'
      WHEN source_url LIKE '%about-us%' OR name ILIKE 'ABOUT US%' THEN 'brand-about-us-coffee'
      WHEN source_url LIKE '%cacaocat%' OR name ILIKE 'CACAOCAT%' THEN 'brand-cacaocat'
      WHEN source_url LIKE '%cerrado%' OR name ILIKE '%Cerrado%' THEN 'brand-okinawa-cerrado-coffee'
      WHEN source_url LIKE '%glitch%' OR name ILIKE 'GLITCH%' THEN 'brand-glitch-coffee-roasters'
      WHEN source_url LIKE '%hario%' OR name ILIKE 'Hario%' OR name ILIKE 'HARIO%' THEN 'brand-hario'
      WHEN source_url LIKE '%ituka%' OR name ILIKE 'ITUKA%' THEN 'brand-ituka-coffee'
      WHEN source_url LIKE '%landmade%' OR name ILIKE 'LANDMADE%' THEN 'brand-landmade'
      WHEN source_url LIKE '%lilo%' OR name ILIKE 'LiLo%' OR name ILIKE 'Lilo%' THEN 'brand-lilo-coffee-roasters'
      WHEN source_url LIKE '%liwei%' OR name ILIKE 'Liwei%' OR name ILIKE 'LIWEI%' THEN 'brand-liwei-coffee-stand'
      WHEN source_url LIKE '%lumiumi%' OR source_url LIKE '%lumi-umi%' OR name ILIKE 'LUMI UMI%' THEN 'brand-lumi-umi'
      WHEN source_url LIKE '%mame-polepole%' OR name ILIKE 'MAME POLEPOLE%' THEN 'brand-mame-polepole'
      WHEN source_url LIKE '%marumi%' OR name ILIKE 'Marumi%' THEN 'brand-marumi-coffee'
      WHEN source_url LIKE '%tokado%' OR name ILIKE 'TOKADO%' THEN 'brand-tokado-coffee'
      WHEN source_url LIKE '%toast%' OR name ILIKE 'TOAST%' THEN 'brand-toast'
      WHEN source_url LIKE '%trsc-origami%' OR name ILIKE 'TRSC X ORIGAMI%' THEN 'brand-trsc-origami'
      WHEN source_url LIKE '%weekenders%' OR name ILIKE 'Weekenders%' OR name ILIKE 'WEEKENDERS%' THEN 'brand-weekenders-coffee'
      WHEN source_url LIKE '%wakaya%' OR source_url LIKE '%wakoya%' OR name ILIKE 'WAKOYA%' THEN 'brand-wakoya'
      WHEN source_url LIKE '%imamura%' OR name ILIKE '%Yoshiaki Imamura%' OR name ILIKE '%今村%' THEN 'brand-yoshiaki-imamura'
      WHEN source_url LIKE '%taiwan-mountain-series%' OR name LIKE '台灣山系列%' THEN 'brand-taiwan-mountain-series'
      WHEN source_url LIKE '%drink-like-a-local%' OR source_url LIKE '%ryokodlal%' OR source_url LIKE '%cupping-spoon%' OR name LIKE '根本在旅行%' THEN 'brand-drink-like-a-local'
      ELSE 'brand-dlal-select'
    END AS brand_slug
  FROM dlal_products
),
brand_links AS (
  SELECT product_id, brand_slug AS category_slug FROM brand_assignments
  UNION ALL
  SELECT id AS product_id, 'dlal-all-brands' AS category_slug FROM dlal_products
)
INSERT INTO product_category_links (product_id, category_id)
SELECT b.product_id, c.id
FROM brand_links b
JOIN categories c ON c.slug = b.category_slug
ON CONFLICT DO NOTHING;

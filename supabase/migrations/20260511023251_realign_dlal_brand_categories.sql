/*
  # Realign DLAL brand categories

  Keeps the All Brands facet aligned with the official DLAL brand list shown on:
  https://www.dlalshop.com/categories/all-brands

  The brand facet should expose only the official brand children. Products that
  do not match one of those brands stay linked to the All Brands root so they
  remain visible from the top-level facet without creating extra brand buttons.
*/

CREATE TEMP TABLE _official_dlal_brands (
  slug text PRIMARY KEY,
  name text NOT NULL
) ON COMMIT DROP;

INSERT INTO _official_dlal_brands (slug, name) VALUES
  ('brand-tea-at-all', '根本茶DLAL'),
  ('brand-about-us-coffee', 'ABOUT US COFFEE'),
  ('brand-cacaocat', 'CACAOCAT'),
  ('brand-glitch-coffee-roasters', 'GLITCH COFFEE & ROASTERS'),
  ('brand-liwei-coffee-stand', 'LIWEI'),
  ('brand-ituka-coffee', 'ITUKA 珈琲屋'),
  ('brand-mame-polepole', 'MAME POLEPOLE 豆ポレポレ'),
  ('brand-lilo-coffee-roasters', 'LiLo Coffee Roasters'),
  ('brand-okinawa-cerrado-coffee', 'Okinawa Cerrado Coffee'),
  ('brand-wakamizu-brew', 'Wakamizu Brew'),
  ('brand-tokado-coffee', 'TOKADO 豆香洞'),
  ('brand-wakoya', 'WAKOYA 和珈屋'),
  ('brand-weekenders-coffee', 'WEEKENDERS COFFEE'),
  ('brand-marumi-coffee', 'Marumi Coffee 丸美珈琲店'),
  ('brand-yoshiaki-imamura', '今村能章');

UPDATE categories
SET name = 'DLAL 所有品牌',
    updated_at = now()
WHERE slug = 'dlal-all-brands';

INSERT INTO categories (name, slug, parent_id, updated_at)
SELECT brand.name, brand.slug, root.id, now()
FROM _official_dlal_brands brand
CROSS JOIN categories root
WHERE root.slug = 'dlal-all-brands'
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    updated_at = now();

WITH root AS (
  SELECT id FROM categories WHERE slug = 'dlal-all-brands'
),
obsolete_brand_categories AS (
  SELECT c.id
  FROM categories c
  JOIN root ON root.id = c.parent_id
  LEFT JOIN _official_dlal_brands official ON official.slug = c.slug
  WHERE official.slug IS NULL
)
UPDATE products p
SET category_id = root.id,
    updated_at = now()
FROM root, obsolete_brand_categories old
WHERE p.category_id = old.id;

WITH dlal_products AS (
  SELECT id
  FROM products
  WHERE lower(coalesce(source_url, '')) LIKE 'https://www.dlalshop.com/%'
),
root AS (
  SELECT id FROM categories WHERE slug = 'dlal-all-brands'
),
brand_scope AS (
  SELECT root.id FROM root
  UNION
  SELECT c.id FROM categories c JOIN root ON c.parent_id = root.id
)
DELETE FROM product_category_links links
USING dlal_products p, brand_scope scope
WHERE links.product_id = p.id
  AND links.category_id = scope.id;

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
      WHEN source_url LIKE '%tea-at-all%' OR name LIKE '茶根本%' THEN 'brand-tea-at-all'
      WHEN source_url LIKE '%about-us%' OR name ILIKE 'ABOUT US%' THEN 'brand-about-us-coffee'
      WHEN source_url LIKE '%cacaocat%' OR name ILIKE 'CACAOCAT%' THEN 'brand-cacaocat'
      WHEN source_url LIKE '%glitch%' OR name ILIKE 'GLITCH%' THEN 'brand-glitch-coffee-roasters'
      WHEN source_url LIKE '%liwei%' OR name ILIKE 'LIWEI%' THEN 'brand-liwei-coffee-stand'
      WHEN source_url LIKE '%ituka%' OR name ILIKE 'ITUKA%' THEN 'brand-ituka-coffee'
      WHEN source_url LIKE '%mame-polepole%' OR name ILIKE 'MAME POLEPOLE%' THEN 'brand-mame-polepole'
      WHEN source_url LIKE '%lilo%' OR name ILIKE 'LiLo%' OR name ILIKE 'Lilo%' THEN 'brand-lilo-coffee-roasters'
      WHEN source_url LIKE '%cerrado%' OR name ILIKE 'Cerrado%' THEN 'brand-okinawa-cerrado-coffee'
      WHEN source_url LIKE '%wakamizu%' OR name ILIKE 'Wakamizu%' THEN 'brand-wakamizu-brew'
      WHEN source_url LIKE '%tokado%' OR name ILIKE 'TOKADO%' THEN 'brand-tokado-coffee'
      WHEN source_url LIKE '%wakaya%' OR source_url LIKE '%wakoya%' OR name LIKE '和珈屋%' OR name ILIKE 'WAKOYA%' THEN 'brand-wakoya'
      WHEN source_url LIKE '%weekenders%' OR name ILIKE 'Weekenders%' OR name ILIKE 'WEEKENDERS%' THEN 'brand-weekenders-coffee'
      WHEN source_url LIKE '%marumi%' OR name ILIKE 'Marumi%' THEN 'brand-marumi-coffee'
      WHEN source_url LIKE '%imamura%' OR name LIKE '今村能章%' OR name ILIKE '%Yoshiaki Imamura%' THEN 'brand-yoshiaki-imamura'
      ELSE NULL
    END AS brand_slug
  FROM dlal_products
),
brand_links AS (
  SELECT id AS product_id, 'dlal-all-brands' AS category_slug FROM dlal_products
  UNION ALL
  SELECT product_id, brand_slug AS category_slug
  FROM brand_assignments
  WHERE brand_slug IS NOT NULL
)
INSERT INTO product_category_links (product_id, category_id)
SELECT links.product_id, categories.id
FROM brand_links links
JOIN categories ON categories.slug = links.category_slug
ON CONFLICT DO NOTHING;

WITH root AS (
  SELECT id FROM categories WHERE slug = 'dlal-all-brands'
)
DELETE FROM categories c
USING root
WHERE c.parent_id = root.id
  AND c.slug NOT IN (SELECT slug FROM _official_dlal_brands);

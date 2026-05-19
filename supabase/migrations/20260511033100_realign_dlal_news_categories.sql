/*
  # Realign DLAL news categories

  Keeps the DLAL News facet aligned with:
  https://www.dlalshop.com/categories/news

  The public shop shows these as direct child filters under "最新消息" rather than
  keeping the older nested Limited edition children. Products may be linked to
  multiple news facets when the official pages overlap.
*/

CREATE TEMP TABLE _official_dlal_news_categories (
  slug text PRIMARY KEY,
  name text NOT NULL
) ON COMMIT DROP;

INSERT INTO _official_dlal_news_categories (slug, name) VALUES
  ('news-subscription-selection', '📦 定期便選豆'),
  ('news-new-arrival', '新品入荷'),
  ('news-hot-sales', '熱銷追加'),
  ('news-limited-edition', '限定聯名'),
  ('news-limited-dlal', 'DLAL'),
  ('news-limited-trsc-origami', 'TRSC X ORIGAMI'),
  ('news-outlet-coffee-beans', 'Outlet咖啡豆專區'),
  ('news-limited-yoshiaki-imamura', '今村能章');

UPDATE categories
SET name = '最新消息',
    updated_at = now()
WHERE slug = 'dlal-news';

INSERT INTO categories (name, slug, parent_id, updated_at)
SELECT news.name, news.slug, root.id, now()
FROM _official_dlal_news_categories news
CROSS JOIN categories root
WHERE root.slug = 'dlal-news'
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    updated_at = now();

WITH root AS (
  SELECT id FROM categories WHERE slug = 'dlal-news'
),
obsolete_news_categories AS (
  SELECT c.id
  FROM categories c
  JOIN root ON c.parent_id = root.id
  LEFT JOIN _official_dlal_news_categories official ON official.slug = c.slug
  WHERE official.slug IS NULL
  UNION
  SELECT grandchild.id
  FROM categories child
  JOIN categories grandchild ON grandchild.parent_id = child.id
  JOIN root ON root.id = child.parent_id
  LEFT JOIN _official_dlal_news_categories official ON official.slug = grandchild.slug
  WHERE official.slug IS NULL
)
UPDATE products p
SET category_id = root.id,
    updated_at = now()
FROM root, obsolete_news_categories old
WHERE p.category_id = old.id;

WITH dlal_products AS (
  SELECT id
  FROM products
  WHERE lower(coalesce(source_url, '')) LIKE 'https://www.dlalshop.com/%'
),
root AS (
  SELECT id FROM categories WHERE slug = 'dlal-news'
),
news_scope AS (
  SELECT root.id FROM root
  UNION
  SELECT child.id FROM categories child JOIN root ON child.parent_id = root.id
  UNION
  SELECT grandchild.id
  FROM categories child
  JOIN categories grandchild ON grandchild.parent_id = child.id
  JOIN root ON child.parent_id = root.id
)
DELETE FROM product_category_links links
USING dlal_products p, news_scope scope
WHERE links.product_id = p.id
  AND links.category_id = scope.id;

WITH dlal_products AS (
  SELECT
    p.id,
    lower(coalesce(p.source_url, '')) AS source_url,
    coalesce(p.name, '') AS name,
    coalesce(p.tags, ARRAY[]::text[]) AS tags
  FROM products p
  WHERE lower(coalesce(p.source_url, '')) LIKE 'https://www.dlalshop.com/%'
),
news_products AS (
  SELECT DISTINCT id
  FROM dlal_products
  WHERE 'DLAL 最新消息' = ANY(tags)
     OR source_url LIKE '%try-our-monthly-subscription%'
     OR source_url LIKE '%landmade-%'
     OR source_url LIKE '%glitch-coffee-and-roasters%'
     OR source_url LIKE '%lumiumi%'
     OR source_url LIKE '%drink-like-a-local-taiwan-the-northpeace%'
     OR source_url LIKE '%cerrado-spring-season-limited%'
     OR source_url LIKE '%cerrado-coffee-blend-the-2nd%'
     OR source_url LIKE '%rootopia-pour-over-tea%'
     OR source_url LIKE '%about-us---season-limited%'
     OR source_url LIKE '%liwei-%'
     OR source_url LIKE '%tokado-haiti%'
     OR source_url LIKE '%marumi-coffee-%'
     OR source_url LIKE '%wakaya-odokomae%'
     OR source_url LIKE '%weekenders-opera-blend%'
     OR source_url LIKE '%lilo-coffee-roasters-east-timor-asico%'
     OR source_url LIKE '%tokado-ethiopia%'
     OR source_url LIKE '%tokado-tokado-blend%'
     OR source_url LIKE '%wakaya-coffee-gold-medal-mocha-blend%'
     OR source_url LIKE '%mame-polepole-%'
     OR source_url LIKE '%trsc-origami%'
     OR source_url LIKE '%ryokodlal%'
     OR source_url LIKE '%drink-like-a-local-cupping-spoon%'
     OR source_url LIKE '%tea-at-all-gift-box%'
     OR source_url LIKE '%imamura-yoshiaki%'
),
news_assignments AS (
  SELECT id AS product_id, 'news-subscription-selection' AS category_slug
  FROM dlal_products
  WHERE source_url LIKE '%try-our-monthly-subscription%'

  UNION ALL
  SELECT id, 'news-new-arrival'
  FROM dlal_products
  WHERE source_url LIKE '%landmade-%'
     OR source_url LIKE '%glitch-coffee-and-roasters%'
     OR source_url LIKE '%try-our-monthly-subscription%'
     OR source_url LIKE '%lumiumi%'
     OR source_url LIKE '%drink-like-a-local-taiwan-the-northpeace%'
     OR source_url LIKE '%cerrado-spring-season-limited%'
     OR source_url LIKE '%rootopia-pour-over-tea%'
     OR source_url LIKE '%cerrado-coffee-blend-the-2nd%'

  UNION ALL
  SELECT id, 'news-hot-sales'
  FROM dlal_products
  WHERE source_url LIKE '%glitch-coffee-and-roasters-china%'
     OR source_url LIKE '%about-us---season-limited%'
     OR source_url LIKE '%liwei-%'
     OR source_url LIKE '%tokado-haiti%'
     OR source_url LIKE '%marumi-coffee-%'
     OR source_url LIKE '%wakaya-odokomae%'
     OR source_url LIKE '%weekenders-opera-blend%'
     OR source_url LIKE '%lilo-coffee-roasters-east-timor-asico%'
     OR source_url LIKE '%tokado-ethiopia%'
     OR source_url LIKE '%tokado-tokado-blend%'
     OR source_url LIKE '%wakaya-coffee-gold-medal-mocha-blend%'
     OR source_url LIKE '%mame-polepole-%'
     OR source_url LIKE '%cerrado-coffee-blend-the-2nd%'

  UNION ALL
  SELECT id, 'news-limited-edition'
  FROM dlal_products
  WHERE source_url LIKE '%rootopia-pour-over-tea%'
     OR source_url LIKE '%drink-like-a-local-cupping-spoon%'
     OR source_url LIKE '%trsc-origami%'
     OR source_url LIKE '%ryokodlal%'

  UNION ALL
  SELECT id, 'news-limited-dlal'
  FROM dlal_products
  WHERE source_url LIKE '%rootopia-pour-over-tea%'
     OR source_url LIKE '%drink-like-a-local-cupping-spoon%'
     OR source_url LIKE '%ryokodlal%'

  UNION ALL
  SELECT id, 'news-limited-trsc-origami'
  FROM dlal_products
  WHERE source_url LIKE '%trsc-origami%'

  UNION ALL
  SELECT id, 'news-outlet-coffee-beans'
  FROM dlal_products
  WHERE source_url LIKE '%tokado-ethiopia%'
     OR source_url LIKE '%tea-at-all-gift-box%'
     OR source_url LIKE '%ryokodlal%'

  UNION ALL
  SELECT id, 'news-limited-yoshiaki-imamura'
  FROM dlal_products
  WHERE source_url LIKE '%imamura-yoshiaki%'
),
news_links AS (
  SELECT id AS product_id, 'dlal-news' AS category_slug FROM news_products
  UNION ALL
  SELECT DISTINCT product_id, category_slug FROM news_assignments
)
INSERT INTO product_category_links (product_id, category_id)
SELECT links.product_id, categories.id
FROM news_links links
JOIN categories ON categories.slug = links.category_slug
ON CONFLICT DO NOTHING;

WITH root AS (
  SELECT id FROM categories WHERE slug = 'dlal-news'
),
allowed AS (
  SELECT slug FROM _official_dlal_news_categories
),
obsolete AS (
  SELECT c.id
  FROM categories c
  JOIN root ON c.parent_id = root.id
  LEFT JOIN allowed ON allowed.slug = c.slug
  WHERE allowed.slug IS NULL
  UNION
  SELECT grandchild.id
  FROM categories child
  JOIN categories grandchild ON grandchild.parent_id = child.id
  JOIN root ON child.parent_id = root.id
  LEFT JOIN allowed ON allowed.slug = grandchild.slug
  WHERE allowed.slug IS NULL
)
DELETE FROM categories c
USING obsolete
WHERE c.id = obsolete.id;

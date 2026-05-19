/*
  # Product category hierarchy and product-category links

  1. Adds a many-to-many product/category link table for DLAL-style category facets.
  2. Syncs the DLAL category tree from the official category navigation.
  3. Reclassifies imported DLAL products into primary subcategories and linked facets.
*/

CREATE TABLE IF NOT EXISTS product_category_links (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (product_id, category_id)
);

ALTER TABLE product_category_links ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'categories'
      AND policyname = 'Admins can delete categories'
  ) THEN
    CREATE POLICY "Admins can delete categories"
      ON categories FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM tbl_user_auth
          WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_category_links'
      AND policyname = 'Product category links are publicly readable'
  ) THEN
    CREATE POLICY "Product category links are publicly readable"
      ON product_category_links FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_category_links'
      AND policyname = 'Admins can manage product category links'
  ) THEN
    CREATE POLICY "Admins can manage product category links"
      ON product_category_links FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM tbl_user_auth
          WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM tbl_user_auth
          WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_category_links'
      AND policyname = 'Vendors can manage own product category links'
  ) THEN
    CREATE POLICY "Vendors can manage own product category links"
      ON product_category_links FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM products p
          JOIN vendors v ON v.id = p.vendor_id
          WHERE p.id = product_category_links.product_id
            AND v.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM products p
          JOIN vendors v ON v.id = p.vendor_id
          WHERE p.id = product_category_links.product_id
            AND v.user_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE TEMP TABLE _dlal_category_defs (
  name text NOT NULL,
  slug text PRIMARY KEY,
  parent_slug text
) ON COMMIT DROP;

INSERT INTO _dlal_category_defs (name, slug, parent_slug) VALUES
  ('DLAL 最新消息', 'dlal-news', NULL),
  ('DLAL 所有品牌', 'dlal-all-brands', NULL),
  ('DLAL 選購咖啡', 'dlal-shop-for-coffee', NULL),
  ('DLAL 咖啡定期便', 'dlal-subscription', NULL),
  ('DLAL 器具用品', 'dlal-tools', NULL),

  ('Subscription Selection', 'news-subscription-selection', 'dlal-news'),
  ('New Arrival', 'news-new-arrival', 'dlal-news'),
  ('Hot sales', 'news-hot-sales', 'dlal-news'),
  ('Outlet - Coffee beans', 'news-outlet-coffee-beans', 'dlal-news'),
  ('Limited edition', 'news-limited-edition', 'dlal-news'),
  ('WAKABA', 'news-limited-wakaba', 'news-limited-edition'),
  ('DLAL', 'news-limited-dlal', 'news-limited-edition'),
  ('Sherry Selection', 'news-limited-sherry-selection', 'news-limited-edition'),
  ('TRSC X ORIGAMI', 'news-limited-trsc-origami', 'news-limited-edition'),
  ('今村能章', 'news-limited-yoshiaki-imamura', 'news-limited-edition'),

  ('Tea at all', 'brand-tea-at-all', 'dlal-all-brands'),
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

  ('Featured goods', 'shop-featured-goods', 'dlal-shop-for-coffee'),
  ('Limited', 'shop-limited', 'dlal-shop-for-coffee'),
  ('Craftsman''s recipe', 'shop-craftsmans-recipe', 'dlal-shop-for-coffee'),
  ('Gesha/Auction', 'shop-gesha-auction', 'dlal-shop-for-coffee'),
  ('Roast degree', 'shop-roast-degree', 'dlal-shop-for-coffee'),
  ('Light roast', 'roast-light', 'shop-roast-degree'),
  ('Light-Medium roast', 'roast-light-medium', 'shop-roast-degree'),
  ('Medium roast', 'roast-medium', 'shop-roast-degree'),
  ('Medium-Dark roast', 'roast-medium-dark', 'shop-roast-degree'),
  ('Dark roast', 'roast-dark', 'shop-roast-degree'),
  ('Processing methods', 'shop-processing-methods', 'dlal-shop-for-coffee'),
  ('Wet process method', 'process-wet', 'shop-processing-methods'),
  ('Natural sundried method', 'process-natural', 'shop-processing-methods'),
  ('Honey process method', 'process-honey', 'shop-processing-methods'),
  ('Anaerobic Fermentation', 'process-anaerobic', 'shop-processing-methods'),
  ('Special method', 'process-special', 'shop-processing-methods'),
  ('Flavor', 'shop-flavor', 'dlal-shop-for-coffee'),
  ('Nutty aroma', 'flavor-nutty', 'shop-flavor'),
  ('Floral and elegant', 'flavor-floral', 'shop-flavor'),
  ('Fruity and refreshing', 'flavor-fruity', 'shop-flavor'),
  ('Sleek and balanced', 'flavor-balanced', 'shop-flavor'),
  ('Spice and wine', 'flavor-spice-wine', 'shop-flavor'),
  ('Drip bag', 'shop-drip-bag', 'dlal-shop-for-coffee'),

  ('咖啡濾掛包', 'subscription-drip-bag', 'dlal-subscription'),
  ('咖啡豆200g/輕巧旅行組', 'subscription-beans-200g', 'dlal-subscription'),
  ('咖啡豆400g/奢華探險組', 'subscription-beans-400g', 'dlal-subscription'),
  ('Plan time', 'subscription-plan-time', 'dlal-subscription'),
  ('3 months (one quarter)', 'subscription-3-months', 'subscription-plan-time'),
  ('6 months (half a year)', 'subscription-6-months', 'subscription-plan-time'),
  ('12 months (1 year)', 'subscription-12-months', 'subscription-plan-time'),

  ('Coffee tools', 'tools-coffee-tools', 'dlal-tools'),
  ('cups and plates', 'tools-cups-plates', 'dlal-tools'),
  ('Brand clothing', 'tools-brand-clothing', 'dlal-tools'),
  ('Goods', 'tools-goods', 'dlal-tools')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    parent_slug = EXCLUDED.parent_slug;

INSERT INTO categories (name, slug, parent_id, updated_at)
SELECT d.name, d.slug, NULL, now()
FROM _dlal_category_defs d
WHERE d.parent_slug IS NULL
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    updated_at = now();

INSERT INTO categories (name, slug, parent_id, updated_at)
SELECT d.name, d.slug, p.id, now()
FROM _dlal_category_defs d
JOIN categories p ON p.slug = d.parent_slug
WHERE d.parent_slug IS NOT NULL
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    updated_at = now();

INSERT INTO categories (name, slug, parent_id, updated_at)
SELECT d.name, d.slug, p.id, now()
FROM _dlal_category_defs d
JOIN categories p ON p.slug = d.parent_slug
WHERE d.parent_slug IS NOT NULL
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    updated_at = now();

WITH classified AS (
  SELECT
    p.id,
    CASE
      WHEN lower(coalesce(p.source_url, '')) LIKE '%subscription%'
        OR lower(coalesce(p.source_url, '')) LIKE '%monthly-subscription%'
        OR p.name ILIKE '%定期便%' THEN
        CASE
          WHEN p.name ILIKE '%400g%' OR lower(coalesce(p.source_url, '')) LIKE '%400g%' THEN 'subscription-beans-400g'
          WHEN p.name ILIKE '%濾掛%' OR p.name ILIKE '%掛耳%' OR lower(coalesce(p.source_url, '')) LIKE '%drip%' THEN 'subscription-drip-bag'
          ELSE 'subscription-beans-200g'
        END
      WHEN lower(coalesce(p.source_url, '')) LIKE ANY (ARRAY['%cacaocat-cat-bottle%', '%soft-toy%', '%totebag%', '%diffuser%'])
        THEN 'tools-goods'
      WHEN lower(coalesce(p.source_url, '')) LIKE ANY (ARRAY['%hario%', '%dripper%', '%spoon%', '%v60%'])
        OR p.name ILIKE '%濾杯%'
        OR p.name ILIKE '%杯測匙%'
        THEN 'tools-coffee-tools'
      WHEN lower(coalesce(p.source_url, '')) LIKE ANY (ARRAY['%art-cups%', '%trsc-origami%', '%coffee-cup%', '%cup%'])
        OR p.name ILIKE '%杯%'
        OR p.name ILIKE '%杯盤%'
        THEN 'tools-cups-plates'
      WHEN lower(coalesce(p.source_url, '')) LIKE '%tea-at-all%'
        OR lower(coalesce(p.source_url, '')) LIKE '%rootopia%'
        OR p.name ILIKE '%茶根本%'
        THEN 'brand-tea-at-all'
      WHEN lower(coalesce(p.source_url, '')) LIKE '%drip%'
        OR p.name ILIKE '%濾掛%'
        OR p.name ILIKE '%掛耳%'
        OR array_to_string(coalesce(p.tags, '{}'::text[]), ' ') ILIKE '%掛耳%'
        OR array_to_string(coalesce(p.tags, '{}'::text[]), ' ') ILIKE '%濾掛%'
        THEN 'shop-drip-bag'
      WHEN p.roast_level ILIKE '%淺中%' THEN 'roast-light-medium'
      WHEN p.roast_level ILIKE '%淺%' THEN 'roast-light'
      WHEN p.roast_level ILIKE '%中深%' THEN 'roast-medium-dark'
      WHEN p.roast_level ILIKE '%深%' THEN 'roast-dark'
      WHEN p.roast_level ILIKE '%中%' THEN 'roast-medium'
      ELSE 'shop-featured-goods'
    END AS category_slug
  FROM products p
  WHERE lower(coalesce(p.source_url, '')) LIKE 'https://www.dlalshop.com/%'
)
UPDATE products p
SET category_id = c.id,
    updated_at = now()
FROM classified x
JOIN categories c ON c.slug = x.category_slug
WHERE p.id = x.id;

DELETE FROM product_category_links
WHERE product_id IN (
  SELECT id FROM products
  WHERE lower(coalesce(source_url, '')) LIKE 'https://www.dlalshop.com/%'
);

INSERT INTO product_category_links (product_id, category_id)
SELECT id, category_id
FROM products
WHERE category_id IS NOT NULL
  AND lower(coalesce(source_url, '')) LIKE 'https://www.dlalshop.com/%'
ON CONFLICT DO NOTHING;

WITH brand_links AS (
  SELECT
    p.id AS product_id,
    CASE
      WHEN lower(coalesce(p.source_url, '')) LIKE '%about-us%' THEN 'brand-about-us-coffee'
      WHEN lower(coalesce(p.source_url, '')) LIKE '%cacaocat%' THEN 'brand-cacaocat'
      WHEN lower(coalesce(p.source_url, '')) LIKE '%glitch%' THEN 'brand-glitch-coffee-roasters'
      WHEN lower(coalesce(p.source_url, '')) LIKE '%liwei%' THEN 'brand-liwei-coffee-stand'
      WHEN lower(coalesce(p.source_url, '')) LIKE '%lilo%' THEN 'brand-lilo-coffee-roasters'
      WHEN lower(coalesce(p.source_url, '')) LIKE '%marumi%' THEN 'brand-marumi-coffee'
      WHEN lower(coalesce(p.source_url, '')) LIKE '%cerrado%' THEN 'brand-okinawa-cerrado-coffee'
      WHEN lower(coalesce(p.source_url, '')) LIKE '%ituka%' THEN 'brand-ituka-coffee'
      WHEN lower(coalesce(p.source_url, '')) LIKE '%wakaya%' OR lower(coalesce(p.source_url, '')) LIKE '%wakoya%' THEN 'brand-wakoya'
      WHEN lower(coalesce(p.source_url, '')) LIKE '%tokado%' THEN 'brand-tokado-coffee'
      WHEN lower(coalesce(p.source_url, '')) LIKE '%weekenders%' THEN 'brand-weekenders-coffee'
      WHEN lower(coalesce(p.source_url, '')) LIKE '%imamura%' OR p.name ILIKE '%今村%' THEN 'brand-yoshiaki-imamura'
      WHEN lower(coalesce(p.source_url, '')) LIKE '%tea-at-all%' OR lower(coalesce(p.source_url, '')) LIKE '%rootopia%' OR p.name ILIKE '%茶根本%' THEN 'brand-tea-at-all'
      ELSE NULL
    END AS category_slug
  FROM products p
  WHERE lower(coalesce(p.source_url, '')) LIKE 'https://www.dlalshop.com/%'
)
INSERT INTO product_category_links (product_id, category_id)
SELECT b.product_id, c.id
FROM brand_links b
JOIN categories c ON c.slug = b.category_slug
WHERE b.category_slug IS NOT NULL
ON CONFLICT DO NOTHING;

WITH product_text AS (
  SELECT
    p.id,
    lower(coalesce(p.source_url, '')) AS source_url,
    coalesce(p.name, '') AS name,
    coalesce(p.roast_level, '') AS roast_level,
    coalesce(p.processing_method, '') AS processing_method,
    array_to_string(coalesce(p.tags, '{}'::text[]) || coalesce(p.flavor_notes, '{}'::text[]), ' ') AS tag_text
  FROM products p
  WHERE lower(coalesce(p.source_url, '')) LIKE 'https://www.dlalshop.com/%'
),
facet_links AS (
  SELECT id AS product_id, 'dlal-news' AS category_slug FROM product_text WHERE tag_text ILIKE '%DLAL 最新消息%'
  UNION ALL SELECT id, 'shop-drip-bag' FROM product_text WHERE name ILIKE '%濾掛%' OR name ILIKE '%掛耳%' OR source_url LIKE '%drip%' OR tag_text ILIKE '%掛耳%'
  UNION ALL SELECT id, 'roast-light-medium' FROM product_text WHERE roast_level ILIKE '%淺中%'
  UNION ALL SELECT id, 'roast-light' FROM product_text WHERE roast_level ILIKE '%淺%' AND roast_level NOT ILIKE '%淺中%'
  UNION ALL SELECT id, 'roast-medium-dark' FROM product_text WHERE roast_level ILIKE '%中深%'
  UNION ALL SELECT id, 'roast-dark' FROM product_text WHERE roast_level ILIKE '%深%' AND roast_level NOT ILIKE '%中深%'
  UNION ALL SELECT id, 'roast-medium' FROM product_text WHERE roast_level ILIKE '%中%' AND roast_level NOT ILIKE '%淺中%' AND roast_level NOT ILIKE '%中深%'
  UNION ALL SELECT id, 'process-wet' FROM product_text WHERE processing_method ILIKE '%水洗%'
  UNION ALL SELECT id, 'process-natural' FROM product_text WHERE processing_method ILIKE '%日曬%' OR processing_method ILIKE '%自然%'
  UNION ALL SELECT id, 'process-honey' FROM product_text WHERE processing_method ILIKE '%蜜%'
  UNION ALL SELECT id, 'process-anaerobic' FROM product_text WHERE processing_method ILIKE '%厭氧%' OR processing_method ILIKE '%發酵%'
  UNION ALL SELECT id, 'process-special' FROM product_text WHERE processing_method <> '' AND processing_method NOT ILIKE '%水洗%' AND processing_method NOT ILIKE '%日曬%' AND processing_method NOT ILIKE '%自然%' AND processing_method NOT ILIKE '%蜜%' AND processing_method NOT ILIKE '%厭氧%' AND processing_method NOT ILIKE '%發酵%'
  UNION ALL SELECT id, 'flavor-nutty' FROM product_text WHERE tag_text ILIKE ANY (ARRAY['%堅果%', '%核果%', '%可可%', '%巧克力%', '%焦糖%', '%烤%'])
  UNION ALL SELECT id, 'flavor-floral' FROM product_text WHERE tag_text ILIKE ANY (ARRAY['%花%', '%伯爵%', '%茶%'])
  UNION ALL SELECT id, 'flavor-fruity' FROM product_text WHERE tag_text ILIKE ANY (ARRAY['%水果%', '%桃%', '%柑%', '%橘%', '%莓%', '%檸%', '%葡萄%', '%櫻桃%', '%荔枝%'])
  UNION ALL SELECT id, 'flavor-balanced' FROM product_text WHERE tag_text ILIKE ANY (ARRAY['%平衡%', '%滑順%', '%順口%', '%柔和%', '%乾淨%'])
  UNION ALL SELECT id, 'flavor-spice-wine' FROM product_text WHERE tag_text ILIKE ANY (ARRAY['%酒%', '%香料%', '%紅酒%', '%辛香%'])
  UNION ALL SELECT id, 'subscription-3-months' FROM product_text WHERE source_url LIKE '%3-months%'
  UNION ALL SELECT id, 'subscription-6-months' FROM product_text WHERE source_url LIKE '%6-months%'
  UNION ALL SELECT id, 'subscription-12-months' FROM product_text WHERE source_url LIKE '%12-months%'
)
INSERT INTO product_category_links (product_id, category_id)
SELECT f.product_id, c.id
FROM facet_links f
JOIN categories c ON c.slug = f.category_slug
ON CONFLICT DO NOTHING;

WITH RECURSIVE ancestors AS (
  SELECT pcl.product_id, parent.id AS category_id
  FROM product_category_links pcl
  JOIN categories child ON child.id = pcl.category_id
  JOIN categories parent ON parent.id = child.parent_id
  UNION
  SELECT a.product_id, parent.id
  FROM ancestors a
  JOIN categories child ON child.id = a.category_id
  JOIN categories parent ON parent.id = child.parent_id
)
INSERT INTO product_category_links (product_id, category_id)
SELECT product_id, category_id
FROM ancestors
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS product_category_links_category_id_idx
  ON product_category_links(category_id);

CREATE INDEX IF NOT EXISTS product_category_links_product_id_idx
  ON product_category_links(product_id);

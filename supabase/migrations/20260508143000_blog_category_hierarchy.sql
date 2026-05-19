/*
  # Blog category hierarchy and Vocus room classification

  Adds parent/child article categories based on the Vocus salon rooms for
  "咖啡旅行家・Hola I’m Ryoko", then links every published imported article to
  the matching root and room-level category.
*/

ALTER TABLE blog_categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES blog_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_blog_categories_parent_id ON blog_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_blog_categories_display_order ON blog_categories(display_order);

CREATE TABLE IF NOT EXISTS blog_post_category_links (
  post_id uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES blog_categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, category_id)
);

ALTER TABLE blog_post_category_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published blog category links are public" ON blog_post_category_links;
DROP POLICY IF EXISTS "Admins can read all blog category links" ON blog_post_category_links;
DROP POLICY IF EXISTS "Vendors can read own blog category links" ON blog_post_category_links;
DROP POLICY IF EXISTS "Admins can insert blog category links" ON blog_post_category_links;
DROP POLICY IF EXISTS "Vendors can insert own blog category links" ON blog_post_category_links;
DROP POLICY IF EXISTS "Admins can update blog category links" ON blog_post_category_links;
DROP POLICY IF EXISTS "Vendors can update own blog category links" ON blog_post_category_links;
DROP POLICY IF EXISTS "Admins can delete blog category links" ON blog_post_category_links;
DROP POLICY IF EXISTS "Vendors can delete own blog category links" ON blog_post_category_links;

CREATE POLICY "Published blog category links are public"
  ON blog_post_category_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_post_category_links.post_id
        AND blog_posts.status = 'published'
    )
  );

CREATE POLICY "Admins can read all blog category links"
  ON blog_post_category_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Vendors can read own blog category links"
  ON blog_post_category_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM blog_posts
      JOIN vendors ON vendors.id = blog_posts.vendor_id
      WHERE blog_posts.id = blog_post_category_links.post_id
        AND vendors.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert blog category links"
  ON blog_post_category_links FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Vendors can insert own blog category links"
  ON blog_post_category_links FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM blog_posts
      JOIN vendors ON vendors.id = blog_posts.vendor_id
      WHERE blog_posts.id = blog_post_category_links.post_id
        AND vendors.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update blog category links"
  ON blog_post_category_links FOR UPDATE
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

CREATE POLICY "Vendors can update own blog category links"
  ON blog_post_category_links FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM blog_posts
      JOIN vendors ON vendors.id = blog_posts.vendor_id
      WHERE blog_posts.id = blog_post_category_links.post_id
        AND vendors.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM blog_posts
      JOIN vendors ON vendors.id = blog_posts.vendor_id
      WHERE blog_posts.id = blog_post_category_links.post_id
        AND vendors.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete blog category links"
  ON blog_post_category_links FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Vendors can delete own blog category links"
  ON blog_post_category_links FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM blog_posts
      JOIN vendors ON vendors.id = blog_posts.vendor_id
      WHERE blog_posts.id = blog_post_category_links.post_id
        AND vendors.user_id = auth.uid()
    )
  );

GRANT SELECT ON blog_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON blog_categories TO authenticated;
GRANT SELECT ON blog_post_category_links TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON blog_post_category_links TO authenticated;

WITH roots(name, slug, description, display_order) AS (
  VALUES
    ('咖啡旅行', 'coffee-travel', '日本各地咖啡廳介紹與咖啡旅程紀錄。', 10),
    ('日本旅行', 'japan-travel', '日本美食、伴手禮與菜單中文翻譯。', 20),
    ('沖繩美好旅行', 'okinawa-travel', '沖繩在地人推薦與旅行情報。', 30),
    ('在宅咖啡', 'home-coffee', '咖啡新手也能在家實作的豆知識。', 40),
    ('職人故事', 'craftsman-stories', '那些堅持與努力的職人們。', 50)
)
INSERT INTO blog_categories (name, slug, description, display_order, parent_id, is_active)
SELECT name, slug, description, display_order, NULL, true
FROM roots
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  parent_id = NULL,
  is_active = true,
  updated_at = now();

WITH child_defs(parent_slug, name, slug, description, display_order) AS (
  VALUES
    ('coffee-travel', '日本各地咖啡廳介紹', 'coffee-travel-japan-cafes', '對應 Vocus room「【咖啡旅行】日本各地咖啡廳介紹」。', 11),
    ('japan-travel', '美食/伴手禮/菜單中文翻譯', 'japan-travel-food-souvenirs-menu', '對應 Vocus room「【日本旅行】美食/伴手禮/菜單中文翻譯」。', 21),
    ('okinawa-travel', '在地人推薦', 'okinawa-local-guide', '對應 Vocus room「【沖繩美好旅行】在地人推薦」。', 31),
    ('home-coffee', '咖啡新手的豆知識', 'home-coffee-basics', '對應 Vocus room「【在宅咖啡】咖啡新手的豆知識」。', 41),
    ('craftsman-stories', '那些堅持與努力的職人們', 'craftsman-stories-people', '對應 Vocus room「【職人故事】那些堅持與努力的職人們」。', 51)
),
resolved AS (
  SELECT child_defs.*, parent.id AS parent_id
  FROM child_defs
  JOIN blog_categories parent ON parent.slug = child_defs.parent_slug
)
INSERT INTO blog_categories (name, slug, description, display_order, parent_id, is_active)
SELECT name, slug, description, display_order, parent_id, true
FROM resolved
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  parent_id = EXCLUDED.parent_id,
  is_active = true,
  updated_at = now();

UPDATE blog_categories
SET is_active = false, updated_at = now()
WHERE slug IN ('travel-guide', 'food-exploration', 'accommodation', 'travel-journal');

DELETE FROM blog_post_category_links links
USING blog_posts posts
WHERE links.post_id = posts.id
  AND posts.status = 'published'
  AND posts.slug <> 'system-store-locations';

WITH room_map(parent_slug, child_slug, marker) AS (
  VALUES
    ('coffee-travel', 'coffee-travel-japan-cafes', '咖啡旅行日本各地咖啡廳介紹'),
    ('japan-travel', 'japan-travel-food-souvenirs-menu', '日本旅行美食/伴手禮/菜單中文翻譯'),
    ('okinawa-travel', 'okinawa-local-guide', '沖繩美好旅行在地人推薦'),
    ('home-coffee', 'home-coffee-basics', '在宅咖啡咖啡新手的豆知識'),
    ('craftsman-stories', 'craftsman-stories-people', '職人故事那些堅持與努力的職人們')
),
matched AS (
  SELECT posts.id AS post_id, room_map.parent_slug, room_map.child_slug
  FROM blog_posts posts
  JOIN room_map ON room_map.marker = ANY(posts.tags)
  WHERE posts.status = 'published'
    AND posts.slug <> 'system-store-locations'
),
category_slugs AS (
  SELECT post_id, parent_slug AS slug FROM matched
  UNION
  SELECT post_id, child_slug AS slug FROM matched
)
INSERT INTO blog_post_category_links (post_id, category_id)
SELECT category_slugs.post_id, blog_categories.id
FROM category_slugs
JOIN blog_categories ON blog_categories.slug = category_slugs.slug
ON CONFLICT DO NOTHING;

WITH fallback AS (
  SELECT
    posts.id AS post_id,
    CASE
      WHEN (posts.title || ' ' || posts.category || ' ' || array_to_string(posts.tags, ' ')) ~* '(沖繩|沖縄)' THEN 'okinawa-travel'
      WHEN posts.category IN ('咖啡知識', '在宅咖啡')
        OR (posts.title || ' ' || posts.category || ' ' || array_to_string(posts.tags, ' ')) ~* '(養豆|咖啡豆|濾杯|手沖|磨豆|耳掛|咖啡包|豆知識|保存|沖煮|V60|Kalita|ORIGAMI)' THEN 'home-coffee'
      WHEN (posts.title || ' ' || posts.category || ' ' || array_to_string(posts.tags, ' ')) ~* '(職人|咖啡師|烘豆|陶藝|巢家居|故事)' THEN 'craftsman-stories'
      WHEN posts.category IN ('旅遊美食', '美食探索')
        OR (posts.title || ' ' || posts.category || ' ' || array_to_string(posts.tags, ' ')) ~* '(美食|伴手禮|菜單|翻譯|壽司|牛排|甜點|拉麵|飯糰|吐司|黑糖)' THEN 'japan-travel'
      ELSE 'coffee-travel'
    END AS parent_slug,
    CASE
      WHEN (posts.title || ' ' || posts.category || ' ' || array_to_string(posts.tags, ' ')) ~* '(沖繩|沖縄)' THEN 'okinawa-local-guide'
      WHEN posts.category IN ('咖啡知識', '在宅咖啡')
        OR (posts.title || ' ' || posts.category || ' ' || array_to_string(posts.tags, ' ')) ~* '(養豆|咖啡豆|濾杯|手沖|磨豆|耳掛|咖啡包|豆知識|保存|沖煮|V60|Kalita|ORIGAMI)' THEN 'home-coffee-basics'
      WHEN (posts.title || ' ' || posts.category || ' ' || array_to_string(posts.tags, ' ')) ~* '(職人|咖啡師|烘豆|陶藝|巢家居|故事)' THEN 'craftsman-stories-people'
      WHEN posts.category IN ('旅遊美食', '美食探索')
        OR (posts.title || ' ' || posts.category || ' ' || array_to_string(posts.tags, ' ')) ~* '(美食|伴手禮|菜單|翻譯|壽司|牛排|甜點|拉麵|飯糰|吐司|黑糖)' THEN 'japan-travel-food-souvenirs-menu'
      ELSE 'coffee-travel-japan-cafes'
    END AS child_slug
  FROM blog_posts posts
  WHERE posts.status = 'published'
    AND posts.slug <> 'system-store-locations'
    AND NOT EXISTS (
      SELECT 1
      FROM blog_post_category_links links
      WHERE links.post_id = posts.id
    )
),
category_slugs AS (
  SELECT post_id, parent_slug AS slug FROM fallback
  UNION
  SELECT post_id, child_slug AS slug FROM fallback
)
INSERT INTO blog_post_category_links (post_id, category_id)
SELECT category_slugs.post_id, blog_categories.id
FROM category_slugs
JOIN blog_categories ON blog_categories.slug = category_slugs.slug
ON CONFLICT DO NOTHING;

UPDATE blog_posts
SET category = CASE
    WHEN '咖啡旅行日本各地咖啡廳介紹' = ANY(tags) THEN '咖啡旅行'
    WHEN '沖繩美好旅行在地人推薦' = ANY(tags) THEN '沖繩美好旅行'
    WHEN '日本旅行美食/伴手禮/菜單中文翻譯' = ANY(tags) THEN '日本旅行'
    WHEN '在宅咖啡咖啡新手的豆知識' = ANY(tags) THEN '在宅咖啡'
    WHEN '職人故事那些堅持與努力的職人們' = ANY(tags) THEN '職人故事'
    WHEN (title || ' ' || category || ' ' || array_to_string(tags, ' ')) ~* '(沖繩|沖縄)' THEN '沖繩美好旅行'
    WHEN category IN ('咖啡知識', '在宅咖啡') THEN '在宅咖啡'
    WHEN category IN ('旅遊美食', '美食探索', '旅遊指南') THEN '日本旅行'
    ELSE '咖啡旅行'
  END,
  updated_at = now()
WHERE status = 'published'
  AND slug <> 'system-store-locations';

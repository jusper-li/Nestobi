/*
  # Vocus blog regional and topic category hierarchy

  Adds the missing third-level article categories parsed from the Vocus rooms:
  - coffeeshopinjapan: regional cafe categories.
  - ryokoinjapan: regional Japan travel categories plus food/dessert/souvenir/menu topics.
  - okinawaryoko: coffee, dessert, food, souvenir, beach, attractions, accommodation and craftsman topics.
  - coffeeathome: bean knowledge, tools and coffee drinks.

  Rebuilds published article category links so filtering can work through
  root -> room -> region/topic.
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

GRANT SELECT ON blog_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON blog_categories TO authenticated;
GRANT SELECT ON blog_post_category_links TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON blog_post_category_links TO authenticated;

CREATE TEMP TABLE _blog_category_defs (
  name text NOT NULL,
  slug text PRIMARY KEY,
  parent_slug text,
  description text NOT NULL,
  display_order integer NOT NULL
) ON COMMIT DROP;

INSERT INTO _blog_category_defs (name, slug, parent_slug, description, display_order) VALUES
  ('咖啡旅行', 'coffee-travel', NULL, '日本與各地咖啡店、咖啡城市散策。', 10),
  ('日本各地咖啡廳介紹', 'coffee-travel-japan-cafes', 'coffee-travel', 'Vocus 房間「日本各地咖啡廳介紹」。', 11),
  ('沖繩咖啡廳', 'coffee-cafes-okinawa', 'coffee-travel-japan-cafes', '咖啡旅行房間的沖繩咖啡店文章。', 111),
  ('福岡咖啡廳', 'coffee-cafes-fukuoka', 'coffee-travel-japan-cafes', '咖啡旅行房間的福岡咖啡店文章。', 112),
  ('京都咖啡廳', 'coffee-cafes-kyoto', 'coffee-travel-japan-cafes', '咖啡旅行房間的京都咖啡店文章。', 113),
  ('大阪咖啡廳', 'coffee-cafes-osaka', 'coffee-travel-japan-cafes', '咖啡旅行房間的大阪咖啡店文章。', 114),
  ('神戶咖啡廳', 'coffee-cafes-kobe', 'coffee-travel-japan-cafes', '咖啡旅行房間的神戶咖啡店文章。', 115),
  ('東京咖啡廳', 'coffee-cafes-tokyo', 'coffee-travel-japan-cafes', '咖啡旅行房間的東京咖啡店文章。', 116),
  ('神奈川咖啡廳', 'coffee-cafes-kanagawa', 'coffee-travel-japan-cafes', '咖啡旅行房間的神奈川咖啡店文章。', 117),
  ('北陸咖啡廳', 'coffee-cafes-hokuriku', 'coffee-travel-japan-cafes', '咖啡旅行房間的北陸咖啡店文章。', 118),
  ('北海道咖啡廳', 'coffee-cafes-hokkaido', 'coffee-travel-japan-cafes', '咖啡旅行房間的北海道咖啡店文章。', 119),
  ('台灣咖啡廳', 'coffee-cafes-taiwan', 'coffee-travel-japan-cafes', '咖啡旅行房間的台灣咖啡店文章。', 120),

  ('日本旅行', 'japan-travel', NULL, '日本旅遊、美食、伴手禮與菜單翻譯。', 20),
  ('美食/伴手禮/菜單中文翻譯', 'japan-travel-food-souvenirs-menu', 'japan-travel', 'Vocus 房間「美食/伴手禮/菜單中文翻譯」。', 21),
  ('北海道', 'japan-travel-hokkaido', 'japan-travel-food-souvenirs-menu', '日本旅行房間的北海道文章。', 211),
  ('東北', 'japan-travel-tohoku', 'japan-travel-food-souvenirs-menu', '日本旅行房間的東北文章。', 212),
  ('北陸', 'japan-travel-hokuriku', 'japan-travel-food-souvenirs-menu', '日本旅行房間的北陸文章。', 213),
  ('東京', 'japan-travel-tokyo', 'japan-travel-food-souvenirs-menu', '日本旅行房間的東京文章。', 214),
  ('神奈川', 'japan-travel-kanagawa', 'japan-travel-food-souvenirs-menu', '日本旅行房間的神奈川文章。', 215),
  ('京都', 'japan-travel-kyoto', 'japan-travel-food-souvenirs-menu', '日本旅行房間的京都文章。', 216),
  ('大阪', 'japan-travel-osaka', 'japan-travel-food-souvenirs-menu', '日本旅行房間的大阪文章。', 217),
  ('神戶', 'japan-travel-kobe', 'japan-travel-food-souvenirs-menu', '日本旅行房間的神戶文章。', 218),
  ('福岡', 'japan-travel-fukuoka', 'japan-travel-food-souvenirs-menu', '日本旅行房間的福岡文章。', 219),
  ('沖繩', 'japan-travel-okinawa', 'japan-travel-food-souvenirs-menu', '日本旅行房間的沖繩文章。', 220),
  ('日本甜點', 'japan-travel-desserts', 'japan-travel-food-souvenirs-menu', '日本旅行房間的甜點文章。', 231),
  ('日本美食', 'japan-travel-food', 'japan-travel-food-souvenirs-menu', '日本旅行房間的美食文章。', 232),
  ('日本伴手禮', 'japan-travel-souvenirs', 'japan-travel-food-souvenirs-menu', '日本旅行房間的伴手禮文章。', 233),
  ('日本菜單中文翻譯', 'japan-travel-menu-translation', 'japan-travel-food-souvenirs-menu', '日本旅行房間的菜單翻譯文章。', 234),

  ('沖繩美好旅行', 'okinawa-travel', NULL, '沖繩在地推薦、景點、美食與生活散策。', 30),
  ('在地人推薦', 'okinawa-local-guide', 'okinawa-travel', 'Vocus 房間「在地人推薦」。', 31),
  ('沖繩咖啡', 'okinawa-coffee', 'okinawa-local-guide', '沖繩咖啡店與咖啡相關文章。', 311),
  ('沖繩甜點', 'okinawa-desserts', 'okinawa-local-guide', '沖繩甜點、鬆餅、冰品與和菓子文章。', 312),
  ('沖繩美食', 'okinawa-food', 'okinawa-local-guide', '沖繩麵、食堂、餐廳與在地美食文章。', 313),
  ('沖繩伴手禮', 'okinawa-souvenirs', 'okinawa-local-guide', '沖繩伴手禮、土產與限定商品文章。', 314),
  ('沖繩海灘', 'okinawa-beaches', 'okinawa-local-guide', '沖繩海灘、海景與海邊散策文章。', 315),
  ('沖繩景點', 'okinawa-attractions', 'okinawa-local-guide', '沖繩景點、城跡、城鎮與觀光文章。', 316),
  ('沖繩住宿', 'okinawa-accommodations', 'okinawa-local-guide', '沖繩飯店、住宿與度假村文章。', 317),
  ('沖繩職人故事', 'okinawa-craftsman-stories', 'okinawa-local-guide', '沖繩職人、器物與地方故事文章。', 318),

  ('在宅咖啡', 'home-coffee', NULL, '在家沖煮、咖啡器具與咖啡豆知識。', 40),
  ('咖啡新手的豆知識', 'home-coffee-basics', 'home-coffee', 'Vocus 房間「咖啡新手的豆知識」。', 41),
  ('豆知識', 'home-coffee-bean-knowledge', 'home-coffee-basics', '咖啡豆、處理法、烘焙與萃取知識。', 411),
  ('咖啡器具', 'home-coffee-tools', 'home-coffee-basics', '手沖器具、濾杯、濾紙與沖煮工具。', 412),
  ('咖啡調飲', 'home-coffee-drinks', 'home-coffee-basics', '拿鐵、冷萃、特調與咖啡飲品。', 413),

  ('職人故事', 'craftsman-stories', NULL, '那些堅持與努力的職人們。', 50),
  ('那些堅持與努力的職人們', 'craftsman-stories-people', 'craftsman-stories', 'Vocus 房間「那些堅持與努力的職人們」。', 51)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    parent_slug = EXCLUDED.parent_slug,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order;

INSERT INTO blog_categories (name, slug, description, display_order, parent_id, is_active, updated_at)
SELECT name, slug, description, display_order, NULL, true, now()
FROM _blog_category_defs
WHERE parent_slug IS NULL
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  parent_id = NULL,
  is_active = true,
  updated_at = now();

INSERT INTO blog_categories (name, slug, description, display_order, parent_id, is_active, updated_at)
SELECT child.name, child.slug, child.description, child.display_order, parent.id, true, now()
FROM _blog_category_defs child
JOIN blog_categories parent ON parent.slug = child.parent_slug
WHERE child.parent_slug IS NOT NULL
  AND child.parent_slug IN ('coffee-travel', 'japan-travel', 'okinawa-travel', 'home-coffee', 'craftsman-stories')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  parent_id = EXCLUDED.parent_id,
  is_active = true,
  updated_at = now();

INSERT INTO blog_categories (name, slug, description, display_order, parent_id, is_active, updated_at)
SELECT child.name, child.slug, child.description, child.display_order, parent.id, true, now()
FROM _blog_category_defs child
JOIN blog_categories parent ON parent.slug = child.parent_slug
WHERE child.parent_slug IS NOT NULL
  AND child.parent_slug NOT IN ('coffee-travel', 'japan-travel', 'okinawa-travel', 'home-coffee', 'craftsman-stories')
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

WITH published_posts AS (
  SELECT id
  FROM blog_posts
  WHERE status = 'published'
    AND slug <> 'system-store-locations'
)
DELETE FROM blog_post_category_links links
USING published_posts posts
WHERE links.post_id = posts.id;

WITH post_text AS (
  SELECT
    id,
    category,
    concat_ws(' ', title, excerpt) AS article_text,
    concat_ws(' ', title, excerpt, category, array_to_string(coalesce(tags, '{}'::text[]), ' ')) AS full_text
  FROM blog_posts
  WHERE status = 'published'
    AND slug <> 'system-store-locations'
),
room_links AS (
  SELECT id AS post_id, 'coffee-travel' AS slug
  FROM post_text
  WHERE category = '咖啡旅行' OR full_text ILIKE '%咖啡旅行日本各地咖啡廳介紹%'
  UNION
  SELECT id, 'coffee-travel-japan-cafes'
  FROM post_text
  WHERE category = '咖啡旅行' OR full_text ILIKE '%咖啡旅行日本各地咖啡廳介紹%'
  UNION
  SELECT id, 'japan-travel'
  FROM post_text
  WHERE category = '日本旅行' OR full_text ILIKE '%日本旅行美食/伴手禮/菜單中文翻譯%'
  UNION
  SELECT id, 'japan-travel-food-souvenirs-menu'
  FROM post_text
  WHERE category = '日本旅行' OR full_text ILIKE '%日本旅行美食/伴手禮/菜單中文翻譯%'
  UNION
  SELECT id, 'okinawa-travel'
  FROM post_text
  WHERE category = '沖繩美好旅行' OR full_text ILIKE '%沖繩美好旅行在地人推薦%'
  UNION
  SELECT id, 'okinawa-local-guide'
  FROM post_text
  WHERE category = '沖繩美好旅行' OR full_text ILIKE '%沖繩美好旅行在地人推薦%'
  UNION
  SELECT id, 'home-coffee'
  FROM post_text
  WHERE category = '在宅咖啡' OR full_text ILIKE '%在宅咖啡%'
  UNION
  SELECT id, 'home-coffee-basics'
  FROM post_text
  WHERE category = '在宅咖啡' OR full_text ILIKE '%在宅咖啡%'
  UNION
  SELECT id, 'craftsman-stories'
  FROM post_text
  WHERE category = '職人故事' OR full_text ILIKE '%職人故事%'
  UNION
  SELECT id, 'craftsman-stories-people'
  FROM post_text
  WHERE category = '職人故事' OR full_text ILIKE '%職人故事%'
)
INSERT INTO blog_post_category_links (post_id, category_id)
SELECT room_links.post_id, blog_categories.id
FROM room_links
JOIN blog_categories ON blog_categories.slug = room_links.slug
ON CONFLICT DO NOTHING;

WITH post_text AS (
  SELECT
    id,
    category,
    concat_ws(' ', title, excerpt) AS article_text,
    concat_ws(' ', title, excerpt, category, array_to_string(coalesce(tags, '{}'::text[]), ' ')) AS full_text
  FROM blog_posts
  WHERE status = 'published'
    AND slug <> 'system-store-locations'
),
detail_links AS (
  SELECT id AS post_id, 'coffee-cafes-okinawa' AS slug FROM post_text WHERE (category = '咖啡旅行' OR full_text ILIKE '%咖啡旅行日本各地咖啡廳介紹%') AND article_text ~* '(沖繩|沖縄|那霸|那覇|首里|讀谷|読谷|浦添|宜野灣|宜野湾|宇流麻|北谷|南城|系滿|系満|石垣|宮古)'
  UNION SELECT id, 'coffee-cafes-fukuoka' FROM post_text WHERE (category = '咖啡旅行' OR full_text ILIKE '%咖啡旅行日本各地咖啡廳介紹%') AND article_text ~* '(福岡|九州)'
  UNION SELECT id, 'coffee-cafes-kyoto' FROM post_text WHERE (category = '咖啡旅行' OR full_text ILIKE '%咖啡旅行日本各地咖啡廳介紹%') AND article_text ~* '京都'
  UNION SELECT id, 'coffee-cafes-osaka' FROM post_text WHERE (category = '咖啡旅行' OR full_text ILIKE '%咖啡旅行日本各地咖啡廳介紹%') AND article_text ~* '大阪'
  UNION SELECT id, 'coffee-cafes-kobe' FROM post_text WHERE (category = '咖啡旅行' OR full_text ILIKE '%咖啡旅行日本各地咖啡廳介紹%') AND article_text ~* '(神戶|神戸)'
  UNION SELECT id, 'coffee-cafes-tokyo' FROM post_text WHERE (category = '咖啡旅行' OR full_text ILIKE '%咖啡旅行日本各地咖啡廳介紹%') AND article_text ~* '(東京|銀座|神保町|澀谷|涉谷|渋谷|原宿|代官山|新橋|御茶水|虎屋|TORAYA|Janu|ash|清澄白河|吉祥寺|表參道|表参道|淺草|浅草)'
  UNION SELECT id, 'coffee-cafes-kanagawa' FROM post_text WHERE (category = '咖啡旅行' OR full_text ILIKE '%咖啡旅行日本各地咖啡廳介紹%') AND article_text ~* '(神奈川|橫濱|横浜|鎌倉)'
  UNION SELECT id, 'coffee-cafes-hokuriku' FROM post_text WHERE (category = '咖啡旅行' OR full_text ILIKE '%咖啡旅行日本各地咖啡廳介紹%') AND article_text ~* '(北陸|金澤|金沢|富山|福井)'
  UNION SELECT id, 'coffee-cafes-hokkaido' FROM post_text WHERE (category = '咖啡旅行' OR full_text ILIKE '%咖啡旅行日本各地咖啡廳介紹%') AND article_text ~* '(北海道|札幌)'
  UNION SELECT id, 'coffee-cafes-taiwan' FROM post_text WHERE (category = '咖啡旅行' OR full_text ILIKE '%咖啡旅行日本各地咖啡廳介紹%') AND article_text ~* '(台灣|台湾|台北|台中|TBrC|世界盃沖煮大賽台灣)'

  UNION SELECT id, 'japan-travel-hokkaido' FROM post_text WHERE (category = '日本旅行' OR full_text ILIKE '%日本旅行美食/伴手禮/菜單中文翻譯%') AND article_text ~* '(北海道|札幌)'
  UNION SELECT id, 'japan-travel-tohoku' FROM post_text WHERE (category = '日本旅行' OR full_text ILIKE '%日本旅行美食/伴手禮/菜單中文翻譯%') AND article_text ~* '(東北|仙台|青森|岩手|秋田|山形|福島|宮城)'
  UNION SELECT id, 'japan-travel-hokuriku' FROM post_text WHERE (category = '日本旅行' OR full_text ILIKE '%日本旅行美食/伴手禮/菜單中文翻譯%') AND article_text ~* '(北陸|金澤|金沢|富山|福井)'
  UNION SELECT id, 'japan-travel-tokyo' FROM post_text WHERE (category = '日本旅行' OR full_text ILIKE '%日本旅行美食/伴手禮/菜單中文翻譯%') AND article_text ~* '(東京|銀座|澀谷|涉谷|渋谷|新宿|原宿|代官山|新橋|御茶水|虎屋|TORAYA|Janu)'
  UNION SELECT id, 'japan-travel-kanagawa' FROM post_text WHERE (category = '日本旅行' OR full_text ILIKE '%日本旅行美食/伴手禮/菜單中文翻譯%') AND article_text ~* '(神奈川|橫濱|横浜|鎌倉)'
  UNION SELECT id, 'japan-travel-kyoto' FROM post_text WHERE (category = '日本旅行' OR full_text ILIKE '%日本旅行美食/伴手禮/菜單中文翻譯%') AND article_text ~* '京都'
  UNION SELECT id, 'japan-travel-osaka' FROM post_text WHERE (category = '日本旅行' OR full_text ILIKE '%日本旅行美食/伴手禮/菜單中文翻譯%') AND article_text ~* '大阪'
  UNION SELECT id, 'japan-travel-kobe' FROM post_text WHERE (category = '日本旅行' OR full_text ILIKE '%日本旅行美食/伴手禮/菜單中文翻譯%') AND article_text ~* '(神戶|神戸)'
  UNION SELECT id, 'japan-travel-fukuoka' FROM post_text WHERE (category = '日本旅行' OR full_text ILIKE '%日本旅行美食/伴手禮/菜單中文翻譯%') AND article_text ~* '福岡'
  UNION SELECT id, 'japan-travel-okinawa' FROM post_text WHERE (category = '日本旅行' OR full_text ILIKE '%日本旅行美食/伴手禮/菜單中文翻譯%') AND article_text ~* '(沖繩|沖縄|那霸|那覇|首里|讀谷|読谷|浦添|宜野灣|宜野湾|宇流麻|北谷|南城|系滿|系満|石垣|宮古)'
  UNION SELECT id, 'japan-travel-desserts' FROM post_text WHERE (category = '日本旅行' OR full_text ILIKE '%日本旅行美食/伴手禮/菜單中文翻譯%') AND article_text ~* '(甜點|鬆餅|舒芙蕾|和菓子|最中|銅鑼燒|餅乾|奶油|虎屋|TORAYA|蛋糕|甜品|焦糖|夾心|BUTTER SAND)'
  UNION SELECT id, 'japan-travel-food' FROM post_text WHERE (category = '日本旅行' OR full_text ILIKE '%日本旅行美食/伴手禮/菜單中文翻譯%') AND article_text ~* '(美食|沖繩麵|沖縄麵|拉麵|壽喜燒|蕎麥|天婦羅|飯糰|餐廳|食堂|和牛|吐司|法式吐司|塔可飯)'
  UNION SELECT id, 'japan-travel-souvenirs' FROM post_text WHERE (category = '日本旅行' OR full_text ILIKE '%日本旅行美食/伴手禮/菜單中文翻譯%') AND article_text ~* '(伴手禮|土產|土産|禮|餅乾|黑糖|雪鹽|辣油|天使之羽|花生豆腐|PRESS BUTTER SAND|金楚糕)'
  UNION SELECT id, 'japan-travel-menu-translation' FROM post_text WHERE (category = '日本旅行' OR full_text ILIKE '%日本旅行美食/伴手禮/菜單中文翻譯%') AND article_text ~* '(菜單|中文翻譯|翻譯|點餐)'

  UNION SELECT id, 'okinawa-coffee' FROM post_text WHERE (category = '沖繩美好旅行' OR full_text ILIKE '%沖繩美好旅行在地人推薦%') AND article_text ~* '(咖啡|珈琲|Cafe|CAFE|咖啡廳|BANTA|ZHYVAGO|豆波波|coffee)'
  UNION SELECT id, 'okinawa-desserts' FROM post_text WHERE (category = '沖繩美好旅行' OR full_text ILIKE '%沖繩美好旅行在地人推薦%') AND article_text ~* '(甜點|鬆餅|舒芙蕾|和菓子|最中|銅鑼燒|冰|蛋糕|甜品|黑糖)'
  UNION SELECT id, 'okinawa-food' FROM post_text WHERE (category = '沖繩美好旅行' OR full_text ILIKE '%沖繩美好旅行在地人推薦%') AND article_text ~* '(美食|沖繩麵|沖縄麵|食堂|餐廳|拉麵|塔可飯|和牛|飯糰|壽喜燒|蕎麥|天婦羅|吐司|鬆餅|舒芙蕾)'
  UNION SELECT id, 'okinawa-souvenirs' FROM post_text WHERE (category = '沖繩美好旅行' OR full_text ILIKE '%沖繩美好旅行在地人推薦%') AND article_text ~* '(伴手禮|土產|土産|禮|黑糖|雪鹽|辣油|天使之羽|花生豆腐|金楚糕|香檸)'
  UNION SELECT id, 'okinawa-beaches' FROM post_text WHERE (category = '沖繩美好旅行' OR full_text ILIKE '%沖繩美好旅行在地人推薦%') AND article_text ~* '(海灘|海景|海邊|沙灘|BANTA|讀谷|読谷|殘波|残波)'
  UNION SELECT id, 'okinawa-attractions' FROM post_text WHERE (category = '沖繩美好旅行' OR full_text ILIKE '%沖繩美好旅行在地人推薦%') AND article_text ~* '(景點|首里城|觀光|旅行|南城|系滿|系満|那霸|那覇|首里|北谷|浦添|宜野灣|宜野湾|宇流麻|宮古|石垣|讀谷|読谷)'
  UNION SELECT id, 'okinawa-accommodations' FROM post_text WHERE (category = '沖繩美好旅行' OR full_text ILIKE '%沖繩美好旅行在地人推薦%') AND article_text ~* '(住宿|飯店|酒店|Hotel|Halekulani|ハレクラニ)'
  UNION SELECT id, 'okinawa-craftsman-stories' FROM post_text WHERE (category = '沖繩美好旅行' OR full_text ILIKE '%沖繩美好旅行在地人推薦%') AND article_text ~* '(職人|今村|陶藝|陶|仲村|豆波波)'

  UNION SELECT id, 'home-coffee-bean-knowledge' FROM post_text WHERE (category = '在宅咖啡' OR full_text ILIKE '%在宅咖啡%') AND article_text ~* '(豆知識|咖啡豆|烘豆|處理法|萃取|風味|杯測|水洗|日曬|蜜處理|配方|濾掛)'
  UNION SELECT id, 'home-coffee-tools' FROM post_text WHERE (category = '在宅咖啡' OR full_text ILIKE '%在宅咖啡%') AND article_text ~* '(器具|V60|Kalita|ORIGAMI|磨豆|濾杯|濾紙|手沖壺|咖啡壺|杯|秤|濾掛)'
  UNION SELECT id, 'home-coffee-drinks' FROM post_text WHERE (category = '在宅咖啡' OR full_text ILIKE '%在宅咖啡%') AND article_text ~* '(調飲|拿鐵|牛奶|特調|冷萃|冰咖啡|咖啡調飲)'
)
INSERT INTO blog_post_category_links (post_id, category_id)
SELECT detail_links.post_id, blog_categories.id
FROM detail_links
JOIN blog_categories ON blog_categories.slug = detail_links.slug
ON CONFLICT DO NOTHING;

WITH okinawa_posts AS (
  SELECT posts.id
  FROM blog_posts posts
  WHERE posts.status = 'published'
    AND posts.slug <> 'system-store-locations'
    AND (posts.category = '沖繩美好旅行' OR array_to_string(coalesce(posts.tags, '{}'::text[]), ' ') ILIKE '%沖繩美好旅行在地人推薦%')
),
linked_detail AS (
  SELECT DISTINCT links.post_id
  FROM blog_post_category_links links
  JOIN blog_categories category ON category.id = links.category_id
  JOIN blog_categories parent ON parent.id = category.parent_id
  WHERE parent.slug = 'okinawa-local-guide'
),
fallback AS (
  SELECT id AS post_id, 'okinawa-attractions' AS slug
  FROM okinawa_posts
  WHERE id NOT IN (SELECT post_id FROM linked_detail)
)
INSERT INTO blog_post_category_links (post_id, category_id)
SELECT fallback.post_id, blog_categories.id
FROM fallback
JOIN blog_categories ON blog_categories.slug = fallback.slug
ON CONFLICT DO NOTHING;


/*
  Unified site content blocks for navigation, footer, and homepage copy.
  Multilingual text is stored in zh/en/ja/ko columns so the frontend can keep
  using normalizeLang + pickByLang without extra locale logic.
*/

CREATE TABLE IF NOT EXISTS public.site_content_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area text NOT NULL CHECK (area = ANY (ARRAY['navigation'::text, 'footer'::text, 'home'::text])),
  placement text NOT NULL DEFAULT '',
  block_type text NOT NULL CHECK (block_type = ANY (ARRAY['section'::text, 'link'::text, 'card'::text, 'cta'::text, 'text'::text])),
  block_key text NOT NULL,
  parent_block_key text NOT NULL DEFAULT '',
  title_zh text NOT NULL DEFAULT '',
  title_en text NOT NULL DEFAULT '',
  title_ja text NOT NULL DEFAULT '',
  title_ko text NOT NULL DEFAULT '',
  subtitle_zh text NOT NULL DEFAULT '',
  subtitle_en text NOT NULL DEFAULT '',
  subtitle_ja text NOT NULL DEFAULT '',
  subtitle_ko text NOT NULL DEFAULT '',
  body_zh text NOT NULL DEFAULT '',
  body_en text NOT NULL DEFAULT '',
  body_ja text NOT NULL DEFAULT '',
  body_ko text NOT NULL DEFAULT '',
  cta_label_zh text NOT NULL DEFAULT '',
  cta_label_en text NOT NULL DEFAULT '',
  cta_label_ja text NOT NULL DEFAULT '',
  cta_label_ko text NOT NULL DEFAULT '',
  link_url text NOT NULL DEFAULT '',
  icon_name text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (block_key)
);

CREATE INDEX IF NOT EXISTS idx_site_content_blocks_area_placement_order
  ON public.site_content_blocks (area, placement, is_active, display_order, created_at);

CREATE INDEX IF NOT EXISTS idx_site_content_blocks_parent_order
  ON public.site_content_blocks (parent_block_key, display_order, created_at);

ALTER TABLE public.site_content_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon can read active site content blocks" ON public.site_content_blocks;
CREATE POLICY "Anon can read active site content blocks"
  ON public.site_content_blocks FOR SELECT
  TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated can read allowed site content blocks" ON public.site_content_blocks;
CREATE POLICY "Authenticated can read allowed site content blocks"
  ON public.site_content_blocks FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR EXISTS (
      SELECT 1
      FROM public.tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role = 'superadmin'
        AND tbl_user_auth.is_active = true
    )
  );

DROP POLICY IF EXISTS "Superadmins can insert site content blocks" ON public.site_content_blocks;
CREATE POLICY "Superadmins can insert site content blocks"
  ON public.site_content_blocks FOR INSERT
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

DROP POLICY IF EXISTS "Superadmins can update site content blocks" ON public.site_content_blocks;
CREATE POLICY "Superadmins can update site content blocks"
  ON public.site_content_blocks FOR UPDATE
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

DROP POLICY IF EXISTS "Superadmins can delete site content blocks" ON public.site_content_blocks;
CREATE POLICY "Superadmins can delete site content blocks"
  ON public.site_content_blocks FOR DELETE
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

GRANT SELECT ON TABLE public.site_content_blocks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.site_content_blocks TO authenticated;
GRANT ALL ON TABLE public.site_content_blocks TO service_role;

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key,
  title_zh, title_en, title_ja, title_ko,
  link_url, icon_name, display_order
) VALUES (
  'navigation', 'header-primary', 'link', 'navigation-header-rooms',
  $$Nestobi 住宿$$, $$Nestobi Stays$$, $$Nestobi 宿泊$$, $$Nestobi 숙박$$,
  '/rooms', 'hotel', 10
)
ON CONFLICT (block_key) DO UPDATE SET
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  link_url = EXCLUDED.link_url,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key,
  title_zh, title_en, title_ja, title_ko,
  link_url, icon_name, display_order
) VALUES (
  'navigation', 'header-primary', 'link', 'navigation-header-shop',
  $$根本在旅行商城$$, $$Genbon Travel Shop$$, $$根本在旅行ショップ$$, $$근본재여행 몰$$,
  '/shop', 'shopping-bag', 20
)
ON CONFLICT (block_key) DO UPDATE SET
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  link_url = EXCLUDED.link_url,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key,
  title_zh, title_en, title_ja, title_ko,
  link_url, icon_name, display_order
) VALUES (
  'navigation', 'header-primary', 'link', 'navigation-header-stores',
  $$根本在旅行咖啡廳$$, $$Genbon Travel Cafes$$, $$根本在旅行カフェ$$, $$근본재여행 카페$$,
  '/stores', 'map-pin', 30
)
ON CONFLICT (block_key) DO UPDATE SET
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  link_url = EXCLUDED.link_url,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key,
  title_zh, title_en, title_ja, title_ko,
  link_url, icon_name, display_order
) VALUES (
  'navigation', 'header-primary', 'link', 'navigation-header-blog',
  $$咖啡旅行家$$, $$Coffee Traveler$$, $$コーヒートラベラー$$, $$커피 트래블러$$,
  '/blog', 'coffee', 40
)
ON CONFLICT (block_key) DO UPDATE SET
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  link_url = EXCLUDED.link_url,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key,
  title_zh, title_en, title_ja, title_ko,
  link_url, icon_name, display_order
) VALUES (
  'navigation', 'mobile-bottom', 'link', 'navigation-mobile-home',
  $$首頁$$, $$Home$$, $$ホーム$$, $$홈$$,
  '/', 'home', 10
)
ON CONFLICT (block_key) DO UPDATE SET
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  link_url = EXCLUDED.link_url,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key,
  title_zh, title_en, title_ja, title_ko,
  link_url, icon_name, display_order
) VALUES (
  'navigation', 'mobile-bottom', 'link', 'navigation-mobile-ai-chat',
  $$AI 客服$$, $$AI Support$$, $$AI サポート$$, $$AI 고객지원$$,
  '/ai/chat', 'message-circle', 20
)
ON CONFLICT (block_key) DO UPDATE SET
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  link_url = EXCLUDED.link_url,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key,
  title_zh, title_en, title_ja, title_ko,
  link_url, icon_name, display_order
) VALUES (
  'navigation', 'mobile-bottom', 'link', 'navigation-mobile-ai-itinerary',
  $$AI 導遊$$, $$AI Guide$$, $$AI ガイド$$, $$AI 가이드$$,
  '/ai/itinerary', 'map', 30
)
ON CONFLICT (block_key) DO UPDATE SET
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  link_url = EXCLUDED.link_url,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key,
  title_zh, title_en, title_ja, title_ko,
  link_url, icon_name, display_order
) VALUES (
  'navigation', 'mobile-bottom', 'link', 'navigation-mobile-ai-coffee-quiz',
  $$AI 尋豆師$$, $$AI Coffee Finder$$, $$AI コーヒー豆診断$$, $$AI 커피 찾기$$,
  '/ai/coffee-quiz', 'coffee', 40
)
ON CONFLICT (block_key) DO UPDATE SET
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  link_url = EXCLUDED.link_url,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key,
  title_zh, title_en, title_ja, title_ko,
  link_url, icon_name, display_order
) VALUES (
  'navigation', 'mobile-bottom', 'link', 'navigation-mobile-member',
  $$我的$$, $$My$$, $$マイ$$, $$내 정보$$,
  '/member', 'user', 50
)
ON CONFLICT (block_key) DO UPDATE SET
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  link_url = EXCLUDED.link_url,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key,
  title_zh, title_en, title_ja, title_ko,
  display_order
) VALUES (
  'footer', 'services', 'section', 'footer-services-heading',
  $$服務$$, $$Services$$, $$サービス$$, $$서비스$$,
  10
)
ON CONFLICT (block_key) DO UPDATE SET
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key, parent_block_key,
  title_zh, title_en, title_ja, title_ko,
  link_url, icon_name, display_order
) VALUES (
  'footer', 'services', 'link', 'footer-services-rooms', 'footer-services-heading',
  $$Nestobi 住宿$$, $$Nestobi Stays$$, $$Nestobi 宿泊$$, $$Nestobi 숙박$$,
  '/rooms', 'hotel', 20
)
ON CONFLICT (block_key) DO UPDATE SET
  parent_block_key = EXCLUDED.parent_block_key,
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  link_url = EXCLUDED.link_url,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key, parent_block_key,
  title_zh, title_en, title_ja, title_ko,
  link_url, icon_name, display_order
) VALUES (
  'footer', 'services', 'link', 'footer-services-shop', 'footer-services-heading',
  $$根本在旅行商城$$, $$Genbon Travel Shop$$, $$根本在旅行ショップ$$, $$근본재여행 몰$$,
  '/shop', 'shopping-bag', 30
)
ON CONFLICT (block_key) DO UPDATE SET
  parent_block_key = EXCLUDED.parent_block_key,
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  link_url = EXCLUDED.link_url,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key, parent_block_key,
  title_zh, title_en, title_ja, title_ko,
  link_url, icon_name, display_order
) VALUES (
  'footer', 'services', 'link', 'footer-services-stores', 'footer-services-heading',
  $$根本在旅行咖啡廳$$, $$Genbon Travel Cafes$$, $$根本在旅行カフェ$$, $$근본재여행 카페$$,
  '/stores', 'map-pin', 40
)
ON CONFLICT (block_key) DO UPDATE SET
  parent_block_key = EXCLUDED.parent_block_key,
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  link_url = EXCLUDED.link_url,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key, parent_block_key,
  title_zh, title_en, title_ja, title_ko,
  link_url, icon_name, display_order
) VALUES (
  'footer', 'services', 'link', 'footer-services-blog', 'footer-services-heading',
  $$咖啡旅行家$$, $$Coffee Traveler$$, $$コーヒートラベラー$$, $$커피 트래블러$$,
  '/blog', 'file-text', 50
)
ON CONFLICT (block_key) DO UPDATE SET
  parent_block_key = EXCLUDED.parent_block_key,
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  link_url = EXCLUDED.link_url,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key,
  title_zh, title_en, title_ja, title_ko,
  display_order
) VALUES (
  'home', 'hero', 'section', 'home-hero-title',
  $$智慧旅遊新體驗$$, $$Smarter Travel Starts Here$$, $$スマートな旅の新体験$$, $$더 똑똑한 여행의 시작$$,
  10
)
ON CONFLICT (block_key) DO UPDATE SET
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key,
  subtitle_zh, subtitle_en, subtitle_ja, subtitle_ko,
  display_order
) VALUES (
  'home', 'search', 'section', 'home-search-title',
  $$今天想去哪裡？$$, $$Where are you heading today?$$, $$今日はどこへ行きますか？$$, $$오늘 어디로 떠날까요?$$,
  20
)
ON CONFLICT (block_key) DO UPDATE SET
  subtitle_zh = EXCLUDED.subtitle_zh,
  subtitle_en = EXCLUDED.subtitle_en,
  subtitle_ja = EXCLUDED.subtitle_ja,
  subtitle_ko = EXCLUDED.subtitle_ko,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key,
  body_zh, body_en, body_ja, body_ko,
  display_order
) VALUES (
  'home', 'search', 'text', 'home-search-placeholder',
  $$搜尋住宿、商品、文章、門市或旅遊靈感...$$, $$Search stays, products, articles, stores, or travel ideas...$$, $$宿泊、商品、記事、店舗、旅のアイデアを検索...$$, $$숙소, 상품, 글, 매장, 여행 아이디어를 검색...$$,
  30
)
ON CONFLICT (block_key) DO UPDATE SET
  body_zh = EXCLUDED.body_zh,
  body_en = EXCLUDED.body_en,
  body_ja = EXCLUDED.body_ja,
  body_ko = EXCLUDED.body_ko,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key,
  title_zh, title_en, title_ja, title_ko,
  subtitle_zh, subtitle_en, subtitle_ja, subtitle_ko,
  display_order
) VALUES (
  'home', 'recommendations', 'section', 'home-recommendations-title',
  $$推薦內容$$, $$Recommended$$, $$おすすめ$$, $$추천 콘텐츠$$,
  $$切換分類，比一直往下滑更快。$$, $$Switch categories instead of scrolling through everything.$$,
  $$カテゴリを切り替えるほうが、全部を下へ追うより早いです。$$, $$카테고리를 전환하면 끝까지 스크롤하는 것보다 더 빠릅니다.$$,
  40
)
ON CONFLICT (block_key) DO UPDATE SET
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  subtitle_zh = EXCLUDED.subtitle_zh,
  subtitle_en = EXCLUDED.subtitle_en,
  subtitle_ja = EXCLUDED.subtitle_ja,
  subtitle_ko = EXCLUDED.subtitle_ko,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key,
  title_zh, title_en, title_ja, title_ko,
  link_url, display_order
) VALUES (
  'home', 'recommendations', 'section', 'home-featured-stays-title',
  $$Nestobi 住宿精選$$, $$Nestobi Featured Stays$$, $$Nestobi のおすすめ宿泊$$, $$Nestobi 추천 숙소$$,
  '/rooms', 50
)
ON CONFLICT (block_key) DO UPDATE SET
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  link_url = EXCLUDED.link_url,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key,
  title_zh, title_en, title_ja, title_ko,
  link_url, display_order
) VALUES (
  'home', 'recommendations', 'section', 'home-featured-shop-title',
  $$根本在旅行商城精選$$, $$Genbon Travel Shop Picks$$, $$根本在旅行ショップおすすめ$$, $$근본재여행 몰 추천$$,
  '/shop', 60
)
ON CONFLICT (block_key) DO UPDATE SET
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  link_url = EXCLUDED.link_url,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key,
  title_zh, title_en, title_ja, title_ko,
  link_url, display_order
) VALUES (
  'home', 'recommendations', 'section', 'home-featured-journal-title',
  $$咖啡旅行家最新文章$$, $$Latest from Coffee Traveler$$, $$コーヒートラベラー最新記事$$, $$커피 트래블러 최신 글$$,
  '/blog', 70
)
ON CONFLICT (block_key) DO UPDATE SET
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  link_url = EXCLUDED.link_url,
  display_order = EXCLUDED.display_order,
  updated_at = now();

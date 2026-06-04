/*
  # Create theme banners

  Stores carousel banners for the three public theme home pages:
  Nestopia stays, Genbon Travel products/stores, and Coffee Traveler articles.

  The table is public-read for active banners and managed by superadmins.
  Explicit GRANT statements keep the table reachable through Supabase Data API.
*/

CREATE TABLE IF NOT EXISTS public.theme_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_key text NOT NULL CHECK (theme_key IN ('nestopia', 'genbon_travel', 'coffee_traveler')),
  title_zh text NOT NULL DEFAULT '',
  title_en text NOT NULL DEFAULT '',
  title_ja text NOT NULL DEFAULT '',
  title_ko text NOT NULL DEFAULT '',
  subtitle_zh text NOT NULL DEFAULT '',
  subtitle_en text NOT NULL DEFAULT '',
  subtitle_ja text NOT NULL DEFAULT '',
  subtitle_ko text NOT NULL DEFAULT '',
  image_url text NOT NULL,
  link_url text NOT NULL DEFAULT '',
  link_label_zh text NOT NULL DEFAULT '',
  link_label_en text NOT NULL DEFAULT '',
  link_label_ja text NOT NULL DEFAULT '',
  link_label_ko text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_theme_banners_theme_active_order
  ON public.theme_banners (theme_key, is_active, display_order, created_at);

ALTER TABLE public.theme_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active theme banners" ON public.theme_banners;
DROP POLICY IF EXISTS "Anon can read active theme banners" ON public.theme_banners;
CREATE POLICY "Anon can read active theme banners"
  ON public.theme_banners FOR SELECT
  TO anon
  USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

DROP POLICY IF EXISTS "Superadmins can read all theme banners" ON public.theme_banners;
DROP POLICY IF EXISTS "Authenticated can read allowed theme banners" ON public.theme_banners;
CREATE POLICY "Authenticated can read allowed theme banners"
  ON public.theme_banners FOR SELECT
  TO authenticated
  USING (
    (
      is_active = true
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at >= now())
    )
    OR EXISTS (
      SELECT 1
      FROM public.tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role = 'superadmin'
        AND tbl_user_auth.is_active = true
    )
  );

DROP POLICY IF EXISTS "Superadmins can insert theme banners" ON public.theme_banners;
CREATE POLICY "Superadmins can insert theme banners"
  ON public.theme_banners FOR INSERT
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

DROP POLICY IF EXISTS "Superadmins can update theme banners" ON public.theme_banners;
CREATE POLICY "Superadmins can update theme banners"
  ON public.theme_banners FOR UPDATE
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

DROP POLICY IF EXISTS "Superadmins can delete theme banners" ON public.theme_banners;
CREATE POLICY "Superadmins can delete theme banners"
  ON public.theme_banners FOR DELETE
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

GRANT SELECT ON TABLE public.theme_banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.theme_banners TO authenticated;
GRANT ALL ON TABLE public.theme_banners TO service_role;

INSERT INTO public.theme_banners (
  theme_key, title_zh, title_en, title_ja, title_ko,
  subtitle_zh, subtitle_en, subtitle_ja, subtitle_ko,
  image_url, link_url, link_label_zh, link_label_en, link_label_ja, link_label_ko,
  display_order, is_active
) VALUES
(
  'nestopia',
  '住進下一段風景',
  'Stay Inside the Next View',
  '次の景色に泊まる',
  '다음 풍경에 머물다',
  '以民宿、房型與城市感受為核心，讓 Nestopia 成為住宿的入口。',
  'Nestopia starts from stays, rooms, cities, and the feeling of arriving.',
  '民宿、客室、街の空気から、Nestopia は宿泊の入口になります。',
  '숙소, 객실, 도시의 감각에서 Nestopia 숙박이 시작됩니다.',
  'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1600',
  '/rooms',
  '探索住宿',
  'Explore stays',
  '宿泊を探す',
  '숙소 둘러보기',
  10,
  true
),
(
  'nestopia',
  '適合旅伴的房型',
  'Rooms for Every Group',
  '旅の仲間に合う客室',
  '여행 동행에 맞는 객실',
  '用人數、預算與停留方式快速找到合適房型。',
  'Find the right room by guests, budget, and the way you want to stay.',
  '人数、予算、滞在スタイルから合う客室を見つけます。',
  '인원, 예산, 머무는 방식으로 알맞은 객실을 찾습니다.',
  'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=1600',
  '/rooms?type=family',
  '看家庭房',
  'View family rooms',
  'ファミリー客室を見る',
  '패밀리 객실 보기',
  20,
  true
),
(
  'genbon_travel',
  '根本在旅行選物商店',
  'Genbon Travel Shop',
  '根本在旅行の選物商店',
  '근본재여행 셀렉트 상점',
  '把咖啡、茶點、旅行器物與門市體驗收在同一個主題。',
  'Coffee, tea, travel goods, and store experiences live under one theme.',
  'コーヒー、お茶、旅の道具、店舗体験をひとつのテーマにまとめます。',
  '커피, 차, 여행 도구, 매장 경험을 하나의 주제로 묶습니다.',
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=1600',
  '/shop',
  '選購商品',
  'Shop products',
  '商品を見る',
  '상품 보기',
  10,
  true
),
(
  'genbon_travel',
  '找到最近的門市',
  'Find a Store Nearby',
  '近くの店舗を探す',
  '가까운 매장 찾기',
  '線上選物與線下門市一起連動，從商品走到真實場域。',
  'Connect online products with real store visits.',
  'オンラインの商品と実店舗の体験をつなぎます。',
  '온라인 상품과 실제 매장 경험을 연결합니다.',
  '/stores/dlal-xinyi-flagship.webp',
  '/stores',
  '查看門市',
  'View stores',
  '店舗を見る',
  '매장 보기',
  20,
  true
),
(
  'coffee_traveler',
  '咖啡旅行家',
  'Coffee Traveler',
  'Coffee Traveler',
  'Coffee Traveler',
  '從一杯咖啡出發，寫下城市、店家、風味與旅途中的人物。',
  'Start from a cup of coffee and collect cities, shops, flavors, and people on the road.',
  '一杯のコーヒーから、街、店、味、人の物語を綴ります。',
  '한 잔의 커피에서 도시, 매장, 맛, 사람의 이야기를 기록합니다.',
  'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=1600',
  '/blog',
  '閱讀文章',
  'Read articles',
  '記事を読む',
  '글 읽기',
  10,
  true
),
(
  'coffee_traveler',
  '沖繩與日本咖啡路線',
  'Coffee Routes in Japan and Okinawa',
  '沖縄と日本のコーヒールート',
  '오키나와와 일본 커피 루트',
  '把咖啡館、在地旅行與職人故事整理成可以慢慢讀的路線。',
  'Coffee shops, local travel, and craft stories become routes worth reading slowly.',
  'カフェ、ローカル旅、職人の物語をゆっくり読めるルートにします。',
  '카페, 로컬 여행, 장인 이야기를 천천히 읽는 루트로 정리합니다.',
  'https://images.pexels.com/photos/302902/pexels-photo-302902.jpeg?auto=compress&cs=tinysrgb&w=1600',
  '/blog',
  '看精選文章',
  'View featured articles',
  '注目記事を見る',
  '추천 글 보기',
  20,
  true
)
ON CONFLICT DO NOTHING;

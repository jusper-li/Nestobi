/*
  # Add home theme banners

  Extends theme_banners so the public homepage hero can use the same
  Supabase-backed banner management flow as the three theme home pages.
*/

ALTER TABLE public.theme_banners
  DROP CONSTRAINT IF EXISTS theme_banners_theme_key_check;

ALTER TABLE public.theme_banners
  ADD CONSTRAINT theme_banners_theme_key_check
  CHECK (theme_key IN ('home', 'nestopia', 'genbon_travel', 'coffee_traveler'));

INSERT INTO public.theme_banners (
  theme_key, title_zh, title_en, title_ja, title_ko,
  subtitle_zh, subtitle_en, subtitle_ja, subtitle_ko,
  image_url, link_url, link_label_zh, link_label_en, link_label_ja, link_label_ko,
  display_order, is_active
)
SELECT *
FROM (
  VALUES
  (
    'home',
    E'三個主題\n各自清楚出發',
    E'Three Themes\nClearly Separated',
    E'3つのテーマ\nそれぞれ明確に',
    E'세 가지 주제\n명확하게 나누어',
    'Nestopia 專注住宿；根本在旅行負責商品與門市；咖啡旅行家獨立整理文章內容，三個主題清楚分工，也能在會員中心彼此連動。',
    'Nestopia focuses on stays, Genbon Travel handles products and stores, and Coffee Traveler organizes articles as its own theme.',
    'Nestopiaは宿泊、根本在旅行は商品と店舗、コーヒートラベラーは記事を独立テーマとして整理します。',
    'Nestopia는 숙박, 근본재여행은 상품과 매장, 커피 트래블러는 글 콘텐츠를 독립 주제로 정리합니다.',
    'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1800',
    '/shop',
    '逛根本在旅行',
    'Shop Genbon Travel',
    '根本在旅行を見る',
    '근본재여행 보기',
    10,
    true
  ),
  (
    'home',
    E'從住宿、選物到文章\n分開管理也彼此連動',
    E'Stays, Products, and Articles\nManaged Apart, Connected Together',
    E'宿泊・商品・記事を\n分けて管理しながら連携',
    E'숙박, 상품, 글을\n분리 관리하며 연결',
    '首頁 banner 可在後台管理圖片、文案、排序與連結，讓三個主題保持清楚入口。',
    'Manage homepage banner images, copy, order, and links from the admin panel.',
    '首頁バナーの画像、文言、順序、リンクを管理画面から調整できます。',
    '관리 화면에서 홈 배너 이미지, 문구, 순서, 링크를 조정할 수 있습니다.',
    'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=1800',
    '/rooms',
    '前往 Nestopia',
    'Explore Nestopia',
    'Nestopiaへ',
    'Nestopia 보기',
    20,
    true
  )
) AS seed(
  theme_key, title_zh, title_en, title_ja, title_ko,
  subtitle_zh, subtitle_en, subtitle_ja, subtitle_ko,
  image_url, link_url, link_label_zh, link_label_en, link_label_ja, link_label_ko,
  display_order, is_active
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.theme_banners
  WHERE theme_key = 'home'
);

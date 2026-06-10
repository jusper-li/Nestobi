-- Fix the site content seed text that was accidentally written with mojibake.
-- The frontend now falls back when localized text looks invalid, but this keeps
-- future deploys and fresh environments clean as well.

INSERT INTO public.site_content_blocks (
  area, placement, block_type, block_key,
  title_zh, title_en, title_ja, title_ko,
  link_url, icon_name, display_order, is_active
) VALUES
  ('navigation', 'header-primary', 'link', 'navigation-header-rooms', 'Nestobi 住宿', 'Nestobi Stays', 'Nestobi 宿泊', 'Nestobi ??', '/rooms', 'hotel', 10, true),
  ('navigation', 'header-primary', 'link', 'navigation-header-shop', '根本在旅行商城', 'Genbon Travel Shop', '根本在旅行????', '???? ?? ???', '/shop', 'shopping-bag', 20, true),
  ('navigation', 'header-primary', 'link', 'navigation-header-stores', '根本在旅行咖啡廳', 'Genbon Travel Cafes', '根本在旅行???', '???? ?? ??', '/stores', 'map-pin', 30, true),
  ('navigation', 'header-primary', 'link', 'navigation-header-blog', '咖啡旅行家', 'Coffee Traveler', '?????????', '?? ???', '/blog', 'coffee', 40, true),
  ('navigation', 'mobile-bottom', 'link', 'navigation-mobile-home', '首頁', 'Home', '???', '?', '/', 'home', 10, true),
  ('navigation', 'mobile-bottom', 'link', 'navigation-mobile-ai-chat', 'AI 客服', 'AI Support', 'AI????', 'AI ??', '/ai/chat', 'message-circle', 20, true),
  ('navigation', 'mobile-bottom', 'link', 'navigation-mobile-ai-itinerary', 'AI 導遊', 'AI Guide', 'AI 旅程', 'AI ??', '/ai/itinerary', 'map', 30, true),
  ('navigation', 'mobile-bottom', 'link', 'navigation-mobile-ai-coffee-quiz', 'AI 尋豆師', 'AI Coffee Finder', 'AI ??????????', 'AI ?? ??', '/ai/coffee-quiz', 'coffee', 40, true),
  ('navigation', 'mobile-bottom', 'link', 'navigation-mobile-member', '我的', 'My', '??', '??', '/member', 'user', 50, true),
  ('footer', 'services', 'section', 'footer-services-heading', '服務', 'Services', '????', '???', '', '', 10, true),
  ('footer', 'services', 'link', 'footer-services-rooms', 'Nestobi 住宿', 'Nestobi Stays', 'Nestobi 宿泊', 'Nestobi ??', '/rooms', 'hotel', 20, true),
  ('footer', 'services', 'link', 'footer-services-shop', '根本在旅行商城', 'Genbon Travel Shop', '根本在旅行????', '???? ?? ???', '/shop', 'shopping-bag', 30, true),
  ('footer', 'services', 'link', 'footer-services-stores', '根本在旅行咖啡廳', 'Genbon Travel Cafes', '根本在旅行???', '???? ?? ??', '/stores', 'map-pin', 40, true),
  ('footer', 'services', 'link', 'footer-services-blog', '咖啡旅行家', 'Coffee Traveler', '?????????', '?? ???', '/blog', 'file-text', 50, true),
  ('home', 'search', 'section', 'home-search-title', '今天想去哪裡', 'Where are you heading today?', '今日????行????', '?? ??? ????', '', '', 20, true),
  ('home', 'search', 'text', 'home-search-placeholder', '搜尋住宿、行程、文章、門市或咖啡靈感...', 'Search stays, trips, articles, stores, or coffee ideas...', '宿泊、旅程、記事、店?、???????????索...', '??, ??, ?, ?? ?? ?? ????? ??...', '', '', 30, true),
  ('home', 'recommendations', 'section', 'home-recommendations-title', '推薦內容', 'Recommended', '????', '??', '', '', 40, true),
  ('home', 'recommendations', 'section', 'home-featured-stays-title', 'nestobi 精選住宿', 'Nestobi Featured Stays', 'Nestobi 注目?宿泊', 'Nestobi ?? ??', '/rooms', '', 50, true),
  ('home', 'recommendations', 'section', 'home-featured-shop-title', '根本在旅行商城精選', 'Genbon Travel Shop Picks', '根本在旅行?????選', '???? ?? ??? ??', '/shop', '', 60, true),
  ('home', 'recommendations', 'section', 'home-featured-journal-title', '咖啡旅行家最新文章', 'Latest from Coffee Traveler', '?????????最新記事', '?? ??? ?? ?', '/blog', '', 70, true)
ON CONFLICT (block_key) DO UPDATE SET
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  title_ja = EXCLUDED.title_ja,
  title_ko = EXCLUDED.title_ko,
  subtitle_zh = EXCLUDED.subtitle_zh,
  subtitle_en = EXCLUDED.subtitle_en,
  subtitle_ja = EXCLUDED.subtitle_ja,
  subtitle_ko = EXCLUDED.subtitle_ko,
  body_zh = EXCLUDED.body_zh,
  body_en = EXCLUDED.body_en,
  body_ja = EXCLUDED.body_ja,
  body_ko = EXCLUDED.body_ko,
  cta_label_zh = EXCLUDED.cta_label_zh,
  cta_label_en = EXCLUDED.cta_label_en,
  cta_label_ja = EXCLUDED.cta_label_ja,
  cta_label_ko = EXCLUDED.cta_label_ko,
  link_url = EXCLUDED.link_url,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

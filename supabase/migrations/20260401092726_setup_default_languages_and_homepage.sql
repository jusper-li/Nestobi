/*
  # Setup Default Languages and Homepage Content

  1. Changes
    - Insert default languages (Traditional Chinese, English, Japanese, Korean)
    - Create default homepage sections with comprehensive content structure
    - Add default translations for common UI elements
  
  2. Security
    - All tables already have RLS enabled
    - This migration only adds default data
  
  3. Content Structure
    - Each homepage section stores: images, text, links, buttons
    - Sections are ordered and can be toggled active/inactive
*/

-- Insert default languages
INSERT INTO languages (code, name, is_default, is_active) VALUES
  ('zh-TW', '繁體中文', true, true),
  ('en', 'English', false, true),
  ('ja', '日本語', false, true),
  ('ko', '한국어', false, true)
ON CONFLICT (code) DO NOTHING;

-- Insert default homepage sections
INSERT INTO homepage_sections (section_type, title, content, sort_order, is_active) VALUES
  (
    'hero',
    '首頁主視覺',
    '{
      "background_image": "",
      "title": "Sonpin",
      "subtitle": "品味每一刻的美好",
      "description": "嚴選世界各地的優質咖啡豆，以專業烘焙技術，為您呈現最純粹的咖啡香氣",
      "buttons": [
        {"text": "探索更多", "link": "#products", "style": "primary"},
        {"text": "查看門市", "link": "#stores", "style": "secondary"}
      ]
    }'::jsonb,
    1,
    true
  ),
  (
    'about',
    '關於我們',
    '{
      "image": "",
      "title": "關於 Sonpin",
      "subtitle": "我們的故事",
      "description": "Sonpin 創立於 2020 年，致力於為咖啡愛好者提供最優質的咖啡體驗。我們相信每一杯咖啡都應該是一次難忘的旅程。",
      "features": [
        {"icon": "coffee", "title": "精選咖啡豆", "description": "來自世界各地的優質產區"},
        {"icon": "flame", "title": "專業烘焙", "description": "嚴格控制每一個烘焙環節"},
        {"icon": "heart", "title": "用心服務", "description": "為每位顧客提供最好的體驗"}
      ]
    }'::jsonb,
    2,
    true
  ),
  (
    'products',
    '精選商品',
    '{
      "title": "精選商品",
      "subtitle": "我們的咖啡",
      "description": "嚴選世界各地優質咖啡豆，提供多種風味選擇",
      "display_mode": "grid",
      "show_count": 6
    }'::jsonb,
    3,
    true
  ),
  (
    'stores',
    '門市據點',
    '{
      "title": "門市據點",
      "subtitle": "歡迎蒞臨",
      "description": "我們在各地都有門市，歡迎您前來品嚐",
      "display_mode": "list"
    }'::jsonb,
    4,
    true
  ),
  (
    'contact',
    '聯絡我們',
    '{
      "title": "聯絡我們",
      "subtitle": "與我們聯繫",
      "description": "有任何問題或建議，歡迎隨時與我們聯繫",
      "email": "hello@ymcoffee.com",
      "phone": "+886-2-1234-5678",
      "address": "台北市信義區信義路五段7號"
    }'::jsonb,
    5,
    true
  )
ON CONFLICT DO NOTHING;

-- Insert default UI translations for Traditional Chinese
INSERT INTO translations (language_code, key, value) VALUES
  ('zh-TW', 'nav.home', '首頁'),
  ('zh-TW', 'nav.about', '關於'),
  ('zh-TW', 'nav.products', '商品'),
  ('zh-TW', 'nav.stores', '門市'),
  ('zh-TW', 'nav.contact', '聯絡'),
  ('zh-TW', 'footer.copyright', '© 2026 Sonpin. All Rights Reserved.'),
  ('zh-TW', 'footer.privacy', '隱私權政策'),
  ('zh-TW', 'footer.terms', '服務條款'),
  ('zh-TW', 'footer.contact', '聯絡我們'),
  ('zh-TW', 'footer.stores', '門市資訊'),
  ('zh-TW', 'footer.email', 'hello@ymcoffee.com'),
  ('zh-TW', 'common.loading', '載入中...'),
  ('zh-TW', 'common.error', '發生錯誤'),
  ('zh-TW', 'common.success', '成功'),
  ('zh-TW', 'common.cancel', '取消'),
  ('zh-TW', 'common.confirm', '確認'),
  ('zh-TW', 'common.save', '儲存'),
  ('zh-TW', 'common.delete', '刪除'),
  ('zh-TW', 'common.edit', '編輯')
ON CONFLICT (language_code, key) DO NOTHING;

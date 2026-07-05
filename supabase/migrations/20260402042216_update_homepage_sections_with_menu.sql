/*
  # Update Homepage Sections with Menu Items

  1. Changes
    - Update existing homepage sections with proper menu structure
    - Add additional sections for all menu items
    - Each section can have submenu items stored in content
  
  2. Security
    - All tables already have RLS enabled
*/

-- Clear existing sections to rebuild with proper structure
DELETE FROM homepage_sections;

-- Insert hero section
INSERT INTO homepage_sections (section_type, title, content, sort_order, is_active) VALUES
  (
    'hero',
    '首頁主視覺',
    '{
      "background_image": "",
      "label": "首頁",
      "main_title": "y & m",
      "subtitle": "COFFEE",
      "tagline": "WORLD CHAMPION ROASTERS",
      "description": "從產地到杯中的完美旅程"
    }'::jsonb,
    1,
    true
  );

-- Insert about section
INSERT INTO homepage_sections (section_type, title, content, sort_order, is_active) VALUES
  (
    'about',
    '關於品牌',
    '{
      "label": "關於品牌",
      "subtitle": "Our Story",
      "number": "01",
      "title": "關於 Sonpin",
      "description": "我們致力於為咖啡愛好者提供最優質的咖啡體驗",
      "image": "",
      "submenu": [
        {"label": "Philosophy", "title": "品牌理念", "href": "/about/philosophy"},
        {"label": "Craftsmanship", "title": "烘焙工藝", "href": "/about/craft"},
        {"label": "Quality", "title": "品質堅持", "href": "/about/quality"}
      ]
    }'::jsonb,
    2,
    true
  );

-- Insert shop section
INSERT INTO homepage_sections (section_type, title, content, sort_order, is_active) VALUES
  (
    'shop',
    '禮盒商城',
    '{
      "label": "禮盒商城",
      "subtitle": "Gift Collection",
      "number": "02",
      "title": "精選禮盒",
      "description": "為每個重要時刻準備完美禮物",
      "image": "",
      "submenu": [
        {"label": "Classic", "title": "經典禮盒", "href": "/shop/classic"},
        {"label": "Seasonal", "title": "節慶限定", "href": "/shop/seasonal"},
        {"label": "Custom", "title": "訂製服務", "href": "/shop/custom"}
      ]
    }'::jsonb,
    3,
    true
  );

-- Insert subscription section
INSERT INTO homepage_sections (section_type, title, content, sort_order, is_active) VALUES
  (
    'subscription',
    '月票訂閱',
    '{
      "label": "月票訂閱",
      "subtitle": "Monthly Subscription",
      "number": "03",
      "title": "咖啡訂閱服務",
      "description": "每月精選不同產區的新鮮咖啡豆送到您家",
      "image": "",
      "submenu": [
        {"label": "Light Plan", "title": "輕量方案", "href": "/subscription/light"},
        {"label": "Classic Plan", "title": "經典方案", "href": "/subscription/classic"},
        {"label": "Premium Plan", "title": "尊享方案", "href": "/subscription/premium"}
      ]
    }'::jsonb,
    4,
    true
  );

-- Insert corporate section
INSERT INTO homepage_sections (section_type, title, content, sort_order, is_active) VALUES
  (
    'corporate',
    '企業禮賓',
    '{
      "label": "企業禮賓",
      "subtitle": "Corporate Gifting",
      "number": "04",
      "title": "企業禮賓服務",
      "description": "為您的企業提供專業的咖啡禮賓方案",
      "image": "",
      "submenu": [
        {"label": "Corporate Gifts", "title": "企業贈禮", "href": "/corporate/gifts"},
        {"label": "Event Planning", "title": "活動規劃", "href": "/corporate/events"},
        {"label": "Concierge", "title": "專人服務", "href": "/corporate/concierge"}
      ]
    }'::jsonb,
    5,
    true
  );

-- Insert journal section
INSERT INTO homepage_sections (section_type, title, content, sort_order, is_active) VALUES
  (
    'journal',
    '我的旅行筆記',
    '{
      "label": "我的旅行筆記",
      "subtitle": "Travel Notes",
      "number": "05",
      "title": "咖啡產地之旅",
      "description": "跟隨我們的腳步，探索世界各地的咖啡產區",
      "image": "",
      "submenu": [
        {"label": "Ethiopia", "title": "衣索比亞", "href": "/travel/ethiopia"},
        {"label": "Colombia", "title": "哥倫比亞", "href": "/travel/colombia"},
        {"label": "Panama", "title": "巴拿馬", "href": "/travel/panama"}
      ]
    }'::jsonb,
    6,
    true
  );
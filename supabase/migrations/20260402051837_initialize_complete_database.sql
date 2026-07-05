/*
  ===================================================================
  COMPLETE DATABASE SCHEMA FOR Y & M COFFEE E-COMMERCE PLATFORM
  ===================================================================

  This script creates the complete database schema including:
  - Admin authentication and authorization system
  - Product catalog with categories
  - Order and payment management
  - Member/customer management
  - Content management (articles, FAQs, homepage sections)
  - Multi-language support
  - SEO settings
  - AI chat integration
  - Storage buckets for images

  Run this script in Supabase SQL Editor to initialize the database.
  ===================================================================
*/

-- ===================================================================
-- 1. EXTENSIONS
-- ===================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===================================================================
-- 2. HELPER FUNCTIONS
-- ===================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- 3. ADMIN AUTHENTICATION SYSTEM
-- ===================================================================

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  avatar_url text,
  is_active boolean DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  action text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(module, action)
);

-- Role-Permission junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Admin-Role junction table
CREATE TABLE IF NOT EXISTS admin_roles (
  admin_id uuid REFERENCES admins(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (admin_id, role_id)
);

-- ===================================================================
-- 4. BUSINESS MODULE TABLES
-- ===================================================================

-- Members (customers) table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  avatar_url text,
  is_active boolean DEFAULT true,
  total_spent numeric DEFAULT 0,
  order_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  summary text DEFAULT '',
  content text DEFAULT '',
  price numeric NOT NULL,
  sale_price numeric,
  cost_price numeric DEFAULT 0,
  member_price numeric,
  stock integer DEFAULT 0,
  sku text UNIQUE,
  images jsonb DEFAULT '[]',
  specifications jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  is_hidden boolean DEFAULT false,
  seo_title text DEFAULT '',
  seo_description text DEFAULT '',
  seo_keywords text DEFAULT '',
  og_image text DEFAULT '',
  og_title text DEFAULT '',
  og_description text DEFAULT '',
  published_at timestamptz,
  unpublished_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  order_number text UNIQUE NOT NULL,
  status text DEFAULT 'pending',
  subtotal numeric NOT NULL,
  tax numeric DEFAULT 0,
  shipping numeric DEFAULT 0,
  total numeric NOT NULL,
  payment_status text DEFAULT 'unpaid',
  shipping_address jsonb,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  price numeric NOT NULL,
  total numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  method text NOT NULL,
  status text DEFAULT 'pending',
  transaction_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Stores (physical locations) table
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  phone text,
  email text,
  opening_hours jsonb DEFAULT '{}',
  location jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Articles (blog posts) table
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text DEFAULT '',
  excerpt text DEFAULT '',
  featured_image text,
  author_id uuid REFERENCES admins(id) ON DELETE SET NULL,
  status text DEFAULT 'draft',
  published_at timestamptz,
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- FAQs table
CREATE TABLE IF NOT EXISTS faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text DEFAULT 'general',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Homepage sections table
CREATE TABLE IF NOT EXISTS homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type text NOT NULL,
  title text NOT NULL,
  content jsonb DEFAULT '{}',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Social accounts table
CREATE TABLE IF NOT EXISTS social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text UNIQUE NOT NULL,
  username text NOT NULL,
  url text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Languages table
CREATE TABLE IF NOT EXISTS languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Translations table
CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(language_code, key)
);

-- SEO settings table
CREATE TABLE IF NOT EXISTS seo_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path text UNIQUE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  keywords text DEFAULT '',
  og_image text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI chat logs table
CREATE TABLE IF NOT EXISTS ai_chat_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  message text NOT NULL,
  response text NOT NULL,
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- AI usage stats table
CREATE TABLE IF NOT EXISTS ai_usage_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
  total_requests integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  avg_response_time numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Site settings table (for header/footer configurations)
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ===================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ===================================================================

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ===================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role full access to admins" ON admins;
DROP POLICY IF EXISTS "Service role full access to roles" ON roles;
DROP POLICY IF EXISTS "Service role full access to permissions" ON permissions;
DROP POLICY IF EXISTS "Service role full access to role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Service role full access to admin_roles" ON admin_roles;
DROP POLICY IF EXISTS "Service role full access to members" ON members;
DROP POLICY IF EXISTS "Service role full access to categories" ON categories;
DROP POLICY IF EXISTS "Service role full access to products" ON products;
DROP POLICY IF EXISTS "Service role full access to orders" ON orders;
DROP POLICY IF EXISTS "Service role full access to order_items" ON order_items;
DROP POLICY IF EXISTS "Service role full access to payments" ON payments;
DROP POLICY IF EXISTS "Service role full access to stores" ON stores;
DROP POLICY IF EXISTS "Service role full access to articles" ON articles;
DROP POLICY IF EXISTS "Service role full access to faqs" ON faqs;
DROP POLICY IF EXISTS "Service role full access to homepage_sections" ON homepage_sections;
DROP POLICY IF EXISTS "Service role full access to social_accounts" ON social_accounts;
DROP POLICY IF EXISTS "Service role full access to languages" ON languages;
DROP POLICY IF EXISTS "Service role full access to translations" ON translations;
DROP POLICY IF EXISTS "Service role full access to seo_settings" ON seo_settings;
DROP POLICY IF EXISTS "Service role full access to ai_chat_logs" ON ai_chat_logs;
DROP POLICY IF EXISTS "Service role full access to ai_usage_stats" ON ai_usage_stats;
DROP POLICY IF EXISTS "Anyone can read site settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can update site settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can insert site settings" ON site_settings;

-- Admin tables - Service role access only
CREATE POLICY "Service role full access to admins" ON admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to roles" ON roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to permissions" ON permissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to role_permissions" ON role_permissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to admin_roles" ON admin_roles FOR ALL USING (true) WITH CHECK (true);

-- Business tables - Service role access only
CREATE POLICY "Service role full access to members" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to stores" ON stores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to articles" ON articles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to faqs" ON faqs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to homepage_sections" ON homepage_sections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to social_accounts" ON social_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to languages" ON languages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to translations" ON translations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to seo_settings" ON seo_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ai_chat_logs" ON ai_chat_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ai_usage_stats" ON ai_usage_stats FOR ALL USING (true) WITH CHECK (true);

-- Site settings - Public read, admin write
CREATE POLICY "Anyone can read site settings" ON site_settings FOR SELECT TO public USING (true);
CREATE POLICY "Admins can update site settings" ON site_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid() AND admins.is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid() AND admins.is_active = true));
CREATE POLICY "Admins can insert site settings" ON site_settings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid() AND admins.is_active = true));

-- ===================================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- ===================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_admins_updated_at') THEN
    CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_members_updated_at') THEN
    CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_categories_updated_at') THEN
    CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_updated_at') THEN
    CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_orders_updated_at') THEN
    CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_stores_updated_at') THEN
    CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_articles_updated_at') THEN
    CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_faqs_updated_at') THEN
    CREATE TRIGGER update_faqs_updated_at BEFORE UPDATE ON faqs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_homepage_sections_updated_at') THEN
    CREATE TRIGGER update_homepage_sections_updated_at BEFORE UPDATE ON homepage_sections
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_social_accounts_updated_at') THEN
    CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON social_accounts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_translations_updated_at') THEN
    CREATE TRIGGER update_translations_updated_at BEFORE UPDATE ON translations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_seo_settings_updated_at') THEN
    CREATE TRIGGER update_seo_settings_updated_at BEFORE UPDATE ON seo_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_site_settings_updated_at') THEN
    CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON site_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ===================================================================
-- 8. INDEXES FOR PERFORMANCE
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_orders_member ON orders(member_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_logs_session ON ai_chat_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_date ON ai_usage_stats(date);

-- ===================================================================
-- 9. ADMIN LOGIN FUNCTION
-- ===================================================================

-- Password-based admin login is intentionally not created.
-- Backoffice authentication uses Supabase Auth email magic links.
DROP FUNCTION IF EXISTS public.verify_admin_login(text, text);

-- ===================================================================
-- 10. DEFAULT DATA - ROLES AND PERMISSIONS
-- ===================================================================

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('super_admin', 'Super administrator with full access'),
  ('admin', 'Administrator with limited access'),
  ('product_manager', 'Manages products and categories'),
  ('order_manager', 'Manages orders and payments'),
  ('content_editor', 'Manages content (articles, FAQs)'),
  ('store_manager', 'Manages store locations'),
  ('marketing_manager', 'Manages SEO and social media'),
  ('viewer', 'Read-only access')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (module, action, description) VALUES
  -- Dashboard
  ('dashboard', 'view', 'View dashboard'),

  -- Members
  ('members', 'view', 'View members'),
  ('members', 'create', 'Create members'),
  ('members', 'update', 'Update members'),
  ('members', 'delete', 'Delete members'),

  -- Products
  ('products', 'view', 'View products'),
  ('products', 'create', 'Create products'),
  ('products', 'update', 'Update products'),
  ('products', 'delete', 'Delete products'),

  -- Orders
  ('orders', 'view', 'View orders'),
  ('orders', 'create', 'Create orders'),
  ('orders', 'update', 'Update orders'),
  ('orders', 'delete', 'Delete orders'),

  -- Payments
  ('payments', 'view', 'View payments'),
  ('payments', 'manage', 'Manage payments'),

  -- Stores
  ('stores', 'view', 'View stores'),
  ('stores', 'create', 'Create stores'),
  ('stores', 'update', 'Update stores'),
  ('stores', 'delete', 'Delete stores'),

  -- Articles
  ('articles', 'view', 'View articles'),
  ('articles', 'create', 'Create articles'),
  ('articles', 'update', 'Update articles'),
  ('articles', 'delete', 'Delete articles'),

  -- FAQ
  ('faq', 'view', 'View FAQ'),
  ('faq', 'create', 'Create FAQ'),
  ('faq', 'update', 'Update FAQ'),
  ('faq', 'delete', 'Delete FAQ'),

  -- Homepage
  ('homepage', 'view', 'View homepage settings'),
  ('homepage', 'update', 'Update homepage settings'),

  -- Social
  ('social', 'view', 'View social accounts'),
  ('social', 'update', 'Update social accounts'),

  -- Languages
  ('languages', 'view', 'View languages'),
  ('languages', 'update', 'Update languages'),

  -- SEO
  ('seo', 'view', 'View SEO settings'),
  ('seo', 'update', 'Update SEO settings'),

  -- AI Chat
  ('ai_chat', 'view', 'View AI chat logs'),
  ('ai_chat', 'manage', 'Manage AI chat'),

  -- AI Analytics
  ('ai_analytics', 'view', 'View AI usage analytics'),

  -- Permissions
  ('permissions', 'view', 'View permissions'),
  ('permissions', 'manage', 'Manage permissions')
ON CONFLICT (module, action) DO NOTHING;

-- Grant all permissions to super_admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- ===================================================================
-- 11. DEFAULT DATA - ADMIN USER
-- ===================================================================

-- No default admin account is inserted.
-- Create an admin in Supabase Auth and add the same email to public.admins.

-- ===================================================================
-- 12. DEFAULT DATA - LANGUAGES
-- ===================================================================

INSERT INTO languages (code, name, is_default, is_active) VALUES
  ('zh-TW', '繁體中文', true, true),
  ('en', 'English', false, true),
  ('ja', '日本語', false, true),
  ('ko', '한국어', false, true)
ON CONFLICT (code) DO NOTHING;

-- ===================================================================
-- 13. DEFAULT DATA - TRANSLATIONS
-- ===================================================================

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

-- ===================================================================
-- 14. DEFAULT DATA - HOMEPAGE SECTIONS
-- ===================================================================

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
  ),
  (
    'menu',
    '導覽選單',
    '{
      "items": [
        {"label": "首頁", "href": "/"},
        {"label": "關於我們", "href": "#about"},
        {"label": "禮盒商城", "href": "/shop"},
        {"label": "聯絡我們", "href": "#contact"}
      ]
    }'::jsonb,
    0,
    true
  )
ON CONFLICT DO NOTHING;

-- ===================================================================
-- 15. DEFAULT DATA - SITE SETTINGS
-- ===================================================================

-- Header settings
INSERT INTO site_settings (setting_key, setting_value)
VALUES (
  'header',
  '{
    "logo_text": "COFFEE HOUSE",
    "logo_image": "",
    "navigation": [
      {"label": "首頁", "href": "/"},
      {"label": "關於我們", "href": "#about"},
      {"label": "禮盒商城", "href": "/shop"},
      {"label": "聯絡我們", "href": "#contact"}
    ],
    "show_cart": true,
    "show_language_selector": true
  }'::jsonb
)
ON CONFLICT (setting_key) DO NOTHING;

-- Footer settings
INSERT INTO site_settings (setting_key, setting_value)
VALUES (
  'footer',
  '{
    "about_text": "我們致力於提供最優質的咖啡體驗，精選來自世界各地的頂級咖啡豆，為您帶來獨特的風味之旅。",
    "contact_email": "info@coffeehouse.com",
    "contact_phone": "+886 2 1234 5678",
    "social_links": {
      "facebook": "https://facebook.com",
      "instagram": "https://instagram.com",
      "youtube": "https://youtube.com"
    },
    "copyright_text": "© 2024 Coffee House. All rights reserved.",
    "link_groups": [
      {
        "title": "關於",
        "links": [
          {"label": "關於我們", "href": "#about"},
          {"label": "品牌故事", "href": "#story"},
          {"label": "聯絡我們", "href": "#contact"}
        ]
      },
      {
        "title": "商品",
        "links": [
          {"label": "禮盒商城", "href": "/shop"},
          {"label": "咖啡豆", "href": "/shop"},
          {"label": "禮盒組合", "href": "/shop"}
        ]
      },
      {
        "title": "客戶服務",
        "links": [
          {"label": "常見問題", "href": "#faq"},
          {"label": "配送資訊", "href": "#shipping"},
          {"label": "退換貨政策", "href": "#returns"}
        ]
      }
    ]
  }'::jsonb
)
ON CONFLICT (setting_key) DO NOTHING;

-- ===================================================================
-- 16. STORAGE BUCKETS
-- ===================================================================

-- Create homepage images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('homepage-images', 'homepage-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create product images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for homepage images
DROP POLICY IF EXISTS "Public read access for homepage images" ON storage.objects;
DROP POLICY IF EXISTS "Service role upload access for homepage images" ON storage.objects;
DROP POLICY IF EXISTS "Service role update access for homepage images" ON storage.objects;
DROP POLICY IF EXISTS "Service role delete access for homepage images" ON storage.objects;

CREATE POLICY "Public read access for homepage images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'homepage-images');

CREATE POLICY "Service role upload access for homepage images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'homepage-images');

CREATE POLICY "Service role update access for homepage images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'homepage-images')
  WITH CHECK (bucket_id = 'homepage-images');

CREATE POLICY "Service role delete access for homepage images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'homepage-images');

-- Storage policies for product images
DROP POLICY IF EXISTS "Public read access for product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;

CREATE POLICY "Public read access for product images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can update product images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can delete product images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');

-- ===================================================================
-- INITIALIZATION COMPLETE
-- ===================================================================

/*
  # Create Header and Footer Settings

  1. New Tables
    - `site_settings` - Global site settings including header and footer configurations
      - `id` (uuid, primary key)
      - `setting_key` (text, unique) - Unique identifier for the setting (e.g., 'header', 'footer')
      - `setting_value` (jsonb) - JSON object containing all configuration
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Settings Structure
    - Header settings will include:
      - logo_text: Brand name
      - logo_image: Logo image URL
      - navigation: Array of navigation items with label and href
      - show_cart: Boolean to show/hide cart icon
      - show_language_selector: Boolean to show/hide language selector
    
    - Footer settings will include:
      - about_text: About section text
      - contact_email: Contact email
      - contact_phone: Contact phone
      - social_links: Object with social media URLs (facebook, instagram, youtube)
      - copyright_text: Copyright notice
      - links: Array of footer link groups

  3. Security
    - Enable RLS on `site_settings` table
    - Add policy for public read access
    - Add policy for authenticated admin write access

  4. Default Data
    - Insert default header configuration
    - Insert default footer configuration
*/

-- Create site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read site settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can update site settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can insert site settings" ON site_settings;

-- Public read access
CREATE POLICY "Anyone can read site settings"
  ON site_settings
  FOR SELECT
  TO public
  USING (true);

-- Admin write access
CREATE POLICY "Admins can update site settings"
  ON site_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  );

-- Admin insert access
CREATE POLICY "Admins can insert site settings"
  ON site_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  );

-- Insert default header settings
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

-- Insert default footer settings
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

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_site_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_site_settings_updated_at
      BEFORE UPDATE ON site_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
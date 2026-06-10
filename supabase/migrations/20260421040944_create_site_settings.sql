/*
  # Create site_settings table

  ## Summary
  Stores global website configuration that the super admin can edit, including
  site name, description, icon, OG image, keywords, contact info, social links,
  and theme colour. Powers dynamic SEO tags across the entire site.

  ## New Tables
  - `site_settings`
    - `id` (uuid, PK)
    - `is_active` (boolean) — marks the live row
    - `site_name` (text) — website display name
    - `site_slogan` (text) — tagline shown beside name
    - `site_description` (text) — default meta description
    - `site_icon_url` (text) — favicon / logo URL
    - `og_image_url` (text) — default Open Graph image
    - `meta_keywords` (text) — default meta keywords
    - `contact_phone` (text)
    - `contact_email` (text)
    - `social_facebook` (text)
    - `social_instagram` (text)
    - `social_twitter` (text)
    - `theme_color` (text) — hex colour for browser chrome
    - `ai_site_summary` (text) — AI-friendly extended summary
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Anyone (anon + authenticated) can read active settings (public data)
  - Only superadmins can update
*/

CREATE TABLE IF NOT EXISTS site_settings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active         boolean NOT NULL DEFAULT true,
  site_name         text NOT NULL DEFAULT 'Nestobi 旅遊平台',
  site_slogan       text NOT NULL DEFAULT '智慧旅遊新體驗',
  site_description  text NOT NULL DEFAULT '結合 AI 智慧科技，提供一站式旅遊服務。訂房、購物、AI 行程規劃、即時翻譯，讓每次旅程都無憂無慮。',
  site_icon_url     text NOT NULL DEFAULT '/20260407_nestobi_logo.svg',
  og_image_url      text NOT NULL DEFAULT '/LOGO.png',
  meta_keywords     text NOT NULL DEFAULT '旅遊平台, 訂房, AI旅遊, 行程規劃, 台灣旅遊, 住宿訂房, 旅遊購物, 旅遊翻譯, Nestobi',
  contact_phone     text NOT NULL DEFAULT '02-27565663',
  contact_email     text NOT NULL DEFAULT '',
  social_facebook   text NOT NULL DEFAULT 'https://www.facebook.com/nestobi',
  social_instagram  text NOT NULL DEFAULT 'https://www.instagram.com/nestobi',
  social_twitter    text NOT NULL DEFAULT '',
  theme_color       text NOT NULL DEFAULT '#C09A6A',
  ai_site_summary   text NOT NULL DEFAULT 'Nestobi 是一個結合 AI 智慧科技的一站式旅遊平台，提供住宿訂房、旅遊購物、AI 行程規劃、多語即時翻譯、24 小時 AI 客服及旅遊護照等功能，專為台灣與亞洲旅遊市場打造。',
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Public data (site name, description, etc.) needs to be readable by everyone
CREATE POLICY "Anyone can read active site settings"
  ON site_settings FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Only superadmins can update
CREATE POLICY "Superadmins can update site settings"
  ON site_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
      AND tbl_user_auth.role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
      AND tbl_user_auth.role = 'superadmin'
    )
  );

-- Seed a default row
INSERT INTO site_settings (is_active) VALUES (true);

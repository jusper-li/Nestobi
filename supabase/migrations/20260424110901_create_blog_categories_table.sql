/*
  # Create Blog Categories Table

  ## Summary
  Creates a managed blog_categories table so superadmins can add, edit,
  and remove article categories without touching code.

  ## New Tables
  - `blog_categories`
    - `id` (uuid, primary key)
    - `name` (text, unique) — display name shown in UI
    - `slug` (text, unique) — URL-safe identifier
    - `description` (text) — optional description
    - `display_order` (int) — controls tab order in BlogList
    - `is_active` (boolean) — hide/show without deleting
    - `created_at`, `updated_at` (timestamptz)

  ## Security
  - Public (anon + authenticated) can SELECT active categories
  - Only admins (is_admin()) can INSERT / UPDATE / DELETE

  ## Seed Data
  Inserts the 5 existing hardcoded categories in their current order.
*/

CREATE TABLE IF NOT EXISTS blog_categories (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL UNIQUE,
  slug         text        NOT NULL UNIQUE,
  description  text        NOT NULL DEFAULT '',
  display_order int        NOT NULL DEFAULT 0,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

-- Public read (used by BlogList, forms, etc.)
CREATE POLICY "Anyone can read active blog categories"
  ON blog_categories FOR SELECT
  USING (is_active = true);

-- Admin write
CREATE POLICY "Admins can insert blog categories"
  ON blog_categories FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update blog categories"
  ON blog_categories FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete blog categories"
  ON blog_categories FOR DELETE
  TO authenticated
  USING (is_admin());

-- Superadmin also needs to read inactive categories
CREATE POLICY "Admins can read all blog categories"
  ON blog_categories FOR SELECT
  TO authenticated
  USING (is_admin());

-- Seed the 5 existing categories
INSERT INTO blog_categories (name, slug, description, display_order) VALUES
  ('咖啡旅行', 'coffee-travel',       '日本各地咖啡廳介紹與咖啡器具評測', 1),
  ('旅遊指南', 'travel-guide',        '旅遊攻略、景點指南、行前準備', 2),
  ('美食探索', 'food-exploration',    '美食餐廳推薦、伴手禮、菜單解析', 3),
  ('住宿推薦', 'accommodation',       '飯店、民宿、度假村深度評測', 4),
  ('旅行日記', 'travel-journal',      '職人故事、旅行記錄、咖啡文化', 5)
ON CONFLICT (name) DO NOTHING;

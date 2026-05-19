/*
  # 建立部落格文章資料表（咖啡旅行家）

  ## 新增資料表
  - `blog_posts`：儲存所有部落格文章
    - `id`：UUID 主鍵
    - `title`：文章標題
    - `slug`：URL 友善識別碼（唯一）
    - `excerpt`：文章摘要
    - `content`：文章內容（HTML）
    - `cover_image_url`：封面圖片網址
    - `author_name`：作者名稱（預設 Nestobi 編輯部）
    - `tags`：標籤陣列
    - `category`：分類名稱
    - `status`：狀態（draft / published）
    - `meta_description`：SEO 說明
    - `published_at`：發布時間
    - `created_at` / `updated_at`：時間戳記

  ## 安全性
  - 啟用 RLS
  - 公開可讀取已發布文章（未登入也可讀）
  - 管理員（role = admin 或 superadmin）可完整 CRUD
*/

CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  excerpt text DEFAULT '',
  content text NOT NULL DEFAULT '',
  cover_image_url text DEFAULT '',
  author_name text DEFAULT 'Nestobi 編輯部',
  tags text[] DEFAULT '{}',
  category text DEFAULT '咖啡旅行',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  meta_description text DEFAULT '',
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published posts"
  ON blog_posts FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can read all posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
      AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can insert posts"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
      AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can update posts"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
      AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
      AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can delete posts"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
      AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

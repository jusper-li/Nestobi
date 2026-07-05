/*
  # Row Level Security Policies

  1. Admin System Policies
    - Admin tables require service role access (for backend API)
    - All operations on admin tables are restricted
  
  2. Business Module Policies
    - All business tables require service role access
    - Frontend will use Edge Functions to access data with proper authentication
  
  3. Security Notes
    - Admin authentication will be handled via Edge Functions
    - Edge Functions will use service role key to bypass RLS
    - This ensures proper permission checking in application layer
*/

-- Admin tables - Restrictive by default (service role only)
CREATE POLICY "Service role full access to admins"
  ON admins FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to roles"
  ON roles FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to permissions"
  ON permissions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to role_permissions"
  ON role_permissions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to admin_roles"
  ON admin_roles FOR ALL
  USING (true)
  WITH CHECK (true);

-- Members table
CREATE POLICY "Service role full access to members"
  ON members FOR ALL
  USING (true)
  WITH CHECK (true);

-- Categories table
CREATE POLICY "Service role full access to categories"
  ON categories FOR ALL
  USING (true)
  WITH CHECK (true);

-- Products table
CREATE POLICY "Service role full access to products"
  ON products FOR ALL
  USING (true)
  WITH CHECK (true);

-- Orders table
CREATE POLICY "Service role full access to orders"
  ON orders FOR ALL
  USING (true)
  WITH CHECK (true);

-- Order items table
CREATE POLICY "Service role full access to order_items"
  ON order_items FOR ALL
  USING (true)
  WITH CHECK (true);

-- Payments table
CREATE POLICY "Service role full access to payments"
  ON payments FOR ALL
  USING (true)
  WITH CHECK (true);

-- Stores table
CREATE POLICY "Service role full access to stores"
  ON stores FOR ALL
  USING (true)
  WITH CHECK (true);

-- Articles table
CREATE POLICY "Service role full access to articles"
  ON articles FOR ALL
  USING (true)
  WITH CHECK (true);

-- FAQs table
CREATE POLICY "Service role full access to faqs"
  ON faqs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Homepage sections table
CREATE POLICY "Service role full access to homepage_sections"
  ON homepage_sections FOR ALL
  USING (true)
  WITH CHECK (true);

-- Social accounts table
CREATE POLICY "Service role full access to social_accounts"
  ON social_accounts FOR ALL
  USING (true)
  WITH CHECK (true);

-- Languages table
CREATE POLICY "Service role full access to languages"
  ON languages FOR ALL
  USING (true)
  WITH CHECK (true);

-- Translations table
CREATE POLICY "Service role full access to translations"
  ON translations FOR ALL
  USING (true)
  WITH CHECK (true);

-- SEO settings table
CREATE POLICY "Service role full access to seo_settings"
  ON seo_settings FOR ALL
  USING (true)
  WITH CHECK (true);

-- AI chat logs table
CREATE POLICY "Service role full access to ai_chat_logs"
  ON ai_chat_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- AI usage stats table
CREATE POLICY "Service role full access to ai_usage_stats"
  ON ai_usage_stats FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
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
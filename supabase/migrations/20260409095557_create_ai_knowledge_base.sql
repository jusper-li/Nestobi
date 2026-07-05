/*
  # Create AI Knowledge Base System

  1. New Tables
    - `knowledge_categories`
      - `id` (uuid, primary key)
      - `name` (text, category name)
      - `description` (text, category description)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `knowledge_base`
      - `id` (uuid, primary key)
      - `category_id` (uuid, foreign key to knowledge_categories)
      - `question` (text, the question)
      - `answer` (text, the answer)
      - `keywords` (text array, search keywords)
      - `priority` (integer, priority level for matching)
      - `usage_count` (integer, how many times used)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `chat_feedback`
      - `id` (uuid, primary key)
      - `message_id` (uuid, foreign key to chat_messages)
      - `session_id` (uuid, foreign key to chat_sessions)
      - `rating` (integer, 1-5 rating)
      - `feedback_text` (text, optional feedback)
      - `created_at` (timestamp)
    
    - `ai_learning_logs`
      - `id` (uuid, primary key)
      - `question` (text, user question)
      - `answer` (text, AI answer)
      - `knowledge_id` (uuid, matched knowledge base entry)
      - `confidence_score` (numeric, matching confidence)
      - `was_helpful` (boolean, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Public can view active knowledge
    - Admins can manage all knowledge
    - Public can submit feedback
*/

CREATE TABLE IF NOT EXISTS knowledge_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES knowledge_categories(id) ON DELETE SET NULL,
  question text NOT NULL,
  answer text NOT NULL,
  keywords text[] DEFAULT '{}',
  priority integer DEFAULT 0,
  usage_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES chat_messages(id) ON DELETE CASCADE,
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback_text text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_learning_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  knowledge_id uuid REFERENCES knowledge_base(id) ON DELETE SET NULL,
  confidence_score numeric DEFAULT 0,
  was_helpful boolean,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE knowledge_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories"
  ON knowledge_categories FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage categories"
  ON knowledge_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE id IN (SELECT admin_id FROM admin_roles)
    )
  );

CREATE POLICY "Anyone can view active knowledge"
  ON knowledge_base FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage knowledge"
  ON knowledge_base FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE id IN (SELECT admin_id FROM admin_roles)
    )
  );

CREATE POLICY "Anyone can submit feedback"
  ON chat_feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all feedback"
  ON chat_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE id IN (SELECT admin_id FROM admin_roles)
    )
  );

CREATE POLICY "System can log AI learning"
  ON ai_learning_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view learning logs"
  ON ai_learning_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE id IN (SELECT admin_id FROM admin_roles)
    )
  );

CREATE INDEX IF NOT EXISTS idx_knowledge_base_category_id ON knowledge_base(category_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_keywords ON knowledge_base USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_active ON knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_session_id ON chat_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_logs_knowledge_id ON ai_learning_logs(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_logs_created_at ON ai_learning_logs(created_at DESC);

INSERT INTO knowledge_categories (name, description) VALUES
  ('產品資訊', '關於產品的常見問題'),
  ('訂購流程', '訂購相關問題'),
  ('付款方式', '付款相關問題'),
  ('運送配送', '運送和配送相關問題'),
  ('退換貨', '退換貨政策和流程'),
  ('會員服務', '會員相關問題'),
  ('營業資訊', '營業時間和聯絡方式'),
  ('其他', '其他常見問題')
ON CONFLICT DO NOTHING;

INSERT INTO knowledge_base (category_id, question, answer, keywords, priority) 
SELECT 
  (SELECT id FROM knowledge_categories WHERE name = '營業資訊'),
  '你們的營業時間是？',
  '我們的營業時間為週一至週日 9:00 - 21:00，全年無休。如遇特殊節日營業時間可能會調整，請留意官網公告。',
  ARRAY['營業時間', '幾點', '開門', '關門', '營業'],
  10
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '訂購流程'),
  '如何訂購商品？',
  '您可以透過以下步驟訂購：1. 瀏覽商品頁面 2. 點擊「加入購物車」 3. 前往購物車確認商品 4. 填寫收件資訊 5. 選擇付款方式 6. 完成結帳。訂購完成後會收到確認郵件。',
  ARRAY['訂購', '怎麼買', '購買', '下單', '結帳'],
  10
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '付款方式'),
  '支援哪些付款方式？',
  '我們支援多種付款方式：1. 信用卡（VISA、MasterCard、JCB）2. LINE Pay 3. 街口支付 4. Apple Pay 5. 貨到付款（需額外手續費）。所有線上付款都採用 SSL 加密保護。',
  ARRAY['付款', '支付', 'payment', '信用卡', 'line pay', '街口'],
  10
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '運送配送'),
  '運送方式和時間？',
  '我們提供以下運送方式：1. 宅配到府（3-5個工作天）2. 超商取貨（2-3個工作天）3. 門市自取（當日或次日）。訂單成立後會提供追蹤編號，可隨時查詢配送進度。',
  ARRAY['運送', '配送', '寄送', '物流', '宅配', '超商取貨'],
  10
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '退換貨'),
  '退換貨政策是什麼？',
  '商品收到後 7 天內可申請退換貨。需符合以下條件：1. 商品完整未使用 2. 保持原包裝完整 3. 附上發票或收據。食品類商品基於衛生考量，拆封後恕不接受退貨。退貨運費由買家負擔，瑕疵品除外。',
  ARRAY['退貨', '換貨', '退換', '退款', '不滿意'],
  10
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '會員服務'),
  '成為會員有什麼好處？',
  '註冊會員享有多項專屬權益：1. 首購優惠折扣 2. 生日當月禮金 3. 消費累積點數 4. 會員專屬優惠 5. 新品優先體驗 6. 訂單快速查詢。註冊完全免費，立即享受會員禮遇！',
  ARRAY['會員', '註冊', '加入', '會籍', '優惠'],
  10
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '產品資訊'),
  '你們有什麼推薦的商品？',
  '我們的招牌商品深受顧客喜愛！推薦您可以試試：1. 人氣排行榜商品 2. 當季限定商品 3. 新品上市。每個商品頁面都有詳細介紹和顧客評價，可以參考選擇最適合您的商品。',
  ARRAY['推薦', '熱門', '人氣', '好喝', '好吃', '什麼好'],
  8
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '營業資訊'),
  '如何聯絡客服？',
  '您可以透過以下方式聯繫我們：1. 線上客服（本對話窗）2. 客服電話：0800-XXX-XXX（週一至週日 9:00-21:00）3. 客服信箱：service@example.com 4. 官方 LINE：@example。我們會在最短時間內為您服務。',
  ARRAY['聯絡', '客服', '電話', 'email', '聯繫', '諮詢'],
  10
ON CONFLICT DO NOTHING;
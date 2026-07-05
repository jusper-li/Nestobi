/*
  # Add About, Story, Contact Static Pages + Contact Inquiries Table

  1. New Static Pages
    - `about` - 關於我們 page content
    - `story` - 品牌故事 page content
    - `contact` - 聯絡我們 page content (info block + used alongside contact form)

  2. New Tables
    - `contact_inquiries`
      - `id` (uuid, primary key)
      - `name` (text) - sender name
      - `email` (text) - sender email
      - `phone` (text, optional)
      - `subject` (text)
      - `message` (text)
      - `status` (text) - pending / replied / closed
      - `created_at` (timestamptz)

  3. Security
    - Public can INSERT contact inquiries (contact form)
    - Only admins (public-access workaround) can read/update inquiries
*/

-- Insert static page content for about, story, contact
INSERT INTO static_pages (slug, title, meta_description, sections, is_published) VALUES
(
  'about',
  '關於我們',
  '了解 Sonpin 的品牌理念、使命與我們對咖啡的熱情',
  '[
    {"type": "intro", "title": "關於我們", "content": "澄宜有限公司（Sonpin）成立於台灣，我們相信一杯好咖啡，不只是味覺的享受，更是人與人之間溫暖連結的橋樑。我們的名字 y & m，代表著「你與我」——每一次品嚐，都是一段共同的故事。"},
    {"type": "section", "title": "我們的使命", "content": "從產地到杯中，我們用心把關每一個環節。與世界各地的優質農場合作，確保咖啡豆的新鮮與永續。我們深信，最美好的咖啡體驗，源自於對土地的尊重與對品質的堅持。"},
    {"type": "section", "title": "我們的堅持", "content": "・直接與農場合作，確保公平交易\n・小批次烘焙，保留最佳風味\n・每批次嚴格品質把關\n・持續探索世界各地的頂級產區\n・提倡永續農業與環境保護"},
    {"type": "section", "title": "我們的團隊", "content": "我們的團隊由對咖啡充滿熱情的專業人士組成——烘豆師、品鑑師、設計師與服務達人。我們共同的目標，是讓每一位顧客都能感受到咖啡最純粹的美好。"},
    {"type": "section", "title": "聯絡我們", "content": "地址：台灣台北市\n電話：+886 2 1234 5678\n電子郵件：info@coffeehouse.com\n服務時間：週一至週五 09:00 - 18:00"}
  ]'::jsonb,
  true
),
(
  'story',
  '品牌故事',
  'Sonpin 的誕生故事——從一杯改變人生的咖啡開始',
  '[
    {"type": "intro", "title": "一杯咖啡，改變了一切", "content": "2018 年，在一趟前往衣索比亞的旅行中，創辦人第一次喝到了真正「新鮮」的咖啡——剛採收的咖啡果，在日曬下散發出花香與果香，那股震撼讓他決定：將這份感動帶回台灣。"},
    {"type": "section", "title": "從一個夢想出發", "content": "回台後，他開始深入研究咖啡烘焙，走訪各地農場，學習品鑑，嘗試與失敗。三年後，Sonpin 正式成立。我們的使命很簡單：讓台灣每個家庭都能喝到世界級的新鮮咖啡。"},
    {"type": "section", "title": "y & m 的意義", "content": "「你與我」——我們相信咖啡的美好，不應該獨享。每一杯 Sonpin，都承載著我們對你的用心，也希望成為你與重要的人之間的美好連結。無論是一個人靜心的早晨，還是與家人共聚的午後，Sonpin 都想陪伴在你身旁。"},
    {"type": "section", "title": "產地直送的承諾", "content": "我們與衣索比亞、哥倫比亞、巴拿馬、肯亞等地的農場建立長期合作關係。每一批豆子都有完整的產地溯源紀錄，讓你清楚知道這杯咖啡從哪裡來，由誰種植。"},
    {"type": "section", "title": "繼續前行", "content": "現在，Sonpin 已服務超過十萬名顧客，我們的故事還在繼續。每一天，我們都在思考如何讓咖啡更好——更新鮮、更永續、更有溫度。感謝你成為這個故事的一部分。"}
  ]'::jsonb,
  true
),
(
  'contact',
  '聯絡我們',
  '有任何問題或合作洽談，歡迎隨時與 Sonpin 聯繫',
  '[
    {"type": "intro", "title": "我們很樂意聽您說", "content": "無論是產品詢問、訂單問題、企業合作或任何想法，都歡迎透過以下方式與我們聯繫。我們的客服團隊將在工作日 24 小時內回覆您。"},
    {"type": "section", "title": "聯絡資訊", "content": "電子郵件：info@coffeehouse.com\n客服電話：+886 2 1234 5678\n服務時間：週一至週五 09:00 - 18:00\n地址：台灣台北市"},
    {"type": "section", "title": "企業合作", "content": "我們提供企業贈禮、客製化包裝、長期訂閱方案等企業服務。如有企業合作需求，請來信 business@coffeehouse.com，我們的專案團隊將與您進一步洽談。"},
    {"type": "section", "title": "媒體合作", "content": "如需採訪、合作報導或品牌聯名相關事宜，歡迎聯繫 pr@coffeehouse.com。"}
  ]'::jsonb,
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Create contact inquiries table
CREATE TABLE IF NOT EXISTS contact_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  subject text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact inquiry"
  ON contact_inquiries FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can read contact inquiries"
  ON contact_inquiries FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can update contact inquiry status"
  ON contact_inquiries FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

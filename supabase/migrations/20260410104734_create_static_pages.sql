/*
  # Create Static Pages Table

  1. New Tables
    - `static_pages`
      - `id` (uuid, primary key)
      - `slug` (text, unique) - URL path identifier (e.g., 'privacy', 'terms', 'shipping', 'returns')
      - `title` (text) - Page title displayed to users
      - `meta_description` (text) - SEO meta description
      - `sections` (jsonb) - Array of content sections [{type, title, content}]
      - `is_published` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Public read for published pages
    - Admin write via custom admin check

  3. Default Data
    - Privacy policy page (privacy)
    - Terms of service page (terms)
    - Shipping info page (shipping)
    - Returns policy page (returns)
*/

CREATE TABLE IF NOT EXISTS static_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT '',
  meta_description text DEFAULT '',
  sections jsonb DEFAULT '[]'::jsonb,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE static_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published static pages"
  ON static_pages FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can insert static pages"
  ON static_pages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins WHERE id::text = auth.uid()::text
    )
  );

CREATE POLICY "Admins can update static pages"
  ON static_pages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins WHERE id::text = auth.uid()::text
    )
  );

CREATE INDEX IF NOT EXISTS static_pages_slug_idx ON static_pages (slug);

INSERT INTO static_pages (slug, title, meta_description, sections, is_published) VALUES
(
  'privacy',
  '隱私權政策',
  '了解 Sonpin 如何收集、使用及保護您的個人資料',
  '[
    {"type": "intro", "title": "隱私權政策", "content": "澄宜有限公司（以下簡稱「本公司」）非常重視您的隱私權，並致力於保護您的個人資料。本隱私權政策說明我們如何收集、使用及保護您所提供的資訊。"},
    {"type": "section", "title": "一、資料收集範圍", "content": "當您使用本網站服務時，我們可能收集以下資訊：\n・您主動提供的個人資料（如姓名、電子郵件、電話、送貨地址）\n・訂單交易記錄\n・網站瀏覽行為及裝置資訊（如IP位址、瀏覽器類型）"},
    {"type": "section", "title": "二、資料使用目的", "content": "我們收集的資料用於：\n・處理及完成您的訂單\n・提供客戶服務與技術支援\n・發送訂單確認及出貨通知\n・改善網站功能與使用者體驗\n・在您同意的情況下，發送行銷資訊"},
    {"type": "section", "title": "三、資料安全", "content": "本公司採用業界標準的安全措施保護您的個人資料，防止未經授權的存取、洩漏或遺失。所有交易均透過加密連線（SSL/TLS）進行。"},
    {"type": "section", "title": "四、Cookie 使用", "content": "本網站使用 Cookie 技術以提升您的瀏覽體驗，包括記住您的偏好設定及購物車內容。您可透過瀏覽器設定管理或停用 Cookie。"},
    {"type": "section", "title": "五、您的權利", "content": "您有權查詢、更正或刪除您的個人資料。如需行使相關權利，請透過以下聯絡方式與我們聯繫：\n電子郵件：info@coffeehouse.com\n電話：+886 2 1234 5678"},
    {"type": "section", "title": "六、政策更新", "content": "本公司保留隨時修訂本隱私權政策的權利。修訂後的政策將公告於本頁面，建議您定期查閱。"}
  ]'::jsonb,
  true
),
(
  'terms',
  '服務條款',
  '使用 Sonpin 網站前，請詳閱本服務條款',
  '[
    {"type": "intro", "title": "服務條款", "content": "歡迎使用 Sonpin 線上商城。請在使用本網站服務前，詳細閱讀以下服務條款。使用本網站即表示您同意接受本條款之約束。"},
    {"type": "section", "title": "一、服務說明", "content": "本網站提供咖啡豆、禮盒及相關商品的線上購物服務。本公司保留修改、暫停或終止服務的權利，並將提前公告通知用戶。"},
    {"type": "section", "title": "二、會員資格", "content": "註冊會員時，您必須提供真實、準確的個人資料。您有責任維護帳號安全，請勿將帳號密碼分享給他人。如發現帳號遭到未經授權使用，請立即通知我們。"},
    {"type": "section", "title": "三、訂單與付款", "content": "・所有訂單須完成付款後方可成立\n・本公司接受信用卡、銀行轉帳等支付方式\n・訂單確認後，如需更改或取消，請於24小時內聯繫客服\n・商品售出後若缺貨，本公司將全額退款並通知您"},
    {"type": "section", "title": "四、商品描述", "content": "本網站商品描述力求準確，但實際商品顏色因螢幕差異可能略有不同。商品重量及規格均為參考值，實際以出貨商品為準。"},
    {"type": "section", "title": "五、智慧財產權", "content": "本網站所有內容（包括文字、圖片、商標、設計）均受著作權法保護，未經本公司書面授權，不得複製、散布或使用。"},
    {"type": "section", "title": "六、免責聲明", "content": "本公司對於因使用或無法使用本服務所造成的損失，不負賠償責任。本公司不保證服務不中斷或無錯誤。"},
    {"type": "section", "title": "七、準據法", "content": "本服務條款依中華民國法律解釋及適用。如有爭議，雙方同意以台灣台北地方法院為第一審管轄法院。"}
  ]'::jsonb,
  true
),
(
  'shipping',
  '配送資訊',
  '了解 Sonpin 的配送方式、費用及時間',
  '[
    {"type": "intro", "title": "配送資訊", "content": "感謝您選擇 Sonpin。我們致力於將最新鮮的咖啡安全、快速地送到您手中。"},
    {"type": "section", "title": "配送範圍", "content": "目前提供台灣全島（含離島）配送服務。部分偏遠地區可能需要額外運費或配送時間，詳情請洽客服。"},
    {"type": "section", "title": "配送方式與費用", "content": "・黑貓宅急便：全台標準配送，運費 NT$100\n・超商取貨（7-11 / 全家）：運費 NT$60\n・滿 NT$1,500 免運費\n・急件配送（加急費 NT$200）：隔日送達（週一至週五下午3點前訂購）"},
    {"type": "section", "title": "配送時間", "content": "・一般訂單：付款確認後 1-3 個工作天出貨\n・客製化禮盒：付款確認後 3-5 個工作天出貨\n・預購商品：依商品頁面標示日期出貨\n・配送時間：週一至週六（不含國定假日）"},
    {"type": "section", "title": "訂單追蹤", "content": "商品出貨後，您將收到包含物流追蹤號碼的電子郵件通知。您可透過物流公司官網即時追蹤包裹狀態。"},
    {"type": "section", "title": "收件注意事項", "content": "・請確保收件地址正確，地址有誤造成退件，再次配送將收取運費\n・收件時請確認包裝完整，如有破損請拍照記錄並立即聯繫客服\n・無人收件時，物流公司將留下通知單，請依指示安排再次投遞"}
  ]'::jsonb,
  true
),
(
  'returns',
  '退換貨政策',
  '了解 Sonpin 的退換貨條件及流程',
  '[
    {"type": "intro", "title": "退換貨政策", "content": "Sonpin 致力於為您提供最優質的商品。若您對購買的商品有任何問題，請參閱以下退換貨政策。"},
    {"type": "section", "title": "退換貨條件", "content": "依消費者保護法，您享有商品到貨後 7 天鑑賞期（非試用期）。以下情況符合退換貨條件：\n・商品有瑕疵或損壞\n・收到商品與訂購不符\n・商品未開封且保持完整包裝"},
    {"type": "section", "title": "不接受退換貨情況", "content": "以下情況恕不接受退換貨：\n・已開封的咖啡豆或咖啡粉（食品衛生安全考量）\n・使用或損壞後的商品\n・超過7天鑑賞期\n・因個人喜好問題（非商品瑕疵）\n・促銷或特價商品"},
    {"type": "section", "title": "退換貨流程", "content": "1. 於鑑賞期內，聯繫我們的客服（email: info@coffeehouse.com 或電話：+886 2 1234 5678）\n2. 說明退換貨原因並提供訂單編號及照片（如有瑕疵）\n3. 客服確認後，將提供退換貨地址\n4. 以原始包裝寄回商品（運費依情況而定）\n5. 收到商品後 3-5 個工作天內完成退款或換貨"},
    {"type": "section", "title": "退款方式", "content": "・信用卡付款：退回至原信用卡帳戶（約 7-14 個工作天）\n・銀行轉帳：退款至您指定的銀行帳戶（約 5-7 個工作天）\n・退款金額為商品金額，運費視情況而定"},
    {"type": "section", "title": "聯絡客服", "content": "如有任何退換貨問題，歡迎透過以下方式聯繫我們：\n電子郵件：info@coffeehouse.com\n電話：+886 2 1234 5678\n服務時間：週一至週五 09:00 - 18:00"}
  ]'::jsonb,
  true
)
ON CONFLICT (slug) DO NOTHING;

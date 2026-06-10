/*
  # Create FAQs table

  ## Summary
  Stores frequently asked questions organized by category, managed by
  super admin and displayed on the public FAQ page.

  ## New Tables
  - `faqs`
    - `id` (uuid, PK)
    - `question` (text) — the question
    - `answer` (text) — the answer (supports basic markdown)
    - `category` (text) — grouping label e.g. "訂房", "購物", "AI功能"
    - `sort_order` (int) — display order within its category
    - `is_published` (boolean) — whether publicly visible
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Anyone can read published FAQs
  - Only superadmins can insert, update, delete
*/

CREATE TABLE IF NOT EXISTS faqs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question      text NOT NULL,
  answer        text NOT NULL,
  category      text NOT NULL DEFAULT '一般',
  sort_order    int NOT NULL DEFAULT 0,
  is_published  boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published FAQs"
  ON faqs FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "Superadmins can insert FAQs"
  ON faqs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
      AND tbl_user_auth.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can update FAQs"
  ON faqs FOR UPDATE
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

CREATE POLICY "Superadmins can delete FAQs"
  ON faqs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
      AND tbl_user_auth.role = 'superadmin'
    )
  );

-- Seed default FAQ entries covering all service areas
INSERT INTO faqs (question, answer, category, sort_order) VALUES
  ('如何訂房？', '在「住宿訂房」頁面瀏覽精選房間，選擇入住及退房日期、人數後，點選「立即預訂」即可完成訂房。訂房確認信將即時寄至您的信箱。', '訂房服務', 1),
  ('可以免費取消訂房嗎？', '大部分住宿提供入住前 3 天免費取消。各住宿取消政策略有不同，請於訂房頁面確認細節。', '訂房服務', 2),
  ('訂房後如何修改日期或人數？', '登入會員中心 > 我的訂房，找到訂單後點選「修改」。若已超過可修改期限，請聯繫客服協助。', '訂房服務', 3),
  ('旅遊商城的商品多久可以收到？', '一般商品於付款完成後 1-3 個工作天出貨，配送約 1-2 天到達。特殊商品或預購品會於頁面標示預計出貨時間。', '旅遊購物', 1),
  ('商品可以退換貨嗎？', '未拆封商品可於收到後 7 日內申請退換貨，請至會員中心 > 我的訂單提交退貨申請。已使用或客製化商品恕不退換。', '旅遊購物', 2),
  ('AI 行程規劃如何使用？', '前往「AI 行程規劃」頁面，輸入目的地、旅遊日期、人數及興趣偏好，AI 將自動產生每日行程建議，包含景點、餐廳及交通方式。您可儲存、編輯或分享行程。', 'AI 功能', 1),
  ('AI 翻譯支援哪些語言？', '目前支援中文、英文、日文、韓文等 30 種主要語言的即時互譯，涵蓋旅遊常用場景如問路、點餐、購物等。', 'AI 功能', 2),
  ('AI 客服的服務時間？', 'AI 客服全年 24 小時不間斷提供服務，可即時回答訂房、購物、行程規劃等旅遊相關問題。若需人工客服，服務時間為週一至週五 09:00-18:00。', 'AI 功能', 3),
  ('什麼是旅遊護照？', '旅遊護照是專屬的旅行紀錄功能，可記錄您走過的每一個景點、美食、購物地點，像蓋印章一樣累積旅遊回憶。您可以從行程規劃中自動匯入，也可手動新增足跡。', 'AI 功能', 4),
  ('如何累積及使用點數？', '每次訂房或商城消費皆可累積旅遊點數（消費金額 1% 回饋），點數可於下次訂房或購物時折抵使用，1 點 = 1 元。', '會員服務', 1),
  ('忘記密碼怎麼辦？', '在登入頁面點選「忘記密碼」，輸入註冊信箱後系統將寄送密碼重設連結，依照指示即可設定新密碼。', '會員服務', 2),
  ('如何聯繫客服？', '您可以透過以下方式聯繫我們：AI 客服（24小時）、客服電話 02-27565663（週一至週五 09:00-18:00）、線上聯絡表單，或寄信至 service@dlalshop.com。', '聯絡與支援', 1),
  ('付款方式有哪些？', '目前支援信用卡（Visa、Mastercard、JCB）、銀行轉帳及旅遊點數折抵。部分商品支援貨到付款。', '付款與安全', 1),
  ('交易安全嗎？', '所有交易均採用 SSL 256-bit 銀行級加密傳輸，信用卡資訊不經過我們的伺服器，由第三方支付平台直接處理，確保您的資金安全。', '付款與安全', 2);

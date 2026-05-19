/*
  # Create static_pages table

  ## Purpose
  Stores editable content for static frontend pages (About, Privacy Policy,
  Terms of Service, Cookie Policy). Admins and SuperAdmins can update these
  pages via the admin dashboard.

  ## New Tables
  - `static_pages`
    - `id` (uuid, primary key)
    - `slug` (text, unique) — page identifier: 'about', 'privacy', 'terms', 'cookies'
    - `title` (text) — page display title
    - `content` (text) — full HTML content of the page
    - `meta_description` (text) — SEO description
    - `updated_at` (timestamptz) — last modified timestamp
    - `updated_by` (text) — email of last editor

  ## Security
  - RLS enabled
  - Anyone can read (public pages)
  - Only authenticated users with admin or superadmin role can update
    (enforced by checking tbl_user_auth role)

  ## Seed Data
  Initial content for all 4 static pages is inserted on creation.
*/

CREATE TABLE IF NOT EXISTS static_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  meta_description text DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  updated_by text DEFAULT ''
);

ALTER TABLE static_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read static pages"
  ON static_pages FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can update static pages"
  ON static_pages FOR UPDATE
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

-- Seed initial page content
INSERT INTO static_pages (slug, title, meta_description, content) VALUES

('about', '關於 Nestobi', '了解旅遊平台 Nestobi 的品牌故事、核心價值與服務使命。',
'<section class="space-y-10">
  <div class="text-center">
    <h1 class="text-4xl font-bold text-gray-900 mb-4">關於 Nestobi</h1>
    <p class="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">結合 AI 智慧科技，打造一站式旅遊體驗平台。</p>
  </div>

  <div class="grid md:grid-cols-2 gap-8">
    <div class="bg-blue-50 rounded-2xl p-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-4">我們的使命</h2>
      <p class="text-gray-600 leading-relaxed">Nestobi 致力於透過人工智慧技術，讓每一位旅者都能輕鬆規劃、預訂並享受無憂無慮的旅程。從住宿預訂、旅遊購物到 AI 智慧客服，我們將所有旅行所需整合於一個平台。</p>
    </div>
    <div class="bg-amber-50 rounded-2xl p-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-4">我們的願景</h2>
      <p class="text-gray-600 leading-relaxed">成為亞洲最受信賴的智慧旅遊平台，以科技賦能旅遊產業，讓旅行變得更簡單、更美好，同時為廠商夥伴創造最大的商業價值。</p>
    </div>
  </div>

  <div>
    <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">核心服務</h2>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="border border-gray-100 rounded-xl p-5 hover:shadow-md transition"><h3 class="font-semibold text-gray-900 mb-2">🏨 智慧訂房</h3><p class="text-sm text-gray-500">精選全台優質住宿，即時確認、彈性退訂，會員專屬優惠。</p></div>
      <div class="border border-gray-100 rounded-xl p-5 hover:shadow-md transition"><h3 class="font-semibold text-gray-900 mb-2">🛍️ 旅遊購物</h3><p class="text-sm text-gray-500">匯聚旅遊相關商品，從伴手禮到旅行裝備，一站購足。</p></div>
      <div class="border border-gray-100 rounded-xl p-5 hover:shadow-md transition"><h3 class="font-semibold text-gray-900 mb-2">🗺️ AI 行程規劃</h3><p class="text-sm text-gray-500">輸入目的地與偏好，AI 即時生成個人化旅遊行程。</p></div>
      <div class="border border-gray-100 rounded-xl p-5 hover:shadow-md transition"><h3 class="font-semibold text-gray-900 mb-2">🌐 即時翻譯</h3><p class="text-sm text-gray-500">支援多國語言即時翻譯，跨越語言障礙暢遊世界。</p></div>
      <div class="border border-gray-100 rounded-xl p-5 hover:shadow-md transition"><h3 class="font-semibold text-gray-900 mb-2">💬 AI 客服</h3><p class="text-sm text-gray-500">24 小時 AI 智慧客服，隨時解答您的旅遊疑問。</p></div>
      <div class="border border-gray-100 rounded-xl p-5 hover:shadow-md transition"><h3 class="font-semibold text-gray-900 mb-2">🎁 會員點數</h3><p class="text-sm text-gray-500">每筆消費累積點數，兌換優惠與獨家會員福利。</p></div>
    </div>
  </div>

  <div class="bg-gray-900 text-white rounded-2xl p-10 text-center">
    <h2 class="text-2xl font-bold mb-3">加入我們的旅程</h2>
    <p class="text-gray-300 leading-relaxed max-w-xl mx-auto">成為 Nestobi 會員，立即享有 AI 智慧旅遊服務、專屬優惠與點數回饋。讓我們一起探索世界每個角落。</p>
  </div>
</section>'),

('privacy', '隱私政策', '了解旅遊平台如何收集、使用與保護您的個人資料。',
'<section class="space-y-8">
  <div>
    <h1 class="text-3xl font-bold text-gray-900 mb-2">隱私政策</h1>
    <p class="text-sm text-gray-400">最後更新：2026年1月1日</p>
  </div>

  <p class="text-gray-600 leading-relaxed">旅遊平台（以下簡稱「本平台」或「Nestobi」）非常重視您的個人隱私。本政策說明我們如何收集、使用、儲存及保護您的個人資料。使用本平台即表示您同意本政策之內容。</p>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-3">一、資料收集範圍</h2>
    <p class="text-gray-600 leading-relaxed mb-2">我們可能收集以下類型的資料：</p>
    <ul class="list-disc list-inside space-y-1 text-gray-600 ml-2">
      <li>帳號資訊：電子郵件地址、顯示名稱、密碼（加密儲存）</li>
      <li>訂單資訊：訂房紀錄、購物訂單、付款資訊</li>
      <li>使用行為：瀏覽紀錄、搜尋紀錄、AI 功能使用紀錄</li>
      <li>裝置資訊：IP 位址、瀏覽器類型、作業系統</li>
      <li>偏好設定：旅遊偏好、語言設定</li>
    </ul>
  </div>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-3">二、資料使用目的</h2>
    <ul class="list-disc list-inside space-y-1 text-gray-600 ml-2">
      <li>提供、維護及改善本平台的服務</li>
      <li>處理訂單與付款</li>
      <li>發送訂單確認、服務通知及行銷資訊</li>
      <li>提供個人化的 AI 服務與推薦</li>
      <li>進行安全防護與防止詐欺</li>
      <li>遵守法律規定</li>
    </ul>
  </div>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-3">三、資料共享</h2>
    <p class="text-gray-600 leading-relaxed">我們不會出售您的個人資料。僅在以下情況下可能與第三方共享：</p>
    <ul class="list-disc list-inside space-y-1 text-gray-600 ml-2 mt-2">
      <li>與住宿廠商共享預訂所需資訊</li>
      <li>與付款處理商共享交易資訊</li>
      <li>依法律要求提供予主管機關</li>
    </ul>
  </div>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-3">四、資料保護措施</h2>
    <p class="text-gray-600 leading-relaxed">本平台採用業界標準的安全措施，包括 SSL/TLS 加密傳輸、密碼雜湊儲存及定期安全審查，以保護您的個人資料免受未授權存取。</p>
  </div>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-3">五、您的權利</h2>
    <ul class="list-disc list-inside space-y-1 text-gray-600 ml-2">
      <li>查詢、更正您的個人資料</li>
      <li>要求刪除您的帳號及相關資料</li>
      <li>拒絕接收行銷通訊</li>
      <li>資料可攜性請求</li>
    </ul>
  </div>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-3">六、聯絡我們</h2>
    <p class="text-gray-600">如對本隱私政策有任何疑問，請聯繫：<a href="mailto:service@travel.com.tw" class="text-blue-600 hover:underline">service@travel.com.tw</a></p>
  </div>
</section>'),

('terms', '服務條款', '使用旅遊平台前，請閱讀我們的服務條款與使用規範。',
'<section class="space-y-8">
  <div>
    <h1 class="text-3xl font-bold text-gray-900 mb-2">服務條款</h1>
    <p class="text-sm text-gray-400">最後更新：2026年1月1日</p>
  </div>

  <p class="text-gray-600 leading-relaxed">歡迎使用旅遊平台（Nestobi）。請在使用本平台服務前仔細閱讀以下條款。使用本平台即表示您接受並同意遵守本服務條款。</p>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-3">一、服務說明</h2>
    <p class="text-gray-600 leading-relaxed">本平台提供住宿預訂、旅遊商品購物、AI 行程規劃、即時翻譯及 AI 客服等旅遊相關服務。部分服務需完成會員註冊方可使用。</p>
  </div>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-3">二、會員帳號</h2>
    <ul class="list-disc list-inside space-y-1 text-gray-600 ml-2">
      <li>您必須提供真實、完整、最新的個人資料進行註冊</li>
      <li>您有責任維護帳號及密碼的安全性</li>
      <li>每位使用者限申請一個帳號</li>
      <li>禁止將帳號轉讓或出售予他人</li>
      <li>如發現帳號遭盜用，請立即通知我們</li>
    </ul>
  </div>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-3">三、訂房規則</h2>
    <ul class="list-disc list-inside space-y-1 text-gray-600 ml-2">
      <li>訂房確認後將發送確認信至您的電子郵件</li>
      <li>退訂政策依各住宿廠商規定為準</li>
      <li>如需修改訂單，請提前聯繫客服</li>
      <li>本平台不對廠商提供之住宿品質負連帶責任</li>
    </ul>
  </div>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-3">四、購物規則</h2>
    <ul class="list-disc list-inside space-y-1 text-gray-600 ml-2">
      <li>下單後請於 24 小時內完成付款，逾時訂單將自動取消</li>
      <li>商品退換貨依《消費者保護法》相關規定辦理</li>
      <li>如有商品瑕疵，請於收貨 7 日內提出申請</li>
    </ul>
  </div>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-3">五、點數規則</h2>
    <ul class="list-disc list-inside space-y-1 text-gray-600 ml-2">
      <li>點數僅限本帳號使用，不可轉讓</li>
      <li>點數自獲得日起 2 年內有效</li>
      <li>本平台保留調整點數規則之權利</li>
    </ul>
  </div>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-3">六、禁止行為</h2>
    <p class="text-gray-600 mb-2">使用者不得從事以下行為：</p>
    <ul class="list-disc list-inside space-y-1 text-gray-600 ml-2">
      <li>刊登虛假、誤導性或違法內容</li>
      <li>嘗試入侵或破壞本平台系統</li>
      <li>利用本平台從事詐欺、洗錢或其他非法活動</li>
      <li>大量爬取或複製本平台資料</li>
    </ul>
  </div>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-3">七、責任限制</h2>
    <p class="text-gray-600 leading-relaxed">本平台在法律允許範圍內，對因使用或無法使用本服務所造成之損失不承擔責任。</p>
  </div>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-3">八、條款修改</h2>
    <p class="text-gray-600">本平台保留隨時修改服務條款之權利。重大修改將透過電子郵件通知。如有疑問請聯繫：<a href="mailto:service@travel.com.tw" class="text-blue-600 hover:underline">service@travel.com.tw</a></p>
  </div>
</section>'),

('cookies', 'Cookie 政策', '了解旅遊平台如何使用 Cookie 及追蹤技術。',
'<section class="space-y-8">
  <div>
    <h1 class="text-3xl font-bold text-gray-900 mb-2">Cookie 政策</h1>
    <p class="text-sm text-gray-400">最後更新：2026年1月1日</p>
  </div>

  <p class="text-gray-600 leading-relaxed">本頁面說明旅遊平台（Nestobi）如何使用 Cookie 及類似的追蹤技術，以及您如何管理這些設定。</p>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-3">什麼是 Cookie？</h2>
    <p class="text-gray-600 leading-relaxed">Cookie 是當您瀏覽網站時，由網站儲存在您裝置上的小型文字檔案。Cookie 幫助網站記住您的偏好設定，提供更個人化的使用體驗。</p>
  </div>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-3">我們使用的 Cookie 類型</h2>
    <div class="space-y-4">
      <div class="border border-gray-100 rounded-xl p-5">
        <h3 class="font-semibold text-gray-900 mb-1">必要性 Cookie</h3>
        <p class="text-sm text-gray-500">維持網站基本功能所必須，例如登入狀態保持、購物車資料。無法關閉此類 Cookie。</p>
      </div>
      <div class="border border-gray-100 rounded-xl p-5">
        <h3 class="font-semibold text-gray-900 mb-1">功能性 Cookie</h3>
        <p class="text-sm text-gray-500">記住您的偏好設定，例如語言選擇、地區偏好，提升使用體驗。</p>
      </div>
      <div class="border border-gray-100 rounded-xl p-5">
        <h3 class="font-semibold text-gray-900 mb-1">分析性 Cookie</h3>
        <p class="text-sm text-gray-500">幫助我們了解使用者如何與網站互動，用於改善服務品質。所有資料均匿名處理。</p>
      </div>
      <div class="border border-gray-100 rounded-xl p-5">
        <h3 class="font-semibold text-gray-900 mb-1">行銷 Cookie</h3>
        <p class="text-sm text-gray-500">用於提供與您興趣相關的廣告及行銷內容。您可隨時選擇退出。</p>
      </div>
    </div>
  </div>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-3">如何管理 Cookie</h2>
    <p class="text-gray-600 leading-relaxed mb-3">您可以透過以下方式管理 Cookie：</p>
    <ul class="list-disc list-inside space-y-2 text-gray-600 ml-2">
      <li><strong>瀏覽器設定：</strong>大多數瀏覽器允許您查看、刪除及阻擋 Cookie。請參閱您的瀏覽器說明文件。</li>
      <li><strong>退出行銷 Cookie：</strong>您可透過帳號設定頁面選擇退出個人化行銷。</li>
      <li><strong>清除現有 Cookie：</strong>在瀏覽器設定中清除瀏覽資料即可刪除已儲存的 Cookie。</li>
    </ul>
    <p class="text-gray-500 text-sm mt-3">注意：停用某些 Cookie 可能影響網站部分功能的正常運作。</p>
  </div>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-3">第三方 Cookie</h2>
    <p class="text-gray-600 leading-relaxed">本平台可能使用第三方服務（如 Google Analytics）設置 Cookie。這些第三方的 Cookie 政策由其各自負責，建議您查閱相關服務的隱私政策。</p>
  </div>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-3">聯絡我們</h2>
    <p class="text-gray-600">如對本 Cookie 政策有任何疑問，請聯繫：<a href="mailto:service@travel.com.tw" class="text-blue-600 hover:underline">service@travel.com.tw</a></p>
  </div>
</section>')

ON CONFLICT (slug) DO NOTHING;

export interface StaticPageFallback {
  title: string;
  content: string;
  meta_description: string;
  updated_at: string;
}

export const STATIC_PAGE_FALLBACKS: Record<string, StaticPageFallback> = {
  'anti-fraud': {
    title: '防詐騙宣導',
    meta_description: 'Nestobi 防詐騙宣導與安全提醒，若有疑慮請立即撥打 165 反詐騙專線。',
    updated_at: '2026-05-07T00:00:00.000Z',
    content: `
<section class="space-y-8">
  <div class="text-center">
    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Anti-Fraud</p>
    <h1 class="mt-3 text-3xl font-bold text-gray-900 md:text-4xl">防詐騙宣導</h1>
    <p class="mx-auto mt-4 max-w-2xl text-gray-600">
      根本在旅行官方網站（以下簡稱「本網站」）提醒您提高警覺，避免遭受詐騙。若接到可疑電話、簡訊或訊息，請先停止操作並再次確認。
    </p>
  </div>

  <div class="rounded-2xl border border-amber-200 bg-amber-50 p-5">
    <p class="text-amber-900">
      如遇任何可疑狀況，請立即撥打 <strong>165 反詐騙專線</strong>，並與我們客服聯繫確認。
    </p>
  </div>

  <div class="space-y-5">
    <article class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900">1. 詐騙可能竄改來電顯示</h2>
      <p class="mt-3 text-gray-600">
        詐騙集團可能偽裝成 110、165、銀行或客服電話。請勿僅憑來電顯示判斷真實性，切勿在電話中提供帳戶、卡號、OTP 或轉帳資訊。
      </p>
    </article>

    <article class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900">2. 非上班時間通知改單需提高警覺</h2>
      <p class="mt-3 text-gray-600">
        我們不會在非正常服務時段主動要求您操作 ATM、網銀或變更付款設定。如遇到類似要求，請先掛斷並聯繫官方客服確認。
      </p>
    </article>

    <article class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900">3. 不明連結與附件請勿點擊</h2>
      <p class="mt-3 text-gray-600">
        不要點擊陌生簡訊、Email 或社群私訊中的短網址與附件。請只透過官方網站與正式客服管道查詢與處理訂單。
      </p>
    </article>

    <article class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900">4. ATM 不具備解除分期或退款功能</h2>
      <p class="mt-3 text-gray-600">
        ATM 沒有「解除分期」、「補款驗證」或「退款驗證」功能。凡要求您到 ATM 操作的訊息，幾乎可判定為詐騙。
      </p>
    </article>

    <article class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900">5. 保留證據並立即通報</h2>
      <p class="mt-3 text-gray-600">
        請保存可疑來電號碼、訊息截圖、轉帳紀錄等證據，立即撥打 165 並向警方報案，也可同步通知我們協助後續處理。
      </p>
    </article>
  </div>
</section>`,
  },
};


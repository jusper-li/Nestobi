export interface StaticPageFallback {
  title: string;
  content: string;
  meta_description: string;
  updated_at: string;
}

export const STATIC_PAGE_FALLBACKS: Record<string, StaticPageFallback> = {
  'anti-fraud': {
    title: '防詐騙宣導',
    meta_description: 'Nestobi 防詐騙宣導，提醒常見詐騙手法與 165 反詐騙專線查證方式。',
    updated_at: '2026-05-07T00:00:00.000Z',
    content: `
<section class="space-y-8">
  <div class="text-center">
    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Anti-Fraud</p>
    <h1 class="mt-3 text-3xl font-bold text-gray-900 md:text-4xl">防詐騙宣導</h1>
    <p class="mx-auto mt-4 max-w-2xl text-gray-600">根本在旅行官方網站（以下簡稱「本網站」）是若水金禾餐飲股份有限公司（以下簡稱「本公司」）所有並經營之網站。</p>
  </div>

  <div class="rounded-2xl border border-amber-200 bg-amber-50 p-5">
    <p class="text-amber-900">請您小心詐騙集團可能藉由以下招式進行詐騙，有疑義時，請立即撥打 <strong>165 反詐騙專線</strong>。</p>
  </div>

  <div class="space-y-5">
    <article class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900">1. 詐騙能竄改顯示號碼</h2>
      <p class="mt-3 text-gray-600">歹徒可能假冒、竄改來電顯示成110、165或本網站客服中心之電話，請不要上當！接獲電話不要提供往來銀行電話、信用卡資訊等金融資料，對方可能於其後竄改成您所提供之電話號碼撥給您以取得您的信任。</p>
    </article>

    <article class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900">2. 詐騙專挑非上班時間</h2>
      <p class="mt-3 text-gray-600">本公司之會計、財務、客服部門人員均不會於「非上班時間」以電話或簡訊與您聯繫訂單或修改訂單事宜，若您接到不明來電或簡訊請您務必小心。如果您還是不放心，請於上班時間以電子郵件或電話聯絡我們，我們將盡速為您服務。</p>
    </article>

    <article class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900">3. 詐騙你勾錯選項</h2>
      <p class="mt-3 text-gray-600">除了您在下訂單時點選分期付款方式給付商品之貨款外，正負零網站並沒有其他分期付款或自動扣款之方案，超商也不會因勾選錯誤自動扣款。會計、財務部門更不會主動致電給您，要求至ATM操作系統，請您千萬不要受騙上當！</p>
    </article>

    <article class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900">4. 不要去ATM操作</h2>
      <p class="mt-3 text-gray-600">ATM沒有任何「取消分期付款」、「取消扣款」或「驗證身分」的功能，中文介面與英文介面更沒有功能上的不同，請不要用英文介面（即您所不熟悉的語言）進行任何操作。詐騙會用「假的來電顯示」，冒充任何人（包含銀行主管、警察、檢察官等）指揮您用ATM把錢匯到歹徒的戶頭，錢一旦轉出去了，詐騙集團就會立即派車手取走您所匯的款項，請您務必提高警覺。</p>
    </article>

    <article class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900">5. 不怕麻煩，小心查證</h2>
      <p class="mt-3 text-gray-600">別因小失大、別受恐嚇，請留待上班日解決。遇可疑電話，請撥打165反詐騙專線或來信與我們客服中心聯繫。</p>
    </article>
  </div>

  <div class="rounded-2xl bg-gray-900 p-6 text-center text-white">
    <p class="text-lg font-semibold">防止新型態網路詐騙，呼籲全民提高警覺防詐騙。</p>
  </div>
</section>`,
  },
};

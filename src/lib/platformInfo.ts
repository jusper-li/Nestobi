export const PLATFORM_OPENAI_MODELS = [
  { label: '客服 / 一般對話', value: 'gpt-4o-mini', env: 'OPENAI_CHAT_MODEL' },
  { label: '翻譯', value: 'gpt-4o-mini', env: 'OPENAI_TRANSLATION_MODEL' },
  { label: '搜尋摘要', value: 'gpt-4o-mini', env: 'OPENAI_SEARCH_MODEL' },
  { label: '資料擷取 / 上架解析', value: 'gpt-4o', env: 'OPENAI_EXTRACTION_MODEL / OPENAI_ADVANCED_MODEL' },
  { label: '圖片辨識', value: 'gpt-4o', env: 'OPENAI_VISION_MODEL / OPENAI_ADVANCED_MODEL' },
  { label: '商品頁產生', value: 'gpt-4o-mini', env: 'OPENAI_PAGE_BUILDER_MODEL' },
  { label: '向量搜尋 Embedding', value: 'text-embedding-3-small', env: 'OPENAI_EMBEDDING_MODEL' },
];

export const PLATFORM_SERVICES = [
  {
    group: 'AI API',
    provider: 'OpenAI',
    usage: 'AI 客服、語意搜尋、翻譯、文章與商品上架解析、商品頁產生',
    entry: 'Supabase Edge Function: openai-proxy / ai-chat / parse-listing / translate / product-page-builder',
    security: 'OPENAI_API_KEY 僅放在 Supabase Edge Function Secrets，前端不直接呼叫 OpenAI。',
  },
  {
    group: '金流 API',
    provider: '藍新金流 NewebPay',
    usage: '一般訂單付款、付款查詢、退款、信用卡定期定額',
    entry: 'newebpay-mpg-payment / newebpay-order-sync / newebpay-order-refund / newebpay-period-payment',
    security: 'MerchantID、HashKey、HashIV 僅放在 Supabase Edge Function Secrets。',
  },
  {
    group: '電子發票 API',
    provider: 'ezPay 電子發票',
    usage: '付款成功後開立發票、查詢發票、作廢發票',
    entry: 'ezpay-invoice-create / ezpay-invoice-query / ezpay-invoice-void',
    security: 'ezPay 發票金鑰僅放在 Supabase Edge Function Secrets，前端只呼叫後端函式。',
  },
  {
    group: '物流 API',
    provider: 'ezPay 物流',
    usage: '建立物流單、查詢物流、列印物流單、物流通知',
    entry: 'ezpay-logistics-create / ezpay-logistics-query / ezpay-logistics-print / ezpay-logistics-notify',
    security: '物流 HashKey、HashIV 僅放在 Supabase Edge Function Secrets。',
  },
  {
    group: '信件 API',
    provider: 'Resend',
    usage: '會員驗證、訂單通知、訂房通知、退款通知、管理員通知',
    entry: 'send-email',
    security: 'RESEND_API_KEY 與寄件地址設定由 Edge Function Secrets / 後台通知信箱管理。',
  },
  {
    group: '資料庫 / 身分驗證',
    provider: 'Supabase',
    usage: 'Postgres 資料庫、Auth、Storage、Edge Functions、RLS 權限控管',
    entry: 'Supabase project qthciyizquumeufrujyp',
    security: '前端只使用 publishable/anon key；service role 僅允許在 Edge Functions 使用。',
  },
  {
    group: '主機 / 部署',
    provider: 'Netlify',
    usage: '正式站 hosting、SPA redirect、CSP header、GitHub main 自動部署',
    entry: 'Netlify project: nestobi',
    security: '正式站由 Netlify 建置部署，後端敏感操作仍走 Supabase Edge Functions。',
  },
];

export const PLATFORM_OPERATION_NOTES = [
  '所有第三方金鑰不可寫入前端程式碼或 Git。',
  '金流、發票、物流、信件、OpenAI 都應由 Supabase Edge Function 代為呼叫。',
  '管理員可在「版本紀錄」查看後台操作與系統檢查紀錄。',
  '若調整 OPENAI_* 模型環境變數，請同步記錄變更原因與測試結果。',
];

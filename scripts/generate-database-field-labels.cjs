const fs = require('fs');
const path = require('path');

const root = process.cwd();
const migrationsDir = path.join(root, 'supabase', 'migrations');
const docsDir = path.join(root, 'docs');

const tableLabels = {
  admin_activity_logs: '後台活動紀錄',
  admin_audit_logs: '管理員稽核紀錄',
  admin_roles: '管理員角色關聯',
  admins: '管理員',
  after_sales_requests: '售後申請',
  ai_chat_logs: 'AI 聊天紀錄',
  ai_learning_logs: 'AI 學習紀錄',
  ai_support_documents: 'AI 客服向量文件',
  ai_usage_stats: 'AI 使用統計',
  articles: '舊版文章',
  blog_categories: '文章分類',
  blog_post_category_links: '文章分類關聯',
  blog_post_translations: '文章翻譯',
  blog_posts: '部落格文章',
  categories: '商品分類',
  category_translations: '分類翻譯',
  chat_feedback: '客服回饋',
  chat_messages: '客服訊息',
  chat_sessions: '客服會話',
  coffee_quiz_question_options: '咖啡測驗選項',
  coffee_quiz_questions: '咖啡測驗題目',
  coffee_quiz_submissions: '咖啡測驗送出紀錄',
  contact_inquiries: '聯絡表單',
  content_translations: '內容翻譯',
  faqs: '常見問題',
  homepage_sections: '首頁區塊',
  hotels: '旅宿',
  invoices: '電子發票',
  itinerary_plans: 'AI 行程規劃',
  knowledge_base: '知識庫',
  knowledge_categories: '知識庫分類',
  languages: '語言',
  logistics_shipments: '物流出貨單',
  member_favorites: '會員收藏',
  member_point_balances: '會員點數餘額',
  member_profiles: '會員摘要資料',
  members: '會員',
  newebpay_mpg_orders: '藍新幕前支付紀錄',
  order_events: '訂單事件',
  order_items: '訂單品項',
  order_messages: '訂單留言',
  orders: '商店訂單',
  password_reset_tokens: '密碼重設 Token',
  payments: '付款紀錄',
  permissions: '權限',
  point_reward_rules: '點數獎勵規則',
  points: '點數交易',
  product_category_links: '商品分類關聯',
  product_favorites: '商品收藏',
  product_reviews: '商品評價',
  product_subscriptions: '商品訂閱',
  product_translations: '商品翻譯',
  products: '商品',
  properties: '資產物件',
  purchase_records: '購買紀錄',
  role_permissions: '角色權限關聯',
  roles: '角色',
  room_inventory_items: '房務備品',
  room_reviews: '住宿評價',
  room_translations: '住宿翻譯',
  seo_settings: 'SEO 設定',
  site_content_blocks: '網站內容區塊',
  site_settings: '網站設定',
  social_accounts: '社群帳號',
  static_page_translations: '靜態頁翻譯',
  static_pages: '靜態頁面',
  store_daily_sales: '門市每日營收',
  store_inventory_movements: '門市庫存異動',
  store_location_managers: '門市管理員',
  store_locations: '門市地點',
  store_point_redemptions: '門市點數折抵',
  stores: '門市',
  tbl_bookings: '訂房紀錄',
  tbl_management_dashboard: '管理儀表板統計',
  tbl_mn5uxems: '購物車',
  tbl_mn5wgzh0: '會員詳細資料',
  tbl_mn5wn257: 'AI 對話訊息',
  tbl_room_day_prices: '房型每日價格',
  tbl_rooms: '房型',
  tbl_super_admin: '超級管理員',
  tbl_user_auth: '使用者角色權限',
  theme_banners: '主題橫幅',
  translation_cache: '翻譯快取',
  translation_glossary_terms: '翻譯詞彙表',
  translation_jobs: '翻譯工作',
  translations: '一般翻譯字串',
  travel_passport: '旅遊護照',
  user_permissions: '使用者權限',
  user_preferences: '會員偏好設定',
  user_usage: '使用者功能使用量',
  vendor_staff: '廠商員工',
  vendors: '廠商',
  verification_codes: '驗證碼',
};

const exactColumnLabels = {
  action: '操作名稱',
  acidity_score: '酸質分數',
  actor_name: '操作者名稱',
  actor_type: '操作者類型',
  actor_user_id: '操作者會員 ID',
  address: '地址',
  admin_id: '管理員 ID',
  adventure_score: '冒險分數',
  agreement: '同意條款',
  ai_site_summary: 'AI 網站摘要',
  alert_notification_emails: '警示通知收件 Email',
  altitude: '海拔',
  amenities: '設施',
  amount: '金額',
  answer: '答案',
  answers: '作答內容',
  area: '區域',
  attempts: '嘗試次數',
  attempt_count: '嘗試次數',
  author_email: '作者 Email',
  author_id: '作者 ID',
  author_name: '作者名稱',
  auth_user_id: 'Auth 使用者 ID',
  avatar_url: '頭像網址',
  available_shares: '可售份數',
  avg_response_time: '平均回應時間',
  bio: '簡介',
  billing_cycle_count: '已扣款期數',
  block_key: '區塊鍵',
  block_type: '區塊類型',
  body_en: '英文內文',
  body_ja: '日文內文',
  body_ko: '韓文內文',
  body_zh: '中文內文',
  booking_id: '訂房 ID',
  booking_notification_emails: '訂房通知收件 Email',
  buyer_email: '買受人 Email',
  buyer_identifier: '買受人統編',
  buyer_name: '買受人姓名',
  can_manage_inventory: '可管理庫存',
  can_manage_points: '可管理點數',
  can_manage_products: '可管理商品',
  can_manage_sales: '可管理營收',
  can_manage_store_info: '可管理門市資料',
  canonical_url: 'Canonical 網址',
  capacity: '可入住人數',
  card_no: '卡號末碼',
  carrier_number: '載具號碼',
  carrier_type: '載具類型',
  category: '分類',
  category_id: '分類 ID',
  channel: '來源通路',
  check_in_date: '入住日期',
  check_out_date: '退房日期',
  checkin_time: '入住時間',
  checkout_time: '退房時間',
  city: '縣市',
  code: '代碼',
  coffee_profile_answers: '咖啡測驗答案',
  coffee_profile_key: '咖啡偏好代碼',
  coffee_profile_label: '咖啡偏好名稱',
  coffee_profile_scores: '咖啡偏好分數',
  coffee_profile_summary: '咖啡偏好摘要',
  coffee_quiz_completed_at: '咖啡測驗完成時間',
  comment: '評論內容',
  communication_notes: '溝通備註',
  company_name: '公司名稱',
  company_no: '公司統編',
  company_tax_id: '公司統編',
  completed_at: '完成時間',
  commit_sha: 'Git 提交代碼',
  confidence_score: '信心分數',
  contact_email: '聯絡 Email',
  contact_phone: '聯絡電話',
  content: '內容',
  content_hash: '內容雜湊',
  cost_price: '成本價',
  cover_image_url: '封面圖片網址',
  created_at: '建立時間',
  created_by: '建立者',
  cta_label_en: '英文 CTA 文字',
  cta_label_ja: '日文 CTA 文字',
  cta_label_ko: '韓文 CTA 文字',
  cta_label_zh: '中文 CTA 文字',
  currency: '幣別',
  current_points: '目前點數',
  customer_account: '顧客帳號',
  customer_email: '顧客 Email',
  customer_name: '顧客姓名',
  customer_phone: '顧客電話',
  date: '日期',
  day_of_week: '星期',
  delivery_status: '配送狀態',
  deposit_amount: '押金',
  description: '描述',
  destination: '目的地',
  details: '詳細資料',
  discount_amount: '折抵金額',
  discount_code: '折扣碼',
  display_name: '顯示名稱',
  display_order: '顯示排序',
  district: '行政區',
  email: '電子郵件',
  embedded_at: '向量建立時間',
  embedding: '向量資料',
  embedding_model: '向量模型',
  end_date: '結束日期',
  ended_at: '結束時間',
  ends_at: '結束顯示時間',
  entity_id: '資料 ID',
  entity_table: '資料表',
  entity_type: '資料類型',
  error_message: '錯誤訊息',
  event_type: '事件類型',
  excerpt: '摘要',
  expires_at: '到期時間',
  expiring_points: '即將到期點數',
  ezpay_raw_request: 'ezPay 原始請求',
  ezpay_raw_response: 'ezPay 原始回應',
  ezpay_trade_no: 'ezPay 交易序號',
  facebook: 'Facebook',
  feature_type: '功能類型',
  featured_image: '精選圖片',
  feedback_text: '回饋文字',
  field_key: '欄位鍵',
  flavor_notes: '風味描述',
  floor: '樓層',
  ga_measurement_id: 'GA 追蹤 ID',
  gateway_name: '金流名稱',
  granted: '是否授權',
  granted_at: '授權時間',
  granted_by: '授權者',
  guests: '入住人數',
  headquarters_address: '總部地址',
  hotel_id: '旅宿 ID',
  hours: '營業時間',
  icon_name: '圖示名稱',
  id: '資料 ID',
  image_url: '圖片網址',
  images: '圖片列表',
  interests: '興趣偏好',
  invoice_date: '發票開立時間',
  invoice_no: '發票號碼',
  invoice_number: '發票號碼',
  invoice_random_number: '發票隨機碼',
  invoice_status: '發票狀態',
  ip_address: 'IP 位址',
  is_active: '是否啟用',
  is_ai_translated: '是否 AI 翻譯',
  is_available: '是否可預訂',
  is_default: '是否預設',
  is_featured: '是否精選',
  is_hidden: '是否隱藏',
  is_manual: '是否手動',
  is_published: '是否發布',
  is_starred: '是否標記星號',
  itinerary_plan_id: '行程規劃 ID',
  key: '鍵值',
  keywords: '關鍵字',
  knowledge_id: '知識庫 ID',
  label: '名稱',
  lang: '語言',
  language: '語言',
  language_code: '語言代碼',
  last_billed_at: '上次扣款時間',
  last_error: '最後錯誤',
  last_login_at: '最後登入時間',
  last_used_at: '最後使用時間',
  lgs_no: '物流單號',
  line_id: 'LINE ID',
  link_label_en: '英文連結文字',
  link_label_ja: '日文連結文字',
  link_label_ko: '韓文連結文字',
  link_label_zh: '中文連結文字',
  link_url: '連結網址',
  location: '地點',
  login_method: '登入方式',
  logistics_status: '物流狀態',
  logistics_type: '物流類型',
  logo_url: 'Logo 網址',
  love_code: '愛心碼',
  manager_notes: '管理備註',
  map_url: '地圖網址',
  member_email: '會員 Email',
  member_id: '會員 ID',
  member_name: '會員姓名',
  member_notification_emails: '會員通知收件 Email',
  member_phone: '會員電話',
  member_price: '會員價',
  merchant_order_no: '商店訂單編號',
  message: '訊息內容',
  message_id: '訊息 ID',
  meta_description: 'SEO 描述',
  meta_keywords: 'Meta 關鍵字',
  metadata: '中繼資料',
  method: '方式',
  min_capacity: '最低入住人數',
  module: '功能模組',
  month_earned: '本月獲得點數',
  month_used: '本月使用點數',
  monthly_amount: '每期金額',
  movement_type: '異動類型',
  name: '名稱',
  name_en: '英文名稱',
  nationality: '國籍',
  newebpay_auth_code: '藍新授權碼',
  newebpay_card_no: '藍新卡號末碼',
  newebpay_paid_at: '藍新付款時間',
  newebpay_payment_type: '藍新付款類型',
  newebpay_period_no: '藍新定期定額編號',
  newebpay_respond_code: '藍新回應碼',
  newebpay_status: '藍新狀態',
  newebpay_trade_no: '藍新交易序號',
  next_bill_at: '下次扣款時間',
  note: '備註',
  notes: '備註',
  notifications_email: 'Email 通知',
  notifications_sms: '簡訊通知',
  og_description: '社群分享描述',
  og_image: '社群分享圖片',
  og_image_url: '社群分享圖片網址',
  og_title: '社群分享標題',
  opening_hours: '營業時間',
  option_key: '選項代號',
  option_text: '選項文字',
  order_count: '訂單數',
  order_id: '訂單 ID',
  order_notification_emails: '訂單通知收件 Email',
  order_number: '訂單編號',
  origin: '產地',
  page_id: '頁面 ID',
  page_path: '頁面路徑',
  parent_block_key: '上層區塊鍵',
  parent_id: '上層分類 ID',
  password_hash: '密碼雜湊',
  paid_at: '付款時間',
  payer_email: '付款人 Email',
  payment_failed_notification_emails: '付款失敗通知 Email',
  payment_method: '付款方式',
  payment_status: '付款狀態',
  permission: '權限',
  permission_id: '權限 ID',
  period_point: '扣款週期點',
  period_start_type: '訂閱起始類型',
  period_times: '訂閱期數',
  period_type: '訂閱週期類型',
  pet_friendly: '是否寵物友善',
  phone: '電話',
  place_name: '地點名稱',
  placement: '放置位置',
  plan_data: '行程資料',
  platform: '平台',
  points_discount: '點數折抵金額',
  points_per_100: '每 NT$100 回饋點數',
  points_used: '使用點數',
  post_id: '文章 ID',
  preferred_language: '偏好語言',
  price: '價格',
  price_per_night: '每晚價格',
  price_per_share: '每份價格',
  priority: '優先順序',
  processing_method: '處理法',
  product_id: '商品 ID',
  product_name: '商品名稱',
  provider: '服務提供者',
  provider_status: '金流狀態',
  published_at: '發布時間',
  purchase_date: '進貨日期',
  purchase_record_id: '購買紀錄 ID',
  quantity: '數量',
  question: '問題',
  question_id: '題目 ID',
  question_text: '題目文字',
  rating: '評分',
  raw_response: '原始回應',
  recorded_by: '紀錄者',
  record_type: '紀錄類型',
  recurring_cycle_no: '訂閱扣款期次',
  reference_id: '關聯 ID',
  reference_type: '關聯類型',
  registration_number: '旅宿登記證號',
  recipient_email: '收件人 Email',
  recipient_name: '收件人姓名',
  recipient_phone: '收件人電話',
  request_type: '申請類型',
  respond_code: '回應碼',
  response: '回覆內容',
  result_type: '結果類型',
  refund_notification_emails: '退款通知收件 Email',
  revenue_amount: '營收金額',
  review_status: '審核狀態',
  roast_date: '烘焙日期',
  roast_level: '烘焙度',
  roast_score: '烘焙分數',
  robots: 'Robots 設定',
  role: '角色',
  role_id: '角色 ID',
  room_id: '房型 ID',
  room_type: '房型類型',
  route: '路由',
  sale_price: '優惠價',
  sales_amount: '銷售額',
  sales_date: '銷售日期',
  schema_markup: '結構化資料',
  score: '分數',
  section_type: '區塊類型',
  sender_type: '發送者類型',
  seo_description: 'SEO 描述',
  seo_keywords: 'SEO 關鍵字',
  seo_title: 'SEO 標題',
  session_id: '會話 ID',
  setting_key: '設定鍵',
  setting_value: '設定值',
  sections: '頁面區塊',
  ship_type: '出貨類型',
  shipping: '運費',
  shipping_address: '配送地址',
  shipping_city: '配送縣市',
  shipping_country: '配送國家',
  shipping_district: '配送行政區',
  shipping_line1: '配送地址第一行',
  shipping_method: '配送方式',
  shipping_notes: '配送備註',
  shipping_postal_code: '配送郵遞區號',
  shipping_status: '物流狀態',
  site_description: '網站描述',
  site_icon_url: '網站圖示',
  site_name: '網站名稱',
  site_slogan: '網站標語',
  sku: 'SKU',
  slug: '網址代稱',
  social_facebook: 'Facebook 連結',
  social_instagram: 'Instagram 連結',
  social_line: 'LINE 連結',
  social_tiktok: 'TikTok 連結',
  social_twitter: 'Twitter 連結',
  social_x: 'X 連結',
  social_youtube: 'YouTube 連結',
  sort_order: '排序',
  source: '來源',
  source_hash: '來源雜湊',
  source_id: '來源 ID',
  source_image_url: '來源圖片網址',
  source_lang: '來源語言',
  source_payload: '來源資料',
  source_text: '來源文字',
  source_type: '來源類型',
  source_url: '來源網址',
  specifications: '規格資料',
  special_requests: '特殊需求',
  star_rating: '星等',
  start_date: '開始日期',
  started_at: '開始時間',
  starts_at: '開始顯示時間',
  stat_key: '統計鍵',
  stat_value: '統計值',
  status: '狀態',
  stock: '庫存',
  stock_quantity: '庫存數量',
  store_addr: '超商門市地址',
  store_id: '超商門市代號',
  store_location_id: '門市 ID',
  store_name: '超商門市名稱',
  store_print_no: '門市列印編號',
  store_tel: '超商門市電話',
  subject: '主旨',
  subscribed_order_notifications: '是否訂閱訂單通知',
  subscription_id: '訂閱 ID',
  subtotal: '小計',
  subtotal_amount: '小計金額',
  subtotal_price: '小計金額',
  subtitle_en: '英文副標題',
  subtitle_ja: '日文副標題',
  subtitle_ko: '韓文副標題',
  subtitle_zh: '中文副標題',
  summary: '摘要',
  supplier_name: '供應商名稱',
  support_notification_emails: '客服通知收件 Email',
  system_notification_emails: '系統通知收件 Email',
  tags: '標籤',
  target_id: '目標 ID',
  target_lang: '目標語言',
  target_langs: '目標語言列表',
  target_text: '目標文字',
  target_type: '目標類型',
  tax: '稅額',
  tax_amount: '稅額',
  tax_type: '課稅別',
  theme: '主題',
  theme_color: '主題色',
  theme_key: '主題鍵',
  title: '標題',
  title_en: '英文標題',
  title_ja: '日文標題',
  title_ko: '韓文標題',
  title_zh: '中文標題',
  token: 'Token',
  tokens_used: '使用 Token 數',
  total: '總金額',
  total_amount: '總金額',
  total_price: '總價',
  total_requests: '總請求數',
  total_shares: '總份數',
  total_spent: '累積消費金額',
  total_tokens: '總 Token 數',
  tracking_number: '物流追蹤碼',
  trade_info: '交易資訊',
  trade_no: '交易序號',
  trade_sha: '交易 SHA',
  trade_type: '交易類型',
  transaction_id: '交易 ID',
  transaction_type: '點數交易類型',
  translated_text: '翻譯文字',
  updated_at: '更新時間',
  updated_by: '更新者',
  url_path: '頁面路徑',
  unpublished_at: '下架時間',
  unit_cost: '單位成本',
  unit_price: '單價',
  usage_count: '使用次數',
  used: '是否已使用',
  used_at: '使用時間',
  user_agent: '使用者代理',
  user_id: '會員 ID',
  username: '帳號',
  value: '值',
  variety: '品種',
  vendor_id: '廠商 ID',
  version_label: '版本標籤',
  views: '瀏覽數',
  visited_date: '造訪日期',
  visitor_email: '訪客 Email',
  visitor_name: '訪客姓名',
  was_helpful: '是否有幫助',
  website: '網站',
  weekend_price: '週末價格',
  weight_grams: '重量克數',
};

const wordLabels = {
  action: '操作',
  active: '啟用',
  admin: '管理員',
  ai: 'AI',
  amount: '金額',
  answer: '答案',
  at: '時間',
  auth: 'Auth',
  avatar: '頭像',
  billing: '扣款',
  blog: '文章',
  booking: '訂房',
  card: '卡號',
  category: '分類',
  chat: '聊天',
  code: '代碼',
  content: '內容',
  count: '數量',
  created: '建立',
  customer: '顧客',
  date: '日期',
  description: '描述',
  discount: '折抵',
  email: 'Email',
  enabled: '啟用',
  id: 'ID',
  image: '圖片',
  invoice: '發票',
  item: '項目',
  key: '鍵',
  label: '名稱',
  lang: '語言',
  link: '連結',
  member: '會員',
  message: '訊息',
  name: '名稱',
  no: '編號',
  notes: '備註',
  number: '號碼',
  order: '訂單',
  payment: '付款',
  phone: '電話',
  point: '點數',
  points: '點數',
  price: '價格',
  product: '商品',
  quantity: '數量',
  raw: '原始',
  request: '請求',
  response: '回應',
  role: '角色',
  room: '房型',
  score: '分數',
  shipping: '配送',
  source: '來源',
  status: '狀態',
  store: '門市',
  target: '目標',
  text: '文字',
  title: '標題',
  total: '總計',
  type: '類型',
  updated: '更新',
  url: '網址',
  user: '會員',
  value: '值',
  vendor: '廠商',
};

const featureOrder = [
  '管理員與權限',
  '會員',
  '商品與商城',
  '訂單與金流',
  '發票物流與售後',
  '住宿訂房',
  '廠商與門市',
  '點數',
  '內容網站設定',
  '多語翻譯',
  'AI 與客服',
  '旅遊其他',
  '其他',
];

const cleanTableName = (raw) => raw
  .replace(/if\s+not\s+exists\s+/i, '')
  .replace(/public\./i, '')
  .replace(/"/g, '')
  .trim()
  .toLowerCase();

const featureForTable = (table) => {
  if (/admin|permission|role|audit|activity|super_admin/.test(table)) return '管理員與權限';
  if (/member|user|verification|password/.test(table) || table === 'tbl_mn5wgzh0') return '會員';
  if (/product|categor|purchase|cart|mn5uxems/.test(table)) return '商品與商城';
  if (/order|payment|newebpay/.test(table)) return '訂單與金流';
  if (/invoice|logistics|after_sales|review|favorite/.test(table)) return '發票物流與售後';
  if (/hotel|room|booking/.test(table)) return '住宿訂房';
  if (/vendor|store/.test(table)) return '廠商與門市';
  if (/point/.test(table)) return '點數';
  if (/blog|article|static|site|theme|home|faq|seo|social|contact/.test(table)) return '內容網站設定';
  if (/translation|language/.test(table)) return '多語翻譯';
  if (/ai|chat|knowledge|coffee_quiz|mn5wn257/.test(table)) return 'AI 與客服';
  if (/itinerary|travel|properties/.test(table)) return '旅遊其他';
  return '其他';
};

const splitColumnDefinitions = (body) => {
  const parts = [];
  let current = '';
  let depth = 0;
  let quote = null;

  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];

    if (quote) {
      current += ch;
      if (ch === quote && body[i - 1] !== '\\') quote = null;
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }

    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;

    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
};

const getColumnLabel = (column) => {
  if (exactColumnLabels[column]) return exactColumnLabels[column];
  return column
    .split('_')
    .map((part) => wordLabels[part] || part)
    .join('');
};

const getTableLabel = (table) => tableLabels[table] || table
  .split('_')
  .map((part) => wordLabels[part] || part)
  .join('');

const addColumn = (tables, table, column, sourceFile) => {
  const ignored = new Set([
    'unique(user_id,',
    'unique(language_code,',
    'unique(module,',
    'unique(date)',
  ]);
  if (!table || !column || ignored.has(column)) return;
  if (!tables.has(table)) tables.set(table, new Map());
  if (!tables.get(table).has(column)) tables.get(table).set(column, { sourceFiles: [] });
  tables.get(table).get(column).sourceFiles.push(sourceFile);
};

const parseSchemaFromMigrations = () => {
  const tables = new Map();
  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8').replace(/--.*$/gm, '');

    const createTableRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?([\w".]+)\s*\(([^;]*?)\);/gis;
    let match;
    while ((match = createTableRe.exec(sql))) {
      const table = cleanTableName(match[1]);
      for (const part of splitColumnDefinitions(match[2])) {
        const first = part.trim().split(/\s+/)[0]?.replace(/"/g, '').toLowerCase();
        if (!first || ['constraint', 'primary', 'foreign', 'unique', 'check', 'exclude'].includes(first)) continue;
        addColumn(tables, table, first, file);
      }
    }

    const alterTableRe = /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([\w".]+)\s+([^;]*);/gis;
    while ((match = alterTableRe.exec(sql))) {
      const table = cleanTableName(match[1]);
      const addColumnRe = /add\s+column\s+(?:if\s+not\s+exists\s+)?"?([a-zA-Z_][\w]*)"?/gi;
      let addMatch;
      while ((addMatch = addColumnRe.exec(match[2]))) {
        addColumn(tables, table, addMatch[1].toLowerCase(), file);
      }
    }
  }

  return tables;
};

const buildRows = (tables) => {
  const rows = [];
  for (const [table, columns] of [...tables.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const feature = featureForTable(table);
    const tableLabel = getTableLabel(table);
    for (const column of [...columns.keys()].sort()) {
      rows.push({
        feature,
        table,
        tableLabel,
        column,
        columnLabel: getColumnLabel(column),
      });
    }
  }
  return rows;
};

const escapeCsv = (value) => `"${String(value).replace(/"/g, '""')}"`;

const writeCsv = (rows) => {
  const csv = [
    ['功能分類', '資料表', '資料表名稱', '欄位', '欄位名稱'].map(escapeCsv).join(','),
    ...rows.map((row) => [
      row.feature,
      row.table,
      row.tableLabel,
      row.column,
      row.columnLabel,
    ].map(escapeCsv).join(',')),
  ].join('\n');

  fs.writeFileSync(path.join(docsDir, 'database-field-labels.csv'), csv, 'utf8');
};

const writeMarkdown = (rows, tables) => {
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.feature)) grouped.set(row.feature, new Map());
    const featureTables = grouped.get(row.feature);
    if (!featureTables.has(row.table)) {
      featureTables.set(row.table, {
        label: row.tableLabel,
        fields: [],
      });
    }
    featureTables.get(row.table).fields.push(row);
  }

  let markdown = '# Nestobi 完整資料表欄位名稱對照\n\n';
  markdown += '產生日期：2026-08-03\n\n';
  markdown += '說明：本文件由本地 `supabase/migrations` 自動彙整，格式為 `英文欄位` 與 `中文欄位名稱` 對照。若線上 Supabase 曾手動改表，請再與線上 schema 比對。\n\n';
  markdown += `總資料表數：${tables.size}\n\n`;
  markdown += `總欄位數：${rows.length}\n\n`;

  for (const feature of featureOrder) {
    const featureTables = grouped.get(feature);
    if (!featureTables) continue;
    markdown += `## ${feature}\n\n`;

    for (const [table, info] of [...featureTables.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      markdown += `### \`${table}\`（${info.label}）\n\n`;
      markdown += '| 欄位 | 欄位名稱 |\n';
      markdown += '| --- | --- |\n';
      for (const field of info.fields.sort((a, b) => a.column.localeCompare(b.column))) {
        markdown += `| \`${field.column}\` | ${field.columnLabel} |\n`;
      }
      markdown += '\n';
    }
  }

  fs.writeFileSync(path.join(docsDir, 'database-field-labels.md'), `${markdown.trimEnd()}\n`, 'utf8');
};

const verifyComplete = (tables) => {
  const markdown = fs.readFileSync(path.join(docsDir, 'database-field-labels.md'), 'utf8');
  const documentedTables = new Set([...markdown.matchAll(/^### `([^`]+)`/gm)].map((match) => match[1]));
  const documentedFields = new Map();
  let currentTable = null;

  for (const line of markdown.split(/\r?\n/)) {
    const tableMatch = line.match(/^### `([^`]+)`/);
    if (tableMatch) {
      currentTable = tableMatch[1];
      documentedFields.set(currentTable, new Set());
      continue;
    }

    const fieldMatch = line.match(/^\| `([^`]+)` \|/);
    if (fieldMatch && currentTable) documentedFields.get(currentTable).add(fieldMatch[1]);
  }

  const missingTables = [];
  const missingFields = [];

  for (const [table, columns] of tables) {
    if (!documentedTables.has(table)) {
      missingTables.push(table);
      continue;
    }

    const fields = documentedFields.get(table) || new Set();
    const missing = [...columns.keys()].filter((column) => !fields.has(column));
    if (missing.length > 0) missingFields.push({ table, missing });
  }

  if (missingTables.length > 0 || missingFields.length > 0) {
    console.error(JSON.stringify({ missingTables, missingFields }, null, 2));
    process.exit(1);
  }
};

fs.mkdirSync(docsDir, { recursive: true });

const tables = parseSchemaFromMigrations();
const rows = buildRows(tables);

writeMarkdown(rows, tables);
writeCsv(rows);
verifyComplete(tables);

console.log(`Generated complete database field labels: ${tables.size} tables, ${rows.length} fields.`);

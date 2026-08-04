export type Lang = 'zh-TW' | 'en' | 'ja' | 'ko';

export const LANG_OPTIONS: { code: Lang; label: string; flag: string }[] = [
  { code: 'zh-TW', label: '繁體中文', flag: 'TW' },
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'ja', label: '日本語', flag: 'JP' },
  { code: 'ko', label: '한국어', flag: 'KR' },
];

const zhTW = {
  nav: {
    rooms: '住宿',
    shop: '選物商店',
    blog: '咖啡旅誌',
    aiItinerary: 'AI 行程規劃',
    aiTranslator: 'AI 即時翻譯',
    aiChat: 'AI 客服',
    travelPassport: '旅人護照',
    login: '登入',
    register: '註冊',
    memberCenter: '會員中心',
    myBookings: '我的訂房',
    myOrders: '我的訂單',
    myPurchases: '購買紀錄',
    myPoints: '我的點數',
    profile: '個人資料',
    settings: '偏好設定',
    adminPanel: '管理後台',
    superAdmin: '超級管理',
    logout: '登出',
  },
  home: {
    heroTitle: '從下一趟旅程開始，讓平台替你少想一點',
    heroSubtitle: '從精選住宿、咖啡選物到 AI 行程規劃，Nestobi 幫你把旅程與購物整理在同一個地方。',
    exploreCta: '尋找住宿',
    registerCta: '立即註冊',
  },
  rooms: { title: '探索住宿', subtitle: '依城市、預算與人數快速找到適合的房間。' },
  shop: { title: '旅行選物商店', subtitle: '把旅程中的味道和日常好物一起帶回家。' },
  blog: { title: '咖啡旅行家', subtitle: '探索在地咖啡文化，記錄旅途中每一杯的美好。' },
  ai: {
    itinerary: { title: 'AI 行程規劃', subtitle: '輸入目的地與偏好，快速生成可編輯行程。' },
    translator: { title: 'AI 即時翻譯', subtitle: '常見旅遊情境一鍵翻譯。' },
    chat: { title: 'AI 客服中心', subtitle: '快速解答訂房、訂單與帳務問題。' },
  },
  common: {
    search: '搜尋',
    cancel: '取消',
    confirm: '確認',
    save: '儲存',
    delete: '刪除',
    edit: '編輯',
    back: '返回',
    next: '下一步',
    loading: '載入中...',
    noData: '目前沒有資料',
    submit: '送出',
    close: '關閉',
    learnMore: '了解更多',
    language: '語言',
    home: '首頁',
    refresh: '重新整理',
    retry: '重試',
    viewDetails: '查看詳情',
  },
  backoffice: {
    superAdmin: '超級管理員',
    vendor: '廠商管理',
    member: '會員中心',
    management: '管理中心',
    logout: '登出',
    backHome: '回首頁',
    language: '介面語言',
  },
  auth: {
    email: '電子郵件',
    password: '密碼',
    forgotPassword: '忘記密碼？',
    noAccount: '還沒有帳號？',
    hasAccount: '已經有帳號？',
    registerCta: '立即註冊',
    loginCta: '登入',
  },
};

const en: typeof zhTW = {
  ...zhTW,
  nav: {
    ...zhTW.nav,
    rooms: 'Stays',
    shop: 'Shop',
    blog: 'Coffee Journal',
    aiItinerary: 'AI Planner',
    aiTranslator: 'AI Translate',
    aiChat: 'AI Support',
    travelPassport: 'Travel Passport',
    login: 'Login',
    register: 'Sign up',
    memberCenter: 'Member Center',
    myBookings: 'My Bookings',
    myOrders: 'My Orders',
    myPurchases: 'Purchase History',
    myPoints: 'My Points',
    profile: 'Profile',
    settings: 'Preferences',
    adminPanel: 'Admin',
    superAdmin: 'Super Admin',
    logout: 'Logout',
  },
  home: {
    heroTitle: 'Start Your Next Journey Here',
    heroSubtitle: 'From curated stays and coffee picks to AI itinerary planning, Nestobi helps you travel, shop, and organize in one place.',
    exploreCta: 'Find Stays',
    registerCta: 'Sign up now',
  },
  rooms: { title: 'Explore Stays', subtitle: 'Find the right room by city, budget, and group size.' },
  shop: { title: 'Travel Shop', subtitle: 'Bring the taste of your journey home.' },
  blog: { title: 'Coffee Traveler', subtitle: 'Stories of local coffee culture and travel moments.' },
  ai: {
    itinerary: { title: 'AI Itinerary Planner', subtitle: 'Create editable plans from your destination and preferences.' },
    translator: { title: 'AI Translator', subtitle: 'Instant translation for common travel scenarios.' },
    chat: { title: 'AI Support Center', subtitle: 'Get quick answers for bookings, orders, and account issues.' },
  },
  common: {
    ...zhTW.common,
    search: 'Search',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back',
    next: 'Next',
    loading: 'Loading...',
    noData: 'No data',
    submit: 'Submit',
    close: 'Close',
    learnMore: 'Learn more',
    language: 'Language',
    home: 'Home',
    refresh: 'Refresh',
    retry: 'Retry',
    viewDetails: 'View details',
  },
  backoffice: {
    superAdmin: 'Super Admin',
    vendor: 'Vendor Portal',
    member: 'Member Center',
    management: 'Management',
    logout: 'Logout',
    backHome: 'Back to home',
    language: 'Interface language',
  },
  auth: {
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    registerCta: 'Sign up',
    loginCta: 'Login',
  },
};

const ja: typeof zhTW = {
  ...en,
  common: {
    ...en.common,
    language: '言語',
    home: 'ホーム',
    refresh: '再読み込み',
    retry: '再試行',
    viewDetails: '詳細を見る',
  },
  backoffice: {
    superAdmin: 'スーパー管理者',
    vendor: 'ベンダー管理',
    member: '会員センター',
    management: '管理センター',
    logout: 'ログアウト',
    backHome: 'ホームへ戻る',
    language: '表示言語',
  },
};

const ko: typeof zhTW = {
  ...en,
  common: {
    ...en.common,
    language: '언어',
    home: '홈',
    refresh: '새로고침',
    retry: '다시 시도',
    viewDetails: '상세 보기',
  },
  backoffice: {
    superAdmin: '최고 관리자',
    vendor: '업체 관리',
    member: '회원 센터',
    management: '관리 센터',
    logout: '로그아웃',
    backHome: '홈으로',
    language: '화면 언어',
  },
};

export const translations: Record<Lang, typeof zhTW> = { 'zh-TW': zhTW, en, ja, ko };
export type Translations = typeof zhTW;

const runtimeTranslations: Record<Lang, Record<string, string>> = {
  'zh-TW': {
    'common.translating': '翻譯中',
    'points.rewards.title': '點數獎勵',
    'points.rewards.subtitle': '設定訂房、商品訂單與訂閱制每消費 NT$100 可回饋多少點數。',
    'points.rewards.enabled': '啟用規則',
    'points.rewards.average': '平均回饋',
    'points.rewards.source': '資料來源',
    'points.unit': '點',
  },
  en: {
    'common.translating': 'Translating',
    'points.rewards.title': 'Point rewards',
    'points.rewards.subtitle': 'Set the points earned for every NT$100 spent on stays, orders, and subscriptions.',
    'points.rewards.enabled': 'Enabled rules',
    'points.rewards.average': 'Average reward',
    'points.rewards.source': 'Data source',
    'points.unit': 'points',
  },
  ja: {
    'common.translating': '翻訳中',
    'points.rewards.title': 'ポイント特典',
    'points.rewards.subtitle': '宿泊、商品注文、定期購入で NT$100 ごとに付与するポイントを設定します。',
    'points.rewards.enabled': '有効なルール',
    'points.rewards.average': '平均付与',
    'points.rewards.source': 'データソース',
    'points.unit': 'ポイント',
  },
  ko: {
    'common.translating': '번역 중',
    'points.rewards.title': '포인트 적립',
    'points.rewards.subtitle': '숙박, 상품 주문, 구독 결제 NT$100당 적립 포인트를 설정합니다.',
    'points.rewards.enabled': '사용 중인 규칙',
    'points.rewards.average': '평균 적립',
    'points.rewards.source': '데이터 소스',
    'points.unit': '포인트',
  },
};

const readTranslation = (source: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((value, segment) => {
    if (!value || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[segment];
  }, source);

export function translateKey(lang: Lang, key: string, fallback = key): string {
  const runtimeValue = runtimeTranslations[lang][key];
  if (runtimeValue) return runtimeValue;
  const value = readTranslation(translations[lang], key);
  return typeof value === 'string' && value.trim() ? value : fallback;
}

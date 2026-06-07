import { BLOG_FALLBACK_IMAGE, PRODUCT_FALLBACK_IMAGE, ROOM_FALLBACK_IMAGE, SCENIC_GALLERY_IMAGES, STORE_FALLBACK_IMAGE } from './images';
import { supabase } from './supabase';

export type ThemeKey = 'home' | 'nestopia' | 'genbon_travel' | 'coffee_traveler';

export interface ThemeBanner {
  id: string;
  theme_key: ThemeKey;
  title_zh: string;
  title_en: string;
  title_ja: string;
  title_ko: string;
  subtitle_zh: string;
  subtitle_en: string;
  subtitle_ja: string;
  subtitle_ko: string;
  image_url: string;
  link_url: string;
  link_label_zh: string;
  link_label_en: string;
  link_label_ja: string;
  link_label_ko: string;
  display_order: number;
}

const FALLBACK_BANNERS: Record<ThemeKey, ThemeBanner[]> = {
  home: [
    {
      id: 'fallback-home-1',
      theme_key: 'home',
      title_zh: '智慧旅遊\n從搜尋開始',
      title_en: 'Smart Travel\nStarts with Search',
      title_ja: 'スマートな旅は\n検索から',
      title_ko: '스마트한 여행은\n검색부터',
      subtitle_zh: '先找住宿與行程靈感，再串接咖啡文章、旅行選物與 AI 客服，讓出發前的決定集中完成。',
      subtitle_en: 'Search stays and trip ideas first, then connect articles, travel goods, and AI support before you go.',
      subtitle_ja: 'まず宿泊と旅のヒントを探し、記事、旅のアイテム、AIサポートまで出発前にまとめて確認できます。',
      subtitle_ko: '먼저 숙소와 여행 아이디어를 찾고, 글과 여행 상품, AI 상담까지 출발 전에 한곳에서 확인하세요.',
      image_url: SCENIC_GALLERY_IMAGES[0] || ROOM_FALLBACK_IMAGE,
      link_url: '/rooms',
      link_label_zh: '開始搜尋住宿',
      link_label_en: 'Search Stays',
      link_label_ja: '宿泊を検索',
      link_label_ko: '숙소 검색',
      display_order: 10,
    },
    {
      id: 'fallback-home-2',
      theme_key: 'home',
      title_zh: '搜尋住宿\n安排旅程',
      title_en: 'Search Stays\nPlan the Trip',
      title_ja: '宿を探して\n旅を整える',
      title_ko: '숙소를 찾고\n여행을 준비',
      subtitle_zh: '用搜尋快速找到住宿與文章，再交給 AI 協助整理行程、翻譯與客服問題。',
      subtitle_en: 'Search stays and articles first, then let AI help with plans, translation, and support.',
      subtitle_ja: '宿泊や記事をすばやく探し、AIで旅程、翻訳、サポートを整えます。',
      subtitle_ko: '숙소와 글을 먼저 찾고, AI로 일정, 번역, 고객지원을 이어갑니다.',
      image_url: SCENIC_GALLERY_IMAGES[1] || PRODUCT_FALLBACK_IMAGE,
      link_url: '/rooms',
      link_label_zh: '前往 nestobi',
      link_label_en: 'Explore nestobi',
      link_label_ja: 'nestobiへ',
      link_label_ko: 'nestobi 보기',
      display_order: 20,
    },
  ],
  nestopia: [
    {
      id: 'fallback-nestopia-1',
      theme_key: 'nestopia',
      title_zh: '住進下一段風景',
      title_en: 'Stay Inside the Next View',
      title_ja: '次の景色に泊まる',
      title_ko: '다음 풍경에 머물다',
      subtitle_zh: '以民宿、房型與城市感受為核心，讓 nestobi 成為住宿的入口。',
      subtitle_en: 'nestobi starts from stays, rooms, cities, and the feeling of arriving.',
      subtitle_ja: '民宿、客室、街の空気から、nestobi は宿泊の入口になります。',
      subtitle_ko: '숙소, 객실, 도시의 감각에서 nestobi 숙박이 시작됩니다.',
      image_url: ROOM_FALLBACK_IMAGE,
      link_url: '/rooms',
      link_label_zh: '探索住宿',
      link_label_en: 'Explore stays',
      link_label_ja: '宿泊を探す',
      link_label_ko: '숙소 둘러보기',
      display_order: 10,
    },
    {
      id: 'fallback-nestopia-2',
      theme_key: 'nestopia',
      title_zh: '適合旅伴的房型',
      title_en: 'Rooms for Every Group',
      title_ja: '旅の仲間に合う客室',
      title_ko: '여행 동행에 맞는 객실',
      subtitle_zh: '用人數、預算與停留方式快速找到合適房型。',
      subtitle_en: 'Find the right room by guests, budget, and the way you want to stay.',
      subtitle_ja: '人数、予算、滞在スタイルから合う客室を見つけます。',
      subtitle_ko: '인원, 예산, 머무는 방식으로 알맞은 객실을 찾습니다.',
      image_url: 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=1600',
      link_url: '/rooms?type=family',
      link_label_zh: '看家庭房',
      link_label_en: 'View family rooms',
      link_label_ja: 'ファミリー客室を見る',
      link_label_ko: '패밀리 객실 보기',
      display_order: 20,
    },
  ],
  genbon_travel: [
    {
      id: 'fallback-genbon-1',
      theme_key: 'genbon_travel',
      title_zh: '旅行前後的\n選物補給',
      title_en: 'Travel Goods\nBefore and After',
      title_ja: '旅の前後に\n必要な選物',
      title_ko: '여행 전후의\n셀렉트 아이템',
      subtitle_zh: '咖啡、茶點、旅行小物與伴手禮集中整理；先搜尋用途，再決定線上購買或到門市挑選。',
      subtitle_en: 'Coffee, tea snacks, travel goods, and gifts in one place. Search by need, then buy online or visit a store.',
      subtitle_ja: 'コーヒー、お茶菓子、旅の小物、ギフトをまとめて確認。用途で探して、オンライン購入や来店を選べます。',
      subtitle_ko: '커피, 차 간식, 여행 소품, 선물을 한곳에서 찾고 필요에 맞춰 온라인 구매나 매장 방문을 선택하세요.',
      image_url: PRODUCT_FALLBACK_IMAGE,
      link_url: '/shop',
      link_label_zh: '搜尋商品',
      link_label_en: 'Search Products',
      link_label_ja: '商品を検索',
      link_label_ko: '상품 검색',
      display_order: 10,
    },
    {
      id: 'fallback-genbon-2',
      theme_key: 'genbon_travel',
      title_zh: '到門市\n看實品',
      title_en: 'See Items\nIn Store',
      title_ja: '店舗で\n実物を見る',
      title_ko: '매장에서\n직접 보기',
      subtitle_zh: '想試喝、看包裝或現場取貨時，直接查門市位置、營業時間與地圖。',
      subtitle_en: 'When you want to taste, check packaging, or pick up in person, find store hours, locations, and maps.',
      subtitle_ja: '試飲、パッケージ確認、店頭受け取りをしたい時に、店舗の場所、営業時間、地図を確認できます。',
      subtitle_ko: '시음, 포장 확인, 현장 수령이 필요할 때 매장 위치, 영업시간, 지도를 바로 확인하세요.',
      image_url: STORE_FALLBACK_IMAGE,
      link_url: '/stores',
      link_label_zh: '查詢門市',
      link_label_en: 'Find Stores',
      link_label_ja: '店舗を探す',
      link_label_ko: '매장 찾기',
      display_order: 20,
    },
  ],
  coffee_traveler: [
    {
      id: 'fallback-coffee-1',
      theme_key: 'coffee_traveler',
      title_zh: '咖啡旅行家',
      title_en: 'Coffee Traveler',
      title_ja: 'Coffee Traveler',
      title_ko: 'Coffee Traveler',
      subtitle_zh: '從一杯咖啡出發，寫下城市、店家、風味與旅途中的人物。',
      subtitle_en: 'Start from a cup of coffee and collect cities, shops, flavors, and people on the road.',
      subtitle_ja: '一杯のコーヒーから、街、店、味、人の物語を綴ります。',
      subtitle_ko: '한 잔의 커피에서 도시, 매장, 맛, 사람의 이야기를 기록합니다.',
      image_url: BLOG_FALLBACK_IMAGE,
      link_url: '/blog',
      link_label_zh: '閱讀文章',
      link_label_en: 'Read articles',
      link_label_ja: '記事を読む',
      link_label_ko: '글 읽기',
      display_order: 10,
    },
    {
      id: 'fallback-coffee-2',
      theme_key: 'coffee_traveler',
      title_zh: '沖繩與日本咖啡路線',
      title_en: 'Coffee Routes in Japan and Okinawa',
      title_ja: '沖縄と日本のコーヒールート',
      title_ko: '오키나와와 일본 커피 루트',
      subtitle_zh: '把咖啡館、在地旅行與職人故事整理成可以慢慢讀的路線。',
      subtitle_en: 'Coffee shops, local travel, and craft stories become routes worth reading slowly.',
      subtitle_ja: 'カフェ、ローカル旅、職人の物語をゆっくり読めるルートにします。',
      subtitle_ko: '카페, 로컬 여행, 장인 이야기를 천천히 읽는 루트로 정리합니다.',
      image_url: 'https://images.pexels.com/photos/302902/pexels-photo-302902.jpeg?auto=compress&cs=tinysrgb&w=1600',
      link_url: '/blog',
      link_label_zh: '看精選文章',
      link_label_en: 'View featured articles',
      link_label_ja: '注目記事を見る',
      link_label_ko: '추천 글 보기',
      display_order: 20,
    },
  ],
};

export function getFallbackThemeBanners(themeKey: ThemeKey) {
  return FALLBACK_BANNERS[themeKey];
}

export async function fetchThemeBanners(themeKey: ThemeKey) {
  const { data, error } = await supabase
    .from('theme_banners')
    .select(
      'id,theme_key,title_zh,title_en,title_ja,title_ko,subtitle_zh,subtitle_en,subtitle_ja,subtitle_ko,image_url,link_url,link_label_zh,link_label_en,link_label_ja,link_label_ko,display_order',
    )
    .eq('theme_key', themeKey)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return (data || []) as ThemeBanner[];
}

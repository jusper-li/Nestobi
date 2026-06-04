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
      title_zh: '三個主題\n各自清楚出發',
      title_en: 'Three Themes\nClearly Separated',
      title_ja: '3つのテーマ\nそれぞれ明確に',
      title_ko: '세 가지 주제\n명확하게 나누어',
      subtitle_zh: 'Nestopia 專注住宿；根本在旅行負責商品與門市；咖啡旅行家獨立整理文章內容，三個主題清楚分工，也能在會員中心彼此連動。',
      subtitle_en: 'Nestopia focuses on stays, Genbon Travel handles products and stores, and Coffee Traveler organizes articles as its own theme.',
      subtitle_ja: 'Nestopiaは宿泊、根本在旅行は商品と店舗、コーヒートラベラーは記事を独立テーマとして整理します。',
      subtitle_ko: 'Nestopia는 숙박, 근본재여행은 상품과 매장, 커피 트래블러는 글 콘텐츠를 독립 주제로 정리합니다.',
      image_url: SCENIC_GALLERY_IMAGES[0] || ROOM_FALLBACK_IMAGE,
      link_url: '/shop',
      link_label_zh: '逛根本在旅行',
      link_label_en: 'Shop Genbon Travel',
      link_label_ja: '根本在旅行を見る',
      link_label_ko: '근본재여행 보기',
      display_order: 10,
    },
    {
      id: 'fallback-home-2',
      theme_key: 'home',
      title_zh: '從住宿、選物到文章\n分開管理也彼此連動',
      title_en: 'Stays, Products, and Articles\nManaged Apart, Connected Together',
      title_ja: '宿泊・商品・記事を\n分けて管理しながら連携',
      title_ko: '숙박, 상품, 글을\n분리 관리하며 연결',
      subtitle_zh: '首頁 banner 可在後台管理圖片、文案、排序與連結，讓三個主題保持清楚入口。',
      subtitle_en: 'Manage homepage banner images, copy, order, and links from the admin panel.',
      subtitle_ja: '首頁バナーの画像、文言、順序、リンクを管理画面から調整できます。',
      subtitle_ko: '관리 화면에서 홈 배너 이미지, 문구, 순서, 링크를 조정할 수 있습니다.',
      image_url: SCENIC_GALLERY_IMAGES[1] || PRODUCT_FALLBACK_IMAGE,
      link_url: '/rooms',
      link_label_zh: '前往 Nestopia',
      link_label_en: 'Explore Nestopia',
      link_label_ja: 'Nestopiaへ',
      link_label_ko: 'Nestopia 보기',
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
      subtitle_zh: '以民宿、房型與城市感受為核心，讓 Nestopia 成為住宿的入口。',
      subtitle_en: 'Nestopia starts from stays, rooms, cities, and the feeling of arriving.',
      subtitle_ja: '民宿、客室、街の空気から、Nestopia は宿泊の入口になります。',
      subtitle_ko: '숙소, 객실, 도시의 감각에서 Nestopia 숙박이 시작됩니다.',
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
      title_zh: '根本在旅行選物商店',
      title_en: 'Genbon Travel Shop',
      title_ja: '根本在旅行の選物商店',
      title_ko: '근본재여행 셀렉트 상점',
      subtitle_zh: '把咖啡、茶點、旅行器物與門市體驗收在同一個主題。',
      subtitle_en: 'Coffee, tea, travel goods, and store experiences live under one theme.',
      subtitle_ja: 'コーヒー、お茶、旅の道具、店舗体験をひとつのテーマにまとめます。',
      subtitle_ko: '커피, 차, 여행 도구, 매장 경험을 하나의 주제로 묶습니다.',
      image_url: PRODUCT_FALLBACK_IMAGE,
      link_url: '/shop',
      link_label_zh: '選購商品',
      link_label_en: 'Shop products',
      link_label_ja: '商品を見る',
      link_label_ko: '상품 보기',
      display_order: 10,
    },
    {
      id: 'fallback-genbon-2',
      theme_key: 'genbon_travel',
      title_zh: '找到最近的門市',
      title_en: 'Find a Store Nearby',
      title_ja: '近くの店舗を探す',
      title_ko: '가까운 매장 찾기',
      subtitle_zh: '線上選物與線下門市一起連動，從商品走到真實場域。',
      subtitle_en: 'Connect online products with real store visits.',
      subtitle_ja: 'オンラインの商品と実店舗の体験をつなぎます。',
      subtitle_ko: '온라인 상품과 실제 매장 경험을 연결합니다.',
      image_url: STORE_FALLBACK_IMAGE,
      link_url: '/stores',
      link_label_zh: '查看門市',
      link_label_en: 'View stores',
      link_label_ja: '店舗を見る',
      link_label_ko: '매장 보기',
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

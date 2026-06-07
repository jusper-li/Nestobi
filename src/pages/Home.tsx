import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Calendar, Coffee, Heart, Home as HomeIcon, Hotel, MapPin, Search, ShoppingBag, User, Users } from 'lucide-react';
import FloatingButtons from '../components/FloatingButtons';
import Footer from '../components/Footer';
import Navigation from '../components/Navigation';
import SEOHead from '../components/SEOHead';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../lib/i18n';
import {
  getTranslationRuntimeState,
  translateBlogPostsFromCacheOnly,
  translateBlogPostsOnDemand,
  translateHotelsFromCacheOnly,
  translateHotelsOnDemand,
  translateProductsFromCacheOnly,
  translateProductsOnDemand,
  translateRoomsFromCacheOnly,
  translateRoomsOnDemand,
} from '../lib/contentTranslations';
import {
  BLOG_FALLBACK_IMAGE,
  PRODUCT_FALLBACK_IMAGE,
  ROOM_FALLBACK_IMAGE,
  useFallbackImage,
} from '../lib/images';
import { fetchPublicList, fetchSnapshotList } from '../lib/listData';
import { supabase } from '../lib/supabase';
import { fetchThemeBanners, getFallbackThemeBanners, type ThemeBanner } from '../lib/themeBanners';
import { formatCurrency } from '../lib/utils';
import type { Room } from '../types';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  description: string | null;
  origin?: string | null;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string;
  published_at: string;
}

function stripHtml(value: string | null | undefined) {
  if (!value) return '';
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function localizeCityName(text: string | null | undefined) {
  return (text || '').trim();
}

function pickBannerText(locale: string, banner: ThemeBanner, field: 'title' | 'subtitle' | 'link_label') {
  return pickByLang(
    locale,
    banner[`${field}_zh`],
    banner[`${field}_en`],
    banner[`${field}_ja`],
    banner[`${field}_ko`],
  );
}

function isInternalLink(url: string) {
  return url.startsWith('/');
}
export default function Home() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const shouldTranslate = pickByLang(normalizedLang, '0', '1', '1', '1') === '1';
  const dateLocale = pickByLang(normalizedLang, 'zh-TW', 'en-US', 'ja-JP', 'ko-KR');
  const t4 = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);

  const t = {
    pageTitle: t4('nestobi・根本在旅行・咖啡旅行家', 'nestobi, Genbon Travel Shop, and Coffee Traveler', 'nestobi・根本在旅行・コーヒートラベラー', 'nestobi, 근본재여행, 커피 트래블러'),
    pageDesc: t4('住宿交給 nestobi，商品與門市交給根本在旅行，文章由咖啡旅行家獨立展開。', 'nestobi is for stays, Genbon Travel Shop is for products and stores, and Coffee Traveler is the independent article theme.', '宿泊はnestobi、商品と店舗は根本在旅行、記事はコーヒートラベラーとして独立展開します。', '숙박은 nestobi, 상품과 매장은 근본재여행, 글은 커피 트래블러가 독립적으로 다룹니다.'),
    heroTitle1: t4('智慧旅遊', 'Smarter Travel', 'スマートな旅', '더 스마트한 여행'),
    heroTitle2: t4('新體驗', 'Starts Here', 'ここから', '여기서 시작'),
    heroDesc: t4('從住宿搜尋、旅遊選物到咖啡文章與 AI 工具，出發前需要的資訊集中在同一個清楚入口。', 'Find stays, travel goods, coffee stories, and AI tools from one clear starting point.', '宿泊検索、旅の買い物、コーヒー記事、AIツールまで、出発前に必要な情報を一つの入口にまとめます。', '숙소 검색, 여행 상품, 커피 콘텐츠, AI 도구까지 출발 전 필요한 정보를 한곳에서 찾을 수 있습니다.'),
    shopNow: t4('逛根本在旅行', 'Shop Genbon Travel', '根本在旅行を見る', '근본재여행 보기'),
    exploreStays: t4('前往 nestobi', 'Explore nestobi', 'nestobiへ', 'nestobi 보기'),
    stays: t4('nestobi', 'nestobi', 'nestobi', 'nestobi'),
    shop: t4('根本在旅行', 'Genbon Travel Shop', '根本在旅行', '근본재여행'),
    journal: t4('咖啡旅行家', 'Coffee Traveler', 'コーヒートラベラー', '커피 트래블러'),
    featuredStays: t4('nestobi 精選住宿', 'nestobi Featured Stays', 'nestobi 注目の宿泊', 'nestobi 추천 숙소'),
    featuredShop: t4('根本在旅行精選商品', 'Genbon Travel Picks', '根本在旅行のおすすめ商品', '근본재여행 추천 상품'),
    featuredJournal: t4('咖啡旅行家最新文章', 'Latest from Coffee Traveler', 'コーヒートラベラー最新記事', '커피 트래블러 최신 글'),
    viewAllStays: t4('查看 nestobi 住宿', 'View nestobi Stays', 'nestobiの宿泊を見る', 'nestobi 숙소 보기'),
    viewAllShop: t4('查看根本在旅行商品', 'View Genbon Travel Products', '根本在旅行の商品を見る', '근본재여행 상품 보기'),
    viewAllJournal: t4('查看咖啡旅行家文章', 'View Coffee Traveler Articles', 'コーヒートラベラーの記事を見る', '커피 트래블러 글 보기'),
    perNight: t4('/ 晚', '/ night', '/ 泊', '/ 박'),
    guests: t4('人', 'guests', '名', '명'),
    translationSyncing: t4('首頁翻譯背景同步中...', 'Homepage translation is syncing in background...', 'ホームページ翻訳をバックグラウンドで同期中...', '홈페이지 번역을 백그라운드에서 동기화 중...'),
    translationFallback: t4('目前先顯示原文內容，翻譯快取尚未就緒。', 'Showing source content first. Translation cache is not ready yet.', '翻訳キャッシュ未準備のため原文を先に表示しています。', '번역 캐시가 아직 준비되지 않아 원문을 먼저 표시합니다.'),
    closeTitle: t4('住宿、商品、文章分開管理，也能彼此連動。', 'Stays, products, and articles are managed separately while staying connected.', '宿泊・商品・記事を分けて管理しながら連携できます。', '숙박, 상품, 글을 분리 관리하면서도 서로 연결합니다.'),
    trustStaysTitle: t4('nestobi 住宿', 'nestobi Stays', 'nestobi 宿泊', 'nestobi 숙소'),
    trustStaysDesc: t4('專注民宿、房型、訂房與入住體驗。', 'Focused on stays, rooms, bookings, and check-in experiences.', '民宿・部屋・予約・宿泊体験に集中します。', '숙소, 객실, 예약, 체크인 경험에 집중합니다.'),
    trustShopTitle: t4('根本在旅行商品與門市', 'Genbon Travel Products and Stores', '根本在旅行の商品と店舗', '근본재여행 상품과 매장'),
    trustShopDesc: t4('商品、購物、訂單、售後與門市據點歸在同一主題。', 'Products, shopping, orders, after-sales, and stores sit under one theme.', '商品・買い物・注文・アフターサービス・店舗を同じテーマにまとめます。', '상품, 쇼핑, 주문, A/S, 매장을 하나의 주제로 묶습니다.'),
    trustAiTitle: t4('咖啡旅行家內容', 'Coffee Traveler Content', 'コーヒートラベラーの記事', '커피 트래블러 콘텐츠'),
    trustAiDesc: t4('文章作為獨立主題，也能關聯住宿、商品與門市。', 'Articles are independent, but can link to stays, products, and stores.', '記事は独立テーマとして、宿泊・商品・店舗にも関連できます。', '글은 독립 주제이면서 숙소, 상품, 매장과 연결될 수 있습니다.'),
  };

  const [featuredRooms, setFeaturedRooms] = useState<Room[]>([]);
  const [displayRooms, setDisplayRooms] = useState<Room[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<BlogPost[]>([]);
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [displayPosts, setDisplayPosts] = useState<BlogPost[]>([]);
  const [homeBanners, setHomeBanners] = useState<ThemeBanner[]>(() => getFallbackThemeBanners('home'));
  const [homeBannerIndex, setHomeBannerIndex] = useState(0);
  const [translationNotice, setTranslationNotice] = useState('');
  const [homeSearch, setHomeSearch] = useState('');
  const [homeSearchTarget, setHomeSearchTarget] = useState<'rooms' | 'journal'>('rooms');
  const [activeRecommendationTab, setActiveRecommendationTab] = useState<'stays' | 'shop' | 'journal'>('stays');

  const activeHomeBanner = homeBanners[homeBannerIndex] || getFallbackThemeBanners('home')[0];
  const homeBannerText = useMemo(
    () => ({
      title: pickBannerText(normalizedLang, activeHomeBanner, 'title'),
      subtitle: pickBannerText(normalizedLang, activeHomeBanner, 'subtitle'),
      linkLabel: pickBannerText(normalizedLang, activeHomeBanner, 'link_label'),
    }),
    [activeHomeBanner, normalizedLang],
  );
  const homeBannerLink = activeHomeBanner.link_url.trim();
  const searchLabels = {
    title: t4('今天想找什麼？', 'What are you looking for today?', '今日は何を探しますか？', '오늘 무엇을 찾으시나요?'),
    subtitle: t4('先搜尋商品、住宿或咖啡文章，再慢慢篩選。', 'Search products, stays, or coffee stories first, then refine.', '商品、宿泊、コーヒー記事をまず検索してから絞り込めます。', '상품, 숙소, 커피 글을 먼저 검색한 뒤 좁혀보세요.'),
    placeholder: t4('輸入咖啡、茶包、宜蘭住宿、沖繩文章...', 'Search coffee, tea bags, Yilan stays, Okinawa articles...', 'コーヒー、ティーバッグ、宜蘭の宿、沖縄記事...', '커피, 티백, 이란 숙소, 오키나와 글...'),
    shop: t4('商品', 'Products', '商品', '상품'),
    rooms: t4('住宿', 'Stays', '宿泊', '숙소'),
    submit: t4('搜尋', 'Search', '検索', '검색'),
    vendorTitle: t4('商家入口', 'Vendor Entrance', '事業者入口', '판매자 입구'),
    vendorDesc: t4('管理房源、商品、訂單與門市資料。', 'Manage stays, products, orders, and store data.', '宿泊、商品、注文、店舗情報を管理します。', '숙소, 상품, 주문, 매장 정보를 관리합니다.'),
    vendorCta: t4('進入商家後台', 'Open Vendor Portal', '事業者管理へ', '판매자 관리 열기'),
    home: t4('首頁', 'Home', 'ホーム', '홈'),
    favorites: t4('收藏', 'Favorites', 'お気に入り', '찜'),
    orders: t4('訂單', 'Orders', '注文', '주문'),
    mine: t4('我的', 'My', 'マイ', '내 정보'),
  };

  const homeSearchLabels = {
    title: t4('今天想去哪裡？', 'Where are you heading today?', '今日はどこへ行きますか？', '오늘 어디로 떠나나요?'),
    subtitle: t4('先找住宿或行程靈感，再進一步篩選。', 'Search stays or trip ideas first, then refine.', 'まず宿泊や旅のアイデアを探してから絞り込みます。', '먼저 숙소나 여행 아이디어를 찾고, 그다음 좁혀보세요.'),
    placeholder: t4('搜尋宜蘭住宿、沖繩行程、咖啡旅遊文章...', 'Search Yilan stays, Okinawa trip ideas, coffee travel articles...', '宜蘭の宿、沖縄の旅程、コーヒー旅記事を検索...', '이란 숙소, 오키나와 일정, 커피 여행 글 검색...'),
    rooms: t4('住宿', 'Stays', '宿泊', '숙소'),
    trips: t4('行程', 'Trips', '旅程', '여행'),
    submit: t4('搜尋', 'Search', '検索', '검색'),
  };

  const flowLabels = {
    quickTitle: t4('常用入口', 'Quick Actions', 'よく使う入口', '자주 쓰는 메뉴'),
    quickSubtitle: t4('把訂房、購物與會員功能集中在一起。', 'Bookings, shopping, and member tools stay together.', '予約・買い物・会員機能をまとめます。', '예약, 쇼핑, 회원 기능을 한곳에 모았습니다.'),
    booking: t4('訂房', 'Book', '予約', '예약'),
    recommendations: t4('為你推薦', 'Recommended', 'おすすめ', '추천'),
    recommendationsDesc: t4('切換分類查看，不用一路滑到底。', 'Switch categories instead of scrolling through everything.', '分類を切り替えて、長くスクロールせずに見られます。', '끝까지 스크롤하지 않고 분류를 전환해 볼 수 있습니다.'),
  };

  const recommendationTabs = [
    { id: 'stays' as const, label: t.stays, title: t.featuredStays, to: '/rooms', action: t.viewAllStays, count: displayRooms.length },
    { id: 'shop' as const, label: t.shop, title: t.featuredShop, to: '/shop', action: t.viewAllShop, count: displayProducts.length },
    { id: 'journal' as const, label: t.journal, title: t.featuredJournal, to: '/blog', action: t.viewAllJournal, count: displayPosts.length },
  ];
  const activeRecommendation = recommendationTabs.find(tab => tab.id === activeRecommendationTab) || recommendationTabs[0];
  const hasRecommendations = recommendationTabs.some(tab => tab.count > 0);

  const submitHomeSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = homeSearch.trim();
    const base = homeSearchTarget === 'rooms' ? '/rooms' : '/blog';
    navigate(query ? `${base}?search=${encodeURIComponent(query)}` : base);
  };

  useEffect(() => {
    let cancelled = false;
    setHomeBanners(getFallbackThemeBanners('home'));
    setHomeBannerIndex(0);
    fetchThemeBanners('home')
      .then(rows => {
        if (!cancelled && rows.length) {
          setHomeBanners(rows);
          setHomeBannerIndex(0);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (homeBanners.length <= 1) return;
    const timer = window.setInterval(() => {
      setHomeBannerIndex(current => (current + 1) % homeBanners.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [homeBanners.length]);

  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      const [rooms, products, posts] = await Promise.all([
        fetchPublicList<Room>('rooms', async () => {
          const { data } = await supabase
            .from('tbl_rooms')
            .select('id,name,description,room_type,capacity,min_capacity,price_per_night,weekend_price,image_url,images,location,is_available,amenities,hotels(id,name,city,star_rating)')
            .eq('is_available', true)
            .limit(3);
          return (data as unknown as Room[]) || [];
        }).catch(() => fetchSnapshotList<Room>('/snapshots/rooms.json')),
        fetchPublicList<Product>('products', async () => {
          const { data } = await supabase
            .from('products')
            .select('id,name,price,image_url,description,origin')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(3);
          return (data as Product[]) || [];
        }).catch(() => fetchSnapshotList<Product>('/snapshots/products.json')),
        fetchPublicList<BlogPost>('blog-posts', async () => {
          const { data } = await supabase
            .from('blog_posts')
            .select('id,title,slug,excerpt,cover_image_url,category,published_at')
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(3);
          return (data as BlogPost[]) || [];
        }).catch(() => fetchSnapshotList<BlogPost>('/snapshots/blog-posts.json')),
      ]);
      if (cancelled) return;
      setFeaturedRooms(rooms.slice(0, 3));
      setDisplayRooms(rooms.slice(0, 3));
      setFeaturedProducts(products.slice(0, 3));
      setDisplayProducts(products.slice(0, 3));
      setFeaturedPosts(posts.slice(0, 3));
      setDisplayPosts(posts.slice(0, 3));
    };
    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!featuredRooms.length || !shouldTranslate) {
      setDisplayRooms(featuredRooms);
      setTranslationNotice('');
      return () => {
        cancelled = true;
      };
    }
    const runtime = getTranslationRuntimeState();
    setTranslationNotice(runtime.tableUnavailable || runtime.isLocalProxyMode ? t.translationFallback : t.translationSyncing);

    Promise.all([
      translateRoomsFromCacheOnly(featuredRooms, normalizedLang),
      translateHotelsFromCacheOnly(
        featuredRooms
          .map(room => room.hotels)
          .filter((hotel): hotel is NonNullable<Room['hotels']> => Boolean(hotel))
          .map(hotel => ({ id: hotel.id, name: hotel.name, city: hotel.city })),
        normalizedLang,
      ),
    ])
      .then(([translatedRooms, translatedHotels]) => {
        if (cancelled) return;
        const hotelMap = new Map(translatedHotels.map(hotel => [hotel.id, hotel]));
        const mergedRooms = translatedRooms.map(room => {
          const hotel = room.hotels;
          if (!hotel || !hotel.id) return room;
          const translatedHotel = hotelMap.get(hotel.id);
          if (!translatedHotel) return room;
          return { ...room, hotels: { ...hotel, name: translatedHotel.name || hotel.name, city: translatedHotel.city || hotel.city } };
        });
        setDisplayRooms(mergedRooms);
      })
      .catch(() => {
        if (!cancelled) {
          setDisplayRooms(featuredRooms);
          setTranslationNotice(t.translationFallback);
        }
      });

    Promise.all([
      translateRoomsOnDemand(featuredRooms.slice(0, 3), normalizedLang),
      translateHotelsOnDemand(
        featuredRooms
          .slice(0, 3)
          .map(room => room.hotels)
          .filter((hotel): hotel is NonNullable<Room['hotels']> => Boolean(hotel))
          .map(hotel => ({ id: hotel.id, name: hotel.name, city: hotel.city })),
        normalizedLang,
      ),
    ])
      .then(([translatedRooms, translatedHotels]) => {
        if (cancelled) return;
        const hotelMap = new Map(translatedHotels.map(hotel => [hotel.id, hotel]));
        const merged = translatedRooms.map(room => {
          const hotel = room.hotels;
          if (!hotel || !hotel.id) return room;
          const translatedHotel = hotelMap.get(hotel.id);
          if (!translatedHotel) return room;
          return { ...room, hotels: { ...hotel, name: translatedHotel.name || hotel.name, city: translatedHotel.city || hotel.city } };
        });
        const byId = new Map(merged.map(item => [item.id, item]));
        setDisplayRooms(current => current.map(item => byId.get(item.id) || item));
        setTranslationNotice('');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [featuredRooms, normalizedLang, shouldTranslate, t.translationFallback, t.translationSyncing]);

  useEffect(() => {
    let cancelled = false;
    if (!featuredProducts.length) return () => { cancelled = true; };
    setDisplayProducts(featuredProducts);
    translateProductsFromCacheOnly(featuredProducts, normalizedLang).then(translated => { if (!cancelled) setDisplayProducts(translated); }).catch(() => {});
    translateProductsOnDemand(featuredProducts.slice(0, 3), normalizedLang).then(translated => {
      if (cancelled) return;
      const byId = new Map(translated.map(item => [item.id, item]));
      setDisplayProducts(current => current.map(item => byId.get(item.id) || item));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [featuredProducts, normalizedLang]);

  useEffect(() => {
    let cancelled = false;
    if (!featuredPosts.length) return () => { cancelled = true; };
    setDisplayPosts(featuredPosts);
    translateBlogPostsFromCacheOnly(featuredPosts, normalizedLang).then(translated => { if (!cancelled) setDisplayPosts(translated); }).catch(() => {});
    translateBlogPostsOnDemand(featuredPosts.slice(0, 3), normalizedLang).then(translated => {
      if (cancelled) return;
      const byId = new Map(translated.map(item => [item.id, item]));
      setDisplayPosts(current => current.map(item => byId.get(item.id) || item));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [featuredPosts, normalizedLang]);

  return (
    <div className="min-h-screen bg-white">
      <SEOHead title={t.pageTitle} description={t.pageDesc} keywords={`Nestobi, ${t.stays}, ${t.shop}`} pageType="home" ogType="website" />
      <Navigation />

      <section className="relative isolate overflow-hidden bg-[#FFF8EA] text-[#2C1F10]">
        <div className="absolute inset-0">
          {homeBanners.map((banner, index) => (
            <img
              key={banner.id}
              src={banner.image_url}
              alt={pickBannerText(normalizedLang, banner, 'title')}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                index === homeBannerIndex ? 'opacity-80' : 'opacity-0'
              }`}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#FFF8EA]/96 via-[#FFF8EA]/72 to-[#FFF8EA]/20" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent" />

        <div className="relative mx-auto grid min-h-[640px] max-w-7xl items-center gap-8 px-4 pb-20 pt-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-24">
          <div className="order-2 max-w-2xl lg:order-1">
            <h1 className="whitespace-pre-line text-4xl font-bold leading-tight text-[#2C1F10] md:text-6xl">
              {homeBannerText.title}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#2C1F10]/72 md:text-lg">{homeBannerText.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {homeBannerLink && (
                isInternalLink(homeBannerLink) ? (
                  <Link to={homeBannerLink} className="btn-primary">
                    <ShoppingBag size={18} />
                    {homeBannerText.linkLabel}
                  </Link>
                ) : (
                  <a href={homeBannerLink} target="_blank" rel="noreferrer" className="btn-primary">
                    <ShoppingBag size={18} />
                    {homeBannerText.linkLabel}
                  </a>
                )
              )}
              <Link to="/rooms" className="btn-ghost"><Hotel size={18} />{t.exploreStays}</Link>
            </div>

            {homeBanners.length > 1 && (
              <div className="mt-7 flex gap-2">
                {homeBanners.map((banner, index) => (
                  <button
                    key={banner.id}
                    type="button"
                    onClick={() => setHomeBannerIndex(index)}
                    className={`h-2.5 rounded-full transition-all ${index === homeBannerIndex ? 'w-8 bg-[#2C1F10]' : 'w-2.5 bg-[#2C1F10]/24 hover:bg-[#2C1F10]/45'}`}
                    aria-label={`Home banner ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="order-1 space-y-4 lg:order-2">
          <form onSubmit={submitHomeSearch} className="rounded-3xl border border-white/80 bg-white/90 p-4 shadow-xl backdrop-blur-md sm:p-6 lg:p-8">
            <p className="text-sm font-bold text-[#8B6840]">{homeSearchLabels.title}</p>
            <h2 className="mt-2 text-2xl font-bold text-[#2C1F10] lg:text-4xl">{homeSearchLabels.submit}</h2>
            <p className="mt-3 text-sm leading-6 text-[#2C1F10]/65">{homeSearchLabels.subtitle}</p>
            <div className="mt-5 flex rounded-2xl bg-[#F7F1E8] p-1">
              {(['rooms', 'journal'] as const).map(target => (
                <button
                  key={target}
                  type="button"
                  onClick={() => setHomeSearchTarget(target)}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold transition ${homeSearchTarget === target ? 'bg-white text-[#2C1F10] shadow-sm' : 'text-[#2C1F10]/55'}`}
                >
                  {target === 'rooms' ? homeSearchLabels.rooms : homeSearchLabels.trips}
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#C09A6A]/25 bg-white px-4 py-2">
              <Search className="h-5 w-5 flex-shrink-0 text-[#C09A6A]" />
              <input
                value={homeSearch}
                onChange={event => setHomeSearch(event.target.value)}
                placeholder={homeSearchLabels.placeholder}
                className="min-w-0 flex-1 bg-transparent py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
              />
              <button type="submit" className="rounded-xl bg-[#2C1F10] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#5A3E1B]">
                {homeSearchLabels.submit}
              </button>
            </div>
          </form>

          </div>
        </div>
      </section>

      {translationNotice && (
        <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">{translationNotice}</div>
        </div>
      )}

      <section className="hidden bg-white py-6 md:block md:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center gap-4 md:gap-6">
            <QuickAction to="/rooms" icon={Hotel} label={flowLabels.booking} />
            <QuickAction to="/shop" icon={ShoppingBag} label={searchLabels.shop} />
            <QuickAction to="/member" icon={User} label={searchLabels.mine} />
            <QuickAction to="/member/orders" icon={Calendar} label={searchLabels.orders} />
          </div>
        </div>
      </section>

      {hasRecommendations && (
        <section className="bg-white py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="section-label">{flowLabels.recommendations}</p>
                <h2 className="section-title text-3xl">{activeRecommendation.title}</h2>
                <span className="gold-bar" />
              </div>
              <Link to={activeRecommendation.to} className="inline-flex items-center gap-1 self-start border-b border-[#2C1F10]/25 pb-1 text-sm font-bold text-[#2C1F10] transition hover:border-[#2C1F10] md:self-auto">
                {activeRecommendation.action}
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="mb-6 flex border-b border-gray-100">
              {recommendationTabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveRecommendationTab(tab.id)}
                  className={`flex-1 border-b-2 px-3 py-3 text-sm font-bold transition ${activeRecommendationTab === tab.id ? 'border-[#2C1F10] text-[#2C1F10]' : 'border-transparent text-[#2C1F10]/55 hover:text-[#2C1F10]'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeRecommendationTab === 'stays' && (
              <div className="grid gap-6 md:grid-cols-3">
                {displayRooms.map(room => {
                  const cover = room.images?.[0] || room.image_url || ROOM_FALLBACK_IMAGE;
                  return (
                    <Link key={room.id} to={`/rooms/${room.id}`} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-elegant transition hover:-translate-y-1 hover:shadow-card-hover">
                      <div className="h-52 overflow-hidden">
                        <img src={cover} alt={room.name} onError={event => useFallbackImage(event, ROOM_FALLBACK_IMAGE)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      </div>
                      <div className="p-5">
                        {room.hotels?.name && <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-[#8B6840]"><Building2 size={13} />{room.hotels.name}</p>}
                        <h3 className="text-base font-bold text-gray-900">{room.name}</h3>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><MapPin size={13} />{localizeCityName(room.location || room.hotels?.city || '-')}</span>
                          <span className="flex items-center gap-1"><Users size={13} />{room.capacity} {t.guests}</span>
                        </div>
                        <div className="mt-5 flex items-end justify-between border-t border-gray-100 pt-4">
                          <span className="text-lg font-bold text-[#2C1F10]">{formatCurrency(room.price_per_night)} <span className="text-xs font-medium text-gray-400">{t.perNight}</span></span>
                          <ArrowRight size={17} className="text-[#C09A6A]" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {activeRecommendationTab === 'shop' && (
              <div className="grid gap-6 md:grid-cols-3">
                {displayProducts.map(product => (
                  <Link key={product.id} to={`/shop/${product.id}`} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-elegant transition hover:-translate-y-1 hover:shadow-card-hover">
                    <div className="relative h-56 overflow-hidden bg-gray-100">
                      <img src={product.image_url || PRODUCT_FALLBACK_IMAGE} alt={product.name} onError={event => useFallbackImage(event, PRODUCT_FALLBACK_IMAGE)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    </div>
                    <div className="p-5">
                      <h3 className="line-clamp-2 text-base font-bold text-gray-900">{product.name}</h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">{stripHtml(product.description)}</p>
                      <div className="mt-5 flex items-end justify-between border-t border-gray-100 pt-4">
                        <span className="text-lg font-bold text-[#C09A6A]">{formatCurrency(Number(product.price))}</span>
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#2C1F10]"><ArrowRight size={14} /></span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {activeRecommendationTab === 'journal' && (
              <div className="grid gap-6 md:grid-cols-3">
                {displayPosts.map(post => (
                  <Link key={post.id} to={`/blog/${post.slug}`} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-elegant transition hover:-translate-y-1 hover:shadow-card-hover">
                    <div className="relative h-48 overflow-hidden bg-[#F0E4C8]">
                      {post.cover_image_url ? (
                        <img src={post.cover_image_url} alt={post.title} onError={event => useFallbackImage(event, BLOG_FALLBACK_IMAGE)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[#C09A6A]"><Coffee size={42} /></div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="line-clamp-2 text-base font-bold text-gray-900 group-hover:text-[#8B6840]">{post.title}</h3>
                      {post.excerpt && <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">{post.excerpt}</p>}
                      <p className="mt-5 flex items-center gap-1 border-t border-gray-100 pt-4 text-xs font-medium text-gray-400">
                        <Calendar size={13} />
                        {new Date(post.published_at).toLocaleDateString(dateLocale)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <Footer />
      <FloatingButtons />
      <MobileHomeNav labels={searchLabels} />
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: typeof Hotel; label: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className="flex h-12 w-12 items-center justify-center rounded-full text-[#2C1F10] transition hover:bg-[#F7F1E8] hover:text-[#8B6840]"
    >
      <Icon className="h-6 w-6" />
    </Link>
  );
}

function MobileHomeNav({ labels }: { labels: { home: string; submit: string; favorites: string; orders: string; mine: string } }) {
  const items = [
    { to: '/', icon: HomeIcon, label: labels.home },
    { to: '/shop', icon: Search, label: labels.submit },
    { to: '/member?tool=favorites', icon: Heart, label: labels.favorites },
    { to: '/member/orders', icon: ShoppingBag, label: labels.orders },
    { to: '/member', icon: User, label: labels.mine },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#2C1F10]/10 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-8px_24px_rgba(44,31,16,0.08)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {items.map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold text-gray-600 transition hover:bg-[#F7F1E8] hover:text-[#2C1F10]">
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

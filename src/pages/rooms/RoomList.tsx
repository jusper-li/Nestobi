import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, MapPin, Search, Users } from 'lucide-react';
import Footer from '../../components/Footer';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import ThemeHeroCarousel from '../../components/ThemeHeroCarousel';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslationRuntimeState, translateRoomsFromCacheOnly, translateRoomsOnDemand } from '../../lib/contentTranslations';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { ROOM_FALLBACK_IMAGE, useFallbackImage } from '../../lib/images';
import { fetchPublicList, fetchSnapshotList, readCachedList, withRetry, writeCachedList } from '../../lib/listData';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';

interface HotelSummary {
  id: string;
  name: string;
  city?: string | null;
}

interface Room {
  id: string;
  name: string;
  description: string | null;
  room_type: string;
  capacity: number;
  min_capacity?: number | null;
  price_per_night: number;
  weekend_price?: number | null;
  image_url: string | null;
  images?: string[] | null;
  location: string | null;
  is_available: boolean;
  amenities: string[] | null;
  hotels?: HotelSummary | HotelSummary[] | null;
}

type SortMode = 'recommended' | 'price-asc' | 'price-desc' | 'capacity';

const ROOMS_CACHE_KEY = 'nestobi:list:rooms:v2';
const ROOMS_SNAPSHOT_PATH = '/snapshots/rooms.json';
const ROOM_TYPES = ['all', 'single', 'double', 'suite', 'deluxe', 'family', 'villa'];

function getHotel(room: Room): HotelSummary | null {
  if (Array.isArray(room.hotels)) return room.hotels[0] || null;
  return room.hotels || null;
}

function roomSearchText(room: Room) {
  const hotel = getHotel(room);
  return [
    room.name,
    room.description || '',
    room.location || '',
    room.room_type,
    hotel?.name || '',
    hotel?.city || '',
    ...(room.amenities || []),
  ]
    .join(' ')
    .toLowerCase();
}

function sortRooms(rooms: Room[], sortMode: SortMode) {
  const list = [...rooms];
  if (sortMode === 'price-asc') return list.sort((a, b) => a.price_per_night - b.price_per_night);
  if (sortMode === 'price-desc') return list.sort((a, b) => b.price_per_night - a.price_per_night);
  if (sortMode === 'capacity') return list.sort((a, b) => b.capacity - a.capacity);
  return list.sort((a, b) => Number(b.weekend_price || 0) - Number(a.weekend_price || 0));
}

function localizeCityName(text: string | null | undefined) {
  return (text || '').trim();
}

export default function RoomList() {
  const [searchParams] = useSearchParams();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const shouldTranslate = pickByLang(locale, '0', '1', '1', '1') === '1';
  const t4 = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [displayRooms, setDisplayRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomType, setRoomType] = useState('all');
  const [maxPrice, setMaxPrice] = useState(30000);
  const [sortMode, setSortMode] = useState<SortMode>('recommended');
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [translationNotice, setTranslationNotice] = useState('');

  const labels = {
    seoTitle: t4('Nestopia 住宿', 'Nestopia Stays', 'Nestopia 宿泊', 'Nestopia 숙소'),
    seoDesc: t4(
      'Nestopia 專注民宿、房型與訂房體驗，依城市、預算與人數找到適合的住宿。',
      'Nestopia focuses on stays, rooms, and booking experiences, helping you find the right place by city, budget, and group size.',
      'Nestopia は民宿、客室、予約体験に特化し、都市、予算、人数から最適な宿泊先を探せます。',
      'Nestopia는 숙소, 객실, 예약 경험에 집중하며 도시, 예산, 인원에 맞는 숙소를 찾도록 돕습니다.',
    ),
    heroTitle: t4('Nestopia', 'Nestopia', 'Nestopia', 'Nestopia'),
    heroDesc: t4(
      '把住宿從商品與文章中分離出來，專心探索民宿、房型、入住人數與旅程停留。',
      'A dedicated home for stays, separated from products and articles, focused on rooms, hosts, guests, and overnight journeys.',
      '商品や記事から宿泊を切り分け、民宿、客室、人数、旅の滞在に集中して探せます。',
      '상품과 글에서 숙박을 분리해 숙소, 객실, 인원, 여행의 머무름에 집중합니다.',
    ),
    searchPlaceholder: t4(
      '試試：雙人房、近車站、有浴缸、預算一萬內',
      'Try: double room, near station, bathtub, under NT$10,000',
      '例：ダブルルーム、駅近、浴槽あり、NT$10,000以内',
      '예: 더블룸, 역 근처, 욕조, NT$10,000 이하',
    ),
    featuredCount: t4('間 Nestopia 住宿', 'Nestopia stays', '件の Nestopia 宿泊', '개의 Nestopia 숙소'),
    maxPrice: t4('最高', 'Max', '上限', '최대'),
    recommended: t4('推薦排序', 'Recommended', 'おすすめ順', '추천순'),
    priceAsc: t4('價格由低到高', 'Price: Low to High', '価格の安い順', '가격 낮은순'),
    priceDesc: t4('價格由高到低', 'Price: High to Low', '価格の高い順', '가격 높은순'),
    capacity: t4('入住人數', 'Capacity', '宿泊人数', '숙박 인원'),
    locationUnavailable: t4('地點未提供', 'Location unavailable', '場所未設定', '위치 미제공'),
    guests: t4('人', 'guests', '名', '명'),
    noDescription: t4('尚無房型介紹。', 'No room description yet.', '客室紹介はまだありません。', '객실 설명이 아직 없습니다.'),
    weekend: t4('週末', 'Weekend', '週末', '주말'),
    details: t4('查看住宿', 'View Stay', '宿泊を見る', '숙소 보기'),
    empty: t4('找不到符合條件的住宿。', 'No matching stays found.', '条件に合う宿泊が見つかりません。', '조건에 맞는 숙소를 찾을 수 없습니다.'),
  };
  const typeLabels: Record<string, string> = {
    all: t4('全部房型', 'All Rooms', 'すべての客室', '전체 객실'),
    single: t4('單人房', 'Single', 'シングル', '싱글'),
    double: t4('雙人房', 'Double', 'ダブル', '더블'),
    suite: t4('套房', 'Suite', 'スイート', '스위트'),
    deluxe: t4('豪華房', 'Deluxe', 'デラックス', '디럭스'),
    family: t4('家庭房', 'Family', 'ファミリー', '패밀리'),
    villa: 'Villa',
  };

  useEffect(() => {
    let cancelled = false;
    const cached = readCachedList<Room>(ROOMS_CACHE_KEY);
    if (cached?.length) {
      setRooms(cached);
      setLoading(false);
    }

    fetchSnapshotList<Room>(ROOMS_SNAPSHOT_PATH)
      .then(snapshot => {
        if (cancelled || cached?.length || snapshot.length === 0) return;
        setRooms(snapshot);
        setLoading(false);
      })
      .catch(() => {});

    withRetry(() =>
      fetchPublicList<Room>('rooms', async () => {
        const { data, error } = await supabase
          .from('tbl_rooms')
          .select(
            'id,name,description,room_type,capacity,min_capacity,price_per_night,weekend_price,image_url,images,location,is_available,amenities,hotels(id,name,city)',
          )
          .eq('is_available', true)
          .limit(160);
        if (error) throw error;
        return (data || []) as unknown as Room[];
      }),
    )
      .then(fresh => {
        if (cancelled) return;
        setRooms(fresh);
        writeCachedList(ROOMS_CACHE_KEY, fresh);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!rooms.length || !shouldTranslate) {
      setDisplayRooms(rooms);
      setTranslationNotice('');
      return () => {
        cancelled = true;
      };
    }

    setDisplayRooms(rooms);
    const runtime = getTranslationRuntimeState();
    setTranslationNotice(
      runtime.tableUnavailable || runtime.isLocalProxyMode
        ? t4('目前先顯示原文住宿資料，翻譯快取尚未就緒。', 'Showing source stay data first. Translation cache is not ready yet.', '翻訳キャッシュ未準備のため、原文の宿泊データを先に表示します。', '번역 캐시가 아직 준비되지 않아 원문 숙소 데이터를 먼저 표시합니다.')
        : t4('正在套用住宿快取翻譯...', 'Applying cached stay translations...', '宿泊のキャッシュ翻訳を適用しています...', '숙소 캐시 번역을 적용하는 중...'),
    );

    translateRoomsFromCacheOnly(rooms, locale)
      .then(r => {
        if (!cancelled) setDisplayRooms(r);
      })
      .catch(() => {});

    translateRoomsOnDemand(rooms, locale)
      .then(r => {
        if (!cancelled) {
          setDisplayRooms(r);
          setTranslationNotice('');
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [rooms, locale, shouldTranslate]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = displayRooms.filter(room => {
      const typeOk = roomType === 'all' || room.room_type === roomType;
      const priceOk = room.price_per_night <= maxPrice;
      const queryOk = !query || roomSearchText(room).includes(query);
      return typeOk && priceOk && queryOk;
    });
    return sortRooms(list, sortMode);
  }, [displayRooms, roomType, maxPrice, search, sortMode]);

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title={labels.seoTitle}
        description={labels.seoDesc}
      />
      <Navigation />

      <ThemeHeroCarousel
        themeKey="nestopia"
        title={labels.heroTitle}
        description={labels.heroDesc}
      >
        <div className="rounded-3xl border border-white/12 bg-white/90 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-sm">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={labels.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
            />
            <button type="button" className="rounded-xl bg-[#C09A6A] px-4 py-3 text-white transition hover:bg-[#8B6840]">
              <Search className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-sm font-semibold text-[#2C1F10]/70">{filtered.length} {labels.featuredCount}</p>
        </div>
      </ThemeHeroCarousel>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {translationNotice && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{translationNotice}</div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {ROOM_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setRoomType(type)}
              className={`rounded-full px-4 py-2 text-sm ${roomType === type ? 'bg-[#C09A6A] text-white' : 'border bg-white'}`}
            >
              {typeLabels[type]}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm">
              {labels.maxPrice} NT$ {maxPrice.toLocaleString()}
            </span>
            <input type="range" min={1000} max={30000} step={500} value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} />
            <select value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)} className="rounded-xl border px-3 py-2">
              <option value="recommended">{labels.recommended}</option>
              <option value="price-asc">{labels.priceAsc}</option>
              <option value="price-desc">{labels.priceDesc}</option>
              <option value="capacity">{labels.capacity}</option>
            </select>
          </div>
        </div>

        <p className="mb-4 text-sm font-medium text-gray-600">{filtered.length} {labels.featuredCount}</p>

        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-gray-500">{labels.empty}</div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(room => {
              const hotel = getHotel(room);
              const city = localizeCityName(room.location || hotel?.city || '');
              const capacityText = room.min_capacity && room.min_capacity !== room.capacity ? `${room.min_capacity}-${room.capacity}` : `${room.capacity}`;

              return (
                <article key={room.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                  <img
                    src={room.image_url || ROOM_FALLBACK_IMAGE}
                    alt={room.name}
                    onError={event => useFallbackImage(event, ROOM_FALLBACK_IMAGE)}
                    className="h-48 w-full object-cover"
                  />
                  <div className="p-4">
                    {hotel?.name && (
                      <p className="mb-2 inline-flex items-center gap-1 text-sm text-[#8B6840]">
                        <Building2 className="h-4 w-4" />
                        {hotel.name}
                      </p>
                    )}
                    <h3 className="text-2xl font-bold">{room.name}</h3>
                    <p className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {city || labels.locationUnavailable}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {capacityText} {labels.guests}
                      </span>
                    </p>
                    <p className="mt-3 line-clamp-2 text-sm text-gray-600">{room.description || labels.noDescription}</p>
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {room.amenities.slice(0, 3).map((amenity, i) => (
                          <span key={`${room.id}-am-${i}`} className="rounded-full bg-[#F0E4C8] px-2 py-1 text-xs">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <div className="text-4xl font-bold text-[#2C1F10]">{formatCurrency(room.price_per_night)}</div>
                        {room.weekend_price ? (
                          <div className="text-sm text-gray-500">
                            {labels.weekend} {formatCurrency(room.weekend_price)}
                          </div>
                        ) : null}
                      </div>
                      <Link to={`/rooms/${room.id}`} className="rounded-xl bg-[#C09A6A] px-4 py-2 text-sm font-semibold text-white">{labels.details}</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

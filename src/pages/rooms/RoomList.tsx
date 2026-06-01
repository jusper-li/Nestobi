import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Search, Users } from 'lucide-react';
import Footer from '../../components/Footer';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
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

const CITY_ZH_EN: Record<string, string> = {
  宜蘭: 'Yilan',
  台北: 'Taipei',
  新北: 'New Taipei',
  桃園: 'Taoyuan',
  台中: 'Taichung',
  台南: 'Tainan',
  高雄: 'Kaohsiung',
  花蓮: 'Hualien',
  台東: 'Taitung',
  屏東: 'Pingtung',
  基隆: 'Keelung',
  新竹: 'Hsinchu',
  苗栗: 'Miaoli',
  彰化: 'Changhua',
  南投: 'Nantou',
  雲林: 'Yunlin',
  嘉義: 'Chiayi',
  澎湖: 'Penghu',
  金門: 'Kinmen',
  連江: 'Lienchiang',
};

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

function localizeCityName(text: string | null | undefined, shouldTranslate: boolean) {
  const value = (text || '').trim();
  if (!value || !shouldTranslate) return value;
  let output = value;
  for (const [zh, en] of Object.entries(CITY_ZH_EN)) output = output.replaceAll(zh, en);
  return output;
}

export default function RoomList() {
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
  const [search, setSearch] = useState('');
  const [translationNotice, setTranslationNotice] = useState('');

  const typeLabels: Record<string, string> = {
    all: t4('全部房型', 'All Rooms', 'すべての部屋', '전체 객실'),
    single: t4('單人房', 'Single', 'シングル', '싱글룸'),
    double: t4('雙人房', 'Double', 'ダブル', '더블룸'),
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
        ? t4(
            '目前先顯示原文房型資料，翻譯快取尚未就緒。',
            'Showing source room data first. Translation cache is not ready yet.',
            '原文の客室データを先に表示しています。翻訳キャッシュは未準備です。',
            '원문 객실 데이터를 먼저 표시합니다. 번역 캐시가 아직 준비되지 않았습니다.',
          )
        : t4('套用已快取翻譯中…', 'Applying cached translations...', 'キャッシュ済み翻訳を適用中…', '캐시된 번역을 적용하는 중…'),
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
        title={t4('探索住宿', 'Curated Stays', '宿泊を探す', '숙소 찾기')}
        description={t4(
          '從城市、預算與人數快速找到適合的房型。',
          'Find the right room by city, budget, and group size.',
          '都市・予算・人数から最適な客室を見つけましょう。',
          '도시, 예산, 인원 기준으로 알맞은 객실을 찾으세요.',
        )}
      />
      <Navigation />

      <section className="bg-[#FEF9EC] px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-bold">{t4('探索住宿', 'Curated Stays', '宿泊を探す', '숙소 찾기')}</h1>
          <p className="mt-2 text-gray-600">
            {t4(
              '從城市、預算與人數快速找到適合的房型。',
              'Find the right room by city, budget, and group size.',
              '都市・予算・人数から最適な客室を見つけましょう。',
              '도시, 예산, 인원 기준으로 알맞은 객실을 찾으세요.',
            )}
          </p>
          <div className="mt-4 flex gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t4(
                '試試：雙人房、近車站、有浴缸、預算一萬內',
                'Try: double room, near station, with bathtub, under NT$10,000',
                '例：ダブル、駅近、浴槽あり、予算1万NT$以下',
                '예: 더블룸, 역 근처, 욕조 포함, NT$10,000 이하',
              )}
              className="w-full rounded-xl border px-4 py-3"
            />
            <button type="button" className="rounded-xl bg-[#C09A6A] px-4 py-3 text-white">
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-6">
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
              {t4('最高', 'Max', '上限', '최대')} NT$ {maxPrice.toLocaleString()}
            </span>
            <input type="range" min={1000} max={30000} step={500} value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} />
            <select value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)} className="rounded-xl border px-3 py-2">
              <option value="recommended">{t4('推薦排序', 'Recommended', 'おすすめ順', '추천순')}</option>
              <option value="price-asc">{t4('價格：低到高', 'Price: Low to High', '価格：安い順', '가격 낮은순')}</option>
              <option value="price-desc">{t4('價格：高到低', 'Price: High to Low', '価格：高い順', '가격 높은순')}</option>
              <option value="capacity">{t4('容納人數', 'Capacity', '定員', '수용 인원')}</option>
            </select>
          </div>
        </div>

        <p className="mb-4 text-sm text-gray-600">
          {filtered.length} {t4('間住宿', 'rooms found', '件の宿泊', '개 숙소')}
        </p>

        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
            {t4('找不到符合條件的房型。', 'No matching rooms found.', '条件に合う客室が見つかりません。', '조건에 맞는 객실을 찾지 못했습니다.')}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(room => {
              const hotel = getHotel(room);
              const city = localizeCityName(room.location || hotel?.city || '', shouldTranslate);
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
                        {city || t4('地點未提供', 'Location unavailable', '所在地未設定', '위치 정보 없음')}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {capacityText} {t4('人', 'guests', '名', '명')}
                      </span>
                    </p>
                    <p className="mt-3 line-clamp-2 text-sm text-gray-600">{room.description || t4('尚無房型描述。', 'No description yet.', '説明はまだありません。', '아직 설명이 없습니다.')}</p>
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
                            {t4('假日', 'Weekend', '週末', '주말')} {formatCurrency(room.weekend_price)}
                          </div>
                        ) : null}
                      </div>
                      <Link to={`/rooms/${room.id}`} className="rounded-xl bg-[#C09A6A] px-4 py-2 text-sm font-semibold text-white">
                        {t4('詳情', 'Details', '詳細', '상세')}
                      </Link>
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

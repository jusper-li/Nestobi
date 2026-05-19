import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import Footer from '../../components/Footer';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { useProgressiveList } from '../../hooks/useProgressiveList';
import { supabase } from '../../lib/supabase';
import { ROOM_FALLBACK_IMAGE, useFallbackImage } from '../../lib/images';
import { fetchPublicList, fetchSnapshotList, readCachedList, withRetry, writeCachedList } from '../../lib/listData';
import { formatCurrency } from '../../lib/utils';

interface HotelSummary {
  id: string;
  name: string;
  city?: string | null;
  star_rating?: number | null;
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

const ROOM_TYPES = ['all', 'single', 'double', 'suite', 'deluxe', 'family', 'villa'];
const ROOMS_CACHE_KEY = 'nestobi:list:rooms:v2';
const ROOMS_SNAPSHOT_PATH = '/snapshots/rooms.json';

const TYPE_LABELS: Record<string, string> = {
  all: '全部房型',
  single: '單人房',
  double: '雙人房',
  suite: '套房',
  deluxe: '豪華房',
  family: '家庭房',
  villa: 'Villa',
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
  ].join(' ').toLowerCase();
}

function sortRooms(rooms: Room[], sortMode: SortMode) {
  const sorted = [...rooms];
  if (sortMode === 'price-asc') return sorted.sort((a, b) => a.price_per_night - b.price_per_night);
  if (sortMode === 'price-desc') return sorted.sort((a, b) => b.price_per_night - a.price_per_night);
  if (sortMode === 'capacity') return sorted.sort((a, b) => b.capacity - a.capacity);

  return sorted.sort((a, b) => Number(b.weekend_price || 0) - Number(a.weekend_price || 0));
}

export default function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomType, setRoomType] = useState('all');
  const [maxPrice, setMaxPrice] = useState(30000);
  const [sortMode, setSortMode] = useState<SortMode>('recommended');
  const [search, setSearch] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiError, setAiError] = useState('');
  const [dataNotice, setDataNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    let receivedFreshData = false;
    const cachedRooms = readCachedList<Room>(ROOMS_CACHE_KEY);

    if (cachedRooms?.length) {
      setRooms(cachedRooms);
      setLoading(false);
    }

    fetchSnapshotList<Room>(ROOMS_SNAPSHOT_PATH)
      .then(snapshotRooms => {
        if (cancelled || receivedFreshData || snapshotRooms.length === 0 || cachedRooms?.length) return;
        setRooms(snapshotRooms);
        setLoading(false);
        setDataNotice('目前先顯示快速快照資料，正在背景更新最新房源。');
      })
      .catch(() => {});

    withRetry(() => fetchPublicList<Room>('rooms', async () => {
      const { data, error } = await supabase
        .from('tbl_rooms')
        .select('id,name,description,room_type,capacity,min_capacity,price_per_night,weekend_price,image_url,images,location,is_available,amenities,hotels(id,name,city,star_rating)')
        .eq('is_available', true)
        .limit(160);
      if (error) throw error;
      return (data || []) as unknown as Room[];
    }))
      .then(freshRooms => {
        if (cancelled) return;
        receivedFreshData = true;
        setRooms(freshRooms);
        writeCachedList(ROOMS_CACHE_KEY, freshRooms);
        setDataNotice('');
      })
      .catch(() => {
        if (cancelled) return;
        if (!cachedRooms?.length) {
          setDataNotice('Supabase 連線暫時不穩，已改用快照資料加速顯示。');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = rooms.filter(room => {
      const typeMatches = roomType === 'all' || room.room_type === roomType;
      const priceMatches = room.price_per_night <= maxPrice;
      const searchMatches = !query || roomSearchText(room).includes(query);

      return typeMatches && priceMatches && searchMatches;
    });

    return sortRooms(matches, sortMode);
  }, [maxPrice, roomType, rooms, search, sortMode]);
  const { visibleItems: visibleRooms, visibleCount, hasMore, sentinelRef, loadMore } = useProgressiveList(filtered, { initialCount: 9, increment: 9 });

  const handleAISearch = async () => {
    if (!search.trim()) return;
    setAiLoading(true);
    setAiError('');
    setAiSummary('');

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-proxy`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'room-search', query: search }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'AI 搜尋暫時無法使用');
      setAiSummary(json.result?.summary || '已依照你的描述整理住宿結果');
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI 搜尋暫時無法使用');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <SEOHead
        title="探索住宿"
        description="精選旅店、民宿與特色房型，支援搜尋、房型篩選、價格篩選與排序。"
        keywords="住宿, 訂房, 民宿, 旅店, Nestobi"
        ogType="website"
        pageType="list"
      />
      <Navigation />

      <section className="bg-[#FEF9EC] px-4 py-14">
        <div className="mx-auto max-w-5xl text-center">
          <p className="section-label">Curated Stays</p>
          <h1 className="section-title text-4xl md:text-5xl">探索住宿</h1>
          <span className="gold-bar-center" />
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[#2C1F10]/65">
            從城市短住到慢旅行，快速找到適合人數、預算與目的地的房間。
          </p>

          <div className={`mx-auto mt-8 flex max-w-2xl items-center rounded-2xl bg-white shadow-card transition ${aiLoading ? 'ring-2 ring-[#C09A6A]/40' : 'focus-within:ring-2 focus-within:ring-[#C09A6A]/30'}`}>
            <div className="pl-4 text-[#C09A6A]">
              {aiLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && handleAISearch()}
              placeholder="試試：雙人房、近車站、有浴缸、預算一萬元內"
              className="min-w-0 flex-1 bg-transparent px-3 py-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
            />
            {search && (
              <button type="button" onClick={() => { setSearch(''); setAiSummary(''); setAiError(''); }} className="p-2 text-gray-400 transition hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={handleAISearch} disabled={aiLoading || !search.trim()} className="m-1.5 inline-flex items-center gap-1.5 rounded-xl bg-[#C09A6A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8B6840] disabled:opacity-50">
              <Search className="h-4 w-4" />
              搜尋
            </button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AnimatePresence>
          {aiError && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {aiError}
              <button type="button" onClick={() => setAiError('')} className="ml-auto"><X className="h-4 w-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {aiSummary && (
          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#C09A6A]/25 bg-white px-5 py-4 shadow-sm">
            <Sparkles className="h-4 w-4 text-[#C09A6A]" />
            <span className="text-sm font-semibold text-[#2C1F10]">{aiSummary}</span>
            <button type="button" onClick={() => setAiSummary('')} className="ml-auto text-sm font-semibold text-gray-400 hover:text-gray-600">
              清除提示
            </button>
          </div>
        )}

        {dataNotice && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {dataNotice}
          </div>
        )}

        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="mr-1 flex items-center gap-2 text-gray-500">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wide text-gray-400">篩選</span>
              </div>
              {ROOM_TYPES.map(type => (
                <button key={type} type="button" onClick={() => setRoomType(type)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${roomType === type ? 'bg-[#C09A6A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {TYPE_LABELS[type] || type}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-3 text-sm text-gray-600">
                <span className="whitespace-nowrap">最高 {formatCurrency(maxPrice)}</span>
                <input type="range" min={1000} max={30000} step={500} value={maxPrice} onChange={event => setMaxPrice(Number(event.target.value))} className="w-36 accent-[#C09A6A]" />
              </label>
              <select value={sortMode} onChange={event => setSortMode(event.target.value as SortMode)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition focus:border-[#C09A6A] focus:ring-2 focus:ring-[#C09A6A]/20">
                <option value="recommended">推薦排序</option>
                <option value="price-asc">價格由低到高</option>
                <option value="price-desc">價格由高到低</option>
                <option value="capacity">可入住人數</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">
            找到 {filtered.length} 間住宿
            <span className="ml-2 text-xs font-medium text-gray-400">已顯示 {Math.min(visibleCount, filtered.length)} 間，可依房型、價格與關鍵字調整</span>
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-28">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#C09A6A] border-t-transparent" />
          </div>
        ) : filtered.length > 0 ? (
          <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="columns-1 gap-6 sm:columns-2 lg:columns-3">
            {visibleRooms.map((room, index) => {
              const hotel = getHotel(room);
              const cover = room.images?.[0] || room.image_url || ROOM_FALLBACK_IMAGE;
              const guestLabel = room.min_capacity && room.min_capacity !== room.capacity ? `${room.min_capacity}-${room.capacity} 人` : `最多 ${room.capacity} 人`;

              return (
                <motion.article key={room.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 8) * 0.025 }} className="group mb-6 inline-block w-full break-inside-avoid overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-elegant transition hover:-translate-y-1 hover:shadow-card" style={{ contentVisibility: 'auto', containIntrinsicSize: '360px' }}>
                  <Link to={`/rooms/${room.id}`} className="relative block h-56 overflow-hidden bg-gray-100">
                    <img src={cover} alt={room.name} loading={index < 4 ? 'eager' : 'lazy'} decoding="async" onError={event => useFallbackImage(event, ROOM_FALLBACK_IMAGE)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    <span className="absolute left-3 top-3 rounded-full bg-[#2C1F10]/80 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                      {TYPE_LABELS[room.room_type] || room.room_type}
                    </span>
                    {room.images && room.images.length > 1 && (
                      <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur">
                        {room.images.length} 張照片
                      </span>
                    )}
                  </Link>

                  <div className="p-5">
                    {hotel?.name && (
                      <Link to={`/hotels/${hotel.id}`} className="mb-2 flex w-fit items-center gap-1 text-xs font-semibold text-[#8B6840] transition hover:text-[#2C1F10] hover:underline">
                        <Building2 className="h-3.5 w-3.5" />
                        {hotel.name}
                      </Link>
                    )}
                    <h2 className="line-clamp-2 text-lg font-bold text-gray-900">{room.name}</h2>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{room.location || hotel?.city || '精選地點'}</span>
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{guestLabel}</span>
                    </div>
                    {room.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-500">{room.description}</p>}
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {room.amenities.slice(0, 3).map(amenity => (
                          <span key={amenity} className="rounded-full bg-[#F0E4C8]/75 px-2 py-0.5 text-[11px] font-semibold text-[#8B6840]">{amenity}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-5 flex items-end justify-between border-t border-gray-100 pt-4">
                      <div>
                        <p className="text-xl font-bold text-[#2C1F10]">
                          {formatCurrency(room.price_per_night)}
                          <span className="text-xs font-medium text-gray-400"> / 晚</span>
                        </p>
                        {room.weekend_price && room.weekend_price > 0 && (
                          <p className="mt-0.5 text-sm font-semibold text-[#8B6840]">假日 {formatCurrency(room.weekend_price)}</p>
                        )}
                      </div>
                      <Link to={`/rooms/${room.id}`} className="inline-flex items-center gap-1 rounded-lg bg-[#C09A6A] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#8B6840]">
                        詳情
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-8">
              <button type="button" onClick={loadMore} className="inline-flex items-center gap-2 rounded-full border border-[#C09A6A]/30 bg-white px-5 py-2 text-sm font-bold text-[#8B6840] shadow-sm transition hover:bg-[#FEF9EC]">
                <Loader2 className="h-4 w-4 animate-spin" />
                載入更多住宿
              </button>
            </div>
          )}
          </>
        ) : (
          <div className="py-28 text-center text-gray-400">
            <Sparkles className="mx-auto mb-3 h-10 w-10 opacity-25" />
            <p className="text-sm">沒有符合條件的住宿。</p>
            <button type="button" onClick={() => { setSearch(''); setRoomType('all'); setMaxPrice(30000); }} className="mt-3 text-sm font-semibold text-[#C09A6A] hover:underline">
              清除篩選
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

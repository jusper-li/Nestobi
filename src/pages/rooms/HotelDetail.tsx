import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, Users } from 'lucide-react';
import Footer from '../../components/Footer';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslationRuntimeState, translateHotelsOnDemand, translateRoomsFromCacheOnly } from '../../lib/contentTranslations';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { ROOM_FALLBACK_IMAGE, useFallbackImage } from '../../lib/images';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';

interface Hotel {
  id: string;
  name: string;
  description: string;
  city: string;
  image_url: string | null;
  star_rating: number;
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
  is_available: boolean;
}

export default function HotelDetail() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const shouldTranslate = pickByLang(locale, '0', '1', '1', '1') === '1';
  const t4 = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [displayHotel, setDisplayHotel] = useState<Hotel | null>(null);
  const [displayRooms, setDisplayRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const [h, r] = await Promise.all([
        supabase.from('hotels').select('id,name,description,city,image_url,star_rating').eq('id', id).maybeSingle(),
        supabase.from('tbl_rooms').select('id,name,description,room_type,capacity,min_capacity,price_per_night,weekend_price,image_url,is_available').eq('hotel_id', id).order('price_per_night', { ascending: true }),
      ]);
      if (cancelled) return;
      setHotel((h.data || null) as Hotel | null);
      setRooms((r.data || []) as Room[]);
      setLoading(false);
    };
    if (id) void run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    if (!hotel) return () => { cancelled = true; };

    if (!shouldTranslate) {
      setDisplayHotel(hotel);
      setDisplayRooms(rooms);
      setNotice('');
      return () => {
        cancelled = true;
      };
    }

    const runtime = getTranslationRuntimeState();
    setNotice(
      runtime.tableUnavailable || runtime.isLocalProxyMode
        ? t4('先顯示原文內容，翻譯快取尚未就緒。', 'Showing source first. Translation cache is not ready yet.', '原文を先に表示しています。翻訳キャッシュはまだ準備中です。', '원문을 먼저 표시합니다. 번역 캐시가 아직 준비되지 않았습니다.')
        : t4('套用翻譯快取中...', 'Applying cached translations...', '翻訳キャッシュを適用中...', '번역 캐시를 적용하는 중...'),
    );

    Promise.all([translateHotelsOnDemand([hotel], locale), translateRoomsFromCacheOnly(rooms, locale)])
      .then(([translatedHotel, translatedRooms]) => {
        if (cancelled) return;
        setDisplayHotel((translatedHotel[0] || hotel) as Hotel);
        setDisplayRooms(translatedRooms);
        setNotice('');
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [hotel, rooms, locale, shouldTranslate]);

  const currentHotel = displayHotel || hotel;
  const currentRooms = displayRooms.length ? displayRooms : rooms;

  if (loading) return <div className="min-h-screen bg-gray-50"><Navigation /><div className="py-24 text-center">Loading...</div></div>;
  if (!currentHotel) return <div className="min-h-screen bg-gray-50"><Navigation /><div className="py-24 text-center">{t4('找不到飯店資料', 'Hotel not found', 'ホテルが見つかりません', '호텔을 찾을 수 없습니다')}</div></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead title={currentHotel.name} description={currentHotel.description || currentHotel.name} />
      <Navigation />
      <div className="mx-auto max-w-6xl px-4 py-6">
        {notice && <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{notice}</div>}
        <Link to="/rooms" className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600"><ArrowLeft className="h-4 w-4" />{t4('返回住宿列表', 'Back to stays', '客室一覧へ戻る', '숙소 목록으로')}</Link>
        <img src={currentHotel.image_url || ROOM_FALLBACK_IMAGE} alt={currentHotel.name} onError={event => useFallbackImage(event, ROOM_FALLBACK_IMAGE)} className="h-64 w-full rounded-2xl object-cover md:h-96" />
        <h1 className="mt-5 text-3xl font-bold">{currentHotel.name}</h1>
        <p className="mt-2 inline-flex items-center gap-1 text-gray-500"><MapPin className="h-4 w-4" />{currentHotel.city}</p>
        <div className="mt-2 flex items-center gap-0.5">{Array.from({ length: currentHotel.star_rating || 4 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}</div>
        <p className="mt-4 text-gray-700">{currentHotel.description || t4('尚無飯店介紹', 'No description yet.', 'ホテル説明はまだありません。', '호텔 설명이 아직 없습니다.')}</p>

        <h2 className="mb-4 mt-8 text-2xl font-bold">{t4('可預訂房型', 'Available rooms', '予約可能な客室', '예약 가능한 객실')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {currentRooms.map(room => {
            const capacityText = room.min_capacity && room.min_capacity !== room.capacity ? `${room.min_capacity}-${room.capacity}` : `${room.capacity}`;
            return (
              <article key={room.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                <img src={room.image_url || ROOM_FALLBACK_IMAGE} alt={room.name} onError={event => useFallbackImage(event, ROOM_FALLBACK_IMAGE)} className="h-44 w-full rounded-xl object-cover" />
                <h3 className="mt-3 text-xl font-bold">{room.name}</h3>
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-gray-500"><Users className="h-4 w-4" />{capacityText} {t4('人', 'guests', '名', '명')}</p>
                <p className="mt-2 line-clamp-2 text-sm text-gray-600">{room.description || t4('尚無房型描述', 'No description yet.', '客室説明はまだありません。', '객실 설명이 아직 없습니다.')}</p>
                <div className="mt-3 text-3xl font-bold text-[#2C1F10]">{formatCurrency(room.price_per_night)}</div>
                {room.weekend_price ? <p className="text-sm text-gray-500">{t4('假日', 'Weekend', '週末', '주말')} {formatCurrency(room.weekend_price)}</p> : null}
                <Link to={`/rooms/${room.id}`} className="mt-3 inline-block rounded-xl bg-[#C09A6A] px-4 py-2 text-white">{t4('查看詳情', 'View details', '詳細を見る', '상세 보기')}</Link>
              </article>
            );
          })}
        </div>
      </div>
      <Footer />
    </div>
  );
}

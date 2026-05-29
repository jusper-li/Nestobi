import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2, CheckCircle, Clock, MapPin, Star, Users } from 'lucide-react';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import SEOHead from '../../components/SEOHead';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang } from '../../lib/i18n';
import { getTranslationRuntimeState, translateHotelsOnDemand, translateRoomsOnDemand } from '../../lib/contentTranslations';
import { ROOM_FALLBACK_IMAGE, useFallbackImage } from '../../lib/images';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';

interface Hotel {
  id: string;
  name: string;
  city: string;
  star_rating: number;
  checkin_time?: string;
  checkout_time?: string;
}

interface Room {
  id: string;
  name: string;
  description: string;
  room_type: string;
  capacity: number;
  min_capacity?: number;
  price_per_night: number;
  weekend_price?: number;
  floor?: string;
  image_url: string;
  images?: string[];
  location: string;
  is_available: boolean;
  amenities: string[];
  hotels?: Hotel | null;
}

const ROOM_TYPE_LABELS: Record<string, { 'zh-TW': string; en: string; ja: string; ko: string }> = {
  single: { 'zh-TW': '單人房', en: 'Single', ja: 'シングル', ko: '싱글' },
  double: { 'zh-TW': '雙人房', en: 'Double', ja: 'ダブル', ko: '더블' },
  suite: { 'zh-TW': '套房', en: 'Suite', ja: 'スイート', ko: '스위트' },
  deluxe: { 'zh-TW': '豪華房', en: 'Deluxe', ja: 'デラックス', ko: '디럭스' },
  family: { 'zh-TW': '家庭房', en: 'Family', ja: 'ファミリー', ko: '패밀리' },
  villa: { 'zh-TW': 'Villa', en: 'Villa', ja: 'ヴィラ', ko: '빌라' },
};

export default function RoomDetail() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const locale = normalizedLang;
  const t4 = (zh: string, en: string, ja: string, ko: string) =>
    locale === 'ja' ? ja : locale === 'ko' ? ko : locale === 'en' ? en : zh;

  const t = {
    notFound: t4('找不到房型資料', 'Room not found', '部屋が見つかりません', '객실을 찾을 수 없습니다'),
    backToList: t4('返回房型列表', 'Back to Room List', '部屋一覧に戻る', '객실 목록으로 돌아가기'),
    amenities: t4('房型設施', 'Amenities', '設備', '객실 편의시설'),
    noAmenities: t4('目前沒有設施資料', 'No amenities available', '設備情報がありません', '편의시설 정보가 없습니다'),
    perNight: t4('/ 晚', '/ night', '/ 泊', '/ 박'),
    weekend: t4('假日', 'Weekend', '週末', '주말'),
    bookNow: t4('立即預訂', 'Book Now', '今すぐ予約', '지금 예약'),
    soldOut: t4('目前無法預訂', 'Unavailable', '予約不可', '예약 불가'),
    checkIn: t4('入住', 'Check-in', 'チェックイン', '체크인'),
    checkOut: t4('退房', 'Check-out', 'チェックアウト', '체크아웃'),
    guests: t4('人', 'guests', '名', '명'),
    noDescription: t4('目前尚無房型描述。', 'No description available yet.', '説明はまだありません。', '아직 객실 설명이 없습니다.'),
    unknownLocation: t4('地點未提供', 'Location unavailable', '場所情報なし', '위치 정보 없음'),
    roomList: t4('房型列表', 'Room List', '部屋一覧', '객실 목록'),
    priceLabel: t4('每晚價格', 'Price per night', '1泊あたり料金', '1박 요금'),
    cacheNotReady: t4('目前先顯示原文內容，翻譯快取尚未就緒。', 'Showing source content first. Translation cache is not ready yet.', '翻訳キャッシュ未準備のため原文を先に表示します。', '번역 캐시 준비 전이라 원문을 먼저 표시합니다.'),
    translatingRoom: t4('正在翻譯房型內容...', 'Translating room content...', '部屋情報を翻訳中...', '객실 내용을 번역 중...'),
    translatingHotel: t4('正在翻譯住宿資訊...', 'Translating property info...', '宿泊施設情報を翻訳中...', '숙소 정보를 번역 중...'),
    showingSource: t4('目前顯示原文內容。', 'Showing source content.', '原文を表示しています。', '원문 콘텐츠를 표시합니다.'),
  };

  const [room, setRoom] = useState<Room | null>(null);
  const [displayRoom, setDisplayRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  const [translationNotice, setTranslationNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetchRoom = async () => {
      const { data } = await supabase
        .from('tbl_rooms')
        .select('*, hotels(id, name, city, star_rating, checkin_time, checkout_time)')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      setRoom((data || null) as Room | null);
      setLoading(false);
    };
    if (id) fetchRoom();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    if (!room) {
      setDisplayRoom(null);
      return () => {
        cancelled = true;
      };
    }
    if (normalizedLang === 'zh-TW') {
      setDisplayRoom(room);
      setTranslationNotice('');
      return () => {
        cancelled = true;
      };
    }

    const run = async () => {
      if (!cancelled) setDisplayRoom(room);
      const runtime = getTranslationRuntimeState();
      if (!cancelled) setTranslationNotice(runtime.tableUnavailable || runtime.isLocalProxyMode ? t.cacheNotReady : t.translatingRoom);

      const [translatedRoom] = await translateRoomsOnDemand([room], normalizedLang);
      if (cancelled) return;
      setDisplayRoom(translatedRoom);
      setTranslationNotice(t.translatingHotel);

      if (translatedRoom.hotels?.id) {
        const [translatedHotel] = await translateHotelsOnDemand([translatedRoom.hotels], normalizedLang);
        if (cancelled) return;
        setDisplayRoom(prev => (prev ? { ...prev, hotels: translatedHotel } : prev));
      }
      if (!cancelled) setTranslationNotice('');
    };

    run().catch(() => {
      if (!cancelled) {
        setDisplayRoom(room);
        setTranslationNotice(t.showingSource);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [room, normalizedLang, t.cacheNotReady, t.translatingRoom, t.translatingHotel, t.showingSource]);

  const currentRoom = displayRoom || room;
  const gallery = useMemo(() => {
    if (!currentRoom) return [];
    const images = currentRoom.images && currentRoom.images.length > 0 ? currentRoom.images : [];
    const merged = [...images];
    if (currentRoom.image_url && !merged.includes(currentRoom.image_url)) merged.unshift(currentRoom.image_url);
    return merged.length > 0 ? merged : [ROOM_FALLBACK_IMAGE];
  }, [currentRoom]);

  const cover = activeImage || gallery[0] || ROOM_FALLBACK_IMAGE;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2C1F10] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h2 className="mb-4 text-xl font-bold text-gray-800">{t.notFound}</h2>
          <Link to="/rooms" className="inline-flex items-center gap-2 rounded-xl bg-[#C09A6A] px-5 py-3 font-semibold text-white hover:bg-[#8B6840]">
            <ArrowLeft className="h-4 w-4" />
            {t.backToList}
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const guestLabel =
    currentRoom.min_capacity && currentRoom.min_capacity !== currentRoom.capacity
      ? `${currentRoom.min_capacity}-${currentRoom.capacity} ${t.guests}`
      : `${currentRoom.capacity} ${t.guests}`;

  const roomType = ROOM_TYPE_LABELS[currentRoom.room_type];
  const typeLabel = roomType ? roomType[locale] : currentRoom.room_type;

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title={currentRoom.name}
        description={`${currentRoom.name} · ${currentRoom.location || ''} · ${formatCurrency(currentRoom.price_per_night)} ${t.perNight}`}
        keywords={`${currentRoom.name}, ${currentRoom.location}, Nestobi`}
        ogImage={cover}
      />
      <Navigation />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {translationNotice && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">{translationNotice}</div>
        )}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-500">
          <Link to="/rooms" className="hover:text-[#2C1F10]">
            {t.roomList}
          </Link>
          <span>/</span>
          <span className="truncate text-gray-800">{currentRoom.name}</span>
        </nav>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative h-72 overflow-hidden rounded-2xl bg-gray-100 md:h-[420px]">
            <img src={cover} alt={currentRoom.name} onError={event => useFallbackImage(event, ROOM_FALLBACK_IMAGE)} className="h-full w-full object-cover" />
          </div>

          {gallery.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {gallery.map((img, index) => (
                <button
                  key={`${currentRoom.id}-img-${index}`}
                  type="button"
                  onClick={() => setActiveImage(img)}
                  className={`h-14 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 ${
                    cover === img ? 'border-[#C09A6A]' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#F0E4C8] px-3 py-1 text-xs font-semibold text-[#2C1F10]">{typeLabel}</span>
                  {currentRoom.hotels?.name && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                      <Building2 className="h-3.5 w-3.5" />
                      {currentRoom.hotels.name}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-gray-900">{currentRoom.name}</h1>
                <p className="mt-2 inline-flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="h-4 w-4" />
                  {currentRoom.location || currentRoom.hotels?.city || t.unknownLocation}
                </p>
                <p className="mt-5 leading-7 text-gray-600">{currentRoom.description || t.noDescription}</p>

                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-gray-100 pt-5 text-sm text-gray-600 sm:grid-cols-4">
                  <div className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-[#2C1F10]" />
                    {guestLabel}
                  </div>
                  <div className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-[#2C1F10]" />
                    {t.checkIn} {currentRoom.hotels?.checkin_time || '15:00'}
                  </div>
                  <div className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-[#2C1F10]" />
                    {t.checkOut} {currentRoom.hotels?.checkout_time || '11:00'}
                  </div>
                  {currentRoom.floor && <div>{currentRoom.floor}</div>}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-bold text-gray-900">{t.amenities}</h2>
                {Array.isArray(currentRoom.amenities) && currentRoom.amenities.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {currentRoom.amenities.map((amenity, index) => (
                      <div key={`${currentRoom.id}-amenity-${index}`} className="inline-flex items-center gap-2 rounded-xl bg-[#F0E4C8]/75 px-3 py-2.5 text-sm font-medium text-[#2C1F10]">
                        <CheckCircle className="h-4 w-4" />
                        {amenity}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">{t.noAmenities}</p>
                )}
              </div>
            </div>

            <div>
              <div className="sticky top-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <p className="text-sm text-gray-500">{t.priceLabel}</p>
                <p className="mt-1 text-4xl font-bold text-[#2C1F10]">{formatCurrency(currentRoom.price_per_night)}</p>
                {currentRoom.weekend_price && currentRoom.weekend_price > 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    {t.weekend} {formatCurrency(currentRoom.weekend_price)}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-0.5">
                  {Array.from({ length: currentRoom.hotels?.star_rating || 4 }).map((_, index) => (
                    <Star key={`${currentRoom.id}-star-${index}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {currentRoom.is_available ? (
                  <Link to={`/booking/${currentRoom.id}`} className="mt-5 block rounded-xl bg-[#C09A6A] py-3 text-center text-lg font-bold text-white hover:bg-[#8B6840]">
                    {t.bookNow}
                  </Link>
                ) : (
                  <div className="mt-5 rounded-xl bg-gray-200 py-3 text-center font-semibold text-gray-500">{t.soldOut}</div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}

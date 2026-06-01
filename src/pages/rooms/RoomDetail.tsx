import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, CheckCircle, Clock, MapPin, Star, Users } from 'lucide-react';
import Footer from '../../components/Footer';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslationRuntimeState, translateHotelsOnDemand, translateRoomsOnDemand } from '../../lib/contentTranslations';
import { normalizeLang, pickByLang } from '../../lib/i18n';
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
  single: { 'zh-TW': '單人房', en: 'Single', ja: 'シングル', ko: '싱글룸' },
  double: { 'zh-TW': '雙人房', en: 'Double', ja: 'ダブル', ko: '더블룸' },
  suite: { 'zh-TW': '套房', en: 'Suite', ja: 'スイート', ko: '스위트' },
  deluxe: { 'zh-TW': '豪華房', en: 'Deluxe', ja: 'デラックス', ko: '디럭스' },
  family: { 'zh-TW': '家庭房', en: 'Family', ja: 'ファミリー', ko: '패밀리' },
  villa: { 'zh-TW': 'Villa', en: 'Villa', ja: 'ヴィラ', ko: '빌라' },
};

export default function RoomDetail() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const shouldTranslate = pickByLang(locale, '0', '1', '1', '1') === '1';
  const t4 = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);

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
        .select('*, hotels(id,name,city,star_rating,checkin_time,checkout_time)')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      setRoom((data || null) as Room | null);
      setLoading(false);
    };
    if (id) void fetchRoom();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    if (!room) return () => { cancelled = true; };
    if (!shouldTranslate) {
      setDisplayRoom(room);
      setTranslationNotice('');
      return () => {
        cancelled = true;
      };
    }

    setDisplayRoom(room);
    const runtime = getTranslationRuntimeState();
    setTranslationNotice(
      runtime.tableUnavailable || runtime.isLocalProxyMode
        ? t4(
            '目前先顯示原文資料，翻譯快取尚未就緒。',
            'Showing source first. Translation cache is not ready yet.',
            '原文を先に表示しています。翻訳キャッシュはまだ準備中です。',
            '원문을 먼저 표시합니다. 번역 캐시가 아직 준비되지 않았습니다.',
          )
        : t4('翻譯房型內容中...', 'Translating room content...', '客室情報を翻訳中...', '객실 정보를 번역 중...'),
    );

    (async () => {
      const [translatedRoom] = await translateRoomsOnDemand([room], locale);
      if (cancelled) return;
      let next = translatedRoom || room;
      if (next.hotels?.id) {
        const [translatedHotel] = await translateHotelsOnDemand([next.hotels], locale);
        if (!cancelled && translatedHotel) next = { ...next, hotels: translatedHotel };
      }
      if (!cancelled) {
        setDisplayRoom(next);
        setTranslationNotice('');
      }
    })().catch(() => {
      if (!cancelled) setTranslationNotice(t4('先顯示原文內容。', 'Showing source content.', '原文を表示しています。', '원문 내용을 표시합니다.'));
    });

    return () => {
      cancelled = true;
    };
  }, [room, locale, shouldTranslate]);

  const currentRoom = displayRoom || room;

  const gallery = useMemo(() => {
    if (!currentRoom) return [];
    const imgs = currentRoom.images && currentRoom.images.length > 0 ? [...currentRoom.images] : [];
    if (currentRoom.image_url && !imgs.includes(currentRoom.image_url)) imgs.unshift(currentRoom.image_url);
    return imgs.length ? imgs : [ROOM_FALLBACK_IMAGE];
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
          <h2 className="mb-4 text-xl font-bold">{t4('找不到房間', 'Room not found', '客室が見つかりません', '객실을 찾을 수 없습니다')}</h2>
          <Link to="/rooms" className="inline-flex items-center gap-2 rounded-xl bg-[#C09A6A] px-5 py-3 font-semibold text-white">
            <ArrowLeft className="h-4 w-4" />
            {t4('返回住宿列表', 'Back to Room List', '客室一覧へ戻る', '객실 목록으로 돌아가기')}
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const guestLabel =
    currentRoom.min_capacity && currentRoom.min_capacity !== currentRoom.capacity
      ? `${currentRoom.min_capacity}-${currentRoom.capacity}`
      : `${currentRoom.capacity}`;
  const roomType = ROOM_TYPE_LABELS[currentRoom.room_type];
  const typeLabel = roomType ? roomType[locale] : currentRoom.room_type;

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead title={currentRoom.name} description={`${currentRoom.name} · ${currentRoom.location || ''}`} ogImage={cover} />
      <Navigation />
      <div className="mx-auto max-w-6xl px-4 py-8">
        {translationNotice && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{translationNotice}</div>
        )}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-500">
          <Link to="/rooms">{t4('住宿列表', 'Room List', '客室一覧', '객실 목록')}</Link>
          <span>/</span>
          <span className="truncate text-gray-800">{currentRoom.name}</span>
        </nav>

        <div className="relative h-72 overflow-hidden rounded-2xl bg-gray-100 md:h-[420px]">
          <img src={cover} alt={currentRoom.name} onError={event => useFallbackImage(event, ROOM_FALLBACK_IMAGE)} className="h-full w-full object-cover" />
        </div>
        {gallery.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {gallery.map((img, i) => (
              <button
                key={`${currentRoom.id}-img-${i}`}
                type="button"
                onClick={() => setActiveImage(img)}
                className={`h-14 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 ${cover === img ? 'border-[#C09A6A]' : 'border-transparent opacity-70 hover:opacity-100'}`}
              >
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
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
                {currentRoom.location || currentRoom.hotels?.city || t4('位置資訊待補', 'Location unavailable', '所在地情報なし', '위치 정보 없음')}
              </p>
              <p className="mt-5 leading-7 text-gray-600">{currentRoom.description || t4('尚無說明', 'No description yet.', '説明はまだありません。', '아직 설명이 없습니다.')}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-5 text-sm text-gray-600 sm:grid-cols-4">
                <div className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-[#2C1F10]" />
                  {guestLabel} {t4('人', 'guests', '名', '명')}
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#2C1F10]" />
                  {t4('入住', 'Check-in', 'チェックイン', '체크인')} {currentRoom.hotels?.checkin_time || '15:00'}
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#2C1F10]" />
                  {t4('退房', 'Check-out', 'チェックアウト', '체크아웃')} {currentRoom.hotels?.checkout_time || '11:00'}
                </div>
                {currentRoom.floor && <div>{currentRoom.floor}</div>}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t4('房型設施', 'Amenities', '設備', '편의시설')}</h2>
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
                <p className="text-sm text-gray-400">{t4('尚無設施資料', 'No amenities available', '設備情報はありません', '편의시설 정보가 없습니다')}</p>
              )}
            </div>
          </div>

          <div>
            <div className="sticky top-6 rounded-2xl border bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">{t4('每晚價格', 'Price per night', '1泊料金', '1박 요금')}</p>
              <p className="mt-1 text-4xl font-bold text-[#2C1F10]">{formatCurrency(currentRoom.price_per_night)}</p>
              {currentRoom.weekend_price && (
                <p className="mt-1 text-sm text-gray-500">
                  {t4('假日', 'Weekend', '週末', '주말')} {formatCurrency(currentRoom.weekend_price)}
                </p>
              )}
              <div className="mt-3 flex items-center gap-0.5">
                {Array.from({ length: currentRoom.hotels?.star_rating || 4 }).map((_, i) => (
                  <Star key={`${currentRoom.id}-star-${i}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              {currentRoom.is_available ? (
                <Link to={`/booking/${currentRoom.id}`} className="mt-5 block rounded-xl bg-[#C09A6A] py-3 text-center text-lg font-bold text-white hover:bg-[#8B6840]">
                  {t4('立即預訂', 'Book Now', '今すぐ予約', '지금 예약')}
                </Link>
              ) : (
                <div className="mt-5 rounded-xl bg-gray-200 py-3 text-center font-semibold text-gray-500">
                  {t4('目前不可預訂', 'Unavailable', '現在予約不可', '현재 예약 불가')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2, Car, ChevronRight, Clock, Coffee, CreditCard, MapPin, PawPrint, Star, Users, Wifi } from 'lucide-react';
import Footer from '../../components/Footer';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang } from '../../lib/i18n';
import { getTranslationRuntimeState, translateHotelsOnDemand, translateRoomsFromCacheOnly } from '../../lib/contentTranslations';
import { ROOM_FALLBACK_IMAGE, useFallbackImage } from '../../lib/images';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';

interface Hotel {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  image_url: string;
  star_rating: number;
  phone: string;
  email: string;
  checkin_time: string;
  checkout_time: string;
  deposit_amount: number;
  pet_friendly: boolean;
  is_active: boolean;
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
  floor?: string | null;
  image_url: string | null;
  images?: string[] | null;
  amenities: string[] | null;
  is_available: boolean;
  location?: string | null;
}

const ROOM_TYPE_LABELS: Record<string, { zh: string; en: string; ja: string; ko: string }> = {
  single: { zh: '單人房', en: 'Single', ja: 'シングル', ko: '싱글' },
  double: { zh: '雙人房', en: 'Double', ja: 'ダブル', ko: '더블' },
  suite: { zh: '套房', en: 'Suite', ja: 'スイート', ko: '스위트' },
  deluxe: { zh: '豪華房', en: 'Deluxe', ja: 'デラックス', ko: '디럭스' },
  family: { zh: '家庭房', en: 'Family', ja: 'ファミリー', ko: '패밀리' },
  villa: { zh: 'Villa', en: 'Villa', ja: 'ヴィラ', ko: '빌라' },
};

export default function HotelDetail() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const locale = normalizedLang === 'zh-TW' ? 'zh' : normalizedLang === 'ja' ? 'ja' : normalizedLang === 'ko' ? 'ko' : 'en';
  const t4 = (zh: string, en: string, ja: string, ko: string) => (locale === 'zh' ? zh : locale === 'ja' ? ja : locale === 'ko' ? ko : en);

  const labels = {
    stays: t4('住宿', 'Stays', '宿泊', '숙소'),
    notFound: t4('找不到住宿', 'Hotel not found', '宿泊施設が見つかりません', '숙소를 찾을 수 없습니다'),
    backToList: t4('返回住宿列表', 'Back to Stays', '宿泊一覧へ戻る', '숙소 목록으로 돌아가기'),
    aboutHotel: t4('住宿介紹', 'About this property', '宿泊施設の紹介', '숙소 소개'),
    availableRooms: t4('可預訂房型', 'Available Rooms', '予約可能な客室', '예약 가능한 객실'),
    noRooms: t4('目前尚無房型資料', 'No room data yet', '客室データがありません', '객실 데이터가 없습니다'),
    roomDetails: t4('查看房型', 'Room details', '客室を見る', '객실 보기'),
    unavailable: t4('暫不可訂', 'Unavailable', '予約不可', '예약 불가'),
    from: t4('每晚起', 'From', '1泊あたり', '1박 기준'),
    weekend: t4('假日', 'Weekend', '週末', '주말'),
    checkIn: t4('入住', 'Check-in', 'チェックイン', '체크인'),
    checkOut: t4('退房', 'Check-out', 'チェックアウト', '체크아웃'),
    deposit: t4('押金', 'Deposit', 'デポジット', '보증금'),
    pets: t4('寵物友善', 'Pet Friendly', 'ペット可', '반려동물 가능'),
    yes: t4('是', 'Yes', 'はい', '예'),
    no: t4('否', 'No', 'いいえ', '아니오'),
    none: t4('無', 'None', 'なし', '없음'),
    people: t4('人', 'guests', '名', '명'),
    noDescription: t4('目前尚無住宿介紹。', 'Description not available yet.', '説明はまだありません。', '아직 숙소 설명이 없습니다.'),
    locationUnknown: t4('地點待補', 'Location unavailable', '場所情報なし', '위치 정보 없음'),
    contact: t4('聯絡資訊', 'Contact', '連絡先', '연락처'),
    phone: t4('電話', 'Phone', '電話', '전화'),
    email: 'Email',
    amenities: t4('基本設施', 'Amenities', '基本設備', '기본 시설'),
    cacheNotReady: t4(
      '目前先顯示原文內容，翻譯快取尚未就緒。',
      'Showing source content first. Translation cache is not ready yet.',
      '翻訳キャッシュ未準備のため原文を先に表示します。',
      '번역 캐시 준비 전이라 원문을 먼저 표시합니다.',
    ),
    translating: t4('正在翻譯住宿資訊...', 'Translating property info...', '宿泊情報を翻訳中...', '숙소 정보를 번역 중...'),
    showingSource: t4('目前顯示原文內容。', 'Showing source content.', '原文を表示しています。', '원문 콘텐츠를 표시합니다.'),
    coffee: t4('咖啡', 'Coffee', 'コーヒー', '커피'),
    parking: t4('停車', 'Parking', '駐車', '주차'),
  };

  const roomTypeLabel = (type: string) => {
    const m = ROOM_TYPE_LABELS[type];
    if (!m) return type;
    return locale === 'zh' ? m.zh : locale === 'ja' ? m.ja : locale === 'ko' ? m.ko : m.en;
  };

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [displayHotel, setDisplayHotel] = useState<Hotel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [displayRooms, setDisplayRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [translationNotice, setTranslationNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      const [hotelRes, roomRes] = await Promise.all([
        supabase.from('hotels').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('tbl_rooms')
          .select('id,name,description,room_type,capacity,min_capacity,price_per_night,weekend_price,floor,image_url,images,amenities,is_available,location')
          .eq('hotel_id', id)
          .order('price_per_night', { ascending: true }),
      ]);
      if (cancelled) return;
      setHotel((hotelRes.data || null) as Hotel | null);
      setRooms((roomRes.data || []) as Room[]);
      setLoading(false);
    };
    if (id) fetchData();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    if (!hotel) {
      setDisplayHotel(null);
      return () => {
        cancelled = true;
      };
    }
    if (normalizedLang === 'zh-TW') {
      setDisplayHotel(hotel);
      setTranslationNotice('');
      return () => {
        cancelled = true;
      };
    }

    const run = async () => {
      setDisplayHotel(hotel);
      const runtime = getTranslationRuntimeState();
      setTranslationNotice(runtime.tableUnavailable || runtime.isLocalProxyMode ? labels.cacheNotReady : labels.translating);
      const [translatedHotel] = await translateHotelsOnDemand([hotel], normalizedLang);
      if (!cancelled) {
        setDisplayHotel({ ...hotel, ...translatedHotel });
        setTranslationNotice('');
      }
    };

    run().catch(() => {
      if (!cancelled) {
        setDisplayHotel(hotel);
        setTranslationNotice(labels.showingSource);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hotel, normalizedLang, labels.cacheNotReady, labels.showingSource, labels.translating]);

  useEffect(() => {
    let cancelled = false;
    if (!rooms.length || normalizedLang === 'zh-TW') {
      setDisplayRooms(rooms);
      return () => {
        cancelled = true;
      };
    }
    setDisplayRooms(rooms);
    translateRoomsFromCacheOnly(rooms, normalizedLang)
      .then(translated => {
        if (!cancelled) setDisplayRooms(translated);
      })
      .catch(() => {
        if (!cancelled) setDisplayRooms(rooms);
      });
    return () => {
      cancelled = true;
    };
  }, [rooms, normalizedLang]);

  const currentHotel = displayHotel || hotel;
  const heroImg = currentHotel?.image_url || ROOM_FALLBACK_IMAGE;
  const amenityChips = useMemo(
    () => [
      { label: 'WiFi', icon: <Wifi className="h-4 w-4" /> },
      { label: labels.coffee, icon: <Coffee className="h-4 w-4" /> },
      { label: labels.parking, icon: <Car className="h-4 w-4" /> },
      { label: labels.pets, icon: <PawPrint className="h-4 w-4" /> },
    ],
    [labels.coffee, labels.parking, labels.pets],
  );

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

  if (!currentHotel) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">{labels.notFound}</h2>
          <Link to="/rooms" className="inline-flex items-center gap-2 rounded-xl bg-[#C09A6A] px-6 py-3 font-semibold text-white transition hover:bg-[#8B6840]">
            <ArrowLeft className="h-4 w-4" />
            {labels.backToList}
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <SEOHead title={currentHotel.name} description={`${currentHotel.name} - ${currentHotel.city || ''}`} keywords={`${currentHotel.name}, ${currentHotel.city}, Nestobi`} ogImage={heroImg} ogType="place" />
      <Navigation />
      <div className="relative h-64 overflow-hidden md:h-[360px]">
        <img src={heroImg} alt={currentHotel.name} onError={event => useFallbackImage(event, ROOM_FALLBACK_IMAGE)} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-6xl px-6 pb-8">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-white/70">
            <Link to="/rooms" className="transition hover:text-white">{labels.stays}</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/95">{currentHotel.name}</span>
          </nav>
          <h1 className="text-3xl font-bold text-white md:text-4xl">{currentHotel.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div className="flex gap-0.5">{Array.from({ length: currentHotel.star_rating || 4 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}</div>
            <span className="inline-flex items-center gap-1 text-sm text-white/85"><MapPin className="h-3.5 w-3.5" />{currentHotel.city || labels.locationUnknown}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {translationNotice && <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">{translationNotice}</div>}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-bold text-gray-900">{labels.aboutHotel}</h2>
              <p className="text-sm leading-relaxed text-gray-600">{currentHotel.description || labels.noDescription}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm"><Clock className="mx-auto mb-2 h-5 w-5 text-[#C09A6A]" /><p className="text-xs text-gray-400">{labels.checkIn}</p><p className="text-sm font-semibold text-gray-800">{currentHotel.checkin_time || '15:00'}</p></div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm"><Clock className="mx-auto mb-2 h-5 w-5 text-[#C09A6A]" /><p className="text-xs text-gray-400">{labels.checkOut}</p><p className="text-sm font-semibold text-gray-800">{currentHotel.checkout_time || '11:00'}</p></div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm"><CreditCard className="mx-auto mb-2 h-5 w-5 text-[#C09A6A]" /><p className="text-xs text-gray-400">{labels.deposit}</p><p className="text-sm font-semibold text-gray-800">{currentHotel.deposit_amount ? formatCurrency(currentHotel.deposit_amount) : labels.none}</p></div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm"><PawPrint className="mx-auto mb-2 h-5 w-5 text-[#C09A6A]" /><p className="text-xs text-gray-400">{labels.pets}</p><p className="text-sm font-semibold text-gray-800">{currentHotel.pet_friendly ? labels.yes : labels.no}</p></div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h2 className="mb-4 text-lg font-bold text-gray-900">{labels.availableRooms}<span className="ml-2 text-sm font-normal text-gray-400">({displayRooms.length})</span></h2>
              {displayRooms.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm"><Building2 className="mx-auto mb-3 h-10 w-10 text-gray-200" /><p className="text-sm text-gray-400">{labels.noRooms}</p></div>
              ) : (
                <div className="space-y-4">
                  {displayRooms.map((room, i) => {
                    const roomCover = room.images?.[0] || room.image_url || ROOM_FALLBACK_IMAGE;
                    const guestLabel = room.min_capacity && room.min_capacity !== room.capacity ? `${room.min_capacity}-${room.capacity} ${labels.people}` : `${room.capacity} ${labels.people}`;
                    return (
                      <motion.article key={room.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row">
                        <div className="relative h-48 flex-shrink-0 overflow-hidden bg-gray-100 sm:h-auto sm:w-56">
                          <img src={roomCover} alt={room.name} onError={event => useFallbackImage(event, ROOM_FALLBACK_IMAGE)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                          <span className="absolute left-3 top-3 rounded-full bg-[#2C1F10]/80 px-2.5 py-1 text-xs font-semibold text-white">{roomTypeLabel(room.room_type)}</span>
                          {!room.is_available && <span className="absolute right-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">{labels.unavailable}</span>}
                        </div>
                        <div className="flex flex-1 flex-col justify-between p-5">
                          <div>
                            <h3 className="text-base font-bold text-gray-900">{room.name}</h3>
                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500"><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{guestLabel}</span>{room.floor && <span>{room.floor}</span>}</div>
                            {room.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-600">{room.description}</p>}
                          </div>
                          <div className="mt-4 flex items-end justify-between border-t border-gray-100 pt-4">
                            <div>
                              <p className="text-sm text-gray-500">{labels.from}</p>
                              <p className="text-xl font-bold text-[#2C1F10]">{formatCurrency(room.price_per_night)}</p>
                              {room.weekend_price && room.weekend_price > 0 && <p className="text-sm font-semibold text-[#8B6840]">{labels.weekend} {formatCurrency(room.weekend_price)}</p>}
                            </div>
                            <Link to={`/rooms/${room.id}`} className="inline-flex items-center gap-2 rounded-lg bg-[#C09A6A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8B6840]">{labels.roomDetails}</Link>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-bold text-gray-900">{labels.contact}</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[#C09A6A]" />{currentHotel.city || labels.locationUnknown}</p>
                <p className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[#C09A6A]" />{currentHotel.address || labels.locationUnknown}</p>
                {currentHotel.phone && <p className="inline-flex items-center gap-2">{labels.phone}: {currentHotel.phone}</p>}
                {currentHotel.email && <p className="break-all">{labels.email}: {currentHotel.email}</p>}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-bold text-gray-900">{labels.amenities}</h3>
              <div className="grid grid-cols-2 gap-2">
                {amenityChips.map(item => (
                  <div key={item.label} className="inline-flex items-center gap-2 rounded-lg bg-[#F0E4C8]/70 px-3 py-2 text-xs font-semibold text-[#2C1F10]">{item.icon}{item.label}</div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

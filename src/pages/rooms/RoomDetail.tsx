import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2, CheckCircle, Clock, MapPin, Star, Users } from 'lucide-react';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import SEOHead from '../../components/SEOHead';
import { useLanguage } from '../../contexts/LanguageContext';
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

const ROOM_TYPE_LABEL_ZH: Record<string, string> = {
  single: '單人房',
  double: '雙人房',
  suite: '套房',
  deluxe: '豪華房',
  family: '家庭房',
  villa: 'Villa',
};

function roomTypeLabel(type: string, isEn: boolean) {
  if (!isEn) return ROOM_TYPE_LABEL_ZH[type] || type;
  if (type === 'single') return 'Single';
  if (type === 'double') return 'Double';
  if (type === 'suite') return 'Suite';
  if (type === 'deluxe') return 'Deluxe';
  if (type === 'family') return 'Family';
  if (type === 'villa') return 'Villa';
  return type ? `${type.charAt(0).toUpperCase()}${type.slice(1)}` : '';
}

export default function RoomDetail() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const t = {
    notFound: isEn ? 'Room not found' : '找不到房型',
    backToList: isEn ? 'Back to Room List' : '返回住宿列表',
    amenities: isEn ? 'Amenities' : '房型設施',
    noAmenities: isEn ? 'No amenities available' : '目前沒有可顯示的設施',
    perNight: isEn ? '/ night' : '/ 晚',
    weekend: isEn ? 'Weekend' : '假日',
    bookNow: isEn ? 'Book Now' : '立即預訂',
    soldOut: isEn ? 'Unavailable' : '暫不可訂',
    checkIn: isEn ? 'Check-in' : '入住',
    checkOut: isEn ? 'Check-out' : '退房',
    guests: isEn ? 'guests' : '人',
    noDescription: isEn ? 'No description available yet.' : '目前尚無房型介紹。',
    unknownLocation: isEn ? 'Location unavailable' : '地點待補',
    roomList: isEn ? 'Room List' : '住宿列表',
    priceLabel: isEn ? 'Price per night' : '每晚價格',
    cacheNotReady: isEn ? 'Showing source content first. Translation cache is not ready yet.' : '目前先顯示原文內容，翻譯快取尚未就緒。',
    translatingRoom: isEn ? 'Translating room content...' : '正在翻譯房型內容...',
    translatingHotel: isEn ? 'Translating property info...' : '正在翻譯住宿資訊...',
    showingSource: isEn ? 'Showing source content.' : '目前顯示原文內容。',
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
    if (lang === 'zh-TW') {
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

      const [translatedRoom] = await translateRoomsOnDemand([room], lang);
      if (cancelled) return;
      setDisplayRoom(translatedRoom);
      setTranslationNotice(t.translatingHotel);

      if (translatedRoom.hotels?.id) {
        const [translatedHotel] = await translateHotelsOnDemand([translatedRoom.hotels], lang);
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
  }, [room, lang, t.cacheNotReady, t.translatingRoom, t.translatingHotel, t.showingSource]);

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

  const typeLabel = roomTypeLabel(currentRoom.room_type, isEn);

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
        {translationNotice && <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">{translationNotice}</div>}
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
                  className={`h-14 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 ${cover === img ? 'border-[#C09A6A]' : 'border-transparent opacity-70 hover:opacity-100'}`}
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
                {currentRoom.weekend_price && currentRoom.weekend_price > 0 && <p className="mt-1 text-sm text-gray-500">{t.weekend} {formatCurrency(currentRoom.weekend_price)}</p>}
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

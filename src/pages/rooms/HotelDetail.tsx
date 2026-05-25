import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2, Car, ChevronRight, Clock, Coffee, CreditCard, MapPin, PawPrint, Star, Users, Wifi } from 'lucide-react';
import Footer from '../../components/Footer';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { useLanguage } from '../../contexts/LanguageContext';
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

export default function HotelDetail() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const t = {
    stays: isEn ? 'Stays' : '住宿',
    notFound: isEn ? 'Hotel not found' : '找不到住宿',
    backToList: isEn ? 'Back to Stays' : '返回住宿列表',
    aboutHotel: isEn ? 'About this property' : '住宿介紹',
    availableRooms: isEn ? 'Available Rooms' : '可預訂房型',
    noRooms: isEn ? 'No room data yet' : '目前尚無房型資料',
    roomDetails: isEn ? 'Room details' : '查看房型',
    unavailable: isEn ? 'Unavailable' : '暫不可訂',
    from: isEn ? 'From' : '每晚起',
    weekend: isEn ? 'Weekend' : '假日',
    checkIn: isEn ? 'Check-in' : '入住',
    checkOut: isEn ? 'Check-out' : '退房',
    deposit: isEn ? 'Deposit' : '押金',
    pets: isEn ? 'Pet Friendly' : '寵物友善',
    yes: isEn ? 'Yes' : '是',
    no: isEn ? 'No' : '否',
    people: isEn ? 'guests' : '人',
    noDescription: isEn ? 'Description not available yet.' : '目前尚無住宿介紹。',
    locationUnknown: isEn ? 'Location unavailable' : '地點待補',
    contact: isEn ? 'Contact' : '聯絡資訊',
    phone: isEn ? 'Phone' : '電話',
    email: 'Email',
    amenities: isEn ? 'Amenities' : '基本設施',
    cacheNotReady: isEn ? 'Showing source content first. Translation cache is not ready yet.' : '目前先顯示原文內容，翻譯快取尚未就緒。',
    translating: isEn ? 'Translating property info...' : '正在翻譯住宿資訊...',
    showingSource: isEn ? 'Showing source content.' : '目前顯示原文內容。',
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
    if (lang === 'zh-TW') {
      setDisplayHotel(hotel);
      setTranslationNotice('');
      return () => {
        cancelled = true;
      };
    }

    const run = async () => {
      if (!cancelled) setDisplayHotel(hotel);
      const runtime = getTranslationRuntimeState();
      if (!cancelled) setTranslationNotice(runtime.tableUnavailable || runtime.isLocalProxyMode ? t.cacheNotReady : t.translating);
      const [translatedHotel] = await translateHotelsOnDemand([hotel], lang);
      if (!cancelled) {
        setDisplayHotel({ ...hotel, ...translatedHotel });
        setTranslationNotice('');
      }
    };

    run().catch(() => {
      if (!cancelled) {
        setDisplayHotel(hotel);
        setTranslationNotice(t.showingSource);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hotel, lang, t.cacheNotReady, t.translating, t.showingSource]);

  useEffect(() => {
    let cancelled = false;
    if (!rooms.length || lang === 'zh-TW') {
      setDisplayRooms(rooms);
      return () => {
        cancelled = true;
      };
    }
    setDisplayRooms(rooms);
    translateRoomsFromCacheOnly(rooms, lang)
      .then(translated => {
        if (!cancelled) setDisplayRooms(translated);
      })
      .catch(() => {
        if (!cancelled) setDisplayRooms(rooms);
      });
    return () => {
      cancelled = true;
    };
  }, [rooms, lang]);

  const currentHotel = displayHotel || hotel;
  const heroImg = currentHotel?.image_url || ROOM_FALLBACK_IMAGE;

  const amenityChips = useMemo(
    () => [
      { label: 'WiFi', icon: <Wifi className="h-4 w-4" /> },
      { label: isEn ? 'Coffee' : '咖啡', icon: <Coffee className="h-4 w-4" /> },
      { label: isEn ? 'Parking' : '停車', icon: <Car className="h-4 w-4" /> },
      { label: t.pets, icon: <PawPrint className="h-4 w-4" /> },
    ],
    [isEn, t.pets],
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
          <h2 className="mb-4 text-xl font-semibold text-gray-700">{t.notFound}</h2>
          <Link to="/rooms" className="inline-flex items-center gap-2 rounded-xl bg-[#C09A6A] px-6 py-3 font-semibold text-white transition hover:bg-[#8B6840]">
            <ArrowLeft className="h-4 w-4" />
            {t.backToList}
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <SEOHead
        title={currentHotel.name}
        description={`${currentHotel.name} · ${currentHotel.city || ''} · ${currentHotel.description?.slice(0, 120) || ''}`}
        keywords={`${currentHotel.name}, ${currentHotel.city}, Nestobi`}
        ogImage={heroImg}
        ogType="place"
      />
      <Navigation />

      <div className="relative h-64 overflow-hidden md:h-[360px]">
        <img src={heroImg} alt={currentHotel.name} onError={event => useFallbackImage(event, ROOM_FALLBACK_IMAGE)} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-6xl px-6 pb-8">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-white/70">
            <Link to="/rooms" className="transition hover:text-white">
              {t.stays}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/95">{currentHotel.name}</span>
          </nav>
          <h1 className="text-3xl font-bold text-white md:text-4xl">{currentHotel.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div className="flex gap-0.5">
              {Array.from({ length: currentHotel.star_rating || 4 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="inline-flex items-center gap-1 text-sm text-white/85">
              <MapPin className="h-3.5 w-3.5" />
              {currentHotel.city || t.locationUnknown}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {translationNotice && <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">{translationNotice}</div>}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-bold text-gray-900">{t.aboutHotel}</h2>
              <p className="text-sm leading-relaxed text-gray-600">{currentHotel.description || t.noDescription}</p>
              <div className="mt-4 border-t border-gray-100 pt-4 text-sm text-gray-600">
                <div className="mb-1 inline-flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-[#C09A6A]" />
                  <span>{currentHotel.address || t.locationUnknown}</span>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
                <Clock className="mx-auto mb-2 h-5 w-5 text-[#C09A6A]" />
                <p className="text-xs text-gray-400">{t.checkIn}</p>
                <p className="text-sm font-semibold text-gray-800">{currentHotel.checkin_time || '15:00'}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
                <Clock className="mx-auto mb-2 h-5 w-5 text-[#C09A6A]" />
                <p className="text-xs text-gray-400">{t.checkOut}</p>
                <p className="text-sm font-semibold text-gray-800">{currentHotel.checkout_time || '11:00'}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
                <CreditCard className="mx-auto mb-2 h-5 w-5 text-[#C09A6A]" />
                <p className="text-xs text-gray-400">{t.deposit}</p>
                <p className="text-sm font-semibold text-gray-800">{currentHotel.deposit_amount ? formatCurrency(currentHotel.deposit_amount) : (isEn ? 'None' : '無')}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
                <PawPrint className="mx-auto mb-2 h-5 w-5 text-[#C09A6A]" />
                <p className="text-xs text-gray-400">{t.pets}</p>
                <p className="text-sm font-semibold text-gray-800">{currentHotel.pet_friendly ? t.yes : t.no}</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  {t.availableRooms}
                  <span className="ml-2 text-sm font-normal text-gray-400">({displayRooms.length})</span>
                </h2>
              </div>
              {displayRooms.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
                  <Building2 className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                  <p className="text-sm text-gray-400">{t.noRooms}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayRooms.map((room, i) => {
                    const roomCover = room.images?.[0] || room.image_url || ROOM_FALLBACK_IMAGE;
                    const guestLabel =
                      room.min_capacity && room.min_capacity !== room.capacity
                        ? `${room.min_capacity}-${room.capacity} ${t.people}`
                        : `${room.capacity} ${t.people}`;
                    return (
                      <motion.article key={room.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row">
                        <div className="relative h-48 flex-shrink-0 overflow-hidden bg-gray-100 sm:h-auto sm:w-56">
                          <img src={roomCover} alt={room.name} onError={event => useFallbackImage(event, ROOM_FALLBACK_IMAGE)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                          <span className="absolute left-3 top-3 rounded-full bg-[#2C1F10]/80 px-2.5 py-1 text-xs font-semibold text-white">{roomTypeLabel(room.room_type, isEn)}</span>
                          {!room.is_available && <span className="absolute right-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">{t.unavailable}</span>}
                        </div>
                        <div className="flex flex-1 flex-col justify-between p-5">
                          <div>
                            <h3 className="text-base font-bold text-gray-900">{room.name}</h3>
                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                {guestLabel}
                              </span>
                              {room.floor && <span>{room.floor}</span>}
                            </div>
                            {room.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-600">{room.description}</p>}
                          </div>
                          <div className="mt-4 flex items-end justify-between border-t border-gray-100 pt-4">
                            <div>
                              <p className="text-sm text-gray-500">{t.from}</p>
                              <p className="text-xl font-bold text-[#2C1F10]">{formatCurrency(room.price_per_night)}</p>
                              {room.weekend_price && room.weekend_price > 0 && <p className="text-sm font-semibold text-[#8B6840]">{t.weekend} {formatCurrency(room.weekend_price)}</p>}
                            </div>
                            <Link to={`/rooms/${room.id}`} className="inline-flex items-center gap-2 rounded-lg bg-[#C09A6A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8B6840]">
                              {t.roomDetails}
                            </Link>
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
              <h3 className="mb-4 text-base font-bold text-gray-900">{t.contact}</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#C09A6A]" />
                  {currentHotel.city || t.locationUnknown}
                </p>
                <p className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#C09A6A]" />
                  {currentHotel.address || t.locationUnknown}
                </p>
                {currentHotel.phone && <p className="inline-flex items-center gap-2">{t.phone}: {currentHotel.phone}</p>}
                {currentHotel.email && <p className="break-all">{t.email}: {currentHotel.email}</p>}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-bold text-gray-900">{t.amenities}</h3>
              <div className="grid grid-cols-2 gap-2">
                {amenityChips.map(item => (
                  <div key={item.label} className="inline-flex items-center gap-2 rounded-lg bg-[#F0E4C8]/70 px-3 py-2 text-xs font-semibold text-[#2C1F10]">
                    {item.icon}
                    {item.label}
                  </div>
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

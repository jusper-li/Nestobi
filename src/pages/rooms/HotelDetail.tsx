import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin, Phone, Star, ArrowLeft, ChevronRight, Clock, Shield,
  Users, Building2, PawPrint, CreditCard, CheckCircle, MessageCircle,
  Facebook, Wifi, Coffee, Car, Waves, Dumbbell, Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import SEOHead from '../../components/SEOHead';

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
  line_id: string;
  facebook: string;
  registration_number: string;
  checkin_time: string;
  checkout_time: string;
  deposit_amount: number;
  pet_friendly: boolean;
  is_active: boolean;
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
  amenities: string[];
  is_available: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  single: '單人房', double: '雙人房', suite: '套房', family: '家庭房', villa: '別墅',
};

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  'WiFi': <Wifi className="w-3.5 h-3.5" />,
  '早餐': <Coffee className="w-3.5 h-3.5" />,
  '停車': <Car className="w-3.5 h-3.5" />,
  '游泳池': <Waves className="w-3.5 h-3.5" />,
  '健身房': <Dumbbell className="w-3.5 h-3.5" />,
  'SPA': <Sparkles className="w-3.5 h-3.5" />,
};

const Stars: React.FC<{ count: number }> = ({ count }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: count }).map((_, i) => (
      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
    ))}
  </div>
);

const HotelDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [hotelRes, roomsRes] = await Promise.all([
        supabase.from('hotels').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('tbl_rooms')
          .select('id,name,description,room_type,capacity,min_capacity,price_per_night,weekend_price,floor,image_url,images,amenities,is_available')
          .eq('hotel_id', id)
          .order('price_per_night', { ascending: true }),
      ]);
      setHotel(hotelRes.data as Hotel | null);
      setRooms((roomsRes.data || []) as Room[]);
      setLoading(false);
    };
    if (id) fetch();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="flex justify-center py-32">
        <div className="w-10 h-10 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!hotel) return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-4">找不到此飯店</h2>
        <Link to="/rooms" className="inline-flex items-center gap-2 bg-[#C09A6A] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#8B6840] transition">
          <ArrowLeft className="w-4 h-4" />返回住宿列表
        </Link>
      </div>
      <Footer />
    </div>
  );

  const heroImg = hotel.image_url || 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg';

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <SEOHead
        title={hotel.name}
        description={`${hotel.name}，位於${hotel.city}${hotel.address ? `（${hotel.address}）` : ''}。${hotel.description?.slice(0, 100) ?? ''}`}
        keywords={`${hotel.name}, ${hotel.city}民宿, ${hotel.city}訂房, 台灣住宿, Nestobi 旅遊平台`}
        ogImage={heroImg}
        ogType="place"
      />
      <Navigation />

      {/* Hero */}
      <div className="relative h-64 md:h-[360px] overflow-hidden">
        <img src={heroImg} alt={hotel.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 max-w-6xl mx-auto">
          <nav className="flex items-center gap-1.5 text-xs text-white/60 mb-3">
            <Link to="/rooms" className="hover:text-white transition-colors">住宿訂房</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/90">{hotel.name}</span>
          </nav>
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2" style={{ letterSpacing: '-0.02em' }}>
                {hotel.name}
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                {hotel.star_rating > 0 && <Stars count={hotel.star_rating} />}
                {hotel.city && (
                  <span className="flex items-center gap-1 text-white/80 text-sm">
                    <MapPin className="w-3.5 h-3.5" />{hotel.city}
                  </span>
                )}
                {hotel.registration_number && (
                  <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
                    民宿登記 {hotel.registration_number}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: info + rooms */}
          <div className="lg:col-span-2 space-y-8">

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-3">關於我們</h2>
              <p className="text-gray-600 leading-relaxed text-sm">{hotel.description}</p>
              {hotel.address && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-2 text-gray-500 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#C09A6A]" />
                  <span>{hotel.address}</span>
                </div>
              )}
            </motion.div>

            {/* Quick info pills */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              {[
                { icon: Clock, label: '入住時間', value: hotel.checkin_time || '15:00' },
                { icon: Clock, label: '退房時間', value: hotel.checkout_time || '11:00' },
                { icon: CreditCard, label: '押金', value: hotel.deposit_amount ? formatCurrency(hotel.deposit_amount) : '免押金' },
                { icon: PawPrint, label: '寵物友善', value: hotel.pet_friendly ? '可攜帶寵物' : '不可攜帶寵物' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                  <Icon className="w-5 h-5 text-[#C09A6A] mx-auto mb-2" />
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-gray-800">{value}</p>
                </div>
              ))}
            </motion.div>

            {/* Rooms */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  房型介紹
                  <span className="ml-2 text-sm font-normal text-gray-400">共 {rooms.length} 種</span>
                </h2>
              </div>

              {rooms.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
                  <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">尚無房型資料</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rooms.map((room, i) => {
                    const imgs = room.images && room.images.length > 0 ? room.images : [room.image_url];
                    const amenities = Array.isArray(room.amenities) ? room.amenities : [];
                    return (
                      <motion.div
                        key={room.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.06 }}
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col sm:flex-row card-lift group"
                      >
                        {/* Image */}
                        <div className="relative sm:w-56 h-48 sm:h-auto flex-shrink-0 overflow-hidden">
                          <img
                            src={imgs[0] || 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg'}
                            alt={room.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <span className="absolute top-3 left-3 bg-[#2C1F10]/80 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
                            {TYPE_LABELS[room.room_type] || room.room_type}
                          </span>
                          {!room.is_available && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full">暫停開放</span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-bold text-gray-900 text-base">{room.name}</h3>
                              {room.floor && (
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                                  {room.floor}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-gray-400 text-xs mb-3">
                              <Users className="w-3.5 h-3.5" />
                              {room.min_capacity && room.min_capacity !== room.capacity
                                ? `${room.min_capacity}–${room.capacity} 位賓客`
                                : `最多 ${room.capacity} 位賓客`}
                            </div>
                            <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-3">
                              {room.description}
                            </p>
                            {amenities.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {amenities.slice(0, 6).map(a => (
                                  <span
                                    key={a}
                                    className="inline-flex items-center gap-1 bg-[#F0E4C8] text-[#2C1F10] text-xs px-2 py-1 rounded-lg"
                                  >
                                    {AMENITY_ICONS[a] || <CheckCircle className="w-3 h-3" />}
                                    {a}
                                  </span>
                                ))}
                                {amenities.length > 6 && (
                                  <span className="text-xs text-gray-400 py-1">+{amenities.length - 6} 項設施</span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-end justify-between pt-4 mt-4 border-t border-gray-100">
                            <div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-[#2C1F10]">{formatCurrency(room.price_per_night)}</span>
                                <span className="text-xs text-gray-400">平日/晚</span>
                              </div>
                              {room.weekend_price && room.weekend_price > 0 && (
                                <div className="flex items-baseline gap-1 mt-0.5">
                                  <span className="text-sm font-semibold text-[#8B6840]">{formatCurrency(room.weekend_price)}</span>
                                  <span className="text-xs text-gray-400">假日</span>
                                </div>
                              )}
                            </div>
                            <Link
                              to={`/rooms/${room.id}`}
                              className="bg-[#C09A6A] hover:bg-[#8B6840] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all hover:shadow-md tracking-wide"
                            >
                              查看詳情 →
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right: contact sidebar */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 sticky top-6"
            >
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#C09A6A]" />聯絡資訊
              </h3>
              <div className="space-y-3">
                {hotel.phone && (
                  <a
                    href={`tel:${hotel.phone}`}
                    className="flex items-center gap-3 p-3 bg-[#F0E4C8] rounded-xl hover:bg-[#E8D5B0] transition group"
                  >
                    <Phone className="w-4 h-4 text-[#2C1F10] flex-shrink-0" />
                    <span className="text-sm font-medium text-[#2C1F10]">{hotel.phone}</span>
                  </a>
                )}
                {hotel.line_id && (
                  <a
                    href={`https://line.me/ti/p/${hotel.line_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-[#E8F5E9] rounded-xl hover:bg-[#D4EDDA] transition"
                  >
                    <MessageCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-green-800">LINE：{hotel.line_id}</span>
                  </a>
                )}
                {hotel.facebook && (
                  <a
                    href={`https://facebook.com/${hotel.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-[#E8F0FE] rounded-xl hover:bg-[#D2E3FC] transition"
                  >
                    <Facebook className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-blue-800">{hotel.facebook}</span>
                  </a>
                )}
              </div>

              <div className="mt-5 pt-5 border-t border-gray-100 space-y-2">
                {[
                  { icon: Shield, label: '合法登記', value: hotel.registration_number || '已登記' },
                  { icon: Clock, label: '入住 / 退房', value: `${hotel.checkin_time || '15:00'} / ${hotel.checkout_time || '11:00'}` },
                  { icon: PawPrint, label: '寵物', value: hotel.pet_friendly ? '歡迎毛孩' : '不接受寵物' },
                  { icon: CreditCard, label: '押金', value: hotel.deposit_amount ? formatCurrency(hotel.deposit_amount) : '免押金' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Icon className="w-4 h-4 text-[#C09A6A] flex-shrink-0" />
                    <span className="text-gray-400">{label}：</span>
                    <span className="font-medium text-gray-700">{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <Link
              to="/rooms"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-gray-200 text-sm text-gray-500 hover:border-[#C09A6A] hover:text-[#C09A6A] transition bg-white"
            >
              <ArrowLeft className="w-4 h-4" />
              返回住宿列表
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default HotelDetail;

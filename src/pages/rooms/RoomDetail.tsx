import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Users, Wifi, Coffee, Car, Waves, Dumbbell, Sparkles, ArrowLeft, Star, ChevronRight, Clock, Shield, CheckCircle, Ban, Info, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import SEOHead from '../../components/SEOHead';

interface Hotel {
  id: string;
  name: string;
  city: string;
  star_rating: number;
  checkin_time?: string;
  checkout_time?: string;
  deposit_amount?: number;
  pet_friendly?: boolean;
  phone?: string;
  line_id?: string;
  address?: string;
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
  hotel_id: string | null;
  hotels?: Hotel | null;
}

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  'WiFi': <Wifi className="w-4 h-4" />,
  '早餐': <Coffee className="w-4 h-4" />,
  '停車': <Car className="w-4 h-4" />,
  '游泳池': <Waves className="w-4 h-4" />,
  '健身房': <Dumbbell className="w-4 h-4" />,
  'SPA': <Sparkles className="w-4 h-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  single: '單人房', double: '雙人房', suite: '套房', family: '家庭房', villa: '別墅',
};

const POLICIES = [
  { icon: Clock, title: '入住 / 退房', items: ['入住時間：15:00 起', '退房時間：11:00 前', '可申請延遲退房（視況而定）', '提前入住請提前聯繫'] },
  { icon: Shield, title: '取消政策', items: ['入住前 7 天取消：全額退款', '入住前 3–6 天取消：退款 50%', '入住前 3 天內取消：不退款', '不可抗力因素另行處理'] },
  { icon: Ban, title: '住宿規定', items: ['室內全面禁菸', '禁止攜帶寵物（另有規定者除外）', '禁止舉辦大型聚會', '22:00 後請保持安靜'] },
  { icon: Info, title: '其他說明', items: ['提供免費 Wi-Fi 全館覆蓋', '櫃台 24 小時服務', '停車場（視房型及空位而定）', '可提供嬰兒床（需預先申請）'] },
];

const HIGHLIGHTS = [
  { icon: CheckCircle, label: '免費取消', sub: '符合條件時全額退款' },
  { icon: Shield, label: '安全付款', sub: '銀行級 SSL 加密' },
  { icon: Star, label: '點數回饋', sub: '入住累積旅遊點數' },
  { icon: Clock, label: '即時確認', sub: '訂房後立即收到確認信' },
];

const RoomDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoom = async () => {
      const { data } = await supabase
        .from('tbl_rooms')
        .select('*, hotels(id, name, city, star_rating, checkin_time, checkout_time, deposit_amount, pet_friendly, phone, line_id, address)')
        .eq('id', id)
        .single();
      setRoom(data as Room);
      setLoading(false);
    };
    if (id) fetchRoom();
  }, [id]);

  const amenities = Array.isArray(room?.amenities) ? room.amenities : [];

  const jsonLd = room ? {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: room.name,
    description: room.description || `${TYPE_LABELS[room.room_type] || room.room_type} — ${room.location}`,
    image: room.image_url,
    priceRange: formatCurrency(room.price_per_night) + '/晚',
    address: {
      '@type': 'PostalAddress',
      addressLocality: room.location,
      addressCountry: 'TW',
    },
    amenityFeature: amenities.map(a => ({
      '@type': 'LocationFeatureSpecification',
      name: a,
      value: true,
    })),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'TWD',
      price: room.price_per_night,
      availability: room.is_available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/Discontinued',
      seller: { '@type': 'Organization', name: 'Nestobi 旅遊平台' },
    },
  } : undefined;

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="flex justify-center py-32">
        <div className="w-10 h-10 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!room) return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">找不到此房型</h2>
        <Link to="/rooms" className="inline-flex items-center gap-2 bg-[#C09A6A] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#8B6840] transition">
          <ArrowLeft className="w-4 h-4" />返回房型列表
        </Link>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {jsonLd && (
        <SEOHead
          title={room.name}
          description={`${TYPE_LABELS[room.room_type] || room.room_type}，位於 ${room.location}。每晚 ${formatCurrency(room.price_per_night)} 起，最多容納 ${room.capacity} 位賓客。${amenities.length > 0 ? `設施包含：${amenities.join('、')}。` : ''}`}
          keywords={`${room.name}, ${room.location} 訂房, ${TYPE_LABELS[room.room_type]}, 台灣住宿, Nestobi 旅遊平台`}
          ogImage={room.image_url}
          ogType="place"
          jsonLd={jsonLd as Record<string, unknown>}
        />
      )}
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6 flex-wrap">
          <Link to="/rooms" className="hover:text-[#2C1F10] transition-colors">住宿訂房</Link>
          {room.hotels && (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link to={`/hotels/${room.hotels.id}`} className="text-gray-500 hover:text-[#2C1F10] truncate max-w-[180px] transition-colors">{room.hotels.name}</Link>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-700 font-medium truncate max-w-[240px]">{room.name}</span>
        </nav>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Gallery thumbnails */}
          {(() => {
            const imgs = (room.images && room.images.length > 0) ? room.images : (room.image_url ? [room.image_url] : []);
            const display = activeImg || imgs[0] || room.image_url || 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg';
            return (
              <div className="mb-8">
                <div className="relative h-72 md:h-[420px] rounded-2xl overflow-hidden shadow-lg">
                  <img src={display} alt={room.name} className="w-full h-full object-cover transition-all duration-300" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="bg-[#2C1F10] text-xs font-semibold px-3 py-1.5 rounded-full tracking-wide">
                  {TYPE_LABELS[room.room_type] || room.room_type}
                </span>
                {room.hotels && (
                  <span className="bg-white/20 backdrop-blur-sm text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />{room.hotels.name}
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{room.name}</h1>
              <div className="flex items-center gap-1.5 text-gray-200 text-sm">
                <MapPin className="w-4 h-4" />{room.location || room.hotels?.city || ''}
              </div>
            </div>
                {!room.is_available && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white text-sm font-semibold px-3 py-1.5 rounded-full">
                    目前不開放
                  </div>
                )}
                </div>
                {/* Thumbnail strip */}
                {imgs.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                    {imgs.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveImg(img)}
                        className={`flex-shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 transition ${(activeImg || imgs[0]) === img ? 'border-[#C09A6A] opacity-100' : 'border-transparent opacity-60 hover:opacity-90'}`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-3">房型介紹</h2>
                <p className="text-gray-600 leading-relaxed">
                  {room.description || '享受我們精心設計的住宿空間，寬敞舒適的環境結合現代化設施，讓您的旅途更加愉快難忘。無論是商務出行還是休閒度假，我們都能滿足您的需求。'}
                </p>

                <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Users className="w-4 h-4 text-[#2C1F10]" />
                    {room.min_capacity && room.min_capacity !== room.capacity ? `${room.min_capacity}–${room.capacity}` : room.capacity} 位賓客
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Clock className="w-4 h-4 text-[#2C1F10]" />
                    入住 {room.hotels?.checkin_time || '15:00'}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Clock className="w-4 h-4 text-[#2C1F10]" />
                    退房 {room.hotels?.checkout_time || '11:00'}
                  </div>
                  {room.floor && (
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Building2 className="w-4 h-4 text-[#2C1F10]" />
                      {room.floor}
                    </div>
                  )}
                </div>
              </div>

              {room.hotels && (
                <Link
                  to={`/hotels/${room.hotels.id}`}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 hover:border-[#C09A6A] hover:shadow-md transition-all group"
                >
                  <div className="p-3 bg-[#F0E4C8] rounded-xl flex-shrink-0">
                    <Building2 className="w-5 h-5 text-[#2C1F10]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">所屬飯店 / 民宿</p>
                    <p className="font-semibold text-gray-900 group-hover:text-[#C09A6A] transition-colors">{room.hotels.name}</p>
                    {room.hotels.city && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />{room.hotels.city}
                      </p>
                    )}
                  </div>
                  {room.hotels.star_rating > 0 && (
                    <div className="ml-auto flex gap-0.5 flex-shrink-0">
                      {Array.from({ length: room.hotels.star_rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  )}
                </Link>
              )}

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">房型設施</h2>
                {amenities.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {amenities.map(a => (
                      <div key={a} className="flex items-center gap-2.5 bg-[#F0E4C8] text-[#2C1F10] text-sm font-medium px-3 py-2.5 rounded-xl">
                        {AMENITY_ICONS[a] || <CheckCircle className="w-4 h-4" />}
                        {a}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">暫無設施資訊，請聯繫客服詳詢。</p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {POLICIES.map(({ icon: Icon, title, items }) => (
                  <div key={title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-4 h-4 text-[#2C1F10]" />
                      <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
                    </div>
                    <ul className="space-y-1.5">
                      {items.map(item => (
                        <li key={item} className="text-xs text-gray-500 flex items-start gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white">
                <h2 className="text-lg font-bold mb-4">位置資訊</h2>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#2C1F10] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{room.location}</p>
                    <p className="text-gray-400 text-sm mt-1">詳細地址及交通資訊於訂房確認後提供</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 sticky top-6">
                <div className="text-center mb-5">
                  <p className="text-gray-500 text-sm mb-1">平日每晚</p>
                  <p className="text-4xl font-bold text-[#2C1F10]">{formatCurrency(room.price_per_night)}</p>
                  {room.weekend_price && room.weekend_price > 0 && (
                    <p className="text-sm text-gray-500 mt-1">假日 / 連假 {formatCurrency(room.weekend_price)}</p>
                  )}
                  {room.hotels?.deposit_amount && room.hotels.deposit_amount > 0 && (
                    <p className="text-xs text-gray-400 mt-1">押金 {formatCurrency(room.hotels.deposit_amount)}（退房後退還）</p>
                  )}
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {Array.from({ length: room.hotels?.star_rating || 4 }).map((_, s) => <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                  </div>
                </div>

                {room.is_available ? (
                  <Link
                    to={`/booking/${room.id}`}
                    className="block w-full bg-[#C09A6A] hover:bg-[#8B6840] text-white text-center font-bold py-4 rounded-xl transition shadow-md hover:shadow-lg text-lg"
                  >
                    立即預訂
                  </Link>
                ) : (
                  <div className="w-full bg-gray-200 text-gray-500 text-center font-semibold py-4 rounded-xl cursor-not-allowed">
                    目前不開放預訂
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {HIGHLIGHTS.map(({ icon: Icon, label, sub }) => (
                    <div key={label} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <Icon className="w-4 h-4 text-[#2C1F10] flex-shrink-0" />
                      <div>
                        <span className="font-medium">{label}</span>
                        <span className="text-gray-400 text-xs block">{sub}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#F0E4C8] rounded-2xl p-4 border border-[#D5CDB8]">
                <p className="text-[#2C1F10] text-sm font-semibold mb-1">需要協助？</p>
                {room.hotels?.phone ? (
                  <p className="text-[#1A1208] text-xs leading-relaxed">
                    電話：{room.hotels.phone}
                    {room.hotels.line_id && <span className="block">LINE：{room.hotels.line_id}</span>}
                  </p>
                ) : (
                  <p className="text-[#1A1208] text-xs leading-relaxed">如有任何訂房問題，請聯繫我們的 24 小時 AI 客服或客服專線。</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default RoomDetail;

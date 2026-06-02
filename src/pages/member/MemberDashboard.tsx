import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BedDouble, BookMarked, ChevronRight, Heart, MapPin, Receipt, Settings, ShoppingBag, Star, Ticket, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';

interface Booking {
  id: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  status: string;
  tbl_rooms: { name: string; location: string } | null;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
}

type UiLang = 'zh-TW' | 'en' | 'ja' | 'ko';

export default function MemberDashboard() {
  const { user, profile } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang) as UiLang;
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);
  const dateLocale = pickByLang(locale, 'zh-TW', 'en-US', 'ja-JP', 'ko-KR');
  const t = {
    welcome: pick('歡迎回來', 'Welcome back', 'おかえりなさい', '다시 오신 것을 환영합니다'),
    points: pick('目前點數', 'Current points', '現在のポイント', '현재 포인트'),
    profile: pick('個人資料', 'Profile', 'プロフィール', '프로필'),
    bookings: pick('我的訂房', 'My Bookings', '予約', '내 예약'),
    orders: pick('我的訂單', 'My Orders', '注文', '내 주문'),
    purchases: pick('消費紀錄', 'Consumption Records', '利用履歴', '소비 내역'),
    myPoints: pick('我的點數', 'My Points', 'マイポイント', '내 포인트'),
    preferences: pick('偏好設定', 'Preferences', '設定', '설정'),
    passport: pick('旅遊護照', 'Travel Passport', 'トラベルパスポート', '트래블 패스포트'),
    recentBookings: pick('近期訂房', 'Recent Bookings', '最近の予約', '최근 예약'),
    recentOrders: pick('近期訂單', 'Recent Orders', '最近の注文', '최근 주문'),
    viewAll: pick('查看全部', 'View all', 'すべて表示', '전체 보기'),
    noBooking: pick('目前沒有訂房資料', 'No bookings yet', '予約はまだありません', '예약이 없습니다'),
    noOrders: pick('目前沒有訂單資料', 'No orders yet', '注文はまだありません', '주문이 없습니다'),
    room: pick('房型', 'Room', '部屋', '객실'),
    memberTools: pick('會員價值功能', 'Member Value Tools', '会員向け機能', '회원 가치 기능'),
    favorites: pick('我的收藏', 'My Favorites', 'お気に入り', '내 찜 목록'),
    coupons: pick('我的優惠券', 'My Coupons', 'マイクーポン', '내 쿠폰'),
    reviews: pick('我的評價', 'My Reviews', 'マイレビュー', '내 리뷰'),
    footprint: pick('旅遊足跡', 'Travel Footprint', '旅の足跡', '여행 발자취'),
    staysCount: pick('已入住', 'Stays', '宿泊済み', '숙박 완료'),
    citiesCount: pick('已探索城市', 'Cities explored', '探索した都市', '탐험한 도시'),
    nightsCount: pick('累積住宿晚數', 'Total nights', '累計宿泊数', '누적 숙박일'),
  };
  const [points, setPoints] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const [{ data: pts }, { data: bks }, { data: ords }] = await Promise.all([
        supabase.from('points').select('amount').eq('user_id', user.id),
        supabase
          .from('tbl_bookings')
          .select('*, tbl_rooms(name, location)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(2),
      ]);
      setPoints((pts || []).reduce((sum: number, row: { amount?: number }) => sum + (row.amount || 0), 0));
      setBookings((bks as Booking[]) || []);
      setOrders(ords || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const quickLinks = [
    { to: '/member/profile', icon: <User className="h-6 w-6" />, label: t.profile, color: 'bg-[#F0E4C8] text-[#2C1F10]' },
    { to: '/member/bookings', icon: <BedDouble className="h-6 w-6" />, label: t.bookings, color: 'bg-teal-50 text-[#0D9488]' },
    { to: '/member/orders', icon: <ShoppingBag className="h-6 w-6" />, label: t.orders, color: 'bg-purple-50 text-purple-600' },
    { to: '/member/purchases', icon: <Receipt className="h-6 w-6" />, label: t.purchases, color: 'bg-orange-50 text-orange-600' },
    { to: '/member/points', icon: <Star className="h-6 w-6" />, label: t.myPoints, color: 'bg-yellow-50 text-yellow-600' },
    { to: '/member/preferences', icon: <Settings className="h-6 w-6" />, label: t.preferences, color: 'bg-gray-50 text-gray-600' },
    { to: '/ai/passport', icon: <BookMarked className="h-6 w-6" />, label: t.passport, color: 'bg-amber-50 text-amber-700' },
  ];

  const completedBookings = bookings.filter(item => item.status === 'completed');
  const exploredCities = new Set(completedBookings.map(item => item.tbl_rooms?.location || '').filter(Boolean)).size;
  const totalNights = completedBookings.reduce((sum, item) => {
    const start = new Date(item.check_in_date);
    const end = new Date(item.check_out_date);
    return sum + Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }, 0);

  const valueTools = [
    { to: '/rooms', icon: <Heart className="h-5 w-5" />, label: t.favorites, value: '0', color: 'bg-pink-50 text-pink-600' },
    { to: '/member/points', icon: <Ticket className="h-5 w-5" />, label: t.coupons, value: String(Math.max(0, Math.floor(points / 100))), color: 'bg-orange-50 text-orange-600' },
    { to: '/shop', icon: <Star className="h-5 w-5" />, label: t.reviews, value: '0', color: 'bg-yellow-50 text-yellow-700' },
    { to: '/ai/passport', icon: <MapPin className="h-5 w-5" />, label: t.footprint, value: `${completedBookings.length}/${totalNights}`, color: 'bg-teal-50 text-teal-700' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2C1F10] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-gradient-to-r from-[#C09A6A] to-[#D4B488] p-6 text-white">
        <h1 className="mb-1 text-2xl font-bold">
          {t.welcome}，{profile?.display_name || 'Traveler'}！
        </h1>
        <p className="text-blue-100">
          {t.points}：<strong className="text-xl text-yellow-300">{points.toLocaleString()}</strong>
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {quickLinks.map((link, index) => (
          <motion.div key={link.to} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
            <Link to={link.to} className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center shadow-sm transition hover:shadow-md">
              <div className={`rounded-xl p-3 ${link.color}`}>{link.icon}</div>
              <span className="text-sm font-medium text-gray-700">{link.label}</span>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">{t.memberTools}</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {valueTools.map(tool => (
            <Link key={tool.label} to={tool.to} className="rounded-xl border border-gray-100 p-4 transition hover:border-[#C09A6A] hover:shadow-sm">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tool.color}`}>{tool.icon}</div>
              <p className="text-sm font-medium text-gray-800">{tool.label}</p>
              <p className="mt-1 text-xl font-bold text-[#2C1F10]">{tool.value}</p>
            </Link>
          ))}
        </div>
        <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-3">
          <p>{t.staysCount}：<span className="font-semibold text-gray-900">{completedBookings.length}</span></p>
          <p>{t.citiesCount}：<span className="font-semibold text-gray-900">{exploredCities}</span></p>
          <p>{t.nightsCount}：<span className="font-semibold text-gray-900">{totalNights}</span></p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <BedDouble className="h-5 w-5 text-[#2C1F10]" />
              {t.recentBookings}
            </h2>
            <Link to="/member/bookings" className="flex items-center gap-1 text-sm text-[#2C1F10] hover:underline">
              {t.viewAll}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {bookings.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">{t.noBooking}</p>
          ) : (
            <div className="space-y-3">
              {bookings.slice(0, 2).map(item => (
                <div key={item.id} className="flex items-center justify-between border-b border-gray-50 py-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.tbl_rooms?.name || t.room}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(item.check_in_date, dateLocale)} ~ {formatDate(item.check_out_date, dateLocale)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(item.status)}`}>{getStatusLabel(item.status, lang)}</span>
                    <p className="mt-0.5 text-sm font-semibold text-gray-900">{formatCurrency(item.total_price)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <ShoppingBag className="h-5 w-5 text-[#0D9488]" />
              {t.recentOrders}
            </h2>
            <Link to="/member/orders" className="flex items-center gap-1 text-sm text-[#2C1F10] hover:underline">
              {t.viewAll}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {orders.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">{t.noOrders}</p>
          ) : (
            <div className="space-y-3">
              {orders.map(item => (
                <div key={item.id} className="flex items-center justify-between border-b border-gray-50 py-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">#{item.id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-gray-400">{formatDate(item.created_at, dateLocale)}</p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(item.status)}`}>{getStatusLabel(item.status, lang)}</span>
                    <p className="mt-0.5 text-sm font-semibold text-gray-900">{formatCurrency(item.total_amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



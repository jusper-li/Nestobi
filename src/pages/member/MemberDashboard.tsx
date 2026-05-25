import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BedDouble, BookMarked, ChevronRight, Receipt, Settings, ShoppingBag, Star, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';

interface Booking {
  id: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  status: string;
  tbl_rooms: { name: string } | null;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function MemberDashboard() {
  const { user, profile } = useAuth();
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const [points, setPoints] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const t = {
    welcome: isEn ? 'Welcome back' : '歡迎回來',
    points: isEn ? 'Current points' : '目前點數',
    profile: isEn ? 'Profile' : '個人資料',
    bookings: isEn ? 'My Bookings' : '我的訂房',
    orders: isEn ? 'My Orders' : '我的訂單',
    purchases: isEn ? 'Purchases' : '購買紀錄',
    myPoints: isEn ? 'My Points' : '我的點數',
    preferences: isEn ? 'Preferences' : '偏好設定',
    passport: isEn ? 'Travel Passport' : '旅遊護照',
    recentBookings: isEn ? 'Recent Bookings' : '近期訂房',
    recentOrders: isEn ? 'Recent Orders' : '近期訂單',
    viewAll: isEn ? 'View all' : '查看全部',
    noBooking: isEn ? 'No bookings yet' : '目前沒有訂房紀錄',
    noOrders: isEn ? 'No orders yet' : '目前沒有訂單紀錄',
    room: isEn ? 'Room' : '房型',
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const [{ data: pts }, { data: bks }, { data: ords }] = await Promise.all([
        supabase.from('points').select('amount').eq('user_id', user.id),
        supabase
          .from('tbl_bookings')
          .select('*, tbl_rooms(name)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(2),
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
              {bookings.map(item => (
                <div key={item.id} className="flex items-center justify-between border-b border-gray-50 py-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.tbl_rooms?.name || t.room}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(item.check_in_date, isEn ? 'en-US' : 'zh-TW')} ~ {formatDate(item.check_out_date, isEn ? 'en-US' : 'zh-TW')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(item.status)}`}>
                      {getStatusLabel(item.status, lang)}
                    </span>
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
                    <p className="text-xs text-gray-400">{formatDate(item.created_at, isEn ? 'en-US' : 'zh-TW')}</p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(item.status)}`}>
                      {getStatusLabel(item.status, lang)}
                    </span>
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

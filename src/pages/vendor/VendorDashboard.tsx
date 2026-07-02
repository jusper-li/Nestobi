import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BedDouble,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  DollarSign,
  LogIn,
  LogOut,
  RefreshCcw,
  ShoppingBag,
  Store,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';

type Period = 'today' | 'week' | 'month';

interface Room {
  id: string;
  name: string;
  room_type: string;
  is_available: boolean;
}

interface Booking {
  id: string;
  user_id: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  payment_status?: string | null;
  status: string;
  tbl_rooms?: { name: string } | null;
}

interface CustomerProfile {
  user_id: string;
  display_name: string;
  phone: string;
}

const PERIOD_LABELS: Record<Period, string> = {
  today: '今天',
  week: '本週',
  month: '本月',
};

const today = () => new Date().toISOString().split('T')[0];
const weekStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
};
const monthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const periodStart = (p: Period) => (p === 'today' ? today() : p === 'week' ? weekStart() : monthStart());

const VendorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [loading, setLoading] = useState(true);
  const [noVendor, setNoVendor] = useState(false);
  const [period, setPeriod] = useState<Period>('week');
  const [refreshing, setRefreshing] = useState(false);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [periodStats, setPeriodStats] = useState({ revenue: 0, bookings: 0, checkins: 0 });
  const [todayCheckins, setTodayCheckins] = useState<Booking[]>([]);
  const [todayCheckouts, setTodayCheckouts] = useState<Booking[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [bookingProfiles, setBookingProfiles] = useState<Record<string, CustomerProfile>>({});

  const loadData = async (vid: string, currentPeriod: Period) => {
    const start = periodStart(currentPeriod);
    const todayStr = today();

    const [roomsRes, statsRes, checkinsRes, checkoutsRes, recentRes] = await Promise.all([
      supabase.from('tbl_rooms').select('id, name, room_type, is_available').eq('vendor_id', vid).order('name'),
      supabase.from('tbl_bookings').select('total_price, status, tbl_rooms!inner(vendor_id)').eq('tbl_rooms.vendor_id', vid).gte('created_at', start),
      supabase.from('tbl_bookings').select('id, user_id, check_in_date, check_out_date, total_price, payment_status, status, tbl_rooms(name)').eq('tbl_rooms.vendor_id', vid).eq('check_in_date', todayStr).neq('status', 'cancelled').order('check_in_date'),
      supabase.from('tbl_bookings').select('id, user_id, check_in_date, check_out_date, total_price, payment_status, status, tbl_rooms(name)').eq('tbl_rooms.vendor_id', vid).eq('check_out_date', todayStr).neq('status', 'cancelled').order('check_out_date'),
      supabase.from('tbl_bookings').select('id, user_id, check_in_date, check_out_date, total_price, payment_status, status, tbl_rooms(name)').eq('tbl_rooms.vendor_id', vid).order('created_at', { ascending: false }).limit(6),
    ]);

    const roomList = (roomsRes.data || []) as Room[];
    setRooms(roomList);

    const bookingList = (statsRes.data || []) as Booking[];
    setPeriodStats({
      revenue: bookingList.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.total_price || 0), 0),
      bookings: bookingList.length,
      checkins: bookingList.filter(b => b.status !== 'cancelled').length,
    });

    const checkinList = (checkinsRes.data || []) as Booking[];
    const checkoutList = (checkoutsRes.data || []) as Booking[];
    const recentList = (recentRes.data || []) as Booking[];
    setTodayCheckins(checkinList);
    setTodayCheckouts(checkoutList);
    setRecentBookings(recentList);

    const userIds = Array.from(new Set([...checkinList, ...checkoutList, ...recentList].map(row => row.user_id).filter(Boolean)));
    if (userIds.length === 0) {
      setBookingProfiles({});
      return;
    }

    const { data: profiles } = await supabase.from('tbl_mn5wgzh0').select('user_id, display_name, phone').in('user_id', userIds);
    setBookingProfiles(Object.fromEntries((profiles || []).map((profile: any) => [profile.user_id, profile])));
  };

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      const { data: vendor } = await supabase.from('vendors').select('id, name').eq('user_id', user.id).maybeSingle();
      if (!vendor) {
        setNoVendor(true);
        setLoading(false);
        return;
      }

      setVendorId(vendor.id);
      setVendorName(vendor.name);
      await loadData(vendor.id, period);
      setLoading(false);
    };

    init();
  }, [user]);

  useEffect(() => {
    if (!vendorId) return;
    loadData(vendorId, period);
  }, [vendorId, period]);

  const handleRefresh = async () => {
    if (!vendorId) return;
    setRefreshing(true);
    await loadData(vendorId, period);
    setRefreshing(false);
  };

  const availableRooms = rooms.filter(room => room.is_available).length;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (noVendor) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <AlertCircle className="mb-3 h-12 w-12 text-yellow-400" />
        <p className="text-gray-600">找不到廠商資料，請聯絡管理員。</p>
      </div>
    );
  }

  const BookingRow = ({ booking }: { booking: Booking }) => {
    const profile = bookingProfiles[booking.user_id];
    return (
      <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
          <BedDouble className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{booking.tbl_rooms?.name || '—'}</p>
          <p className="truncate text-xs text-gray-500">
            {profile?.display_name || 'Guest'}{profile?.phone ? ` · ${profile.phone}` : ''}
          </p>
          <p className="text-xs text-gray-400">{formatDate(booking.check_in_date)} — {formatDate(booking.check_out_date)}</p>
        </div>
        <div className="flex-shrink-0 space-y-1 text-right">
          <p className="text-sm font-semibold text-gray-900">{formatCurrency(booking.total_price)}</p>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${booking.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {booking.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
          </span>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(booking.status)}`}>{getStatusLabel(booking.status)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-2.5">
            <Store className="h-6 w-6 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight text-gray-900">{vendorName}</h1>
            <p className="mt-0.5 text-sm text-gray-400">{new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className={`flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 transition hover:bg-emerald-50 hover:text-emerald-600 ${refreshing ? 'opacity-50' : ''}`}
        >
          <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          重新整理
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-2 shadow-sm sm:grid-cols-4">
        {[
          { icon: <DollarSign className="h-4 w-4" />, label: `${PERIOD_LABELS[period]}營收`, value: formatCurrency(periodStats.revenue), color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: <ShoppingBag className="h-4 w-4" />, label: `${PERIOD_LABELS[period]}訂房`, value: `${periodStats.bookings} 筆`, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: <BedDouble className="h-4 w-4" />, label: '房型總數', value: `${rooms.length} 間`, color: 'text-slate-600', bg: 'bg-slate-50' },
          { icon: <CheckCircle2 className="h-4 w-4" />, label: '可售房數', value: `${availableRooms} 間`, color: 'text-teal-600', bg: 'bg-teal-50' },
        ].map((stat, index) => (
          <motion.div key={index} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="flex items-center gap-3 p-4">
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}>{stat.icon}</div>
            <div>
              <p className="text-xs leading-tight text-gray-400">{stat.label}</p>
              <p className={`mt-0.5 text-lg font-bold leading-tight ${stat.color}`}>{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <LogIn className="h-4 w-4 text-green-500" />
              <span className="text-sm font-semibold text-gray-900">今日入住</span>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{todayCheckins.length}</span>
            </div>
            <Link to="/vendor/orders" className="flex items-center gap-0.5 text-xs text-emerald-600 transition hover:text-emerald-700">
              查看全部 <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {todayCheckins.length === 0 ? (
            <div className="py-10 text-center text-gray-300">
              <LogIn className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm text-gray-400">今天沒有入住訂單</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {todayCheckins.map(booking => <BookingRow key={booking.id} booking={booking} />)}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <LogOut className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-semibold text-gray-900">今日退房</span>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">{todayCheckouts.length}</span>
            </div>
            <Link to="/vendor/orders" className="flex items-center gap-0.5 text-xs text-emerald-600 transition hover:text-emerald-700">
              查看全部 <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {todayCheckouts.length === 0 ? (
            <div className="py-10 text-center text-gray-300">
              <LogOut className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm text-gray-400">今天沒有退房訂單</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {todayCheckouts.map(booking => <BookingRow key={booking.id} booking={booking} />)}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-gray-900">近期訂房</span>
          </div>
          <Link to="/vendor/orders" className="flex items-center gap-0.5 text-xs text-emerald-600 transition hover:text-emerald-700">
            查看全部 <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recentBookings.length === 0 ? (
          <div className="py-12 text-center">
            <Calendar className="mx-auto mb-2 h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-400">目前沒有最近訂房資料</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentBookings.map(booking => <BookingRow key={booking.id} booking={booking} />)}
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { to: '/vendor/rooms', icon: <BedDouble className="h-5 w-5 text-emerald-600" />, label: '房型管理', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { to: '/vendor/housekeeping', icon: <ClipboardList className="h-5 w-5 text-teal-600" />, label: '房務管理', bg: 'bg-teal-50', border: 'border-teal-200' },
          { to: '/vendor/products', icon: <Store className="h-5 w-5 text-blue-600" />, label: '商品管理', bg: 'bg-blue-50', border: 'border-[#D5CDB8]' },
          { to: '/vendor/orders', icon: <ShoppingBag className="h-5 w-5 text-amber-600" />, label: '訂單管理', bg: 'bg-amber-50', border: 'border-amber-200' },
        ].map((item, index) => (
          <Link key={index} to={item.to} className={`flex items-center gap-2.5 rounded-2xl border p-3.5 transition hover:brightness-95 hover:shadow-sm ${item.bg} ${item.border}`}>
            {item.icon}
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
            <ArrowRight className="ml-auto h-3.5 w-3.5 text-gray-400" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default VendorDashboard;

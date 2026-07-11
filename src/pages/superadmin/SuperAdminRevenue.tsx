import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Calendar, DollarSign, ShoppingBag, TrendingUp, BedDouble } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';

interface MonthlyData {
  month: string;
  label: string;
  bookingRevenue: number;
  orderRevenue: number;
  total: number;
}

interface TopVendor {
  vendor_name: string;
  room_count: number;
  booking_count: number;
  revenue: number;
}

const SuperAdminRevenue: React.FC = () => {
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);

  const [loading, setLoading] = useState(true);
  const [totalBookingRevenue, setTotalBookingRevenue] = useState(0);
  const [totalOrderRevenue, setTotalOrderRevenue] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [topVendors, setTopVendors] = useState<TopVendor[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date();
      const months: MonthlyData[] = [];

      for (let i = 5; i >= 0; i -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = date.toISOString().slice(0, 10);
        const label = `${date.getMonth() + 1}${pick('月', 'mo', '月', '월')}`;
        months.push({ month: start, label, bookingRevenue: 0, orderRevenue: 0, total: 0 });
      }

      const [{ data: bookings }, { data: orders }, { data: allOrders }, { data: vendorData }] = await Promise.all([
        supabase.from('tbl_bookings').select('total_price, created_at').eq('status', 'completed'),
        supabase.from('orders').select('total_amount, created_at').eq('payment_status', 'paid'),
        supabase.from('orders').select('id, total_amount, status, payment_status, created_at').order('created_at', { ascending: false }).limit(8),
        supabase.from('vendors').select('id, name, tbl_rooms(id, tbl_bookings(total_price, status))').eq('is_active', true).limit(10),
      ]);

      for (const month of months) {
        const monthStart = new Date(month.month);
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);

        const bookingRevenue = (bookings || [])
          .filter((booking: any) => {
            const createdAt = new Date(booking.created_at);
            return createdAt >= monthStart && createdAt <= monthEnd;
          })
          .reduce((sum: number, booking: any) => sum + (booking.total_price || 0), 0);

        const orderRevenue = (orders || [])
          .filter((order: any) => {
            const createdAt = new Date(order.created_at);
            return createdAt >= monthStart && createdAt <= monthEnd;
          })
          .reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0);

        month.bookingRevenue = bookingRevenue;
        month.orderRevenue = orderRevenue;
        month.total = bookingRevenue + orderRevenue;
      }

      const totalBR = (bookings || []).reduce((sum: number, booking: any) => sum + (booking.total_price || 0), 0);
      const totalOR = (orders || []).reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0);

      const vendorRevenues: TopVendor[] = (vendorData || [])
        .map((vendor: any) => {
          const rooms = vendor.tbl_rooms || [];
          const bookingCount = rooms.reduce((sum: number, room: any) => sum + (room.tbl_bookings?.length || 0), 0);
          const revenue = rooms.reduce(
            (sum: number, room: any) =>
              sum +
              (room.tbl_bookings || [])
                .filter((booking: any) => booking.status === 'completed')
                .reduce((bookingSum: number, booking: any) => bookingSum + (booking.total_price || 0), 0),
            0,
          );
          return { vendor_name: vendor.name, room_count: rooms.length, booking_count: bookingCount, revenue };
        })
        .sort((a: TopVendor, b: TopVendor) => b.revenue - a.revenue);

      setTotalBookingRevenue(totalBR);
      setTotalOrderRevenue(totalOR);
      setMonthlyData(months);
      setTopVendors(vendorRevenues);
      setRecentOrders(allOrders || []);
      setLoading(false);
    };

    fetchData();
  }, [pick]);

  const maxBar = Math.max(...monthlyData.map(month => month.total), 1);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-xl bg-amber-100 p-2">
          <BarChart2 className="h-6 w-6 text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pick('營收總覽', 'Revenue Overview', '売上概要', '매출 개요')}</h1>
          <p className="text-sm text-gray-400">{pick('檢視訂房與訂單的整體營收表現。', 'View overall booking and order revenue performance.', '宿泊と注文の収益状況を確認します。', '숙박과 주문의 매출 현황을 확인합니다.')}</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { icon: <DollarSign className="h-5 w-5 text-amber-600" />, label: pick('總營收', 'Total revenue', '総売上', '총 매출'), value: formatCurrency(totalBookingRevenue + totalOrderRevenue), color: 'bg-amber-50' },
          { icon: <BedDouble className="h-5 w-5 text-teal-600" />, label: pick('訂房營收', 'Booking revenue', '宿泊売上', '숙박 매출'), value: formatCurrency(totalBookingRevenue), color: 'bg-teal-50' },
          { icon: <ShoppingBag className="h-5 w-5 text-blue-600" />, label: pick('商店營收', 'Order revenue', '注文売上', '주문 매출'), value: formatCurrency(totalOrderRevenue), color: 'bg-blue-50' },
          { icon: <TrendingUp className="h-5 w-5 text-green-600" />, label: pick('最近一月', 'Latest month', '直近1か月', '최근 1개월'), value: formatCurrency(monthlyData[monthlyData.length - 1]?.total || 0), color: 'bg-green-50' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-2xl bg-white p-5 shadow-sm"
          >
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>{stat.icon}</div>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-5 flex items-center gap-2 font-semibold text-gray-900">
          <Calendar className="h-5 w-5 text-amber-600" />
          {pick('近六個月營收趨勢', 'Revenue trend for the last 6 months', '直近6か月の売上推移', '최근 6개월 매출 추이')}
        </h3>
        <div className="flex h-40 items-end gap-3">
          {monthlyData.map((month, index) => (
            <div key={month.month} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-xs text-gray-400">{month.total > 0 ? formatCurrency(month.total).replace('NT$ ', '').replace(',000', 'K') : ''}</span>
              <div className="flex w-full flex-col justify-end gap-0.5" style={{ height: '112px' }}>
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: index * 0.08, duration: 0.4 }}
                  style={{ height: `${(month.orderRevenue / maxBar) * 80}px`, transformOrigin: 'bottom' }}
                  className="w-full rounded-t-sm bg-blue-400"
                />
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: index * 0.08 + 0.1, duration: 0.4 }}
                  style={{ height: `${(month.bookingRevenue / maxBar) * 80}px`, transformOrigin: 'bottom' }}
                  className="w-full rounded-t-sm bg-amber-400"
                />
              </div>
              <span className="text-xs font-medium text-gray-500">{month.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-amber-400" />
            <span className="text-xs text-gray-500">{pick('訂房營收', 'Booking revenue', '宿泊売上', '숙박 매출')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-blue-400" />
            <span className="text-xs text-gray-500">{pick('商店營收', 'Order revenue', '注文売上', '주문 매출')}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <TrendingUp className="h-5 w-5 text-amber-600" />
            {pick('合作商家營收排行', 'Top vendors by revenue', '売上上位の提携先', '매출 상위 공급사')}
          </h3>
          {topVendors.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">{pick('尚無合作商家資料', 'No vendor data yet', '提携先データがありません', '공급사 데이터가 없습니다')}</p>
          ) : (
            <div className="space-y-3">
              {topVendors.slice(0, 5).map((vendor, index) => (
                <div key={vendor.vendor_name} className="flex items-center justify-between border-b border-gray-50 py-2 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-600'}`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{vendor.vendor_name}</p>
                      <p className="text-xs text-gray-400">
                        {vendor.room_count} {pick('間房', 'rooms', '部屋', '개')} · {vendor.booking_count} {pick('筆訂房', 'bookings', '件の予約', '건의 예약')}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(vendor.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <ShoppingBag className="h-5 w-5 text-blue-600" />
            {pick('最近訂單', 'Recent orders', '最近の注文', '최근 주문')}
          </h3>
          <div className="space-y-2">
            {recentOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between border-b border-gray-50 py-2 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">#{order.id.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total_amount)}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(order.payment_status)}`}>{getStatusLabel(order.payment_status)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminRevenue;

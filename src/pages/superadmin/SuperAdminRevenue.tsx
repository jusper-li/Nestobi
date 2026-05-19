import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, DollarSign, TrendingUp, ShoppingBag, BedDouble, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';

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
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = d.toISOString().slice(0, 10);
        const label = `${d.getMonth() + 1}月`;
        months.push({ month: start, label, bookingRevenue: 0, orderRevenue: 0, total: 0 });
      }

      const [{ data: bookings }, { data: orders }, { data: allOrders }, { data: vendorData }] = await Promise.all([
        supabase.from('tbl_bookings').select('total_price, created_at').eq('status', 'completed'),
        supabase.from('orders').select('total_amount, created_at').eq('payment_status', 'paid'),
        supabase.from('orders').select('id, total_amount, status, payment_status, created_at').order('created_at', { ascending: false }).limit(8),
        supabase.from('vendors').select('id, name, tbl_rooms(id, tbl_bookings(total_price, status))').eq('is_active', true).limit(10),
      ]);

      let totalBR = 0, totalOR = 0;

      for (const m of months) {
        const mStart = new Date(m.month);
        const mEnd = new Date(mStart.getFullYear(), mStart.getMonth() + 1, 0, 23, 59, 59);
        const br = (bookings || []).filter((b: any) => { const d = new Date(b.created_at); return d >= mStart && d <= mEnd; }).reduce((s: number, b: any) => s + (b.total_price || 0), 0);
        const or = (orders || []).filter((o: any) => { const d = new Date(o.created_at); return d >= mStart && d <= mEnd; }).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
        m.bookingRevenue = br;
        m.orderRevenue = or;
        m.total = br + or;
      }

      totalBR = (bookings || []).reduce((s: number, b: any) => s + (b.total_price || 0), 0);
      totalOR = (orders || []).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);

      const vendorRevenues: TopVendor[] = (vendorData || []).map((v: any) => {
        const rooms = v.tbl_rooms || [];
        const bookingCount = rooms.reduce((s: number, r: any) => s + (r.tbl_bookings?.length || 0), 0);
        const revenue = rooms.reduce((s: number, r: any) => s + (r.tbl_bookings || []).filter((b: any) => b.status === 'completed').reduce((bs: number, b: any) => bs + (b.total_price || 0), 0), 0);
        return { vendor_name: v.name, room_count: rooms.length, booking_count: bookingCount, revenue };
      }).sort((a: TopVendor, b: TopVendor) => b.revenue - a.revenue);

      setTotalBookingRevenue(totalBR);
      setTotalOrderRevenue(totalOR);
      setMonthlyData(months);
      setTopVendors(vendorRevenues);
      setRecentOrders(allOrders || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const maxBar = Math.max(...monthlyData.map(m => m.total), 1);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-amber-100 rounded-xl"><BarChart2 className="w-6 h-6 text-amber-700" /></div>
        <h1 className="text-2xl font-bold text-gray-900">營收報表</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <DollarSign className="w-5 h-5 text-amber-600" />, label: '總營收', value: formatCurrency(totalBookingRevenue + totalOrderRevenue), color: 'bg-amber-50' },
          { icon: <BedDouble className="w-5 h-5 text-teal-600" />, label: '訂房收入', value: formatCurrency(totalBookingRevenue), color: 'bg-teal-50' },
          { icon: <ShoppingBag className="w-5 h-5 text-blue-600" />, label: '訂單收入', value: formatCurrency(totalOrderRevenue), color: 'bg-blue-50' },
          { icon: <TrendingUp className="w-5 h-5 text-green-600" />, label: '本月營收', value: formatCurrency(monthlyData[monthlyData.length - 1]?.total || 0), color: 'bg-green-50' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl shadow-sm p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>{s.icon}</div>
            <p className="text-gray-500 text-sm">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-600" />近六個月營收趨勢
        </h3>
        <div className="flex items-end gap-3 h-40">
          {monthlyData.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-xs text-gray-400">{m.total > 0 ? formatCurrency(m.total).replace('NT$ ', '').replace(',000', 'K') : ''}</span>
              <div className="w-full flex flex-col gap-0.5 justify-end" style={{ height: '112px' }}>
                <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.08, duration: 0.4 }} style={{ height: `${(m.orderRevenue / maxBar) * 80}px`, transformOrigin: 'bottom' }} className="w-full bg-blue-400 rounded-t-sm" />
                <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.08 + 0.1, duration: 0.4 }} style={{ height: `${(m.bookingRevenue / maxBar) * 80}px`, transformOrigin: 'bottom' }} className="w-full bg-amber-400 rounded-t-sm" />
              </div>
              <span className="text-xs text-gray-500 font-medium">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-400 rounded-sm" /><span className="text-xs text-gray-500">訂房收入</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-400 rounded-sm" /><span className="text-xs text-gray-500">訂單收入</span></div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-amber-600" />廠商營收排行</h3>
          {topVendors.length === 0 ? <p className="text-gray-400 text-center py-6 text-sm">暫無廠商數據</p> : (
            <div className="space-y-3">
              {topVendors.slice(0, 5).map((v, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-600'}`}>{i + 1}</span>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{v.vendor_name}</p>
                      <p className="text-xs text-gray-400">{v.room_count} 間房 · {v.booking_count} 筆訂房</p>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">{formatCurrency(v.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-blue-600" />最近訂單</h3>
          <div className="space-y-2">
            {recentOrders.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">#{o.id.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-gray-400">{formatDate(o.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 text-sm">{formatCurrency(o.total_amount)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(o.payment_status)}`}>{getStatusLabel(o.payment_status)}</span>
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

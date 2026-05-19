import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BedDouble, ShoppingBag, DollarSign, Users, Package, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '../../lib/utils';

interface Stats { totalBookings: number; totalOrders: number; totalRevenue: number; activeUsers: number; activeRooms: number; activeProducts: number; }
interface RecentBooking { id: string; total_price: number; status: string; created_at: string; tbl_rooms: { name: string } | null; }
interface RecentOrder { id: string; total_amount: number; status: string; created_at: string; }

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string; delay: number }> = ({ icon, label, value, color, delay }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="bg-white rounded-2xl shadow-sm p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
      <p className="text-gray-500 text-sm">{label}</p>
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </motion.div>
);

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({ totalBookings: 0, totalOrders: 0, totalRevenue: 0, activeUsers: 0, activeRooms: 0, activeProducts: 0 });
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [{ count: bkCount }, { count: ordCount }, { data: revenue }, { count: usrCount }, { count: rmCount }, { count: prCount }, { data: bks }, { data: ords }] = await Promise.all([
        supabase.from('tbl_bookings').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total_amount').eq('payment_status', 'paid'),
        supabase.from('tbl_user_auth').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('tbl_rooms').select('*', { count: 'exact', head: true }).eq('is_available', true),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('tbl_bookings').select('*, tbl_rooms(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
      ]);
      const totalRev = (revenue || []).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
      setStats({ totalBookings: bkCount || 0, totalOrders: ordCount || 0, totalRevenue: totalRev, activeUsers: usrCount || 0, activeRooms: rmCount || 0, activeProducts: prCount || 0 });
      setRecentBookings((bks as any) || []);
      setRecentOrders(ords || []);

      const { data: monthlyOrders } = await supabase
        .from('orders')
        .select('total_amount, created_at, payment_status')
        .eq('payment_status', 'paid');
      const now = new Date();
      const monthlyMap: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[key] = 0;
      }
      (monthlyOrders || []).forEach((o: any) => {
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key in monthlyMap) monthlyMap[key] += o.total_amount || 0;
      });
      const MONTH_LABELS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
      setRevenueData(
        Object.entries(monthlyMap).map(([key, value]) => ({
          label: MONTH_LABELS[parseInt(key.split('-')[1]) - 1],
          value,
        }))
      );
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" /></div>;

  const maxRev = Math.max(...revenueData.map(d => d.value));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">管理儀表板</h1>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={<BedDouble className="w-5 h-5 text-[#2C1F10]" />} label="總訂房數" value={stats.totalBookings} color="bg-[#F0E4C8]" delay={0.05} />
        <StatCard icon={<ShoppingBag className="w-5 h-5 text-purple-600" />} label="總訂單數" value={stats.totalOrders} color="bg-purple-50" delay={0.1} />
        <StatCard icon={<DollarSign className="w-5 h-5 text-green-600" />} label="總營收" value={formatCurrency(stats.totalRevenue)} color="bg-green-50" delay={0.15} />
        <StatCard icon={<Users className="w-5 h-5 text-orange-500" />} label="活躍用戶" value={stats.activeUsers} color="bg-orange-50" delay={0.2} />
        <StatCard icon={<BedDouble className="w-5 h-5 text-[#0D9488]" />} label="可用房型" value={stats.activeRooms} color="bg-teal-50" delay={0.25} />
        <StatCard icon={<Package className="w-5 h-5 text-pink-500" />} label="上架商品" value={stats.activeProducts} color="bg-pink-50" delay={0.3} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-[#2C1F10]" />月度營收趨勢</h3>
        <div className="flex items-end gap-3 h-32">
          {revenueData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div initial={{ height: 0 }} animate={{ height: `${(d.value / maxRev) * 100}%` }} transition={{ delay: i * 0.1, duration: 0.5 }} className="w-full bg-gradient-to-t from-[#C09A6A] to-[#D4B488] rounded-t-lg min-h-[4px]" style={{ height: `${(d.value / maxRev) * 100}%` }} />
              <span className="text-xs text-gray-500">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">近期訂房</h3>
          <div className="space-y-3">
            {recentBookings.map(b => (
              <div key={b.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div><p className="text-sm font-medium text-gray-900">{b.tbl_rooms?.name || '房型'}</p><p className="text-xs text-gray-400">{formatDate(b.created_at)}</p></div>
                <div className="text-right"><span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(b.status)}`}>{getStatusLabel(b.status)}</span><p className="text-sm font-semibold text-gray-900 mt-0.5">{formatCurrency(b.total_price)}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">近期訂單</h3>
          <div className="space-y-3">
            {recentOrders.map(o => (
              <div key={o.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div><p className="text-sm font-medium text-gray-900">#{o.id.slice(-8).toUpperCase()}</p><p className="text-xs text-gray-400">{formatDate(o.created_at)}</p></div>
                <div className="text-right"><span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(o.status)}`}>{getStatusLabel(o.status)}</span><p className="text-sm font-semibold text-gray-900 mt-0.5">{formatCurrency(o.total_amount)}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

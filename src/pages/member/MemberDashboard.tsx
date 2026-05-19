import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BedDouble, ShoppingBag, Star, Settings, User, Receipt, ChevronRight, BookMarked } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface Booking { id: string; check_in_date: string; check_out_date: string; total_price: number; status: string; tbl_rooms: { name: string } | null; }
interface Order { id: string; total_amount: number; status: string; created_at: string; }

const MemberDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [points, setPoints] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const [{ data: pts }, { data: bks }, { data: ords }] = await Promise.all([
        supabase.from('points').select('amount').eq('user_id', user.id),
        supabase.from('tbl_bookings').select('*, tbl_rooms(name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(2),
        supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(2),
      ]);
      setPoints((pts || []).reduce((s: number, p: any) => s + (p.amount || 0), 0));
      setBookings((bks as any) || []);
      setOrders(ords || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const quickLinks = [
    { to: '/member/profile', icon: <User className="w-6 h-6" />, label: '個人資料', color: 'bg-[#F0E4C8] text-[#2C1F10]' },
    { to: '/member/bookings', icon: <BedDouble className="w-6 h-6" />, label: '我的訂房', color: 'bg-teal-50 text-[#0D9488]' },
    { to: '/member/orders', icon: <ShoppingBag className="w-6 h-6" />, label: '我的訂單', color: 'bg-purple-50 text-purple-600' },
    { to: '/member/purchases', icon: <Receipt className="w-6 h-6" />, label: '購買紀錄', color: 'bg-orange-50 text-orange-600' },
    { to: '/member/points', icon: <Star className="w-6 h-6" />, label: '我的點數', color: 'bg-yellow-50 text-yellow-600' },
    { to: '/member/preferences', icon: <Settings className="w-6 h-6" />, label: '偏好設定', color: 'bg-gray-50 text-gray-600' },
    { to: '/ai/passport', icon: <BookMarked className="w-6 h-6" />, label: '旅遊護照', color: 'bg-amber-50 text-amber-700' },
  ];

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-[#C09A6A] to-[#D4B488] rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">歡迎回來，{profile?.display_name || '旅遊夥伴'}！</h1>
        <p className="text-blue-100">目前點數餘額：<strong className="text-yellow-300 text-xl">{points.toLocaleString()}</strong> 點</p>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {quickLinks.map((link, i) => (
          <motion.div key={link.to} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={link.to} className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition text-center">
              <div className={`p-3 rounded-xl ${link.color}`}>{link.icon}</div>
              <span className="text-sm font-medium text-gray-700">{link.label}</span>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><BedDouble className="w-5 h-5 text-[#2C1F10]" />近期訂房</h2>
            <Link to="/member/bookings" className="text-[#2C1F10] text-sm hover:underline flex items-center gap-1">查看全部<ChevronRight className="w-4 h-4" /></Link>
          </div>
          {bookings.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">尚無訂房紀錄</p> : (
            <div className="space-y-3">
              {bookings.map(b => (
                <div key={b.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{b.tbl_rooms?.name || '房型'}</p>
                    <p className="text-gray-400 text-xs">{formatDate(b.check_in_date)} ~ {formatDate(b.check_out_date)}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(b.status)}`}>{getStatusLabel(b.status)}</span>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{formatCurrency(b.total_price)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-[#0D9488]" />近期訂單</h2>
            <Link to="/member/orders" className="text-[#2C1F10] text-sm hover:underline flex items-center gap-1">查看全部<ChevronRight className="w-4 h-4" /></Link>
          </div>
          {orders.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">尚無訂單紀錄</p> : (
            <div className="space-y-3">
              {orders.map(o => (
                <div key={o.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">#{o.id.slice(-8).toUpperCase()}</p>
                    <p className="text-gray-400 text-xs">{formatDate(o.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(o.status)}`}>{getStatusLabel(o.status)}</span>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{formatCurrency(o.total_amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberDashboard;

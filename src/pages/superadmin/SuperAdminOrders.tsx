import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, BedDouble, ShoppingBag, DollarSign, Search, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/utils';

type TabType = 'shop' | 'booking';

interface ShopOrder {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  display_name?: string;
}

interface BookingOrder {
  id: string;
  user_id: string;
  total_price: number;
  status: string;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  created_at: string;
  display_name?: string;
  room_name?: string;
}

const SHOP_STATUS_LABELS: Record<string, string> = { pending: '待處理', processing: '處理中', shipped: '已出貨', completed: '已完成', cancelled: '已取消' };
const BOOKING_STATUS_LABELS: Record<string, string> = { pending: '待確認', confirmed: '已確認', cancelled: '已取消', completed: '已完成' };

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-cyan-100 text-cyan-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  confirmed: 'bg-green-100 text-green-700',
};

const SuperAdminOrders: React.FC = () => {
  const location = useLocation();
  const initialParams = new URLSearchParams(location.search);
  const [tab, setTab] = useState<TabType>(initialParams.get('tab') === 'booking' ? 'booking' : 'shop');
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>([]);
  const [bookingOrders, setBookingOrders] = useState<BookingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setTab(params.get('tab') === 'booking' ? 'booking' : 'shop');
    setSearch(params.get('q') || '');
  }, [location.search]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: orders }, { data: bookings }] = await Promise.all([
      supabase.from('orders').select('id, user_id, total_amount, status, payment_status, created_at').order('created_at', { ascending: false }),
      supabase.from('tbl_bookings').select('id, user_id, total_price, status, check_in_date, check_out_date, guests, created_at, tbl_rooms(name)').order('created_at', { ascending: false }),
    ]);

    const allUserIds = Array.from(new Set([
      ...(orders || []).map((o: any) => o.user_id),
      ...(bookings || []).map((b: any) => b.user_id),
    ]));

    let profileMap: Record<string, string> = {};
    if (allUserIds.length > 0) {
      const { data: profiles } = await supabase.from('tbl_mn5wgzh0').select('user_id, display_name').in('user_id', allUserIds);
      profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.display_name]));
    }

    setShopOrders((orders || []).map((o: any) => ({ ...o, display_name: profileMap[o.user_id] })));
    setBookingOrders((bookings || []).map((b: any) => ({
      ...b,
      display_name: profileMap[b.user_id],
      room_name: b.tbl_rooms?.name,
    })));
    setLoading(false);
  };

  const shopRevenue = shopOrders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + o.total_amount, 0);
  const bookingRevenue = bookingOrders.filter(b => b.status === 'completed').reduce((s, b) => s + b.total_price, 0);

  const filteredShop = shopOrders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !search || o.id.toLowerCase().includes(q) || (o.display_name || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredBookings = bookingOrders.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !search || b.id.toLowerCase().includes(q) || (b.display_name || '').toLowerCase().includes(q) || (b.room_name || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const shopStatuses = ['all', 'pending', 'processing', 'shipped', 'completed', 'cancelled'];
  const bookingStatuses = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-xl"><Package className="w-6 h-6 text-amber-700" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">訂單數據</h1>
          <p className="text-sm text-gray-400">購物訂單與訂房紀錄全覽</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <ShoppingBag className="w-5 h-5 text-amber-600" />, label: '購物訂單數', value: shopOrders.length, color: 'bg-amber-50' },
          { icon: <BedDouble className="w-5 h-5 text-teal-600" />, label: '訂房筆數', value: bookingOrders.length, color: 'bg-teal-50' },
          { icon: <DollarSign className="w-5 h-5 text-green-600" />, label: '購物已收款', value: formatCurrency(shopRevenue), color: 'bg-green-50' },
          { icon: <DollarSign className="w-5 h-5 text-blue-600" />, label: '訂房已收款', value: formatCurrency(bookingRevenue), color: 'bg-blue-50' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl shadow-sm p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>{s.icon}</div>
            <p className="text-gray-500 text-sm">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl w-fit">
        {([['shop', '購物訂單', ShoppingBag], ['booking', '訂房紀錄', BedDouble]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setStatusFilter('all'); setSearch(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tab === 'shop' ? '搜尋訂單 ID 或用戶…' : '搜尋訂單 ID、用戶或房型…'}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex gap-1.5 flex-wrap">
            {(tab === 'shop' ? shopStatuses : bookingStatuses).map(s => {
              const labels: Record<string, string> = tab === 'shop' ? { ...SHOP_STATUS_LABELS, all: '全部' } : { ...BOOKING_STATUS_LABELS, all: '全部' };
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === s ? 'bg-amber-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {labels[s]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'shop' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">訂單編號</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">用戶</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">金額</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">付款</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">狀態</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">日期</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredShop.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">暫無訂單資料</td></tr>
                ) : filteredShop.map((o, i) => (
                  <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-amber-50/30">
                    <td className="px-5 py-3">
                      <span className="font-mono font-medium text-gray-900">#{o.id.slice(-10).toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-sm">{o.display_name || '用戶'}</p>
                      <p className="text-xs text-gray-400 font-mono">{o.user_id.slice(-8)}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(o.total_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {o.payment_status === 'paid' ? '已付款' : '待付款'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                        {SHOP_STATUS_LABELS[o.status] || o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(o.created_at)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">訂房 ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">用戶</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">房型</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">入住 / 退房</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">金額</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredBookings.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">暫無訂房資料</td></tr>
                ) : filteredBookings.map((b, i) => (
                  <motion.tr key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-amber-50/30">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-gray-500">#{b.id.slice(-10).toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-sm">{b.display_name || '用戶'}</p>
                      <p className="text-xs text-gray-400 font-mono">{b.user_id.slice(-8)}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{b.room_name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <div>{b.check_in_date}</div>
                      <div className="text-gray-400">{b.check_out_date}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(b.total_price)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-600'}`}>
                        {BOOKING_STATUS_LABELS[b.status] || b.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && (
        <p className="text-xs text-gray-400 text-right">
          顯示 {tab === 'shop' ? filteredShop.length : filteredBookings.length} 筆記錄
        </p>
      )}
    </div>
  );
};

export default SuperAdminOrders;

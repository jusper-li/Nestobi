import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, AlertCircle, BedDouble } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';

interface Booking {
  id: string;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  total_price: number;
  status: string;
  created_at: string;
  tbl_rooms?: { name: string; location: string };
}

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];
const STATUS_LABELS: Record<string, string> = { all: '全部', pending: '待確認', confirmed: '已確認', completed: '已完成', cancelled: '已取消' };

const VendorOrders: React.FC = () => {
  const { user } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [noVendor, setNoVendor] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('vendors').select('id').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (!data) { setNoVendor(true); setLoading(false); return; }
      setVendorId(data.id);
      fetchBookings(data.id).then(() => setLoading(false));
    });
  }, [user]);

  const fetchBookings = async (vid: string) => {
    const { data } = await supabase
      .from('tbl_bookings')
      .select('id, check_in_date, check_out_date, guests, total_price, status, created_at, tbl_rooms(name, location)')
      .eq('tbl_rooms.vendor_id', vid)
      .order('created_at', { ascending: false });
    setBookings((data || []) as unknown as Booking[]);
  };

  const updateStatus = async (bookingId: string, status: string) => {
    if (!vendorId) return;
    setUpdating(bookingId);
    await supabase.from('tbl_bookings').update({ status, updated_at: new Date().toISOString() }).eq('id', bookingId);
    await fetchBookings(vendorId);
    setUpdating(null);
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (noVendor) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <AlertCircle className="w-12 h-12 text-yellow-400 mb-3" />
      <p className="text-gray-600">帳號尚未關聯廠商，請聯絡管理員。</p>
    </div>
  );

  const filtered = statusFilter === 'all' ? bookings : bookings.filter(b => b.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-100 rounded-xl"><ShoppingBag className="w-6 h-6 text-emerald-700" /></div>
        <h1 className="text-2xl font-bold text-gray-900">訂單與訂房</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${statusFilter === s ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300'}`}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <BedDouble className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">目前沒有{statusFilter !== 'all' ? STATUS_LABELS[statusFilter] : ''}訂房</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{b.tbl_rooms?.name || '未知房間'}</p>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${getStatusColor(b.status)}`}>{getStatusLabel(b.status)}</span>
                  </div>
                  {b.tbl_rooms?.location && <p className="text-sm text-gray-400">{b.tbl_rooms.location}</p>}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>入住：{formatDate(b.check_in_date)}</span>
                    <span>退房：{formatDate(b.check_out_date)}</span>
                    <span>{b.guests} 人</span>
                  </div>
                  <p className="text-xs text-gray-400">下單時間：{formatDate(b.created_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-xl font-bold text-emerald-700">{formatCurrency(b.total_price)}</p>
                  {b.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(b.id, 'confirmed')} disabled={updating === b.id}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl transition disabled:opacity-60">
                        {updating === b.id ? '...' : '確認訂房'}
                      </button>
                      <button onClick={() => updateStatus(b.id, 'cancelled')} disabled={updating === b.id}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-xl transition disabled:opacity-60">
                        取消
                      </button>
                    </div>
                  )}
                  {b.status === 'confirmed' && (
                    <button onClick={() => updateStatus(b.id, 'completed')} disabled={updating === b.id}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium rounded-xl transition disabled:opacity-60">
                      {updating === b.id ? '...' : '標記完成'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VendorOrders;

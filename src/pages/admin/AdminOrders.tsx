import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/utils';

interface Order { id: string; user_id: string; total_amount: number; status: string; payment_status: string; payment_method: string; created_at: string; }

const STATUSES = ['all', 'pending', 'processing', 'completed', 'cancelled'];
const STATUS_OPTIONS = ['pending', 'processing', 'completed', 'cancelled'];

const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (filterStatus !== 'all') query = query.eq('status', filterStatus);
    const { data } = await query;
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [filterStatus]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const STATUS_LABELS: Record<string, string> = { pending: '待處理', processing: '處理中', completed: '已完成', cancelled: '已取消', all: '全部' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">訂單管理</h1>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex gap-1.5">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterStatus === s ? 'bg-[#C09A6A] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <table className="w-full">
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
                {orders.map((order, i) => (
                  <motion.tr key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-gray-300" />
                        <span className="text-sm font-mono font-medium text-gray-900">#{order.id.slice(-10).toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{order.user_id.slice(-8)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(order.total_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {order.payment_status === 'paid' ? '已付款' : '待付款'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select value={order.status} onChange={e => handleStatusChange(order.id, e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#2C1F10]">
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(order.created_at)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && orders.length === 0 && <div className="text-center py-12 text-gray-400">暫無訂單資料</div>}
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;

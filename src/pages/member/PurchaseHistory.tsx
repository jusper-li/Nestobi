import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Receipt, Calendar, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface PurchaseRecord {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  created_at: string;
  products: { name: string; image_url: string } | null;
}

const PurchaseHistory: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchRecords = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from('purchase_records').select('*, products(name, image_url)').eq('user_id', user.id).order('created_at', { ascending: false });
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate + 'T23:59:59');
    const { data } = await query;
    setRecords((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [user]);

  const handleFilter = (e: React.FormEvent) => { e.preventDefault(); fetchRecords(); };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Receipt className="w-5 h-5 text-orange-500" />購買紀錄</h2>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <form onSubmit={handleFilter} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">開始日期</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">結束日期</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" />
          </div>
          <button type="submit" className="flex items-center gap-1.5 bg-[#C09A6A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#8B6840] transition">
            <Filter className="w-4 h-4" />篩選
          </button>
          {(startDate || endDate) && (
            <button type="button" onClick={() => { setStartDate(''); setEndDate(''); setTimeout(fetchRecords, 0); }} className="text-gray-500 text-sm hover:text-gray-700 px-2 py-2 rounded-lg hover:bg-gray-50">清除</button>
          )}
        </form>
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <Receipt className="w-14 h-14 mx-auto mb-4 text-gray-200" />
          <p className="text-gray-400">暫無購買紀錄</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">商品</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">數量</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">單價</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">總價</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">日期</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((record, i) => (
                  <motion.tr key={record.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img src={record.products?.image_url || 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=60'} alt="" className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900 line-clamp-1">{record.products?.name || '商品'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(record.unit_price)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(record.total_price)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(record.created_at)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(record.status)}`}>{getStatusLabel(record.status)}</span></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseHistory;

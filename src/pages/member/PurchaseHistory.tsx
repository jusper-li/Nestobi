import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Filter, Receipt } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { localeByLang, normalizeLang } from '../../lib/i18n';

interface PurchaseRecord {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  created_at: string;
  products: { name: string; image_url: string } | null;
}

type UiLang = 'zh-TW' | 'en' | 'ja' | 'ko';

const copy: Record<UiLang, Record<string, string>> = {
  'zh-TW': {
    title: '購買紀錄',
    startDate: '開始日期',
    endDate: '結束日期',
    filter: '篩選',
    reset: '重設',
    noData: '目前沒有購買紀錄',
    product: '商品',
    qty: '數量',
    unitPrice: '單價',
    total: '總價',
    date: '日期',
    status: '狀態',
    unknown: '未知商品',
  },
  en: {
    title: 'Purchase History',
    startDate: 'Start Date',
    endDate: 'End Date',
    filter: 'Filter',
    reset: 'Reset',
    noData: 'No purchase records yet',
    product: 'Product',
    qty: 'Qty',
    unitPrice: 'Unit Price',
    total: 'Total',
    date: 'Date',
    status: 'Status',
    unknown: 'Unknown Product',
  },
  ja: {
    title: '購入履歴',
    startDate: '開始日',
    endDate: '終了日',
    filter: '絞り込み',
    reset: 'リセット',
    noData: '購入履歴はまだありません',
    product: '商品',
    qty: '数量',
    unitPrice: '単価',
    total: '合計',
    date: '日付',
    status: '状態',
    unknown: '不明な商品',
  },
  ko: {
    title: '구매 내역',
    startDate: '시작일',
    endDate: '종료일',
    filter: '필터',
    reset: '초기화',
    noData: '구매 내역이 없습니다',
    product: '상품',
    qty: '수량',
    unitPrice: '단가',
    total: '합계',
    date: '날짜',
    status: '상태',
    unknown: '알 수 없는 상품',
  },
};

const PurchaseHistory: React.FC = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang) as UiLang;
  const dateLocale = localeByLang(locale);
  const t = copy[locale];
  const [records, setRecords] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchRecords = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from('purchase_records').select('*, products(name, image_url)').eq('user_id', user.id).order('created_at', { ascending: false });
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`);
    const { data } = await query;
    setRecords((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [user]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords();
  };

  if (loading) return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2C1F10] border-t-transparent" /></div>;

  return (
    <div className="space-y-5">
      <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900"><Receipt className="h-5 w-5 text-orange-500" />{t.title}</h2>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <form onSubmit={handleFilter} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">{t.startDate}</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">{t.endDate}</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" />
          </div>
          <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-[#C09A6A] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#8B6840]">
            <Filter className="h-4 w-4" />
            {t.filter}
          </button>
          {(startDate || endDate) && (
            <button type="button" onClick={() => { setStartDate(''); setEndDate(''); setTimeout(fetchRecords, 0); }} className="rounded-lg px-2 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700">
              {t.reset}
            </button>
          )}
        </form>
      </div>

      {records.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
          <Receipt className="mx-auto mb-4 h-14 w-14 text-gray-200" />
          <p className="text-gray-400">{t.noData}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">{t.product}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">{t.qty}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">{t.unitPrice}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">{t.total}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">{t.date}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">{t.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((record, i) => (
                  <motion.tr key={record.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img src={record.products?.image_url || 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=60'} alt="" className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" />
                        <span className="line-clamp-1 text-sm font-medium text-gray-900">{record.products?.name || t.unknown}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(record.unit_price)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(record.total_price)}</td>
                    <td className="flex items-center gap-1 px-4 py-3 text-sm text-gray-500"><Calendar className="h-3.5 w-3.5" />{formatDate(record.created_at, dateLocale)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(record.status)}`}>{getStatusLabel(record.status, lang)}</span></td>
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



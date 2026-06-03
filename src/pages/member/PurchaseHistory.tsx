import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BedDouble, Calendar, Filter, Receipt, RefreshCcw, ShoppingBag, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { translateProductsOnDemand, translateRoomsOnDemand } from '../../lib/contentTranslations';
import { normalizeLang, pickByLang } from '../../lib/i18n';

interface PurchaseRecord {
  id: string;
  total_price: number;
  status: string;
  created_at: string;
  products: { id: string; name: string; image_url: string } | { id: string; name: string; image_url: string }[] | null;
}

interface BookingRecord {
  id: string;
  total_price: number;
  status: string;
  created_at: string;
  tbl_rooms: { id: string; name: string; location?: string | null } | { id: string; name: string; location?: string | null }[] | null;
}

interface PointRecord {
  id: string;
  amount: number;
  description: string;
  created_at: string;
}

interface ConsumptionRecord {
  id: string;
  type: 'product' | 'booking' | 'points';
  title: string;
  date: string;
  amount: number;
  status: string;
}

type UiLang = 'zh-TW' | 'en' | 'ja' | 'ko';

const PurchaseHistory: React.FC = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang) as UiLang;
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);
  const dateLocale = pickByLang(locale, 'zh-TW', 'en-US', 'ja-JP', 'ko-KR');
  const t = {
    title: pick('消費紀錄', 'Consumption Records', '利用履歴', '소비 내역'),
    subtitle: pick('統一管理商品消費、訂房消費、購物金使用、優惠券使用與退款紀錄。', 'Manage product purchases, stays, credits, coupons, and refunds in one place.', '商品の購入、宿泊、クレジット、クーポン、返金履歴をまとめて管理します。', '상품 구매, 숙박, 적립금, 쿠폰, 환불 내역을 한곳에서 관리합니다.'),
    startDate: pick('開始日期', 'Start Date', '開始日', '시작일'),
    endDate: pick('結束日期', 'End Date', '終了日', '종료일'),
    filter: pick('篩選', 'Filter', '絞り込み', '필터'),
    reset: pick('重設', 'Reset', 'リセット', '초기화'),
    noData: pick('目前沒有消費紀錄', 'No consumption records yet', '利用履歴はまだありません', '소비 내역이 없습니다'),
    type: pick('類型', 'Type', '種類', '유형'),
    item: pick('項目', 'Item', '項目', '항목'),
    date: pick('日期', 'Date', '日付', '날짜'),
    amount: pick('金額', 'Amount', '金額', '금액'),
    status: pick('狀態', 'Status', '状態', '상태'),
    product: pick('商品消費', 'Product', '商品購入', '상품 구매'),
    booking: pick('訂房消費', 'Booking', '宿泊予約', '숙박 예약'),
    points: pick('購物金使用', 'Store Credit', 'ストアクレジット', '스토어 크레딧'),
    coupon: pick('優惠券使用', 'Coupon Usage', 'クーポン利用', '쿠폰 사용'),
    refund: pick('退款紀錄', 'Refunds', '返金履歴', '환불 내역'),
    used: pick('折抵', 'Used', '使用済み', '사용됨'),
    unknownProduct: pick('未知商品', 'Unknown Product', '不明な商品', '알 수 없는 상품'),
    unknownRoom: pick('住宿訂房', 'Room Booking', '宿泊予約', '숙박 예약'),
    pointTx: pick('Nest幣異動', 'Nest Coin Change', 'Nestコイン変動', 'Nest 코인 변동'),
  };

  const [records, setRecords] = useState<ConsumptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchRecords = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    let productQuery = supabase.from('purchase_records').select('id, total_price, status, created_at, products(id, name, image_url)').eq('user_id', user.id);
    let bookingQuery = supabase.from('tbl_bookings').select('id, total_price, status, created_at, tbl_rooms(id, name, location)').eq('user_id', user.id);
    let pointQuery = supabase.from('points').select('id, amount, description, created_at').eq('user_id', user.id);

    if (startDate) {
      productQuery = productQuery.gte('created_at', startDate);
      bookingQuery = bookingQuery.gte('created_at', startDate);
      pointQuery = pointQuery.gte('created_at', startDate);
    }
    if (endDate) {
      const end = `${endDate}T23:59:59`;
      productQuery = productQuery.lte('created_at', end);
      bookingQuery = bookingQuery.lte('created_at', end);
      pointQuery = pointQuery.lte('created_at', end);
    }

    const [{ data: products }, { data: bookings }, { data: points }] = await Promise.all([
      productQuery.order('created_at', { ascending: false }),
      bookingQuery.order('created_at', { ascending: false }),
      pointQuery.order('created_at', { ascending: false }),
    ]);

    const productRecords = ((products || []) as unknown) as PurchaseRecord[];
    const bookingRecords = ((bookings || []) as unknown) as BookingRecord[];
    const productSource = productRecords.map(row => firstRelation(row.products)).filter((item): item is { id: string; name: string; image_url: string } => Boolean(item?.id));
    const roomSource = bookingRecords.map(row => firstRelation(row.tbl_rooms)).filter((item): item is { id: string; name: string; location?: string | null } => Boolean(item?.id));
    const [translatedProducts, translatedRooms] = locale === 'zh-TW'
      ? [productSource, roomSource]
      : await Promise.all([
        translateProductsOnDemand(productSource.map(item => ({ id: item.id, name: item.name, description: '' })), locale),
        translateRoomsOnDemand(roomSource.map(item => ({ id: item.id, name: item.name, description: '', location: item.location || '', amenities: [] })), locale),
      ]);
    const translatedProductsById = new Map(translatedProducts.map(item => [item.id, item]));
    const translatedRoomsById = new Map(translatedRooms.map(item => [item.id, item]));

    const productRows = productRecords.map(row => {
      const product = firstRelation(row.products);
      const translated = product?.id ? translatedProductsById.get(product.id) : null;
      return {
        id: `product-${row.id}`,
        type: 'product' as const,
        title: translated?.name || product?.name || t.unknownProduct,
        date: row.created_at,
        amount: row.total_price,
        status: row.status || 'completed',
      };
    });

    const bookingRows = bookingRecords.map(row => {
      const room = firstRelation(row.tbl_rooms);
      const translated = room?.id ? translatedRoomsById.get(room.id) : null;
      return {
        id: `booking-${row.id}`,
        type: 'booking' as const,
        title: translated?.name || room?.name || t.unknownRoom,
        date: row.created_at,
        amount: row.total_price,
        status: row.status || 'completed',
      };
    });

    const pointRows = ((points as PointRecord[]) || []).map(row => ({
      id: `points-${row.id}`,
      type: 'points' as const,
      title: row.description || t.pointTx,
      date: row.created_at,
      amount: row.amount,
      status: 'used',
    }));

    setRecords([...productRows, ...bookingRows, ...pointRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setLoading(false);
  };

  useEffect(() => {
    void fetchRecords();
  }, [locale, user]);

  const summary = useMemo(() => ({
    product: records.filter(record => record.type === 'product').length,
    booking: records.filter(record => record.type === 'booking').length,
    points: records.filter(record => record.type === 'points').length,
    coupon: 0,
    refund: records.filter(record => record.status === 'refunded').length,
  }), [records]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchRecords();
  };

  const resetFilter = () => {
    setStartDate('');
    setEndDate('');
    window.setTimeout(() => void fetchRecords(), 0);
  };

  const typeLabel = (type: ConsumptionRecord['type']) => {
    const labels = {
      product: t.product,
      booking: t.booking,
      points: t.points,
    };
    return labels[type];
  };

  const typeIcon = (type: ConsumptionRecord['type']) => {
    if (type === 'booking') return <BedDouble className="h-4 w-4" />;
    if (type === 'points') return <Star className="h-4 w-4" />;
    return <ShoppingBag className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2C1F10] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Receipt className="h-5 w-5 text-orange-500" />
          {t.title}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryCard icon={<ShoppingBag className="h-4 w-4" />} label={t.product} value={summary.product} />
        <SummaryCard icon={<BedDouble className="h-4 w-4" />} label={t.booking} value={summary.booking} />
        <SummaryCard icon={<Star className="h-4 w-4" />} label={t.points} value={summary.points} />
        <SummaryCard icon={<Receipt className="h-4 w-4" />} label={t.coupon} value={summary.coupon} />
        <SummaryCard icon={<RefreshCcw className="h-4 w-4" />} label={t.refund} value={summary.refund} />
      </div>

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
            <button type="button" onClick={resetFilter} className="rounded-lg px-2 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700">
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
          <div className="divide-y divide-gray-50 md:hidden">
            {records.map((record, i) => (
              <motion.article key={record.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                    {typeIcon(record.type)}
                    {typeLabel(record.type)}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${record.status === 'used' ? 'bg-orange-100 text-orange-700' : getStatusColor(record.status)}`}>
                    {record.status === 'used' ? t.used : getStatusLabel(record.status, lang)}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-gray-900">{record.title}</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Info label={t.date} value={formatDate(record.date, dateLocale)} />
                  <Info label={t.amount} value={`${record.amount < 0 ? '-' : ''}${formatCurrency(Math.abs(record.amount))}`} strong={record.amount >= 0} />
                </div>
              </motion.article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">{t.type}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">{t.item}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">{t.date}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">{t.amount}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">{t.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((record, i) => (
                  <motion.tr key={record.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        {typeIcon(record.type)}
                        {typeLabel(record.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-500"><span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(record.date, dateLocale)}</span></td>
                    <td className={`px-4 py-3 text-sm font-semibold ${record.amount < 0 ? 'text-red-500' : 'text-gray-900'}`}>{record.amount < 0 ? '-' : ''}{formatCurrency(Math.abs(record.amount))}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${record.status === 'used' ? 'bg-orange-100 text-orange-700' : getStatusColor(record.status)}`}>
                        {record.status === 'used' ? t.used : getStatusLabel(record.status, lang)}
                      </span>
                    </td>
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

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-700 sm:h-8 sm:w-8">{icon}</div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-gray-900 sm:text-xl">{value}</p>
    </div>
  );
}

function Info({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`mt-0.5 truncate ${strong ? 'font-bold text-[#2C1F10]' : 'font-medium text-gray-800'}`}>{value}</p>
    </div>
  );
}

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value;
}

export default PurchaseHistory;

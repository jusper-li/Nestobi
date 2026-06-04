import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, BedDouble, Package, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
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

interface ProductOrderLine {
  id: string;
  order_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  payment_method: string;
  status: string;
  created_at: string;
  products?: { id: string; name: string; image_url?: string | null; sku?: string | null; vendor_id?: string | null };
  orders?: { id: string; status: string; payment_status: string; total_amount: number; currency?: string | null; created_at: string };
}

type VendorOrderItem =
  | { kind: 'booking'; id: string; created_at: string; status: string; booking: Booking }
  | { kind: 'product'; id: string; created_at: string; status: string; productOrder: ProductOrderLine };

const PRODUCT_STATUS_FILTERS = ['all', 'pending', 'processing', 'shipped', 'completed', 'cancelled'];
const BOOKING_STATUS_FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

const VendorOrders: React.FC = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [productOrders, setProductOrders] = useState<ProductOrderLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [noVendor, setNoVendor] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'product' | 'booking'>('product');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const labels = {
    title: pick('訂單與訂房', 'Orders & Bookings', '注文と予約', '주문 및 예약'),
    noVendor: pick('目前找不到你的廠商資料，請聯絡管理員。', 'No vendor profile was found. Please contact an administrator.', 'ベンダー情報が見つかりません。管理者へお問い合わせください。', '업체 정보를 찾을 수 없습니다. 관리자에게 문의하세요.'),
    empty: pick('目前沒有符合條件的訂單或訂房。', 'No matching product orders or bookings yet.', '条件に合う注文または予約はまだありません。', '조건에 맞는 주문 또는 예약이 없습니다.'),
    productEmpty: pick('目前沒有符合條件的商品訂單。', 'No matching product orders yet.', '条件に合う商品注文はまだありません。', '조건에 맞는 상품 주문이 없습니다.'),
    bookingEmpty: pick('目前沒有符合條件的訂房。', 'No matching bookings yet.', '条件に合う予約はまだありません。', '조건에 맞는 예약이 없습니다.'),
    all: pick('全部', 'All', 'すべて', '전체'),
    productTab: pick('商品訂單', 'Product Orders', '商品注文', '상품 주문'),
    bookingTab: pick('訂房', 'Bookings', '予約', '예약'),
    productOrder: pick('商品訂單', 'Product Order', '商品注文', '상품 주문'),
    booking: pick('訂房', 'Booking', '予約', '예약'),
    orderNumber: pick('訂單編號', 'Order No.', '注文番号', '주문 번호'),
    quantity: pick('數量', 'Quantity', '数量', '수량'),
    unitPrice: pick('單價', 'Unit price', '単価', '단가'),
    paymentStatus: pick('付款狀態', 'Payment', '支払い状態', '결제 상태'),
    checkIn: pick('入住', 'Check-in', 'チェックイン', '체크인'),
    checkOut: pick('退房', 'Check-out', 'チェックアウト', '체크아웃'),
    guests: pick('人', 'guests', '名', '명'),
    createdAt: pick('下單時間', 'Created', '作成日時', '생성 시간'),
    markProcessing: pick('開始處理', 'Start Processing', '処理開始', '처리 시작'),
    markShipped: pick('標記出貨', 'Mark Shipped', '発送済みにする', '출고 처리'),
    markCompleted: pick('標記完成', 'Mark Completed', '完了にする', '완료 처리'),
    cancel: pick('取消', 'Cancel', 'キャンセル', '취소'),
    updateFailed: pick('更新失敗，請稍後再試。', 'Update failed. Please try again later.', '更新に失敗しました。後でもう一度お試しください。', '업데이트에 실패했습니다. 잠시 후 다시 시도하세요.'),
  };

  const activeStatusFilters = categoryFilter === 'product' ? PRODUCT_STATUS_FILTERS : BOOKING_STATUS_FILTERS;
  const categoryOptions = [
    { value: 'product' as const, label: labels.productTab, count: productOrders.length },
    { value: 'booking' as const, label: labels.bookingTab, count: bookings.length },
  ];

  const statusLabels: Record<string, string> = {
    all: labels.all,
    pending: getStatusLabel('pending', locale),
    confirmed: getStatusLabel('confirmed', locale),
    processing: getStatusLabel('processing', locale),
    shipped: getStatusLabel('shipped', locale),
    completed: getStatusLabel('completed', locale),
    cancelled: getStatusLabel('cancelled', locale),
  };

  useEffect(() => {
    if (!activeStatusFilters.includes(statusFilter)) {
      setStatusFilter('all');
    }
  }, [activeStatusFilters, statusFilter]);

  const loadVendorOrders = async (vid: string) => {
    const [bookingRes, productRes] = await Promise.all([
      supabase
        .from('tbl_bookings')
        .select('id, check_in_date, check_out_date, guests, total_price, status, created_at, tbl_rooms!inner(name, location, vendor_id)')
        .eq('tbl_rooms.vendor_id', vid)
        .order('created_at', { ascending: false }),
      supabase
        .from('purchase_records')
        .select('id, order_id, quantity, unit_price, total_price, payment_method, status, created_at, products!inner(id, name, image_url, sku, vendor_id), orders(id, status, payment_status, total_amount, currency, created_at)')
        .eq('products.vendor_id', vid)
        .order('created_at', { ascending: false }),
    ]);

    if (bookingRes.error || productRes.error) {
      setMessage(bookingRes.error?.message || productRes.error?.message || labels.updateFailed);
    }

    setBookings((bookingRes.data || []) as unknown as Booking[]);
    setProductOrders((productRes.data || []) as unknown as ProductOrderLine[]);
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from('vendors')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (cancelled) return;
        if (!data) {
          setNoVendor(true);
          setLoading(false);
          return;
        }
        setVendorId(data.id);
        await loadVendorOrders(data.id);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const items = useMemo<VendorOrderItem[]>(() => {
    const combined: VendorOrderItem[] = [
      ...productOrders.map(item => ({
        kind: 'product' as const,
        id: `product:${item.id}`,
        created_at: item.created_at,
        status: item.status,
        productOrder: item,
      })),
      ...bookings.map(item => ({
        kind: 'booking' as const,
        id: `booking:${item.id}`,
        created_at: item.created_at,
        status: item.status,
        booking: item,
      })),
    ];
    return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [bookings, productOrders]);

  const categoryItems = items.filter(item => item.kind === categoryFilter);
  const filtered = statusFilter === 'all' ? categoryItems : categoryItems.filter(item => item.status === statusFilter);
  const emptyLabel = categoryFilter === 'product' ? labels.productEmpty : labels.bookingEmpty;

  const refresh = async () => {
    if (vendorId) await loadVendorOrders(vendorId);
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    setUpdating(`booking:${bookingId}`);
    const { error } = await supabase.from('tbl_bookings').update({ status, updated_at: new Date().toISOString() }).eq('id', bookingId);
    if (error) setMessage(labels.updateFailed);
    await refresh();
    setUpdating(null);
  };

  const updateProductStatus = async (recordId: string, status: string) => {
    setUpdating(`product:${recordId}`);
    const { error } = await supabase.from('purchase_records').update({ status }).eq('id', recordId);
    if (error) setMessage(labels.updateFailed);
    await refresh();
    setUpdating(null);
  };

  if (loading) return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" /></div>;

  if (noVendor) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <AlertCircle className="mb-3 h-12 w-12 text-yellow-400" />
      <p className="text-gray-600">{labels.noVendor}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-emerald-100 p-2"><ShoppingBag className="h-6 w-6 text-emerald-700" /></div>
        <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
      </div>

      {message && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">{message}</div>}

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-sm">
        {categoryOptions.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setCategoryFilter(option.value);
              setStatusFilter('all');
            }}
            className={`rounded-xl px-4 py-3 text-left transition ${categoryFilter === option.value ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <span className="block text-sm font-bold">{option.label}</span>
            <span className={`mt-1 block text-xs ${categoryFilter === option.value ? 'text-emerald-50' : 'text-gray-400'}`}>{option.count}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {activeStatusFilters.map(status => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${statusFilter === status ? 'bg-emerald-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:border-emerald-300'}`}
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
          <BedDouble className="mx-auto mb-3 h-12 w-12 text-gray-200" />
          <p className="text-gray-400">{emptyLabel}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, index) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="rounded-2xl bg-white p-5 shadow-sm">
              {item.kind === 'product' ? (
                <ProductOrderCard item={item.productOrder} labels={labels} locale={locale} updating={updating} onUpdate={updateProductStatus} />
              ) : (
                <BookingCard item={item.booking} labels={labels} locale={locale} updating={updating} onUpdate={updateBookingStatus} />
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

function ProductOrderCard({
  item,
  labels,
  locale,
  updating,
  onUpdate,
}: {
  item: ProductOrderLine;
  labels: Record<string, string>;
  locale: string;
  updating: string | null;
  onUpdate: (id: string, status: string) => void;
}) {
  const busy = updating === `product:${item.id}`;
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
            <Package className="h-3.5 w-3.5" />
            {labels.productOrder}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(item.status)}`}>{getStatusLabel(item.status, locale)}</span>
        </div>
        <p className="font-semibold text-gray-900">{item.products?.name || labels.productOrder}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
          <span>{labels.orderNumber}: #{item.order_id.slice(0, 8).toUpperCase()}</span>
          <span>{labels.quantity}: {item.quantity}</span>
          <span>{labels.unitPrice}: {formatCurrency(item.unit_price)}</span>
          <span>{labels.paymentStatus}: {getStatusLabel(item.orders?.payment_status || 'unpaid', locale)}</span>
        </div>
        <p className="text-xs text-gray-400">{labels.createdAt}: {formatDate(item.created_at)}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <p className="text-xl font-bold text-emerald-700">{formatCurrency(item.total_price)}</p>
        {item.status === 'pending' && (
          <div className="flex gap-2">
            <button type="button" onClick={() => onUpdate(item.id, 'processing')} disabled={busy} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60">
              {busy ? '...' : labels.markProcessing}
            </button>
            <button type="button" onClick={() => onUpdate(item.id, 'cancelled')} disabled={busy} className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-60">
              {labels.cancel}
            </button>
          </div>
        )}
        {item.status === 'processing' && (
          <button type="button" onClick={() => onUpdate(item.id, 'shipped')} disabled={busy} className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-100 disabled:opacity-60">
            {busy ? '...' : labels.markShipped}
          </button>
        )}
        {item.status === 'shipped' && (
          <button type="button" onClick={() => onUpdate(item.id, 'completed')} disabled={busy} className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-100 disabled:opacity-60">
            {busy ? '...' : labels.markCompleted}
          </button>
        )}
      </div>
    </div>
  );
}

function BookingCard({
  item,
  labels,
  locale,
  updating,
  onUpdate,
}: {
  item: Booking;
  labels: Record<string, string>;
  locale: string;
  updating: string | null;
  onUpdate: (id: string, status: string) => void;
}) {
  const busy = updating === `booking:${item.id}`;
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            <BedDouble className="h-3.5 w-3.5" />
            {labels.booking}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(item.status)}`}>{getStatusLabel(item.status, locale)}</span>
        </div>
        <p className="font-semibold text-gray-900">{item.tbl_rooms?.name || labels.booking}</p>
        {item.tbl_rooms?.location && <p className="text-sm text-gray-400">{item.tbl_rooms.location}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
          <span>{labels.checkIn}: {formatDate(item.check_in_date)}</span>
          <span>{labels.checkOut}: {formatDate(item.check_out_date)}</span>
          <span>{item.guests} {labels.guests}</span>
        </div>
        <p className="text-xs text-gray-400">{labels.createdAt}: {formatDate(item.created_at)}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <p className="text-xl font-bold text-emerald-700">{formatCurrency(item.total_price)}</p>
        {item.status === 'pending' && (
          <div className="flex gap-2">
            <button type="button" onClick={() => onUpdate(item.id, 'confirmed')} disabled={busy} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60">
              {busy ? '...' : getStatusLabel('confirmed', locale)}
            </button>
            <button type="button" onClick={() => onUpdate(item.id, 'cancelled')} disabled={busy} className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-60">
              {labels.cancel}
            </button>
          </div>
        )}
        {item.status === 'confirmed' && (
          <button type="button" onClick={() => onUpdate(item.id, 'completed')} disabled={busy} className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-100 disabled:opacity-60">
            {busy ? '...' : labels.markCompleted}
          </button>
        )}
      </div>
    </div>
  );
}

export default VendorOrders;

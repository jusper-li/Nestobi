import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Package, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { localeByLang, normalizeLang, pickByLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';

interface PurchaseRecord {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products: { name: string; image_url: string } | null;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
}

type UiLang = 'zh-TW' | 'en' | 'ja' | 'ko';

export default function MemberOrders() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang) as UiLang;
  const dateLocale = localeByLang(locale);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);
  const t = {
    title: pick('我的訂單', 'My Orders', '注文履歴', '내 주문'),
    noData: pick('目前沒有訂單', 'No orders yet', '注文履歴はまだありません', '주문 내역이 없습니다'),
    paid: pick('已付款', 'Paid', '支払い済み', '결제 완료'),
    unpaid: pick('未付款', 'Unpaid', '未払い', '미결제'),
    view: pick('查看明細', 'View details', '詳細を見る', '상세 보기'),
    hide: pick('收合明細', 'Hide details', '詳細を閉じる', '상세 닫기'),
    items: pick('訂單品項', 'Order Items', '注文商品', '주문 상품'),
  };
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, PurchaseRecord[]>>({});

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      const { data } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setOrders(data || []);
      setLoading(false);
    };
    fetchOrders();
  }, [user]);

  const toggleExpand = async (orderId: string) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (!details[orderId]) {
      const { data } = await supabase.from('purchase_records').select('*, products(name, image_url)').eq('order_id', orderId);
      setDetails(prev => ({ ...prev, [orderId]: (data as PurchaseRecord[]) || [] }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2C1F10] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
        <ShoppingBag className="h-5 w-5 text-[#0D9488]" />
        {t.title}
      </h2>
      {orders.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
          <ShoppingBag className="mx-auto mb-4 h-14 w-14 text-gray-200" />
          <p className="text-gray-400">{t.noData}</p>
        </div>
      ) : (
        orders.map((order, index) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="overflow-hidden rounded-2xl bg-white shadow-sm"
          >
            <div className="p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">#{order.id.slice(-10).toUpperCase()}</p>
                  <p className="mt-0.5 text-sm text-gray-400">{formatDate(order.created_at, dateLocale)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(order.status)}`}>{getStatusLabel(order.status, lang)}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {order.payment_status === 'paid' ? t.paid : t.unpaid}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-[#2C1F10]">{formatCurrency(order.total_amount)}</p>
                <button onClick={() => toggleExpand(order.id)} className="flex items-center gap-1 text-sm text-gray-500 transition hover:text-gray-700">
                  {expandedId === order.id ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      {t.hide}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      {t.view}
                    </>
                  )}
                </button>
              </div>
            </div>

            {expandedId === order.id && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="border-t border-gray-100 p-5">
                <h4 className="mb-3 flex items-center gap-1.5 font-medium text-gray-700">
                  <Package className="h-4 w-4" />
                  {t.items}
                </h4>
                {(details[order.id] || []).map(item => (
                  <div key={item.id} className="flex items-center gap-3 border-b border-gray-50 py-2 last:border-0">
                    <img src={item.products?.image_url || 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=60'} alt={item.products?.name || ''} className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{item.products?.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(item.unit_price)} x {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.total_price)}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        ))
      )}
    </div>
  );
}



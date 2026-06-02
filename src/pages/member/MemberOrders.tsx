import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Heart, Headphones, Package, Receipt, RotateCcw, Search, ShoppingBag, Star, Truck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';

interface PurchaseRecord {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products: { id: string; name: string; image_url: string; sku?: string | null } | null;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  payment_status: string;
  payment_method: string;
  discount_code: string;
  currency: string;
  created_at: string;
}

type UiLang = 'zh-TW' | 'en' | 'ja' | 'ko';

export default function MemberOrders() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang) as UiLang;
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);
  const dateLocale = pickByLang(locale, 'zh-TW', 'en-US', 'ja-JP', 'ko-KR');
  const t = {
    title: pick('\u6211\u7684\u8a02\u55ae', 'My Orders', 'My Orders', 'My Orders'),
    noData: pick('\u76ee\u524d\u6c92\u6709\u8a02\u55ae', 'No orders yet', 'No orders yet', 'No orders yet'),
    summary: pick('\u8a02\u55ae\u6458\u8981', 'Order Summary', 'Order Summary', 'Order Summary'),
    items: pick('\u5546\u54c1\u8cc7\u8a0a', 'Product Items', 'Product Items', 'Product Items'),
    logistics: pick('\u7269\u6d41\u8cc7\u8a0a', 'Logistics', 'Logistics', 'Logistics'),
    afterSales: pick('\u552e\u5f8c\u670d\u52d9', 'After-sales Service', 'After-sales Service', 'After-sales Service'),
    orderNo: pick('\u8a02\u55ae\u7de8\u865f', 'Order No.', 'Order No.', 'Order No.'),
    orderDate: pick('\u8a02\u55ae\u65e5\u671f', 'Order Date', 'Order Date', 'Order Date'),
    paymentMethod: pick('\u4ed8\u6b3e\u65b9\u5f0f', 'Payment Method', 'Payment Method', 'Payment Method'),
    paymentStatus: pick('\u4ed8\u6b3e\u72c0\u614b', 'Payment Status', 'Payment Status', 'Payment Status'),
    logisticsStatus: pick('\u7269\u6d41\u72c0\u614b', 'Logistics Status', 'Logistics Status', 'Logistics Status'),
    invoiceStatus: pick('\u767c\u7968\u72c0\u614b', 'Invoice Status', 'Invoice Status', 'Invoice Status'),
    paid: pick('\u5df2\u4ed8\u6b3e', 'Paid', 'Paid', 'Paid'),
    unpaid: pick('\u672a\u4ed8\u6b3e', 'Unpaid', 'Unpaid', 'Unpaid'),
    creditCard: pick('\u4fe1\u7528\u5361', 'Credit Card', 'Credit Card', 'Credit Card'),
    invoicePending: pick('\u5f85\u958b\u7acb', 'Pending', 'Pending', 'Pending'),
    spec: pick('\u898f\u683c', 'Spec', 'Spec', 'Spec'),
    qty: pick('\u6578\u91cf', 'Qty', 'Qty', 'Qty'),
    unitPrice: pick('\u55ae\u50f9', 'Unit Price', 'Unit Price', 'Unit Price'),
    company: pick('\u7269\u6d41\u516c\u53f8', 'Carrier', 'Carrier', 'Carrier'),
    trackingNo: pick('\u7269\u6d41\u55ae\u865f', 'Tracking No.', 'Tracking No.', 'Tracking No.'),
    deliveryStatus: pick('\u914d\u9001\u72c0\u614b', 'Delivery Status', 'Delivery Status', 'Delivery Status'),
    estimatedArrival: pick('\u9810\u8a08\u5230\u8ca8', 'Estimated Arrival', 'Estimated Arrival', 'Estimated Arrival'),
    blackCat: pick('\u9ed1\u8c93\u5b85\u6025\u4fbf', 'T-Cat Express', 'T-Cat Express', 'T-Cat Express'),
    notProvided: pick('\u5c1a\u672a\u63d0\u4f9b', 'Not provided', 'Not provided', 'Not provided'),
    preparing: pick('\u5099\u8ca8\u4e2d', 'Preparing', 'Preparing', 'Preparing'),
    shipped: pick('\u5df2\u51fa\u8ca8', 'Shipped', 'Shipped', 'Shipped'),
    delivered: pick('\u5df2\u9001\u9054', 'Delivered', 'Delivered', 'Delivered'),
    queryLogistics: pick('\u67e5\u8a62\u7269\u6d41', 'Track Package', 'Track Package', 'Track Package'),
    view: pick('\u67e5\u770b\u660e\u7d30', 'View Details', 'View Details', 'View Details'),
    hide: pick('\u6536\u5408\u660e\u7d30', 'Hide Details', 'Hide Details', 'Hide Details'),
    return: pick('\u7533\u8acb\u9000\u8ca8', 'Return', 'Return', 'Return'),
    refund: pick('\u7533\u8acb\u9000\u6b3e', 'Refund', 'Refund', 'Refund'),
    contact: pick('\u806f\u7d61\u5ba2\u670d', 'Contact Support', 'Contact Support', 'Contact Support'),
    buyAgain: pick('\u518d\u6b21\u8cfc\u8cb7', 'Buy Again', 'Buy Again', 'Buy Again'),
    favorite: pick('\u52a0\u5165\u6536\u85cf', 'Add Favorite', 'Add Favorite', 'Add Favorite'),
    review: pick('\u8a55\u50f9\u5546\u54c1', 'Review Product', 'Review Product', 'Review Product'),
    recommendations: pick('\u63a8\u85a6\u5546\u54c1', 'Recommended Products', 'Recommended Products', 'Recommended Products'),
    unknown: pick('\u672a\u77e5\u5546\u54c1', 'Unknown Product', 'Unknown Product', 'Unknown Product'),
    defaultSpec: pick('\u6a19\u6e96\u898f\u683c', 'Standard', 'Standard', 'Standard'),
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, PurchaseRecord[]>>({});

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setOrders(data || []);
      setLoading(false);
    };
    void fetchOrders();
  }, [user]);

  const toggleExpand = async (orderId: string) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (!details[orderId]) {
      const { data } = await supabase.from('purchase_records').select('*, products(id, name, image_url, sku)').eq('order_id', orderId);
      setDetails(prev => ({ ...prev, [orderId]: (data as PurchaseRecord[]) || [] }));
    }
  };

  const deliveryLabel = (status: string) => {
    if (status === 'completed') return t.delivered;
    if (status === 'shipped') return t.shipped;
    return t.preparing;
  };

  const estimatedArrival = (createdAt: string) => {
    const date = new Date(createdAt);
    date.setDate(date.getDate() + 3);
    return formatDate(date.toISOString(), dateLocale);
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
        orders.map((order, index) => {
          const items = details[order.id] || [];
          const isExpanded = expandedId === order.id;

          return (
            <motion.article key={order.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">#{order.id.slice(-10).toUpperCase()}</p>
                    <h3 className="mt-1 text-lg font-bold text-gray-900">{t.summary}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(order.status)}`}>{getStatusLabel(order.status, lang)}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {order.payment_status === 'paid' ? t.paid : t.unpaid}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <Info label={t.orderNo} value={`#${order.id.slice(-10).toUpperCase()}`} />
                  <Info label={t.orderDate} value={formatDate(order.created_at, dateLocale)} />
                  <Info label={t.paymentMethod} value={order.payment_method === 'credit_card' ? t.creditCard : order.payment_method} />
                  <Info label={t.paymentStatus} value={order.payment_status === 'paid' ? t.paid : t.unpaid} />
                  <Info label={t.logisticsStatus} value={deliveryLabel(order.status)} />
                  <Info label={t.invoiceStatus} value={t.invoicePending} />
                  <Info label={t.recommendations} value={order.discount_code || t.notProvided} />
                  <Info label={t.summary} value={formatCurrency(order.total_amount, order.currency || 'TWD')} strong />
                </div>

                <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900"><Truck className="h-4 w-4 text-[#0D9488]" />{t.logistics}</h4>
                  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <Info label={t.company} value={t.blackCat} />
                    <Info label={t.trackingNo} value={order.status === 'shipped' || order.status === 'completed' ? `NTB${order.id.slice(-8).toUpperCase()}` : t.notProvided} />
                    <Info label={t.deliveryStatus} value={deliveryLabel(order.status)} />
                    <Info label={t.estimatedArrival} value={estimatedArrival(order.created_at)} />
                  </div>
                  <button type="button" className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                    <Search className="h-4 w-4" />
                    {t.queryLogistics}
                  </button>
                </section>

                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <p className="text-lg font-bold text-[#2C1F10]">{formatCurrency(order.total_amount, order.currency || 'TWD')}</p>
                  <button onClick={() => toggleExpand(order.id)} className="flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-gray-700">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {isExpanded ? t.hide : t.view}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-5 border-t border-gray-100 p-5">
                  <section>
                    <h4 className="mb-3 flex items-center gap-1.5 font-medium text-gray-700"><Package className="h-4 w-4" />{t.items}</h4>
                    <div className="space-y-3">
                      {items.map(item => (
                        <div key={item.id} className="flex gap-3 rounded-xl border border-gray-100 p-3">
                          <img src={item.products?.image_url || 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=120'} alt={item.products?.name || t.unknown} className="h-20 w-20 flex-shrink-0 rounded-lg object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900">{item.products?.name || t.unknown}</p>
                            <p className="mt-1 text-sm text-gray-500">{t.spec}: {item.products?.sku || t.defaultSpec}</p>
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                              <span>{t.qty}: {item.quantity}</span>
                              <span>{t.unitPrice}: {formatCurrency(item.unit_price)}</span>
                              <span className="font-semibold text-gray-900">{formatCurrency(item.total_price)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h4 className="mb-3 flex items-center gap-1.5 font-medium text-gray-700"><Headphones className="h-4 w-4" />{t.afterSales}</h4>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"><Package className="h-4 w-4" />{t.return}</button>
                      <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"><Receipt className="h-4 w-4" />{t.refund}</button>
                      <Link to="/contact" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"><Headphones className="h-4 w-4" />{t.contact}</Link>
                      <Link to="/shop" className="inline-flex items-center gap-1.5 rounded-lg bg-[#C09A6A] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#8B6840]"><RotateCcw className="h-4 w-4" />{t.buyAgain}</Link>
                      <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-pink-200 px-3 py-2 text-sm font-medium text-pink-600 transition hover:bg-pink-50"><Heart className="h-4 w-4" />{t.favorite}</button>
                      <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-200 px-3 py-2 text-sm font-medium text-yellow-700 transition hover:bg-yellow-50"><Star className="h-4 w-4" />{t.review}</button>
                    </div>
                  </section>
                </motion.div>
              )}
            </motion.article>
          );
        })
      )}
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

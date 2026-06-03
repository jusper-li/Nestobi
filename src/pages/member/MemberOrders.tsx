import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Heart, Headphones, Package, Receipt, RotateCcw, Search, ShoppingBag, Star, Truck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';

interface PurchaseRecord {
  id: string;
  product_id: string | null;
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
  const { addItem } = useCart();
  const { lang } = useLanguage();
  const navigate = useNavigate();
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
    returnRequested: pick('\u5df2\u7533\u8acb\u9000\u8ca8', 'Return Requested', 'Return Requested', 'Return Requested'),
    refundRequested: pick('\u5df2\u7533\u8acb\u9000\u6b3e', 'Refund Requested', 'Refund Requested', 'Refund Requested'),
    requestSent: pick('\u7533\u8acb\u5df2\u9001\u51fa\uff0c\u5ba2\u670d\u6703\u76e1\u5feb\u806f\u7d61\u4f60\u3002', 'Request sent. Support will contact you soon.', 'Request sent. Support will contact you soon.', 'Request sent. Support will contact you soon.'),
    addedToCart: pick('\u5df2\u52a0\u5165\u8cfc\u7269\u8eca', 'Added to cart', 'Added to cart', 'Added to cart'),
    addedFavorite: pick('\u5df2\u52a0\u5165\u6536\u85cf', 'Added to favorites', 'Added to favorites', 'Added to favorites'),
    favorited: pick('\u5df2\u6536\u85cf', 'Favorited', 'Favorited', 'Favorited'),
    reviewPlaceholder: pick('\u5206\u4eab\u9019\u6b21\u5546\u54c1\u9ad4\u9a57...', 'Share your product experience...', 'Share your product experience...', 'Share your product experience...'),
    submitReview: pick('\u9001\u51fa\u8a55\u50f9', 'Submit Review', 'Submit Review', 'Submit Review'),
    reviewed: pick('\u5df2\u9001\u51fa\u8a55\u50f9', 'Review Submitted', 'Review Submitted', 'Review Submitted'),
    reviewRequired: pick('\u8acb\u5148\u8f38\u5165\u8a55\u50f9\u5167\u5bb9', 'Please enter a review first.', 'Please enter a review first.', 'Please enter a review first.'),
    actionFailed: pick('\u64cd\u4f5c\u5931\u6557\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002', 'Action failed. Please try again.', 'Action failed. Please try again.', 'Action failed. Please try again.'),
    contactSubject: pick('\u8a02\u55ae\u552e\u5f8c\u670d\u52d9', 'Order After-sales Service', 'Order After-sales Service', 'Order After-sales Service'),
    contactBody: pick('\u6211\u60f3\u8a62\u554f\u9019\u7b46\u8a02\u55ae\u7684\u552e\u5f8c\u670d\u52d9\uff1a', 'I would like to ask about after-sales service for this order:', 'I would like to ask about after-sales service for this order:', 'I would like to ask about after-sales service for this order:'),
    recommendations: pick('\u63a8\u85a6\u5546\u54c1', 'Recommended Products', 'Recommended Products', 'Recommended Products'),
    unknown: pick('\u672a\u77e5\u5546\u54c1', 'Unknown Product', 'Unknown Product', 'Unknown Product'),
    defaultSpec: pick('\u6a19\u6e96\u898f\u683c', 'Standard', 'Standard', 'Standard'),
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, PurchaseRecord[]>>({});
  const [afterSalesRequests, setAfterSalesRequests] = useState<Record<string, true>>({});
  const [favoriteProductIds, setFavoriteProductIds] = useState<Record<string, true>>({});
  const [reviewedItems, setReviewedItems] = useState<Record<string, true>>({});
  const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchAfterSalesState = async () => {
      if (!user) {
        setAfterSalesRequests({});
        setFavoriteProductIds({});
        setReviewedItems({});
        return;
      }

      const [{ data: requests }, { data: favorites }, { data: reviews }] = await Promise.all([
        supabase.from('after_sales_requests').select('order_id, request_type').eq('user_id', user.id),
        supabase.from('member_favorites').select('target_id').eq('user_id', user.id).eq('target_type', 'product'),
        supabase.from('product_reviews').select('purchase_record_id').eq('user_id', user.id),
      ]);

      setAfterSalesRequests(Object.fromEntries(((requests || []) as { order_id: string; request_type: string }[]).map(item => [`${item.order_id}:${item.request_type}`, true])) as Record<string, true>);
      setFavoriteProductIds(Object.fromEntries(((favorites || []) as { target_id: string }[]).map(item => [item.target_id, true])) as Record<string, true>);
      setReviewedItems(Object.fromEntries(((reviews || []) as { purchase_record_id: string }[]).map(item => [item.purchase_record_id, true])) as Record<string, true>);
    };

    void fetchAfterSalesState().catch(() => {
      setAfterSalesRequests({});
      setFavoriteProductIds({});
      setReviewedItems({});
    });
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

  const showMessage = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    window.setTimeout(() => setActionMessage(null), 3000);
  };

  const persistAfterSalesRequest = async (orderId: string, type: 'return' | 'refund') => {
    if (!user) {
      showMessage('error', t.actionFailed);
      return;
    }
    setBusyAction(`${orderId}:${type}`);
    try {
      const { error } = await supabase
        .from('after_sales_requests')
        .upsert({
          user_id: user.id,
          order_id: orderId,
          request_type: type,
          status: 'pending',
          message: `${type} request from member order page`,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,order_id,request_type' });
      if (error) throw error;
      setAfterSalesRequests(prev => ({ ...prev, [`${orderId}:${type}`]: true }));
      showMessage('success', t.requestSent);
    } catch {
      showMessage('error', t.actionFailed);
    } finally {
      setBusyAction(null);
    }
  };

  const orderProductIds = (items: PurchaseRecord[]) => items.map(item => item.product_id || item.products?.id).filter(Boolean) as string[];

  const handleBuyAgain = async (orderId: string, items: PurchaseRecord[]) => {
    const productIds = orderProductIds(items);
    if (productIds.length === 0) {
      showMessage('error', t.actionFailed);
      return;
    }
    setBusyAction(`${orderId}:buy`);
    try {
      for (const productId of productIds) {
        const item = items.find(record => (record.product_id || record.products?.id) === productId);
        await addItem(productId, item?.quantity || 1);
      }
      showMessage('success', t.addedToCart);
      navigate('/cart');
    } catch {
      showMessage('error', t.actionFailed);
    } finally {
      setBusyAction(null);
    }
  };

  const handleFavorite = async (items: PurchaseRecord[]) => {
    if (!user) {
      showMessage('error', t.actionFailed);
      return;
    }
    const productIds = orderProductIds(items);
    if (productIds.length === 0) {
      showMessage('error', t.actionFailed);
      return;
    }
    setBusyAction('favorite');
    try {
      const { error } = await supabase
        .from('member_favorites')
        .upsert(productIds.map(productId => ({ user_id: user.id, target_type: 'product', target_id: productId })), { onConflict: 'user_id,target_type,target_id', ignoreDuplicates: true });
      if (error) throw error;
      setFavoriteProductIds(prev => {
        const next = { ...prev };
        productIds.forEach(productId => {
          next[productId] = true;
        });
        return next;
      });
      showMessage('success', t.addedFavorite);
    } catch {
      showMessage('error', t.actionFailed);
    } finally {
      setBusyAction(null);
    }
  };

  const handleSubmitReview = async (orderId: string, items: PurchaseRecord[]) => {
    if (!user) {
      showMessage('error', t.actionFailed);
      return;
    }
    if (!reviewText.trim()) {
      showMessage('error', t.reviewRequired);
      return;
    }
    const reviewRows = items
      .map(item => {
        const productId = item.product_id || item.products?.id;
        if (!productId) return null;
        return {
          user_id: user.id,
          order_id: orderId,
          purchase_record_id: item.id,
          product_id: productId,
          rating: 5,
          comment: reviewText.trim(),
          status: 'published',
          updated_at: new Date().toISOString(),
        };
      })
      .filter(Boolean) as {
        user_id: string;
        order_id: string;
        purchase_record_id: string;
        product_id: string;
        rating: number;
        comment: string;
        status: string;
        updated_at: string;
      }[];
    if (reviewRows.length === 0) {
      showMessage('error', t.actionFailed);
      return;
    }
    setBusyAction(`${orderId}:review`);
    try {
      const { error } = await supabase
        .from('product_reviews')
        .upsert(reviewRows, { onConflict: 'user_id,purchase_record_id' });
      if (error) throw error;
      setReviewedItems(prev => {
        const next = { ...prev };
        reviewRows.forEach(item => {
          next[item.purchase_record_id] = true;
        });
        return next;
      });
      setReviewText('');
      setReviewingOrderId(null);
      showMessage('success', t.reviewed);
    } catch {
      showMessage('error', t.actionFailed);
    } finally {
      setBusyAction(null);
    }
  };

  const contactHref = (orderId: string) => {
    const shortId = orderId.slice(-10).toUpperCase();
    const subject = `${t.contactSubject} #${shortId}`;
    const body = `${t.contactBody} #${shortId}`;
    return `mailto:service@nestobi.com.tw?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

      {actionMessage && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${actionMessage.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {actionMessage.type === 'success' ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
          {actionMessage.text}
        </div>
      )}

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

                <div className="grid grid-cols-2 gap-3 text-sm sm:hidden">
                  <Info label={t.orderDate} value={formatDate(order.created_at, dateLocale)} />
                  <Info label={t.summary} value={formatCurrency(order.total_amount, order.currency || 'TWD')} strong />
                  <Info label={t.paymentMethod} value={order.payment_method === 'credit_card' ? t.creditCard : order.payment_method} />
                  <Info label={t.logisticsStatus} value={deliveryLabel(order.status)} />
                </div>

                <div className={`${isExpanded ? 'block' : 'hidden'} space-y-4 sm:block`}>
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
                </div>

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
                      <button type="button" onClick={() => void persistAfterSalesRequest(order.id, 'return')} disabled={afterSalesRequests[`${order.id}:return`] || busyAction === `${order.id}:return`} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:border-green-200 disabled:bg-green-50 disabled:text-green-700"><Package className="h-4 w-4" />{afterSalesRequests[`${order.id}:return`] ? t.returnRequested : t.return}</button>
                      <button type="button" onClick={() => void persistAfterSalesRequest(order.id, 'refund')} disabled={afterSalesRequests[`${order.id}:refund`] || busyAction === `${order.id}:refund`} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:border-green-200 disabled:bg-green-50 disabled:text-green-700"><Receipt className="h-4 w-4" />{afterSalesRequests[`${order.id}:refund`] ? t.refundRequested : t.refund}</button>
                      <a href={contactHref(order.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"><Headphones className="h-4 w-4" />{t.contact}</a>
                      <button type="button" onClick={() => handleBuyAgain(order.id, items)} disabled={busyAction === `${order.id}:buy`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#C09A6A] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#8B6840] disabled:opacity-60"><RotateCcw className="h-4 w-4" />{t.buyAgain}</button>
                      <button type="button" onClick={() => void handleFavorite(items)} disabled={busyAction === 'favorite'} className="inline-flex items-center gap-1.5 rounded-lg border border-pink-200 px-3 py-2 text-sm font-medium text-pink-600 transition hover:bg-pink-50 disabled:opacity-60"><Heart className="h-4 w-4" />{orderProductIds(items).every(productId => favoriteProductIds[productId]) && items.length > 0 ? t.favorited : t.favorite}</button>
                      <button type="button" onClick={() => setReviewingOrderId(reviewingOrderId === order.id ? null : order.id)} disabled={items.length > 0 && items.every(item => reviewedItems[item.id])} className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-200 px-3 py-2 text-sm font-medium text-yellow-700 transition hover:bg-yellow-50 disabled:border-green-200 disabled:bg-green-50 disabled:text-green-700"><Star className="h-4 w-4" />{items.length > 0 && items.every(item => reviewedItems[item.id]) ? t.reviewed : t.review}</button>
                    </div>
                    {reviewingOrderId === order.id && (
                      <div className="mt-3 rounded-xl border border-yellow-100 bg-yellow-50 p-3">
                        <textarea value={reviewText} onChange={event => setReviewText(event.target.value)} rows={3} placeholder={t.reviewPlaceholder} className="w-full resize-none rounded-lg border border-yellow-100 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-yellow-300" />
                        <button type="button" onClick={() => void handleSubmitReview(order.id, items)} disabled={busyAction === `${order.id}:review`} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-yellow-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-yellow-600 disabled:opacity-60"><Star className="h-4 w-4" />{t.submitReview}</button>
                      </div>
                    )}
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

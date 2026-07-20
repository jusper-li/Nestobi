import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, CreditCard, Heart, Headphones, Package, Receipt, RotateCcw, Search, ShoppingBag, Star, Truck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { translateProductsOnDemand } from '../../lib/contentTranslations';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { trackPurchase } from '../../lib/analytics';
import { submitNewebPayMpgForm } from '../../lib/shopCheckout';

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
  merchant_order_no?: string;
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
  const { settings } = useSiteSettings();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const merchantOrderNo = searchParams.get('merchantOrderNo');
  const syncAttemptedRef = useRef<string | null>(null);
  const locale = normalizeLang(lang) as UiLang;
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);
  const dateLocale = pickByLang(locale, 'zh-TW', 'en-US', 'ja-JP', 'ko-KR');
  const t = {
    title: pick('我的訂單', 'My Orders', '注文', '내 주문'),
    noData: pick('目前沒有訂單', 'No orders yet', '注文はまだありません', '주문 내역이 없습니다'),
    summary: pick('訂單摘要', 'Order Summary', '注文概要', '주문 요약'),
    items: pick('商品資訊', 'Product Items', '商品情報', '상품 정보'),
    logistics: pick('物流資訊', 'Logistics', '配送情報', '배송 정보'),
    afterSales: pick('售後服務', 'After-sales Service', 'アフターサービス', 'A/S 서비스'),
    orderNo: pick('訂單編號', 'Order No.', '注文番号', '주문 번호'),
    orderDate: pick('訂單日期', 'Order Date', '注文日', '주문일'),
    paymentMethod: pick('付款方式', 'Payment Method', '支払い方法', '결제 방식'),
    paymentStatus: pick('付款狀態', 'Payment Status', '支払い状況', '결제 상태'),
    logisticsStatus: pick('物流狀態', 'Logistics Status', '配送状況', '배송 상태'),
    invoiceStatus: pick('發票狀態', 'Invoice Status', '領収書状況', '영수증 상태'),
    paid: pick('已付款', 'Paid', '支払い済み', '결제 완료'),
    unpaid: pick('未付款', 'Unpaid', '未払い', '미결제'),
    creditCard: pick('信用卡', 'Credit Card', 'クレジットカード', '신용카드'),
    invoicePending: pick('待開立', 'Pending', '発行待ち', '발행 대기'),
    spec: pick('規格', 'Spec', '規格', '규격'),
    qty: pick('數量', 'Qty', '数量', '수량'),
    unitPrice: pick('單價', 'Unit Price', '単価', '단가'),
    company: pick('物流公司', 'Carrier', '配送会社', '택배사'),
    trackingNo: pick('物流單號', 'Tracking No.', '追跡番号', '운송장 번호'),
    deliveryStatus: pick('配送狀態', 'Delivery Status', '配送状況', '배송 상태'),
    estimatedArrival: pick('預計到貨', 'Estimated Arrival', '到着予定', '도착 예정'),
    blackCat: pick('黑貓宅急便', 'T-Cat Express', 'クロネコ宅急便', '블랙캣 택배'),
    notProvided: pick('尚未提供', 'Not provided', '未提供', '아직 제공되지 않음'),
    preparing: pick('備貨中', 'Preparing', '準備中', '준비 중'),
    shipped: pick('已出貨', 'Shipped', '発送済み', '배송됨'),
    delivered: pick('已送達', 'Delivered', '配達済み', '배송 완료'),
    queryLogistics: pick('查詢物流', 'Track Package', '配送を確認', '배송 조회'),
    view: pick('查看明細', 'View Details', '詳細を見る', '상세 보기'),
    hide: pick('收合明細', 'Hide Details', '詳細を閉じる', '상세 접기'),
    return: pick('申請退貨', 'Return', '返品申請', '반품 신청'),
    refund: pick('申請退款', 'Refund', '返金申請', '환불 신청'),
    contact: pick('聯絡客服', 'Contact Support', 'サポートに連絡', '고객센터 문의'),
    buyAgain: pick('再次購買', 'Buy Again', '再購入', '다시 구매'),
    favorite: pick('加入收藏', 'Add Favorite', 'お気に入りに追加', '즐겨찾기 추가'),
    review: pick('評價商品', 'Review Product', '商品を評価', '상품 평가'),
    returnRequested: pick('已申請退貨', 'Return Requested', '返品申請済み', '반품 신청됨'),
    refundRequested: pick('已申請退款', 'Refund Requested', '返金申請済み', '환불 신청됨'),
    requestSent: pick('申請已送出，客服會盡快聯絡你。', 'Request sent. Support will contact you soon.', '申請を送信しました。サポートより近日中に連絡します。', '신청이 접수되었습니다. 고객센터에서 곧 연락드립니다.'),
    addedToCart: pick('已加入購物車', 'Added to cart', 'カートに追加しました', '장바구니에 추가됨'),
    addedFavorite: pick('已加入收藏', 'Added to favorites', 'お気に入りに追加しました', '즐겨찾기에 추가됨'),
    favorited: pick('已收藏', 'Favorited', 'お気に入り済み', '즐겨찾기됨'),
    reviewPlaceholder: pick('分享這次商品體驗...', 'Share your product experience...', '商品の感想を共有してください...', '상품 경험을 공유해 주세요...'),
    submitReview: pick('送出評價', 'Submit Review', '評価を送信', '평가 제출'),
    reviewed: pick('已送出評價', 'Review Submitted', '評価送信済み', '평가 제출됨'),
    reviewRequired: pick('請先輸入評價內容', 'Please enter a review first.', '先に評価内容を入力してください。', '먼저 평가 내용을 입력해 주세요.'),
    actionFailed: pick('操作失敗，請稍後再試。', 'Action failed. Please try again.', '操作に失敗しました。しばらくしてから再試行してください。', '작업에 실패했습니다. 잠시 후 다시 시도해 주세요.'),
    contactSubject: pick('訂單售後服務', 'Order After-sales Service', '注文アフターサービス', '주문 A/S 서비스'),
    contactBody: pick('我想詢問這筆訂單的售後服務：', 'I would like to ask about after-sales service for this order:', 'この注文のアフターサービスについて問い合わせたいです：', '이 주문의 A/S 서비스에 대해 문의하고 싶습니다:'),
    recommendations: pick('推薦商品', 'Recommended Products', 'おすすめ商品', '추천 상품'),
    unknown: pick('未知商品', 'Unknown Product', '不明な商品', '알 수 없는 상품'),
    defaultSpec: pick('標準規格', 'Standard', '標準規格', '표준 규격'),
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
  const ORDER_SYNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/newebpay-order-sync`;
  const trackedPurchaseRef = useRef<string | null>(null);

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
    const syncPaymentStatus = async () => {
      if (!user || !merchantOrderNo || loading) return;
      if (syncAttemptedRef.current === merchantOrderNo) return;

      const currentOrder = orders.find(order => order.merchant_order_no === merchantOrderNo);
      if (!currentOrder || currentOrder.payment_status === 'paid') return;

      syncAttemptedRef.current = merchantOrderNo;

      try {
        const response = await fetch(ORDER_SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantOrderNo }),
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok && (result.synced || result.success)) {
          window.location.reload();
        }
      } catch {
        // Keep the current list visible if the sync request fails.
      }
    };

    void syncPaymentStatus();
  }, [ORDER_SYNC_URL, loading, merchantOrderNo, orders, user]);

  useEffect(() => {
    const trackCompletedPurchase = async () => {
      if (!user || !merchantOrderNo || loading) return;
      if (trackedPurchaseRef.current === merchantOrderNo) return;

      const currentOrder = orders.find(order => order.merchant_order_no === merchantOrderNo);
      if (!currentOrder || currentOrder.payment_status !== 'paid') return;

      trackedPurchaseRef.current = merchantOrderNo;

      const { data } = await supabase
        .from('purchase_records')
        .select('id, quantity, unit_price, total_price, products(id, name)')
        .eq('order_id', currentOrder.id);

      const records = (data || []) as PurchaseRecord[];
      trackPurchase({
        transaction_id: currentOrder.merchant_order_no || currentOrder.id,
        value: Number(currentOrder.total_amount || 0),
        items: records.map(record => ({
          item_id: record.products?.id || record.id,
          item_name: record.products?.name || t.unknown,
          price: Number(record.unit_price || 0),
          quantity: Number(record.quantity || 1),
        })),
      });
    };

    void trackCompletedPurchase();
  }, [loading, merchantOrderNo, orders, t.unknown, user]);

  useEffect(() => {
    setDetails({});
    setExpandedId(null);
  }, [locale]);

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
      const rows = (data as PurchaseRecord[]) || [];
      if (locale === 'zh-TW') {
        setDetails(prev => ({ ...prev, [orderId]: rows }));
        return;
      }
      const translatedProducts = await translateProductsOnDemand(
        rows
          .filter(item => item.products?.id)
          .map(item => ({
            id: item.products?.id || '',
            name: item.products?.name || '',
            description: '',
          })),
        locale,
      );
      const translatedById = new Map(translatedProducts.map(product => [product.id, product]));
      setDetails(prev => ({
        ...prev,
        [orderId]: rows.map(item => {
          const translated = item.products?.id ? translatedById.get(item.products.id) : null;
          if (!translated || !item.products) return item;
          return { ...item, products: { ...item.products, name: translated.name || item.products.name } };
        }),
      }));
    }
  };

  const deliveryLabel = (status: string) => {
    if (status === 'completed') return t.delivered;
    if (status === 'shipped') return t.shipped;
    return t.preparing;
  };

  const paymentMethodLabel = (method: string) => {
    if (method === 'points') return pick('點數支付', 'Points payment', 'ポイント支払い', '포인트 결제');
    if (method === 'points_credit_card') return pick('點數折抵 + 信用卡', 'Points discount + credit card', 'ポイント割引 + クレジットカード', '포인트 할인 + 신용카드');
    if (method === 'credit_card') return t.creditCard;
    return method;
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

  const handleRetryPayment = async (order: Order) => {
    if (!user || order.payment_status === 'paid' || order.payment_status === 'refunded') {
      showMessage('error', t.actionFailed);
      return;
    }

    setBusyAction(`${order.id}:pay`);
    try {
      const { data, error } = await supabase.functions.invoke('newebpay-mpg-payment', {
        body: {
          retryOrderId: order.id,
          paymentMethod: 'CREDIT',
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Payment retry failed');

      if (data.mode === 'points') {
        window.location.href = data.clientBackUrl || `/member/orders?merchantOrderNo=${encodeURIComponent(data.merchantOrderNo || '')}`;
        return;
      }

      submitNewebPayMpgForm(
        data.paymentUrl,
        data.merchantId,
        data.tradeInfo,
        data.tradeSha,
        data.version || '2.3',
      );
    } catch {
      showMessage('error', t.actionFailed);
      setBusyAction(null);
    }
  };

  const contactHref = (orderId: string) => {
    const shortId = orderId.slice(-10).toUpperCase();
    const subject = `${t.contactSubject} #${shortId}`;
    const body = `${t.contactBody} #${shortId}`;
    const email = settings.contact_email || 'service@dlalshop.com';
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
                  <Info label={t.paymentMethod} value={paymentMethodLabel(order.payment_method)} />
                  <Info label={t.logisticsStatus} value={deliveryLabel(order.status)} />
                </div>

                <div className={`${isExpanded ? 'block' : 'hidden'} space-y-4 sm:block`}>
                  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <Info label={t.orderNo} value={`#${order.id.slice(-10).toUpperCase()}`} />
                    <Info label={t.orderDate} value={formatDate(order.created_at, dateLocale)} />
                    <Info label={t.paymentMethod} value={paymentMethodLabel(order.payment_method)} />
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

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                  <p className="text-lg font-bold text-[#2C1F10]">{formatCurrency(order.total_amount, order.currency || 'TWD')}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {order.payment_status !== 'paid' && order.payment_status !== 'refunded' && (
                      <button
                        type="button"
                        onClick={() => void handleRetryPayment(order)}
                        disabled={busyAction === `${order.id}:pay`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#2C1F10] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#4A3420] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CreditCard className="h-4 w-4" />
                        {busyAction === `${order.id}:pay`
                          ? pick('前往付款中', 'Opening payment', '決済へ移動中', '결제 이동 중')
                          : pick('再次付款', 'Pay Again', 'もう一度支払う', '다시 결제')}
                      </button>
                    )}
                    <button onClick={() => toggleExpand(order.id)} className="flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-gray-700">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {isExpanded ? t.hide : t.view}
                    </button>
                  </div>
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

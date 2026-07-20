import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  BedDouble,
  Calendar,
  Clock3,
  ExternalLink,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Receipt,
  ShoppingBag,
  Truck,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { refundOrder } from '../../lib/orderRefund';
import { logAdminAction } from '../../lib/auditLog';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, formatDateTime, getStatusColor, getStatusLabel } from '../../lib/utils';

interface Booking {
  id: string;
  user_id: string;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  total_price: number;
  payment_status?: string | null;
  status: string;
  created_at: string;
  tbl_rooms?: { name: string; location: string } | null;
}

interface BookingDetail extends Booking {
  room?: { id?: string | null; name?: string | null; location?: string | null } | null;
  tbl_rooms?: {
    id?: string | null;
    name?: string | null;
    location?: string | null;
    vendors?: { name?: string | null; contact_phone?: string | null; contact_email?: string | null } | null;
    hotels?: { name?: string | null; phone?: string | null; email?: string | null; address?: string | null } | null;
  } | null;
}

interface CustomerProfile {
  user_id: string;
  display_name: string;
  phone: string;
  email?: string | null;
}

interface AfterSalesRequest {
  id: string;
  request_type: string;
  status: string;
  message: string;
  created_at: string;
  updated_at: string;
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
  products?: { id: string; name: string; image_url?: string | null; sku?: string | null; vendor_id?: string | null } | null;
  orders?: {
    id: string;
    user_id: string;
    status: string;
    payment_status: string;
    payment_method?: string | null;
    merchant_order_no?: string | null;
    newebpay_status?: string | null;
    total_amount: number;
    currency?: string | null;
    created_at: string;
    shipping_address?: Record<string, string> | null;
  } | null;
}

interface SubscriptionOrderLine {
  id: string;
  user_id: string;
  product_id: string;
  vendor_id?: string | null;
  order_id?: string | null;
  quantity: number;
  monthly_amount: number;
  period_type?: string | null;
  period_point?: string | null;
  period_start_type?: string | null;
  period_times?: string | null;
  billing_cycle_count?: number | null;
  status: string;
  next_bill_at?: string | null;
  last_billed_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  expires_at?: string | null;
  shipping_address?: Record<string, string> | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  newebpay_trade_no?: string | null;
  newebpay_auth_code?: string | null;
  newebpay_card_no?: string | null;
  newebpay_payment_type?: string | null;
  newebpay_respond_code?: string | null;
  newebpay_status?: string | null;
  newebpay_paid_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
  products?: { id: string; name: string; image_url?: string | null; sku?: string | null; vendor_id?: string | null } | null;
  orders?: {
    id: string;
    user_id: string;
    status: string;
    payment_status: string;
    payment_method?: string | null;
    merchant_order_no?: string | null;
    newebpay_status?: string | null;
    total_amount: number;
    currency?: string | null;
    created_at: string;
    shipping_address?: Record<string, string> | null;
  } | null;
}

interface ShopOrderDetail {
  id: string;
  user_id: string;
  total_amount: number;
  subtotal_amount?: number | null;
  points_discount?: number | null;
  status: string;
  payment_method?: string | null;
  payment_status?: string | null;
  merchant_order_no?: string | null;
  newebpay_status?: string | null;
  newebpay_trade_no?: string | null;
  newebpay_auth_code?: string | null;
  newebpay_card_no?: string | null;
  newebpay_respond_code?: string | null;
  newebpay_payment_type?: string | null;
  newebpay_paid_at?: string | null;
  shipping_address?: Record<string, string> | null;
  discount_code?: string | null;
  currency?: string | null;
  created_at: string;
  updated_at?: string | null;
}

type VendorOrderItem =
  | { kind: 'booking'; id: string; created_at: string; status: string; booking: Booking }
  | { kind: 'product'; id: string; created_at: string; status: string; productOrder: ProductOrderLine }
  | { kind: 'subscription'; id: string; created_at: string; status: string; subscription: SubscriptionOrderLine };

const PRODUCT_STATUS_FILTERS = ['all', 'pending', 'processing', 'shipped', 'completed', 'cancelled', 'refunded'];
const SUBSCRIPTION_STATUS_FILTERS = ['all', 'pending', 'active', 'paused', 'cancelled', 'expired'];
const BOOKING_STATUS_FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

const VendorOrders: React.FC = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [productOrders, setProductOrders] = useState<ProductOrderLine[]>([]);
  const [subscriptionOrders, setSubscriptionOrders] = useState<SubscriptionOrderLine[]>([]);
  const [customerProfiles, setCustomerProfiles] = useState<Record<string, CustomerProfile>>({});
  const [loading, setLoading] = useState(true);
  const [noVendor, setNoVendor] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'product' | 'subscription' | 'booking'>('product');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [selectedDetail, setSelectedDetail] = useState<VendorOrderItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailCustomer, setDetailCustomer] = useState<CustomerProfile | null>(null);
  const [detailShopOrder, setDetailShopOrder] = useState<ShopOrderDetail | null>(null);
  const [detailSubscription, setDetailSubscription] = useState<SubscriptionOrderLine | null>(null);
  const [detailBooking, setDetailBooking] = useState<BookingDetail | null>(null);
  const [detailAfterSales, setDetailAfterSales] = useState<AfterSalesRequest[]>([]);

  const labels = {
    title: pick('訂單管理', 'Order Management', '注文管理', '주문 관리'),
    noVendor: pick('找不到廠商資料，請聯絡管理員。', 'No vendor profile was found. Please contact an administrator.', 'ベンダー情報が見つかりません。管理者に連絡してください。', '판매자 프로필을 찾을 수 없습니다. 관리자에게 문의하세요.'),
    empty: pick('目前沒有符合條件的訂單。', 'No matching orders yet.', '条件に一致する注文はまだありません。', '조건에 맞는 주문이 아직 없습니다.'),
    productEmpty: pick('目前沒有符合條件的商品訂單。', 'No matching product orders yet.', '条件に一致する商品注文はまだありません。', '조건에 맞는 상품 주문이 아직 없습니다.'),
    subscriptionEmpty: pick('目前沒有符合條件的訂閱制訂單。', 'No matching subscription orders yet.', '条件に一致する定期便注文はまだありません。', '조건에 맞는 구독 주문이 아직 없습니다.'),
    bookingEmpty: pick('目前沒有符合條件的訂房。', 'No matching bookings yet.', '条件に一致する予約はまだありません。', '조건에 맞는 예약이 아직 없습니다.'),
    all: pick('全部', 'All', 'すべて', '전체'),
    productTab: pick('商品訂單', 'Product Orders', '商品注文', '상품 주문'),
    subscriptionTab: pick('訂閱制', 'Subscriptions', '定期便', '구독'),
    bookingTab: pick('訂房', 'Bookings', '予約', '예약'),
    productOrder: pick('商品訂單', 'Product Order', '商品注文', '상품 주문'),
    subscriptionOrder: pick('訂閱制', 'Subscription', '定期便', '구독'),
    booking: pick('訂房', 'Booking', '予約', '예약'),
    orderNumber: pick('訂單編號', 'Order No.', '注文番号', '주문 번호'),
    quantity: pick('數量', 'Quantity', '数量', '수량'),
    unitPrice: pick('單價', 'Unit price', '単価', '단가'),
    paymentStatus: pick('付款狀態', 'Payment', '支払い状況', '결제 상태'),
    orderPaymentStatus: pick('訂單付款', 'Order payment', '注文支払い', '주문 결제'),
    bookingPaymentStatus: pick('訂房付款', 'Booking payment', '予約支払い', '예약 결제'),
    customer: pick('消費者', 'Customer', '顧客', '고객'),
    phone: pick('電話', 'Phone', '電話番号', '전화'),
    checkIn: pick('入住', 'Check-in', 'チェックイン', '체크인'),
    checkOut: pick('退房', 'Check-out', 'Check-out', '체크아웃'),
    guests: pick('位', 'guests', '名', '명'),
    createdAt: pick('建立時間', 'Created', '作成時間', '생성 시간'),
    markProcessing: pick('開始處理', 'Start Processing', '処理開始', '처리 시작'),
    markShipped: pick('標記出貨', 'Mark Shipped', '発送済みにする', '배송 처리'),
    markCompleted: pick('標記完成', 'Mark Completed', '完了にする', '완료 처리'),
    cancel: pick('取消', 'Cancel', 'キャンセル', '취소'),
    updateFailed: pick('更新失敗，請稍後再試。', 'Update failed. Please try again later.', '更新に失敗しました。後でもう一度お試しください。', '업데이트 실패. 잠시 후 다시 시도하세요.'),
    paid: pick('已付款', 'Paid', '支払済み', '결제 완료'),
    unpaid: pick('未付款', 'Unpaid', '未払い', '미결제'),
    refunded: pick('已退款', 'Refunded', '返金済み', '환불됨'),
  };

  const activeStatusFilters = categoryFilter === 'product'
    ? PRODUCT_STATUS_FILTERS
    : categoryFilter === 'subscription'
      ? SUBSCRIPTION_STATUS_FILTERS
      : BOOKING_STATUS_FILTERS;
  const categoryOptions = [
    { value: 'product' as const, label: labels.productTab, count: productOrders.length },
    { value: 'subscription' as const, label: labels.subscriptionTab, count: subscriptionOrders.length },
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
    refunded: labels.refunded,
  };

  const subscriptionStatusLabels: Record<string, string> = {
    all: labels.all,
    pending: pick('待啟用', 'Pending', '保留', '대기'),
    active: pick('啟用中', 'Active', '利用中', '활성'),
    paused: pick('暫停', 'Paused', '停止中', '일시중지'),
    cancelled: pick('已取消', 'Cancelled', 'キャンセル', '취소'),
    expired: pick('已到期', 'Expired', '期限切れ', '만료'),
  };

  const getSubscriptionStatusColor = (status?: string | null) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700';
      case 'pending':
        return 'bg-amber-50 text-amber-700';
      case 'paused':
        return 'bg-blue-50 text-blue-700';
      case 'cancelled':
        return 'bg-red-50 text-red-700';
      case 'expired':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getPaymentLabel = (status?: string | null) => {
    if (status === 'paid') return labels.paid;
    if (status === 'refunded') return labels.refunded;
    return labels.unpaid;
  };

  const getShippingAddress = () => {
    if (selectedDetail?.kind === 'product') {
      return detailShopOrder?.shipping_address || selectedDetail.productOrder.orders?.shipping_address || null;
    }
    if (selectedDetail?.kind === 'subscription') {
      return detailSubscription?.shipping_address || detailSubscription?.orders?.shipping_address || null;
    }
    return null;
  };

  const getOrdererName = () => {
    const shippingAddress = getShippingAddress();
    return detailCustomer?.display_name
      || shippingAddress?.customer_name
      || shippingAddress?.recipient_name
      || detailSubscription?.customer_name
      || detailShopOrder?.user_id
      || detailBooking?.user_id
      || '-';
  };

  const getOrdererPhone = () => {
    const shippingAddress = getShippingAddress();
    return detailCustomer?.phone
      || shippingAddress?.customer_phone
      || shippingAddress?.recipient_phone
      || detailSubscription?.customer_phone
      || '-';
  };

  const getOrdererEmail = () => {
    const shippingAddress = getShippingAddress();
    return detailCustomer?.email
      || detailSubscription?.customer_email
      || shippingAddress?.customer_email
      || shippingAddress?.email
      || '-';
  };

  const copyShippingSlip = async () => {
    const shippingAddress = getShippingAddress();
    const summary = [
      `訂單編號：${selectedDetail?.id || '-'}`,
      `訂購者：${getOrdererName()}`,
      `電話：${getOrdererPhone()}`,
      `Email：${getOrdererEmail()}`,
      `商品：${selectedDetail?.kind === 'product'
        ? (selectedDetail.productOrder.products?.name || labels.productOrder)
        : selectedDetail?.kind === 'subscription'
          ? (detailSubscription?.products?.name || labels.subscriptionOrder)
          : (detailBooking?.tbl_rooms?.name || labels.booking)}`,
      `配送資料：${shippingAddress ? Object.entries(shippingAddress).map(([key, value]) => `${key}：${value}`).join(' / ') : '無'}`,
    ].join('\n');
    await navigator.clipboard.writeText(summary);
    setMessage('已複製出貨單摘要');
    setTimeout(() => setMessage(''), 3000);
  };

  const openDetail = async (item: VendorOrderItem) => {
    setSelectedDetail(item);
    setDetailLoading(true);
    setDetailError('');
    setDetailCustomer(null);
    setDetailShopOrder(null);
    setDetailSubscription(null);
    setDetailAfterSales([]);

    try {
      if (item.kind === 'product') {
        const orderId = item.productOrder.order_id;
        const userId = item.productOrder.orders?.user_id || '';
        const [profileRes, orderRes, afterSalesRes] = await Promise.all([
          userId
            ? supabase.from('tbl_mn5wgzh0').select('user_id, display_name, phone').eq('user_id', userId).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from('orders')
            .select('id,user_id,total_amount,subtotal_amount,points_discount,status,payment_method,payment_status,merchant_order_no,newebpay_status,newebpay_trade_no,newebpay_auth_code,newebpay_card_no,newebpay_respond_code,newebpay_payment_type,newebpay_paid_at,shipping_address,discount_code,currency,created_at,updated_at')
            .eq('id', orderId)
            .maybeSingle(),
          supabase.from('after_sales_requests').select('id,request_type,status,message,created_at,updated_at').eq('order_id', orderId).order('created_at', { ascending: false }),
        ]);
        const shippingAddress = (orderRes.data as ShopOrderDetail | null)?.shipping_address || null;
        setDetailCustomer((profileRes.data as CustomerProfile) || (shippingAddress ? {
          user_id: userId,
          display_name: shippingAddress.customer_name || shippingAddress.recipient_name || '',
          phone: shippingAddress.customer_phone || shippingAddress.recipient_phone || '',
          email: shippingAddress.customer_email || shippingAddress.email || '',
        } : null));
        setDetailShopOrder((orderRes.data as ShopOrderDetail) || null);
        setDetailAfterSales((afterSalesRes.data || []) as AfterSalesRequest[]);
      } else if (item.kind === 'subscription') {
        const userId = item.subscription.user_id;
        const [profileRes, subscriptionRes] = await Promise.all([
          userId
            ? supabase.from('tbl_mn5wgzh0').select('user_id, display_name, phone, email').eq('user_id', userId).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from('product_subscriptions')
            .select('id,user_id,product_id,vendor_id,order_id,quantity,monthly_amount,period_type,period_point,period_start_type,period_times,billing_cycle_count,status,next_bill_at,last_billed_at,started_at,ended_at,expires_at,shipping_address,customer_name,customer_email,customer_phone,newebpay_trade_no,newebpay_auth_code,newebpay_card_no,newebpay_payment_type,newebpay_respond_code,newebpay_status,newebpay_paid_at,notes,created_at,updated_at,products(id,name,image_url,sku,vendor_id),orders!product_subscriptions_order_id_fkey(id,user_id,status,payment_status,payment_method,merchant_order_no,newebpay_status,total_amount,currency,created_at,shipping_address)')
            .eq('id', item.subscription.id)
            .maybeSingle(),
        ]);
        const subscriptionData = (subscriptionRes.data as SubscriptionOrderLine | null) || item.subscription;
        const shippingAddress = subscriptionData.shipping_address || subscriptionData.orders?.shipping_address || null;
        setDetailCustomer((profileRes.data as CustomerProfile) || (shippingAddress ? {
          user_id: userId,
          display_name: subscriptionData.customer_name || shippingAddress.customer_name || shippingAddress.recipient_name || '',
          phone: subscriptionData.customer_phone || shippingAddress.customer_phone || shippingAddress.recipient_phone || '',
          email: subscriptionData.customer_email || shippingAddress.customer_email || shippingAddress.email || '',
        } : null));
        setDetailSubscription(subscriptionData);
        setDetailShopOrder((subscriptionData.orders as ShopOrderDetail) || null);
      } else {
        const [{ data: profileData }, { data: bookingData }] = await Promise.all([
          supabase.from('tbl_mn5wgzh0').select('user_id, display_name, phone').eq('user_id', item.booking.user_id).maybeSingle(),
          supabase
            .from('tbl_bookings')
            .select('id,user_id,room_id,check_in_date,check_out_date,guests,total_price,subtotal_price,points_discount,status,payment_method,payment_status,special_requests,created_at,updated_at,tbl_rooms(id,name,location,vendors(name,contact_phone,contact_email),hotels(name,phone,email,address))')
            .eq('id', item.booking.id)
            .maybeSingle(),
        ]);
        setDetailCustomer((profileData as CustomerProfile) || null);
        setDetailBooking((bookingData as BookingDetail) || null);
      }
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : labels.updateFailed);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedDetail(null);
    setDetailError('');
    setDetailCustomer(null);
    setDetailShopOrder(null);
    setDetailSubscription(null);
    setDetailBooking(null);
    setDetailAfterSales([]);
  };

  useEffect(() => {
    if (!activeStatusFilters.includes(statusFilter)) {
      setStatusFilter('all');
    }
  }, [activeStatusFilters, statusFilter]);

  const loadVendorOrders = async (vid: string) => {
    const [bookingRes, productRes, subscriptionRes] = await Promise.all([
      supabase
        .from('tbl_bookings')
        .select('id, user_id, check_in_date, check_out_date, guests, total_price, payment_status, status, created_at, tbl_rooms!inner(name, location, vendor_id)')
        .eq('tbl_rooms.vendor_id', vid)
        .order('created_at', { ascending: false }),
      supabase
        .from('purchase_records')
        .select('id, order_id, quantity, unit_price, total_price, payment_method, status, created_at, products!inner(id, name, image_url, sku, vendor_id), orders(id, user_id, status, payment_status, payment_method, merchant_order_no, newebpay_status, total_amount, currency, created_at, shipping_address)')
        .eq('products.vendor_id', vid)
        .order('created_at', { ascending: false }),
      supabase
        .from('product_subscriptions')
        .select('id, user_id, product_id, vendor_id, order_id, quantity, monthly_amount, period_type, period_point, period_start_type, period_times, billing_cycle_count, status, next_bill_at, last_billed_at, started_at, ended_at, expires_at, shipping_address, customer_name, customer_email, customer_phone, newebpay_trade_no, newebpay_auth_code, newebpay_card_no, newebpay_payment_type, newebpay_respond_code, newebpay_status, newebpay_paid_at, notes, created_at, updated_at, products!inner(id, name, image_url, sku, vendor_id), orders!product_subscriptions_order_id_fkey(id, user_id, status, payment_status, payment_method, merchant_order_no, newebpay_status, total_amount, currency, created_at, shipping_address)')
        .eq('vendor_id', vid)
        .order('created_at', { ascending: false }),
    ]);

    if (bookingRes.error || productRes.error || subscriptionRes.error) {
      setMessage(bookingRes.error?.message || productRes.error?.message || subscriptionRes.error?.message || labels.updateFailed);
    }

    const bookingData = (bookingRes.data || []) as Booking[];
    const productData = (productRes.data || []) as ProductOrderLine[];
    const subscriptionData = (subscriptionRes.data || []) as SubscriptionOrderLine[];
    setBookings(bookingData);
    setProductOrders(productData);
    setSubscriptionOrders(subscriptionData);

    const userIds = Array.from(new Set([
      ...bookingData.map(item => item.user_id).filter(Boolean),
      ...productData.map(item => item.orders?.user_id).filter(Boolean),
      ...subscriptionData.map(item => item.user_id).filter(Boolean),
    ]));

    if (userIds.length === 0) {
      setCustomerProfiles({});
      return;
    }

    const { data: profiles, error: profileError } = await supabase
      .from('tbl_mn5wgzh0')
      .select('user_id, display_name, phone')
      .in('user_id', userIds);

    if (profileError) {
      setCustomerProfiles({});
      return;
    }

    const profileMap = Object.fromEntries((profiles || []).map((profile: any) => [profile.user_id, profile])) as Record<string, CustomerProfile>;
    setCustomerProfiles(profileMap);
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
      ...subscriptionOrders.map(item => ({
        kind: 'subscription' as const,
        id: `subscription:${item.id}`,
        created_at: item.created_at,
        status: item.status,
        subscription: item,
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
  }, [bookings, productOrders, subscriptionOrders]);

  const categoryItems = items.filter(item => item.kind === categoryFilter);
  const filtered = statusFilter === 'all' ? categoryItems : categoryItems.filter(item => item.status === statusFilter);
  const emptyLabel = categoryFilter === 'product'
    ? labels.productEmpty
    : categoryFilter === 'subscription'
      ? labels.subscriptionEmpty
      : labels.bookingEmpty;
  const activeStatusLabels = categoryFilter === 'subscription' ? subscriptionStatusLabels : statusLabels;

  const refresh = async () => {
    if (vendorId) await loadVendorOrders(vendorId);
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    setUpdating(`booking:${bookingId}`);
    const { error } = await supabase.from('tbl_bookings').update({ status, updated_at: new Date().toISOString() }).eq('id', bookingId);
    if (error) setMessage(labels.updateFailed);
    else await logAdminAction('update_booking_status', 'tbl_bookings', bookingId, { status, vendor_id: vendorId });
    await refresh();
    setUpdating(null);
  };

  const updateProductStatus = async (item: ProductOrderLine, status: string) => {
    setUpdating(`product:${item.id}`);
    try {
      if (status === 'cancelled' && item.orders?.payment_status === 'paid') {
        await refundOrder(item.order_id);
        await logAdminAction('refund_product_order', 'purchase_records', item.id, {
          order_id: item.order_id,
          vendor_id: vendorId,
          status,
        });
        await refresh();
        setMessage('');
        return;
      }

      const { error } = await supabase.from('purchase_records').update({ status }).eq('id', item.id);
      if (error) throw error;
      await logAdminAction('update_product_order_status', 'purchase_records', item.id, { order_id: item.order_id, status, vendor_id: vendorId });
      await refresh();
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : labels.updateFailed);
    } finally {
      setUpdating(null);
    }
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

      <div className="grid grid-cols-1 gap-2 rounded-2xl bg-white p-2 shadow-sm sm:grid-cols-3">
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
            {activeStatusLabels[status]}
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
              <ProductOrderCard
                  item={item.productOrder}
                  labels={labels}
                  locale={locale}
                  updating={updating}
                  onUpdate={updateProductStatus}
                  customer={item.productOrder.orders?.user_id ? customerProfiles[item.productOrder.orders.user_id] : undefined}
                  paymentLabel={getPaymentLabel(item.productOrder.orders?.payment_status)}
                  onViewDetail={() => void openDetail(item)}
                />
              ) : item.kind === 'subscription' ? (
                <SubscriptionCard
                  item={item.subscription}
                  labels={labels}
                  updating={updating}
                  statusLabel={subscriptionStatusLabels[item.subscription.status] || item.subscription.status}
                  statusClassName={getSubscriptionStatusColor(item.subscription.status)}
                  customer={customerProfiles[item.subscription.user_id]}
                  paymentLabel={getPaymentLabel(item.subscription.orders?.payment_status)}
                  onViewDetail={() => void openDetail(item)}
                />
              ) : (
                <BookingCard
                  item={item.booking}
                  labels={labels}
                  locale={locale}
                  updating={updating}
                  onUpdate={updateBookingStatus}
                  customer={customerProfiles[item.booking.user_id]}
                  paymentLabel={getPaymentLabel(item.booking.payment_status)}
                  onViewDetail={() => void openDetail(item)}
                />
              )}
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={closeDetail}
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      <Package className="h-3.5 w-3.5" />
                      {selectedDetail.kind === 'product'
                        ? labels.productOrder
                        : selectedDetail.kind === 'subscription'
                          ? labels.subscriptionOrder
                          : labels.booking}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${selectedDetail.kind === 'subscription'
                      ? getSubscriptionStatusColor(selectedDetail.subscription.status)
                      : getStatusColor(selectedDetail.kind === 'product' ? selectedDetail.productOrder.status : selectedDetail.booking.status)}`}>
                      {selectedDetail.kind === 'product'
                        ? getStatusLabel(selectedDetail.productOrder.status, locale)
                        : selectedDetail.kind === 'subscription'
                          ? subscriptionStatusLabels[selectedDetail.subscription.status] || selectedDetail.subscription.status
                          : getStatusLabel(selectedDetail.booking.status, locale)}
                    </span>
                  </div>
                  <h2 className="mt-2 text-2xl font-bold text-gray-900">
                    #{selectedDetail.id.split(':').pop()?.slice(-10).toUpperCase()}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">{formatDateTime(selectedDetail.created_at)}</p>
                </div>
                <button type="button" onClick={closeDetail} className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-gray-50">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {detailLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                  </div>
                ) : detailError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{detailError}</div>
                ) : selectedDetail.kind === 'product' ? (
                  <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-6">
                      <DetailCard title="訂單資料" icon={<Receipt className="h-4 w-4" />}>
                        <div className="grid gap-4 md:grid-cols-2">
                          <DetailField label={labels.orderNumber} value={detailShopOrder?.id ? `#${detailShopOrder.id.slice(-10).toUpperCase()}` : '-'} mono />
                          <DetailField label={labels.orderPaymentStatus} value={getPaymentLabel(detailShopOrder?.payment_status)} />
                          <DetailField label={labels.paymentStatus} value={detailShopOrder?.status || '-'} />
                          <DetailField label="支付方式" value={getPaymentMethodLabel(detailShopOrder?.payment_method)} />
                          <DetailField label="Merchant Order No." value={detailShopOrder?.merchant_order_no || '-'} mono />
                          <DetailField label="交易序號" value={detailShopOrder?.newebpay_trade_no || '-'} mono />
                          <DetailField label="付款時間" value={detailShopOrder?.newebpay_paid_at ? formatDateTime(detailShopOrder.newebpay_paid_at) : '-'} />
                          <DetailField label="更新時間" value={detailShopOrder?.updated_at ? formatDateTime(detailShopOrder.updated_at) : '-'} />
                        </div>
                      </DetailCard>

                      <DetailCard title="訂購人資訊" icon={<User className="h-4 w-4" />}>
                        <div className="grid gap-4 md:grid-cols-2">
                          <DetailField label="訂購者名稱" value={getOrdererName()} />
                          <DetailField label={labels.phone} value={getOrdererPhone()} />
                          <DetailField label="Email" value={getOrdererEmail()} />
                          <DetailField label="User ID" value={detailShopOrder?.user_id || '-'} mono />
                        </div>
                      </DetailCard>

                      <DetailCard title={labels.productOrder} icon={<ShoppingBag className="h-4 w-4" />}>
                        <div className="space-y-3">
                          {(selectedDetail.productOrder.products?.name || selectedDetail.productOrder.products?.sku) ? (
                            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="font-semibold text-gray-900">{selectedDetail.productOrder.products?.name || labels.productOrder}</p>
                                  <p className="mt-1 text-xs text-gray-400">{selectedDetail.productOrder.products?.sku || selectedDetail.productOrder.id}</p>
                                  <p className="mt-1 text-sm text-gray-600">
                                    {selectedDetail.productOrder.products?.vendors?.name || '-'}
                                    {selectedDetail.productOrder.products?.vendors?.contact_phone ? ` · ${selectedDetail.productOrder.products.vendors.contact_phone}` : ''}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-base font-bold text-gray-900">{formatCurrency(selectedDetail.productOrder.total_price)}</p>
                                  <p className="text-xs text-gray-400">{selectedDetail.productOrder.quantity} x {formatCurrency(selectedDetail.productOrder.unit_price)}</p>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </DetailCard>

                      <DetailCard title="配送 / 送貨資料" icon={<MapPin className="h-4 w-4" />}>
                        {getShippingAddress() && Object.keys(getShippingAddress() || {}).length > 0 ? (
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3">
                              <div>
                                <p className="text-sm font-semibold text-emerald-800">出貨單摘要</p>
                                <p className="text-xs text-emerald-700">先確認訂購者名稱、電話與配送資訊後即可出貨</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => void copyShippingSlip()}
                                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                              >
                                建立出貨單
                              </button>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                            {Object.entries(getShippingAddress() || {}).map(([key, value]) => (
                              <DetailField key={key} label={key} value={String(value)} />
                            ))}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">沒有配送資料</div>
                        )}
                      </DetailCard>
                    </div>

                    <aside className="space-y-6">
                      <DetailCard title="訂單通訊" icon={<MessageSquare className="h-4 w-4" />}>
                        <div className="space-y-3">
                          {detailAfterSales.length === 0 ? (
                            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">目前沒有售後留言</div>
                          ) : detailAfterSales.map((req) => (
                            <div key={req.id} className="rounded-2xl bg-gray-50 p-4">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-900">{req.request_type}</p>
                                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600">{req.status}</span>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-gray-700">{req.message || '-'}</p>
                              <p className="mt-2 text-xs text-gray-400">{formatDateTime(req.created_at)}</p>
                            </div>
                          ))}
                        </div>
                      </DetailCard>

                      <DetailCard title="訂單活動紀錄" icon={<Clock3 className="h-4 w-4" />}>
                        <div className="space-y-3">
                          {[
                            { label: '建立訂單', value: formatDateTime(selectedDetail.productOrder.created_at) },
                            { label: '付款狀態', value: getPaymentLabel(selectedDetail.productOrder.orders?.payment_status) },
                            { label: '訂單狀態', value: getStatusLabel(selectedDetail.productOrder.status, locale) },
                            { label: '最後更新', value: detailShopOrder?.updated_at ? formatDateTime(detailShopOrder.updated_at) : '-' },
                          ].map((step) => (
                            <div key={step.label} className="flex gap-3 rounded-2xl bg-gray-50 p-4">
                              <div className="mt-0.5 h-7 w-7 flex-shrink-0 rounded-full bg-emerald-100 text-center text-xs font-bold leading-7 text-emerald-700">•</div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{step.label}</p>
                                <p className="mt-1 text-sm text-gray-500">{step.value}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </DetailCard>
                    </aside>
                  </div>
                ) : selectedDetail.kind === 'subscription' ? (
                  <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-6">
                      <DetailCard title="訂閱資料" icon={<Receipt className="h-4 w-4" />}>
                        <div className="grid gap-4 md:grid-cols-2">
                          <DetailField label={labels.orderNumber} value={detailSubscription?.id ? `#${detailSubscription.id.slice(-10).toUpperCase()}` : '-'} mono />
                          <DetailField label={labels.paymentStatus} value={subscriptionStatusLabels[detailSubscription?.status || ''] || detailSubscription?.status || '-'} />
                          <DetailField label="月費金額" value={formatCurrency(detailSubscription?.monthly_amount || 0)} />
                          <DetailField label="數量" value={String(detailSubscription?.quantity || '-')} />
                          <DetailField label="訂閱期數" value={detailSubscription?.billing_cycle_count != null ? `${detailSubscription.billing_cycle_count} 期` : '-'} />
                          <DetailField label="期數類型" value={detailSubscription?.period_type || '-'} />
                          <DetailField label="期數指定日" value={detailSubscription?.period_point || '-'} />
                          <DetailField label="起算方式" value={detailSubscription?.period_start_type || '-'} />
                          <DetailField label="總期數" value={detailSubscription?.period_times || '-'} />
                          <DetailField label="下次扣款" value={detailSubscription?.next_bill_at ? formatDateTime(detailSubscription.next_bill_at) : '-'} />
                          <DetailField label="上次扣款" value={detailSubscription?.last_billed_at ? formatDateTime(detailSubscription.last_billed_at) : '-'} />
                          <DetailField label="開始時間" value={detailSubscription?.started_at ? formatDateTime(detailSubscription.started_at) : '-'} />
                          <DetailField label="結束時間" value={detailSubscription?.ended_at ? formatDateTime(detailSubscription.ended_at) : '-'} />
                          <DetailField label="到期時間" value={detailSubscription?.expires_at ? formatDateTime(detailSubscription.expires_at) : '-'} />
                          <DetailField label="付款狀態" value={getPaymentLabel(detailSubscription?.orders?.payment_status)} />
                          <DetailField label="NewebPay 狀態" value={detailSubscription?.newebpay_status || '-'} />
                          <DetailField label="付款時間" value={detailSubscription?.newebpay_paid_at ? formatDateTime(detailSubscription.newebpay_paid_at) : '-'} />
                          <DetailField label="更新時間" value={detailSubscription?.updated_at ? formatDateTime(detailSubscription.updated_at) : '-'} />
                        </div>
                      </DetailCard>

                      <DetailCard title="訂購人資訊" icon={<User className="h-4 w-4" />}>
                        <div className="grid gap-4 md:grid-cols-2">
                          <DetailField label="訂購者名稱" value={getOrdererName()} />
                          <DetailField label={labels.phone} value={getOrdererPhone()} />
                          <DetailField label="Email" value={getOrdererEmail()} />
                          <DetailField label="User ID" value={detailSubscription?.user_id || '-'} mono />
                        </div>
                      </DetailCard>

                      <DetailCard title={labels.subscriptionOrder} icon={<ShoppingBag className="h-4 w-4" />}>
                        <div className="space-y-3">
                          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold text-gray-900">{detailSubscription?.products?.name || labels.subscriptionOrder}</p>
                                <p className="mt-1 text-xs text-gray-400">{detailSubscription?.products?.sku || detailSubscription?.product_id || '-'}</p>
                                <p className="mt-1 text-sm text-gray-600">
                                  {detailSubscription?.notes || '訂閱商品明細'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-base font-bold text-gray-900">{formatCurrency(detailSubscription?.monthly_amount || 0)}</p>
                                <p className="text-xs text-gray-400">{detailSubscription?.quantity || 1} x {formatCurrency(detailSubscription?.monthly_amount || 0)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </DetailCard>

                      <DetailCard title="配送 / 收件資料" icon={<MapPin className="h-4 w-4" />}>
                        {getShippingAddress() && Object.keys(getShippingAddress() || {}).length > 0 ? (
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3">
                              <div>
                                <p className="text-sm font-semibold text-emerald-800">配送資訊</p>
                                <p className="text-xs text-emerald-700">可直接確認訂閱收件資料與聯絡方式</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => void copyShippingSlip()}
                                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                              >
                                建立出貨單
                              </button>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              {Object.entries(getShippingAddress() || {}).map(([key, value]) => (
                                <DetailField key={key} label={key} value={String(value)} />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">沒有配送資料</div>
                        )}
                      </DetailCard>
                    </div>

                    <aside className="space-y-6">
                      <DetailCard title="訂閱狀態" icon={<Clock3 className="h-4 w-4" />}>
                        <div className="space-y-3">
                          {[
                            { label: '建立時間', value: detailSubscription?.created_at ? formatDateTime(detailSubscription.created_at) : '-' },
                            { label: '訂閱狀態', value: subscriptionStatusLabels[detailSubscription?.status || ''] || detailSubscription?.status || '-' },
                            { label: '付款狀態', value: getPaymentLabel(detailSubscription?.orders?.payment_status) },
                            { label: 'Merchant Order No.', value: detailSubscription?.orders?.merchant_order_no || detailSubscription?.order_id || '-', mono: true },
                            { label: '交易序號', value: detailSubscription?.newebpay_trade_no || '-', mono: true },
                            { label: '卡號末四碼', value: detailSubscription?.newebpay_card_no || '-' },
                            { label: '付款類型', value: detailSubscription?.newebpay_payment_type || '-' },
                          ].map((step) => (
                            <div key={step.label} className="rounded-2xl bg-gray-50 p-4">
                              <p className="text-sm font-semibold text-gray-900">{step.label}</p>
                              <p className={`mt-1 text-sm text-gray-500 ${step.mono ? 'font-mono break-all text-xs' : ''}`}>{step.value}</p>
                            </div>
                          ))}
                        </div>
                      </DetailCard>

                      <DetailCard title="訂單連結" icon={<MessageSquare className="h-4 w-4" />}>
                        <div className="space-y-3">
                          <DetailCard title="關聯訂單" icon={<ShoppingBag className="h-4 w-4" />}>
                            <div className="grid gap-4 md:grid-cols-2">
                              <DetailField label="訂單編號" value={detailSubscription?.orders?.id ? `#${detailSubscription.orders.id.slice(-10).toUpperCase()}` : '-'} mono />
                              <DetailField label="訂單總額" value={formatCurrency(detailSubscription?.orders?.total_amount || 0)} />
                              <DetailField label="訂單付款" value={getPaymentLabel(detailSubscription?.orders?.payment_status)} />
                              <DetailField label="訂單狀態" value={detailSubscription?.orders?.status || '-'} />
                            </div>
                          </DetailCard>
                          <DetailCard title="備註" icon={<MessageSquare className="h-4 w-4" />}>
                            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                              {detailSubscription?.notes || '沒有備註'}
                            </div>
                          </DetailCard>
                        </div>
                      </DetailCard>
                    </aside>
                  </div>
                ) : (
                  <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-6">
                      <DetailCard title="訂房資料" icon={<BedDouble className="h-4 w-4" />}>
                        <div className="grid gap-4 md:grid-cols-2">
                          <DetailField label={labels.orderNumber} value={detailBooking?.id ? `#${detailBooking.id.slice(-10).toUpperCase()}` : '-'} mono />
                          <DetailField label={labels.bookingPaymentStatus} value={getPaymentLabel(detailBooking?.payment_status)} />
                          <DetailField label={labels.paymentStatus} value={detailBooking?.status || '-'} />
                          <DetailField label={labels.checkIn} value={formatDate(detailBooking?.check_in_date || '')} />
                          <DetailField label={labels.checkOut} value={formatDate(detailBooking?.check_out_date || '')} />
                          <DetailField label={labels.guests} value={String(detailBooking?.guests || '-')} />
                          <DetailField label="總金額" value={formatCurrency(detailBooking?.total_price || 0)} />
                          <DetailField label="特殊需求" value={detailBooking?.special_requests || '-'} />
                        </div>
                      </DetailCard>

                      <DetailCard title="房型資訊" icon={<Receipt className="h-4 w-4" />}>
                        <div className="grid gap-4 md:grid-cols-2">
                          <DetailField label="房型" value={detailBooking?.room?.name || detailBooking?.tbl_rooms?.name || '-'} />
                          <DetailField label="地點" value={detailBooking?.room?.location || detailBooking?.tbl_rooms?.location || '-'} />
                          <DetailField label="入住日期" value={formatDate(detailBooking?.check_in_date || '')} />
                          <DetailField label="退房日期" value={formatDate(detailBooking?.check_out_date || '')} />
                        </div>
                      </DetailCard>
                    </div>

                    <aside className="space-y-6">
                      <DetailCard title="訂購人資訊" icon={<User className="h-4 w-4" />}>
                        <div className="grid gap-4 md:grid-cols-2">
                          <DetailField label={labels.customer} value={detailCustomer?.display_name || detailBooking?.user_id || '-'} />
                          <DetailField label={labels.phone} value={detailCustomer?.phone || '-'} />
                          <DetailField label="User ID" value={detailBooking?.user_id || '-'} mono />
                          <DetailField label="Email" value={'-'} />
                        </div>
                      </DetailCard>

                      <DetailCard title="聯絡方式" icon={<Phone className="h-4 w-4" />}>
                        <div className="grid gap-4 md:grid-cols-2">
                          <DetailField label="接待方" value={detailBooking?.tbl_rooms?.vendors?.name || detailBooking?.tbl_rooms?.hotels?.name || '-'} />
                          <DetailField label="電話" value={detailBooking?.tbl_rooms?.vendors?.contact_phone || detailBooking?.tbl_rooms?.hotels?.phone || '-'} />
                          <DetailField label="Email" value={detailBooking?.tbl_rooms?.vendors?.contact_email || detailBooking?.tbl_rooms?.hotels?.email || '-'} />
                          <DetailField label="地址" value={detailBooking?.tbl_rooms?.vendors?.address || detailBooking?.tbl_rooms?.hotels?.address || detailBooking?.tbl_rooms?.location || '-'} />
                        </div>
                      </DetailCard>

                      <DetailCard title="訂單活動紀錄" icon={<Clock3 className="h-4 w-4" />}>
                        <div className="space-y-3">
                          {[
                            { label: '建立訂單', value: formatDateTime(selectedDetail.booking.created_at) },
                            { label: '付款狀態', value: getPaymentLabel(selectedDetail.booking.payment_status) },
                            { label: '訂房狀態', value: getStatusLabel(selectedDetail.booking.status, locale) },
                            { label: '最後更新', value: detailBooking?.updated_at ? formatDateTime(detailBooking.updated_at) : '-' },
                          ].map((step) => (
                            <div key={step.label} className="flex gap-3 rounded-2xl bg-gray-50 p-4">
                              <div className="mt-0.5 h-7 w-7 flex-shrink-0 rounded-full bg-emerald-100 text-center text-xs font-bold leading-7 text-emerald-700">•</div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{step.label}</p>
                                <p className="mt-1 text-sm text-gray-500">{step.value}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </DetailCard>
                    </aside>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function ProductOrderCard({
  item,
  labels,
  locale,
  updating,
  onUpdate,
  customer,
  paymentLabel,
  onViewDetail,
}: {
  item: ProductOrderLine;
  labels: Record<string, string>;
  locale: string;
  updating: string | null;
  onUpdate: (item: ProductOrderLine, status: string) => void;
  customer?: CustomerProfile;
  paymentLabel: string;
  onViewDetail: () => void;
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
          <span>{labels.customer}: {customer?.display_name || item.orders?.shipping_address?.customer_name || item.orders?.shipping_address?.recipient_name || item.orders?.user_id || '—'}</span>
          <span>{labels.phone}: {customer?.phone || item.orders?.shipping_address?.customer_phone || item.orders?.shipping_address?.recipient_phone || '—'}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
          <span>{labels.orderNumber}: #{item.order_id.slice(0, 8).toUpperCase()}</span>
          <span>{labels.quantity}: {item.quantity}</span>
          <span>{labels.unitPrice}: {formatCurrency(item.unit_price)}</span>
          <span>{labels.orderPaymentStatus}: {paymentLabel}</span>
        </div>
        <p className="text-xs text-gray-400">{labels.createdAt}: {formatDate(item.created_at)}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <p className="text-xl font-bold text-emerald-700">{formatCurrency(item.total_price)}</p>
        {item.status === 'pending' && (
          <div className="flex gap-2">
            <button type="button" onClick={() => onUpdate(item, 'processing')} disabled={busy} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60">
              {busy ? '...' : labels.markProcessing}
            </button>
            <button type="button" onClick={() => onUpdate(item, 'cancelled')} disabled={busy} className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-60">
              {labels.cancel}
            </button>
          </div>
        )}
        {item.status === 'processing' && (
          <button type="button" onClick={() => onUpdate(item, 'shipped')} disabled={busy} className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-100 disabled:opacity-60">
            {busy ? '...' : labels.markShipped}
          </button>
        )}
        {item.status === 'shipped' && (
          <button type="button" onClick={() => onUpdate(item, 'completed')} disabled={busy} className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-100 disabled:opacity-60">
            {busy ? '...' : labels.markCompleted}
          </button>
        )}
        <button type="button" onClick={onViewDetail} className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50">
          查看明細
        </button>
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
  customer,
  paymentLabel,
  onViewDetail,
}: {
  item: Booking;
  labels: Record<string, string>;
  locale: string;
  updating: string | null;
  onUpdate: (id: string, status: string) => void;
  customer?: CustomerProfile;
  paymentLabel: string;
  onViewDetail: () => void;
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
          <span>{labels.customer}: {customer?.display_name || item.user_id || '—'}</span>
          <span>{labels.phone}: {customer?.phone || '—'}</span>
          <span>{labels.bookingPaymentStatus}: {paymentLabel}</span>
        </div>
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
        <button type="button" onClick={onViewDetail} className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50">
          查看明細
        </button>
      </div>
    </div>
  );
}

function SubscriptionCard({
  item,
  labels,
  updating,
  statusLabel,
  statusClassName,
  customer,
  paymentLabel,
  onViewDetail,
}: {
  item: SubscriptionOrderLine;
  labels: Record<string, string>;
  updating: string | null;
  statusLabel: string;
  statusClassName: string;
  customer?: CustomerProfile;
  paymentLabel: string;
  onViewDetail: () => void;
}) {
  const busy = updating === `subscription:${item.id}`;
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-700">
            <Package className="h-3.5 w-3.5" />
            {labels.subscriptionOrder}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClassName}`}>{statusLabel}</span>
        </div>
        <p className="font-semibold text-gray-900">{item.products?.name || labels.subscriptionOrder}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
          <span>{labels.customer}: {customer?.display_name || item.customer_name || item.orders?.user_id || '—'}</span>
          <span>{labels.phone}: {customer?.phone || item.customer_phone || '—'}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
          <span>{labels.orderNumber}: #{item.order_id?.slice(0, 8).toUpperCase() || item.id.slice(0, 8).toUpperCase()}</span>
          <span>月費：{formatCurrency(item.monthly_amount || 0)}</span>
          <span>期數：{item.billing_cycle_count != null ? `${item.billing_cycle_count} 期` : '-'}</span>
          <span>{labels.orderPaymentStatus}: {paymentLabel}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
          <span>開始：{item.started_at ? formatDate(item.started_at) : '-'}</span>
          <span>下次扣款：{item.next_bill_at ? formatDate(item.next_bill_at) : '-'}</span>
          <span>到期：{item.expires_at ? formatDate(item.expires_at) : '-'}</span>
        </div>
        <p className="text-xs text-gray-400">{labels.createdAt}: {formatDate(item.created_at)}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <p className="text-xl font-bold text-cyan-700">{formatCurrency(item.monthly_amount || 0)}</p>
        <button type="button" onClick={onViewDetail} disabled={busy} className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60">
          查看明細
        </button>
      </div>
    </div>
  );
}

function DetailCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function DetailField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className={`mt-1 text-sm font-medium text-gray-900 ${mono ? 'break-all font-mono text-xs' : ''}`}>{value || '-'}</p>
    </div>
  );
}

function getPaymentMethodLabel(method?: string | null) {
  switch (method) {
    case 'credit_card':
      return '信用卡';
    case 'points':
      return '點數';
    case 'points_credit_card':
      return '點數 + 信用卡';
    case 'points_online':
      return '點數 + 線上付款';
    case 'service':
      return '專人服務';
    case 'online':
      return '線上付款';
    case 'webatm':
      return 'WebATM';
    case 'atm':
    case 'bank_transfer':
      return 'ATM 轉帳';
    case 'cvs':
      return '超商代碼';
    default:
      return method || '-';
  }
}

export default VendorOrders;

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Clock3,
  Copy,
  DollarSign,
  ExternalLink,
  Filter,
  Mail,
  MapPin,
  Package,
  Phone,
  Search,
  ShoppingBag,
  Truck,
  User,
  Users,
  BedDouble,
  X,
  MessageSquare,
  Receipt,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils';

type TabType = 'shop' | 'booking';

type PaymentStatus = 'paid' | 'unpaid' | 'refunded' | string;
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled' | 'confirmed' | string;

interface ShopOrderListRow {
  id: string;
  user_id: string;
  total_amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string | null;
  created_at: string;
  updated_at?: string | null;
  display_name?: string;
}

interface BookingOrderListRow {
  id: string;
  user_id: string;
  total_price: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string | null;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  created_at: string;
  updated_at?: string | null;
  display_name?: string;
  room_name?: string;
}

interface CustomerProfile {
  user_id: string;
  display_name?: string | null;
  phone?: string | null;
  nationality?: string | null;
  preferred_language?: string | null;
}

interface AfterSalesRequest {
  id: string;
  request_type: string;
  status: string;
  message: string;
  created_at: string;
  updated_at: string;
}

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

interface ShopOrderDetail {
  id: string;
  user_id: string;
  total_amount: number;
  subtotal_amount?: number | null;
  points_discount?: number | null;
  status: OrderStatus;
  payment_method: string | null;
  payment_status: PaymentStatus;
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
  purchase_records?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    status?: string | null;
    products?: {
      id: string;
      name?: string | null;
      sku?: string | null;
      image_url?: string | null;
      vendors?: {
        id?: string | null;
        name?: string | null;
        contact_phone?: string | null;
        contact_email?: string | null;
      } | null;
    } | null;
  }> | null;
}

interface InvoiceDetail {
  id: string;
  order_id: string;
  user_id: string;
  invoice_status: string;
  invoice_number?: string | null;
  invoice_random_number?: string | null;
  invoice_date?: string | null;
  buyer_name?: string | null;
  buyer_email?: string | null;
  buyer_identifier?: string | null;
  carrier_type?: string | null;
  carrier_number?: string | null;
  love_code?: string | null;
  tax_type?: string | null;
  sales_amount?: number | string | null;
  tax_amount?: number | string | null;
  total_amount?: number | string | null;
  ezpay_trade_no?: string | null;
  ezpay_raw_request?: Record<string, unknown> | null;
  ezpay_raw_response?: Record<string, unknown> | null;
  error_message?: string | null;
  created_at: string;
  updated_at?: string | null;
}

interface BookingOrderDetail {
  id: string;
  user_id: string;
  room_id?: string | null;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  total_price: number;
  subtotal_price?: number | null;
  points_discount?: number | null;
  status: OrderStatus;
  payment_method?: string | null;
  payment_status?: PaymentStatus;
  special_requests?: string | null;
  created_at: string;
  updated_at?: string | null;
  tbl_rooms?: {
    id?: string | null;
    name?: string | null;
    location?: string | null;
    image_url?: string | null;
    price_per_night?: number | null;
    vendors?: {
      id?: string | null;
      name?: string | null;
      contact_phone?: string | null;
      contact_email?: string | null;
      address?: string | null;
    } | null;
    hotels?: {
      id?: string | null;
      name?: string | null;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
    } | null;
  } | null;
}

interface EmailResult {
  [userId: string]: string;
}

interface SelectedDetail {
  type: TabType;
  id: string;
}

const SHOP_STATUS_LABELS: Record<string, string> = {
  pending: '待處理',
  processing: '處理中',
  shipped: '已出貨',
  completed: '已完成',
  cancelled: '已取消',
};

const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: '待確認',
  confirmed: '已確認',
  completed: '已完成',
  cancelled: '已取消',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: '已付款',
  unpaid: '未付款',
  refunded: '已退款',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-cyan-100 text-cyan-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  confirmed: 'bg-emerald-100 text-emerald-700',
  paid: 'bg-green-100 text-green-700',
  unpaid: 'bg-amber-100 text-amber-700',
  refunded: 'bg-slate-100 text-slate-700',
};

const PAGE_LABELS = {
  title: '訂單管理',
  subtitle: '查看商店與住宿訂單、付款、發票與配送資訊',
  tabShop: '商店訂單',
  tabBooking: '住宿訂單',
  searchShop: '搜尋商店訂單 / 訂單編號 / 顧客',
  searchBooking: '搜尋住宿訂單 / 訂單編號 / 顧客',
  emptyShop: '沒有商店訂單',
  emptyBooking: '沒有住宿訂單',
  detailTitle: '訂單明細',
  orderData: '訂單資料',
  buyerInfo: '顧客資訊',
  paymentInfo: '付款資料',
  shippingInfo: '配送 / 住宿資料',
  communication: '訂單溝通',
  timeline: '訂單時間軸',
  productDetails: '商品明細',
  bookingDetails: '住宿資料',
  contact: '聯絡資訊',
  createdAt: '建立時間',
  updatedAt: '更新時間',
};

const formatStatusLabel = (type: TabType, value: string) => {
  if (type === 'shop') return SHOP_STATUS_LABELS[value] || value || '-';
  return BOOKING_STATUS_LABELS[value] || value || '-';
};

const getPaymentMethodLabel = (method?: string | null) => {
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
      return '服務費';
    case 'online':
      return '線上付款';
    case 'webatm':
      return 'WebATM';
    case 'atm':
    case 'bank_transfer':
      return 'ATM / 轉帳';
    case 'cvs':
      return '超商代碼';
    default:
      return method || '-';
  }
};

const getShippingEntries = (shipping?: Record<string, string> | null) => {
  if (!shipping || typeof shipping !== 'object') return [];

  const priorityKeys = [
    'recipient_name',
    'customer_name',
    'receiver_name',
    'recipient_phone',
    'phone',
    'email',
    'zip',
    'postal_code',
    'city',
    'district',
    'address',
    'street',
    'delivery_method',
    'store_name',
    'store_code',
    'note',
  ];

  const seen = new Set<string>();
  const ordered: Array<[string, string]> = [];

  priorityKeys.forEach((key) => {
    const raw = shipping[key];
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value) {
      ordered.push([key, value]);
      seen.add(key);
    }
  });

  Object.entries(shipping).forEach(([key, raw]) => {
    if (seen.has(key)) return;
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value) ordered.push([key, value]);
  });

  return ordered;
};

async function fetchMemberEmails(userIds: string[]): Promise<EmailResult> {
  try {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueIds.length === 0) return {};

    const session = (await supabase.auth.getSession()).data.session;
    if (!session) return {};

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ user_ids: uniqueIds }),
    });

    if (!response.ok) return {};
    const { emails } = await response.json();
    return emails || {};
  } catch {
    return {};
  }
}

const SuperAdminOrders: React.FC = () => {
  const location = useLocation();
  const initialParams = new URLSearchParams(location.search);
  const [tab, setTab] = useState<TabType>(initialParams.get('tab') === 'booking' ? 'booking' : 'shop');
  const [shopOrders, setShopOrders] = useState<ShopOrderListRow[]>([]);
  const [bookingOrders, setBookingOrders] = useState<BookingOrderListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [shopDetail, setShopDetail] = useState<ShopOrderDetail | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetail | null>(null);
  const [bookingDetail, setBookingDetail] = useState<BookingOrderDetail | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [detailActivityLogs, setDetailActivityLogs] = useState<ActivityLog[]>([]);
  const [detailAfterSales, setDetailAfterSales] = useState<AfterSalesRequest[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setTab(params.get('tab') === 'booking' ? 'booking' : 'shop');
    setSearch(params.get('q') || '');
  }, [location.search]);

  useEffect(() => {
    void fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: orders }, { data: bookings }] = await Promise.all([
        supabase
          .from('orders')
          .select('id,user_id,total_amount,status,payment_status,payment_method,created_at,updated_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('tbl_bookings')
          .select('id,user_id,total_price,status,payment_status,payment_method,check_in_date,check_out_date,guests,created_at,updated_at,tbl_rooms(name)')
          .order('created_at', { ascending: false }),
      ]);

      const allUserIds = Array.from(new Set([
        ...(orders || []).map((o: any) => o.user_id),
        ...(bookings || []).map((b: any) => b.user_id),
      ]));

      let profileMap: Record<string, string> = {};
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase.from('tbl_mn5wgzh0').select('user_id,display_name').in('user_id', allUserIds);
        profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.display_name]));
      }

      setShopOrders((orders || []).map((o: any) => ({ ...o, display_name: profileMap[o.user_id] || '' })));
      setBookingOrders((bookings || []).map((b: any) => ({
        ...b,
        display_name: profileMap[b.user_id] || '',
        room_name: b.tbl_rooms?.name || '',
      })));
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceDetail = async (orderId: string) => {
    const { data } = await supabase
      .from('invoices')
      .select(
        'id,order_id,user_id,invoice_status,invoice_number,invoice_random_number,invoice_date,buyer_name,buyer_email,buyer_identifier,carrier_type,carrier_number,love_code,tax_type,sales_amount,tax_amount,total_amount,ezpay_trade_no,ezpay_raw_request,ezpay_raw_response,error_message,created_at,updated_at',
      )
      .eq('order_id', orderId)
      .maybeSingle();

    setInvoiceDetail((data as InvoiceDetail) || null);
  };

  const openDetail = async (detail: SelectedDetail) => {
    setSelectedDetail(detail);
    setDetailLoading(true);
    setDetailError('');
    setShopDetail(null);
    setInvoiceDetail(null);
    setBookingDetail(null);
    setCustomerProfile(null);
    setCustomerEmail('');
    setDetailActivityLogs([]);
    setDetailAfterSales([]);

    try {
      if (detail.type === 'shop') {
        const [{ data: orderData }, emailMap] = await Promise.all([
          supabase
            .from('orders')
            .select(`
              id,user_id,total_amount,subtotal_amount,points_discount,status,payment_method,payment_status,merchant_order_no,
              newebpay_status,newebpay_trade_no,newebpay_auth_code,newebpay_card_no,newebpay_respond_code,newebpay_payment_type,
              newebpay_paid_at,shipping_address,discount_code,currency,created_at,updated_at,
              purchase_records(
                id,quantity,unit_price,total_price,status,
                products(
                  id,name,sku,image_url,
                  vendors(id,name,contact_phone,contact_email)
                )
              )
            `)
            .eq('id', detail.id)
            .maybeSingle(),
          fetchMemberEmails([]),
        ]);

        const shopRow = (orderData as ShopOrderDetail) || null;
        setShopDetail(shopRow);
        if (shopRow?.id) {
          void fetchInvoiceDetail(shopRow.id);
        }

        if (shopRow?.user_id) {
          const [profileRes, buyerEmails] = await Promise.all([
            supabase.from('tbl_mn5wgzh0').select('user_id,display_name,phone,nationality,preferred_language').eq('user_id', shopRow.user_id).maybeSingle(),
            fetchMemberEmails([shopRow.user_id]),
          ]);
          setCustomerProfile((profileRes.data as CustomerProfile) || null);
          setCustomerEmail(buyerEmails[shopRow.user_id] || '');
        } else {
          setCustomerEmail('');
        }
        const [logsRes, afterSalesRes] = await Promise.all([
          supabase.from('admin_activity_logs').select('id,action,entity_type,entity_id,details,created_at').eq('entity_type', 'orders').eq('entity_id', shopRow?.id || detail.id).order('created_at', { ascending: false }),
          supabase.from('after_sales_requests').select('id,request_type,status,message,created_at,updated_at').eq('order_id', shopRow?.id || detail.id).order('created_at', { ascending: false }),
        ]);
        setDetailActivityLogs((logsRes.data || []) as ActivityLog[]);
        setDetailAfterSales((afterSalesRes.data || []) as AfterSalesRequest[]);
      } else {
        const [{ data: bookingData }, buyerEmails] = await Promise.all([
          supabase
            .from('tbl_bookings')
            .select(`
              id,user_id,room_id,check_in_date,check_out_date,guests,total_price,subtotal_price,points_discount,status,payment_method,payment_status,special_requests,created_at,updated_at,
              tbl_rooms(
                id,name,location,image_url,price_per_night,
                vendors(id,name,contact_phone,contact_email,address),
                hotels(id,name,phone,email,address)
              )
            `)
            .eq('id', detail.id)
            .maybeSingle(),
          fetchMemberEmails([]),
        ]);

        const bookingRow = (bookingData as BookingOrderDetail) || null;
        setBookingDetail(bookingRow);

        if (bookingRow?.user_id) {
          const [profileRes, userEmails] = await Promise.all([
            supabase.from('tbl_mn5wgzh0').select('user_id,display_name,phone,nationality,preferred_language').eq('user_id', bookingRow.user_id).maybeSingle(),
            fetchMemberEmails([bookingRow.user_id]),
          ]);
          setCustomerProfile((profileRes.data as CustomerProfile) || null);
          setCustomerEmail(userEmails[bookingRow.user_id] || '');
        } else {
          setCustomerEmail('');
        }
        const { data: logsData } = await supabase
          .from('admin_activity_logs')
          .select('id,action,entity_type,entity_id,details,created_at')
          .eq('entity_type', 'tbl_bookings')
          .eq('entity_id', detail.id)
          .order('created_at', { ascending: false });
        setDetailActivityLogs((logsData || []) as ActivityLog[]);
      }
    } catch (error: any) {
      setDetailError(error?.message || '載入訂單明細失敗');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedDetail(null);
    setDetailError('');
    setShopDetail(null);
    setInvoiceDetail(null);
    setBookingDetail(null);
    setCustomerProfile(null);
    setCustomerEmail('');
    setDetailActivityLogs([]);
    setDetailAfterSales([]);
  };

  const shopRevenue = shopOrders.filter((o) => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const bookingRevenue = bookingOrders.filter((o) => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total_price || 0), 0);

  const filteredShop = shopOrders.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch = !search || o.id.toLowerCase().includes(q) || (o.display_name || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredBookings = bookingOrders.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch = !search || b.id.toLowerCase().includes(q) || (b.display_name || '').toLowerCase().includes(q) || (b.room_name || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const shopStatuses = ['all', 'pending', 'processing', 'shipped', 'completed', 'cancelled'];
  const bookingStatuses = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

  const activeDetail = selectedDetail?.type === 'shop' ? shopDetail : bookingDetail;

  const contactPhone = selectedDetail?.type === 'shop'
    ? customerProfile?.phone || shopDetail?.purchase_records?.[0]?.products?.vendors?.contact_phone || null
    : customerProfile?.phone || bookingDetail?.tbl_rooms?.vendors?.contact_phone || bookingDetail?.tbl_rooms?.hotels?.phone || null;

  const contactEmail = selectedDetail?.type === 'shop'
    ? customerEmail || shopDetail?.purchase_records?.[0]?.products?.vendors?.contact_email || null
    : customerEmail || bookingDetail?.tbl_rooms?.vendors?.contact_email || bookingDetail?.tbl_rooms?.hotels?.email || null;

  const createdAt = activeDetail?.created_at ? formatDateTime(activeDetail.created_at) : '-';
  const updatedAt = activeDetail?.updated_at ? formatDateTime(activeDetail.updated_at) : '-';
  const currentInvoice = selectedDetail?.type === 'shop' ? invoiceDetail : null;

  const refreshInvoiceDetail = async () => {
    if (!shopDetail?.id) return;
    await fetchInvoiceDetail(shopDetail.id);
  };

  const handleReissueInvoice = async () => {
    if (!shopDetail?.id) return;

    setDetailLoading(true);
    setDetailError('');
    try {
      const { data, error } = await supabase.functions.invoke('ezpay-invoice-create', {
        body: { order_id: shopDetail.id },
      });

      if (error) {
        throw error;
      }

      if (data?.success === false && data?.error) {
        throw new Error(data.error);
      }

      await refreshInvoiceDetail();
    } catch (error: any) {
      setDetailError(error?.message || '無法重新開立發票');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleVoidInvoiceAction = async () => {
    if (!shopDetail?.id) return;

    setDetailLoading(true);
    setDetailError('');
    try {
      const { data, error } = await supabase.functions.invoke('ezpay-invoice-void', {
        body: { order_id: shopDetail.id, reason: 'Requested by admin' },
      });
      if (error) throw error;
      if (data?.success === false && data?.error) throw new Error(data.error);
      await refreshInvoiceDetail();
    } catch (error: any) {
      setDetailError(error?.message || '無法作廢發票');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleQueryInvoiceAction = async () => {
    if (!shopDetail?.id) return;

    setDetailLoading(true);
    setDetailError('');
    try {
      const { data, error } = await supabase.functions.invoke('ezpay-invoice-query', {
        body: { order_id: shopDetail.id },
      });
      if (error) throw error;
      if (data?.success === false && data?.error) throw new Error(data.error);
      await refreshInvoiceDetail();
    } catch (error: any) {
      setDetailError(error?.message || '無法查詢發票狀態');
    } finally {
      setDetailLoading(false);
    }
  };

  const timeline = useMemo(() => {
    if (!selectedDetail || !activeDetail) return [];

    if (detailActivityLogs.length > 0) {
      return detailActivityLogs.map((log) => ({
        label: log.action.replace(/_/g, ' '),
        value: `${formatDateTime(log.created_at)}${log.details && Object.keys(log.details).length > 0 ? ` · ${JSON.stringify(log.details)}` : ''}`,
      }));
    }

    if (selectedDetail.type === 'shop') {
      const order = activeDetail as ShopOrderDetail;
      return [
        { label: '建立時間', value: formatDateTime(order.created_at) },
        { label: '付款狀態', value: PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status || '-' },
        { label: '訂單狀態', value: formatStatusLabel('shop', order.status) },
        { label: '更新時間', value: order.updated_at ? formatDateTime(order.updated_at) : '-' },
      ];
    }

    const booking = activeDetail as BookingOrderDetail;
    return [
      { label: '建立時間', value: formatDateTime(booking.created_at) },
      { label: '付款狀態', value: PAYMENT_STATUS_LABELS[booking.payment_status || ''] || booking.payment_status || '-' },
      { label: '訂單狀態', value: formatStatusLabel('booking', booking.status) },
      { label: '更新時間', value: booking.updated_at ? formatDateTime(booking.updated_at) : '-' },
    ];
  }, [activeDetail, detailActivityLogs, selectedDetail]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-amber-100 p-2">
          <Package className="h-6 w-6 text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{PAGE_LABELS.title}</h1>
          <p className="text-sm text-gray-500">{PAGE_LABELS.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: <ShoppingBag className="h-5 w-5 text-amber-600" />, label: '商店訂單', value: shopOrders.length, color: 'bg-amber-50' },
          { icon: <BedDouble className="h-5 w-5 text-teal-600" />, label: '住宿訂單', value: bookingOrders.length, color: 'bg-teal-50' },
          { icon: <DollarSign className="h-5 w-5 text-green-600" />, label: '商店營收', value: formatCurrency(shopRevenue), color: 'bg-green-50' },
          { icon: <DollarSign className="h-5 w-5 text-blue-600" />, label: '住宿營收', value: formatCurrency(bookingRevenue), color: 'bg-blue-50' },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="rounded-2xl bg-white p-5 shadow-sm"
          >
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}>{item.icon}</div>
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{item.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex w-fit gap-1.5 rounded-xl bg-gray-100 p-1">
        {([
          ['shop', PAGE_LABELS.tabShop, ShoppingBag],
          ['booking', PAGE_LABELS.tabBooking, BedDouble],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setStatusFilter('all');
              setSearch('');
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'shop' ? PAGE_LABELS.searchShop : PAGE_LABELS.searchBooking}
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <div className="flex flex-wrap gap-1.5">
            {(tab === 'shop' ? shopStatuses : bookingStatuses).map((value) => {
              const labels = tab === 'shop'
                ? { ...SHOP_STATUS_LABELS, all: '全部' }
                : { ...BOOKING_STATUS_LABELS, all: '全部' };
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${statusFilter === value ? 'bg-amber-500 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  {labels[value] || value}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
          </div>
        ) : tab === 'shop' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">訂單編號</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">顧客</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">金額</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">付款</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">狀態</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">建立時間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredShop.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">{PAGE_LABELS.emptyShop}</td>
                  </tr>
                ) : filteredShop.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => void openDetail({ type: 'shop', id: order.id })}
                    className="cursor-pointer hover:bg-amber-50/40"
                  >
                    <td className="px-5 py-3">
                      <span className="font-mono font-medium text-gray-900">#{order.id.slice(-10).toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{order.display_name || '訪客'}</p>
                      <p className="text-xs text-gray-400 font-mono">{order.user_id.slice(-8)}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(order.total_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                        {PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {formatStatusLabel('shop', order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(order.created_at)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">訂單編號</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">顧客</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">房型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">入住 / 退房</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">狀態</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">建立時間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">{PAGE_LABELS.emptyBooking}</td>
                  </tr>
                ) : filteredBookings.map((booking, index) => (
                  <motion.tr
                    key={booking.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => void openDetail({ type: 'booking', id: booking.id })}
                    className="cursor-pointer hover:bg-amber-50/40"
                  >
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-gray-500">#{booking.id.slice(-10).toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{booking.display_name || '訪客'}</p>
                      <p className="text-xs text-gray-400 font-mono">{booking.user_id.slice(-8)}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{booking.room_name || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <div>{formatDate(booking.check_in_date)}</div>
                      <div className="text-gray-400">{formatDate(booking.check_out_date)}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(booking.total_price)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-600'}`}>
                        {formatStatusLabel('booking', booking.status)}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-right text-xs text-gray-400">
        目前顯示 {tab === 'shop' ? filteredShop.length : filteredBookings.length} 筆
      </p>

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
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-[#faf7f2] shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/60 bg-white px-6 py-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      <Package className="h-3.5 w-3.5" />
                      {PAGE_LABELS.detailTitle}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[activeDetail?.status || ''] || 'bg-gray-100 text-gray-600'}`}>
                      {selectedDetail.type === 'shop'
                        ? formatStatusLabel('shop', activeDetail?.status || '')
                        : formatStatusLabel('booking', activeDetail?.status || '')}
                    </span>
                  </div>
                  <h2 className="mt-2 text-2xl font-bold text-gray-900">
                    #{selectedDetail.id.slice(-10).toUpperCase()}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedDetail.type === 'shop' ? '商店訂單' : '住宿訂單'} · {createdAt}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-gray-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {detailLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
                  </div>
                ) : detailError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {detailError}
                  </div>
                ) : !activeDetail ? null : (
                  <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <section className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-4">
                        <SummaryCard label="總金額" value={selectedDetail.type === 'shop' ? formatCurrency((activeDetail as ShopOrderDetail).total_amount) : formatCurrency((activeDetail as BookingOrderDetail).total_price)} accent />
                        <SummaryCard label="付款狀態" value={PAYMENT_STATUS_LABELS[(activeDetail as any).payment_status] || (activeDetail as any).payment_status || '-'} />
                        <SummaryCard label="訂單狀態" value={formatStatusLabel(selectedDetail.type, (activeDetail as any).status)} />
                        <SummaryCard label="付款方式" value={getPaymentMethodLabel((activeDetail as any).payment_method)} />
                      </div>

                      <CardSection title={PAGE_LABELS.orderData} icon={<Receipt className="h-4 w-4" />}>
                        {selectedDetail.type === 'shop' ? (
                          <div className="grid gap-4 md:grid-cols-2">
                            <InfoItem label="訂單編號" value={`#${shopDetail?.id?.slice(-10).toUpperCase() || '-'}`} mono />
                            <InfoItem label="Merchant Order No." value={shopDetail?.merchant_order_no || '-'} mono />
                            <InfoItem label="建立時間" value={createdAt} />
                            <InfoItem label="更新時間" value={updatedAt} />
                            <InfoItem label="Subtotal" value={formatCurrency(shopDetail?.subtotal_amount || 0)} />
                            <InfoItem label="Points Discount" value={formatCurrency(shopDetail?.points_discount || 0)} />
                            <InfoItem label="NewebPay 狀態" value={shopDetail?.newebpay_status || '-'} />
                            <InfoItem label="NewebPay 付款時間" value={shopDetail?.newebpay_paid_at ? formatDateTime(shopDetail.newebpay_paid_at) : '-'} />
                          </div>
                        ) : (
                          <div className="grid gap-4 md:grid-cols-2">
                            <InfoItem label="住宿訂單編號" value={`#${bookingDetail?.id?.slice(-10).toUpperCase() || '-'}`} mono />
                            <InfoItem label="建立時間" value={createdAt} />
                            <InfoItem label="更新時間" value={updatedAt} />
                            <InfoItem label="入住日期" value={bookingDetail ? formatDate(bookingDetail.check_in_date) : '-'} />
                            <InfoItem label="退房日期" value={bookingDetail ? formatDate(bookingDetail.check_out_date) : '-'} />
                            <InfoItem label="入住人數" value={String(bookingDetail?.guests || '-')} />
                            <InfoItem label="Subtotal" value={formatCurrency(bookingDetail?.subtotal_price || 0)} />
                            <InfoItem label="Points Discount" value={formatCurrency(bookingDetail?.points_discount || 0)} />
                          </div>
                        )}
                      </CardSection>

                      <CardSection title={PAGE_LABELS.buyerInfo} icon={<Users className="h-4 w-4" />}>
                        <div className="grid gap-4 md:grid-cols-2">
                          <InfoItem label="顧客姓名" value={customerProfile?.display_name || '-'} />
                          <InfoItem label="電話" value={customerProfile?.phone || '-'} />
                          <InfoItem label="Email" value={customerEmail || '-'} />
                          <InfoItem label="User ID" value={(activeDetail as any).user_id || '-'} mono />
                          <InfoItem label="國籍" value={customerProfile?.nationality || '-'} />
                          <InfoItem label="偏好語言" value={customerProfile?.preferred_language || '-'} />
                        </div>
                      </CardSection>

                      {selectedDetail.type === 'shop' ? (
                        <CardSection title={PAGE_LABELS.productDetails} icon={<ShoppingBag className="h-4 w-4" />}>
                          <div className="space-y-3">
                            {(shopDetail?.purchase_records || []).length === 0 ? (
                              <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">目前沒有商品明細</p>
                            ) : (
                              shopDetail?.purchase_records?.map((item) => (
                                <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                                  <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        {item.products?.id ? (
                                          <Link
                                            to={`/superadmin/products/detail/${item.products.id}`}
                                            className="inline-flex items-center gap-1 font-semibold text-gray-900 transition hover:text-amber-700 hover:underline"
                                          >
                                            {item.products.name || '-'}
                                            <ExternalLink className="h-3.5 w-3.5" />
                                          </Link>
                                        ) : (
                                          <p className="font-semibold text-gray-900">{item.products?.name || '-'}</p>
                                        )}
                                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                          {item.quantity} 件
                                        </span>
                                      </div>
                                      <p className="mt-1 text-xs text-gray-400">{item.products?.sku || item.id}</p>
                                      <p className="mt-1 text-sm text-gray-600">
                                        {item.products?.vendors?.name || '未命名供應商'}
                                        {item.products?.vendors?.contact_phone ? ` / ${item.products.vendors.contact_phone}` : ''}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-base font-bold text-gray-900">{formatCurrency(item.total_price)}</p>
                                      <p className="text-xs text-gray-400">{formatCurrency(item.unit_price)} / 件</p>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </CardSection>
                      ) : (
                        <CardSection title={PAGE_LABELS.bookingDetails} icon={<BedDouble className="h-4 w-4" />}>
                          <div className="space-y-4">
                            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                  {bookingDetail?.tbl_rooms?.id ? (
                                    <Link
                                      to={`/superadmin/rooms/detail/${bookingDetail.tbl_rooms.id}`}
                                      className="inline-flex items-center gap-1 font-semibold text-gray-900 transition hover:text-amber-700 hover:underline"
                                    >
                                      {bookingDetail.tbl_rooms.name || '未命名房型'}
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </Link>
                                  ) : (
                                    <p className="font-semibold text-gray-900">{bookingDetail?.tbl_rooms?.name || '-'}</p>
                                  )}
                                  <p className="mt-1 text-sm text-gray-600">{bookingDetail?.tbl_rooms?.location || '-'}</p>
                                  <p className="mt-1 text-xs text-gray-400">
                                    {bookingDetail?.tbl_rooms?.vendors?.name || bookingDetail?.tbl_rooms?.hotels?.name || '-'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-base font-bold text-gray-900">{formatCurrency(bookingDetail?.total_price || 0)}</p>
                                  <p className="text-xs text-gray-400">{bookingDetail?.guests || 0} 人</p>
                                </div>
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <InfoItem label="入住日期" value={bookingDetail ? formatDate(bookingDetail.check_in_date) : '-'} />
                              <InfoItem label="退房日期" value={bookingDetail ? formatDate(bookingDetail.check_out_date) : '-'} />
                            </div>
                            <div>
                              <p className="mb-2 text-xs font-medium text-gray-500">特殊需求</p>
                              <div className="rounded-2xl bg-gray-50 p-4 text-sm leading-7 text-gray-700">
                                {bookingDetail?.special_requests || '-'}
                              </div>
                            </div>
                          </div>
                        </CardSection>
                      )}

                      <CardSection title={PAGE_LABELS.paymentInfo} icon={<Truck className="h-4 w-4" />}>
                        <div className="grid gap-4 md:grid-cols-2">
                          <InfoItem label="付款方式" value={getPaymentMethodLabel((activeDetail as any).payment_method)} />
                          <InfoItem label="付款狀態" value={PAYMENT_STATUS_LABELS[(activeDetail as any).payment_status] || (activeDetail as any).payment_status || '-'} />
                          <InfoItem label="交易序號" value={(shopDetail?.newebpay_trade_no || '-') as string} mono />
                          <InfoItem label="授權碼" value={shopDetail?.newebpay_auth_code || '-'} mono />
                          <InfoItem label="卡號" value={shopDetail?.newebpay_card_no || '-'} mono />
                          <InfoItem label="回應代碼" value={shopDetail?.newebpay_respond_code || '-'} mono />
                          <InfoItem label="付款類型" value={shopDetail?.newebpay_payment_type || '-'} />
                          <InfoItem label="付款時間" value={shopDetail?.newebpay_paid_at ? formatDateTime(shopDetail.newebpay_paid_at) : '-'} />
                        </div>
                      </CardSection>

                      {selectedDetail.type === 'shop' && (
                        <CardSection title="電子發票" icon={<Receipt className="h-4 w-4" />}>
                          <div className="grid gap-4 md:grid-cols-2">
                            <InfoItem label="發票狀態" value={currentInvoice?.invoice_status || 'pending'} />
                            <InfoItem label="發票號碼" value={currentInvoice?.invoice_number || '-'} mono />
                            <InfoItem label="隨機碼" value={currentInvoice?.invoice_random_number || '-'} mono />
                            <InfoItem label="開立時間" value={currentInvoice?.invoice_date ? formatDateTime(currentInvoice.invoice_date) : '-'} />
                            <InfoItem label="買受人統編" value={currentInvoice?.buyer_identifier || '-'} mono />
                            <InfoItem
                              label="載具"
                              value={[currentInvoice?.carrier_type || '', currentInvoice?.carrier_number || ''].filter(Boolean).join(' / ') || '-'}
                              mono
                            />
                            <InfoItem label="愛心碼" value={currentInvoice?.love_code || '-'} mono />
                            <InfoItem label="ezPay 交易序號" value={currentInvoice?.ezpay_trade_no || '-'} mono />
                          </div>
                          {currentInvoice?.error_message && (
                            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700">
                              {currentInvoice.error_message}
                            </div>
                          )}
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void handleReissueInvoice()}
                              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500"
                            >
                              重新補開發票
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleVoidInvoiceAction()}
                              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                            >
                              作廢發票
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleQueryInvoiceAction()}
                              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                            >
                              查詢發票狀態
                            </button>
                          </div>
                        </CardSection>
                      )}
                      <CardSection title={PAGE_LABELS.shippingInfo} icon={<MapPin className="h-4 w-4" />}>
                        {selectedDetail.type === 'shop' ? (
                          <div className="space-y-3">
                            {getShippingEntries(shopDetail?.shipping_address || null).length === 0 ? (
                              <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">沒有可顯示的配送資料</p>
                            ) : (
                              getShippingEntries(shopDetail?.shipping_address || null).map(([key, value]) => (
                                <InfoItem key={key} label={key} value={value} />
                              ))
                            )}
                          </div>
                        ) : (
                          <div className="grid gap-4 md:grid-cols-2">
                            <InfoItem label="供應商名稱" value={bookingDetail?.tbl_rooms?.vendors?.name || bookingDetail?.tbl_rooms?.hotels?.name || '-'} />
                            <InfoItem label="供應商電話" value={bookingDetail?.tbl_rooms?.vendors?.contact_phone || bookingDetail?.tbl_rooms?.hotels?.phone || '-'} />
                            <InfoItem label="供應商 Email" value={bookingDetail?.tbl_rooms?.vendors?.contact_email || bookingDetail?.tbl_rooms?.hotels?.email || '-'} />
                            <InfoItem label="地址" value={bookingDetail?.tbl_rooms?.vendors?.address || bookingDetail?.tbl_rooms?.hotels?.address || bookingDetail?.tbl_rooms?.location || '-'} />
                          </div>
                        )}
                      </CardSection>

                    </section>

                    <aside className="space-y-6">
                      <CardSection title={PAGE_LABELS.contact} icon={<MessageSquare className="h-4 w-4" />}>
                        <div className="grid gap-3">
                          <InfoItem label="電話" value={contactPhone || '-'} />
                          <InfoItem label="Email" value={contactEmail || '-'} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {contactPhone && (
                            <a href={`tel:${contactPhone}`} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                              <Phone className="h-4 w-4" />
                              撥打
                            </a>
                          )}
                          {contactEmail && (
                            <a href={`mailto:${contactEmail}`} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                              <Mail className="h-4 w-4" />
                              寄信
                            </a>
                          )}
                        </div>
                      </CardSection>

                      <CardSection title={PAGE_LABELS.communication} icon={<MessageSquare className="h-4 w-4" />}>
                        {selectedDetail.type === 'shop' ? (
                          <div className="space-y-3">
                            {detailAfterSales.length > 0 ? (
                              detailAfterSales.map((req) => (
                                <div key={req.id} className="rounded-2xl bg-gray-50 p-4">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-gray-900">{req.request_type}</p>
                                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600">{req.status}</span>
                                  </div>
                                  <p className="mt-2 text-sm leading-6 text-gray-700">{req.message || '-'}</p>
                                  <p className="mt-2 text-xs text-gray-400">{formatDateTime(req.created_at)}</p>
                                </div>
                              ))
                            ) : (
                              <>
                                <NoteBlock label="訂單備註" value={shopDetail?.shipping_address?.note || shopDetail?.discount_code || '-'} />
                                <NoteBlock label="配送備註" value={shopDetail?.shipping_address?.delivery_note || shopDetail?.shipping_address?.note || '-'} />
                                <NoteBlock label="聯絡資訊" value={contactPhone || contactEmail || '-'} />
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <NoteBlock label="特殊需求" value={bookingDetail?.special_requests || '-'} />
                            <NoteBlock label="住宿地址" value={bookingDetail?.tbl_rooms?.hotels?.address || bookingDetail?.tbl_rooms?.vendors?.address || '-'} />
                            <NoteBlock label="聯絡資訊" value={contactPhone || contactEmail || '-'} />
                          </div>
                        )}
                      </CardSection>

                      <CardSection title={PAGE_LABELS.timeline} icon={<Clock3 className="h-4 w-4" />}>
                        <div className="space-y-3">
                          {timeline.map((step) => (
                            <div key={step.label} className="flex items-start gap-3 rounded-2xl bg-white p-3 shadow-sm">
                              <div className="mt-0.5 h-8 w-8 flex-shrink-0 rounded-full bg-amber-100 text-center text-xs font-bold leading-8 text-amber-700">→</div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900">{step.label}</p>
                                <p className="mt-1 text-sm text-gray-500">{step.value}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardSection>
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

function SummaryCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border ${accent ? 'border-amber-200 bg-amber-50' : 'border-white bg-white'} p-4 shadow-sm`}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-2 text-lg font-bold ${accent ? 'text-amber-800' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function CardSection({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/70 bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function InfoItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className={`mt-1 text-sm font-medium text-gray-900 ${mono ? 'break-all font-mono text-xs' : ''}`}>{value || '-'}</p>
    </div>
  );
}

function NoteBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-gray-700">{value || '-'}</p>
    </div>
  );
}

export default SuperAdminOrders;



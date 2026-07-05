import { useEffect, useMemo, useState } from 'react';
import { Eye, Loader2, Plus, RefreshCw, Save, Search, Star, X } from 'lucide-react';
import { isMissingSupabaseTableError, supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

interface Order {
  id: string;
  order_number: string;
  member_id: string | null;
  status: string;
  payment_status: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  shipping_address: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  completed_at?: string | null;
  source?: string | null;
  channel?: string | null;
  company_name?: string | null;
  company_tax_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_account?: string | null;
  subscribed_order_notifications?: boolean | null;
  shipping_status?: string | null;
  delivery_status?: string | null;
  shipping_method?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  tracking_number?: string | null;
  shipping_country?: string | null;
  shipping_postal_code?: string | null;
  shipping_city?: string | null;
  shipping_district?: string | null;
  shipping_line1?: string | null;
  communication_notes?: string | null;
  shipping_notes?: string | null;
}

interface PaymentRecord {
  id: string;
  order_id: string;
  amount: number;
  method: string;
  status: string;
  transaction_id: string | null;
  provider_status?: string | null;
  paid_at?: string | null;
  gateway_name?: string | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}

interface Member {
  id: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
}

interface OrderMessage {
  id: string;
  order_id: string;
  message: string;
  is_starred: boolean;
  author_name: string | null;
  author_email: string | null;
  created_at: string;
}

interface OrderEvent {
  id: string;
  order_id: string;
  event_type: string;
  description: string;
  actor_name: string | null;
  actor_type: string | null;
  created_at: string;
}

const ORDER_EXTENSION_MIGRATION = '20260519173000_expand_order_management_fields.sql';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('zh-TW', { hour12: false }) : '-');

const getAddressField = (address: Record<string, unknown> | null | undefined, keys: string[]) => {
  if (!address) return '';
  for (const key of keys) {
    const value = address[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const emptyTimelineResult = Promise.resolve({ data: [], error: null } as const);

export default function OrderManagement() {
  const { t } = useLanguage();
  const [supportsOrderTimeline, setSupportsOrderTimeline] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [members, setMembers] = useState<Map<string, Member>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const [statusEdit, setStatusEdit] = useState('pending');
  const [paymentStatusEdit, setPaymentStatusEdit] = useState('unpaid');
  const [shippingStatusEdit, setShippingStatusEdit] = useState('ready_to_ship');
  const [deliveryStatusEdit, setDeliveryStatusEdit] = useState('preparing');
  const [orderNoteEdit, setOrderNoteEdit] = useState('');
  const [companyNameEdit, setCompanyNameEdit] = useState('');
  const [companyTaxIdEdit, setCompanyTaxIdEdit] = useState('');
  const [customerNameEdit, setCustomerNameEdit] = useState('');
  const [customerEmailEdit, setCustomerEmailEdit] = useState('');
  const [customerPhoneEdit, setCustomerPhoneEdit] = useState('');
  const [customerAccountEdit, setCustomerAccountEdit] = useState('');
  const [shippingMethodEdit, setShippingMethodEdit] = useState('');
  const [recipientNameEdit, setRecipientNameEdit] = useState('');
  const [recipientPhoneEdit, setRecipientPhoneEdit] = useState('');
  const [trackingNumberEdit, setTrackingNumberEdit] = useState('');
  const [shippingCountryEdit, setShippingCountryEdit] = useState('');
  const [shippingPostalCodeEdit, setShippingPostalCodeEdit] = useState('');
  const [shippingCityEdit, setShippingCityEdit] = useState('');
  const [shippingDistrictEdit, setShippingDistrictEdit] = useState('');
  const [shippingLine1Edit, setShippingLine1Edit] = useState('');
  const [shippingNotesEdit, setShippingNotesEdit] = useState('');
  const [subscribeNoticeEdit, setSubscribeNoticeEdit] = useState(false);
  const [communicationNotesEdit, setCommunicationNotesEdit] = useState('');

  const orderStatusOptions = useMemo(
    () => [
      { value: 'pending', label: t('order_management.status_pending', '待處理') },
      { value: 'processing', label: t('order_management.status_processing', '處理中') },
      { value: 'completed', label: t('order_management.status_completed', '已完成') },
      { value: 'cancelled', label: t('order_management.status_cancelled', '已取消') },
    ],
    [t]
  );

  const paymentStatusOptions = useMemo(
    () => [
      { value: 'unpaid', label: t('order_management.payment_unpaid', '未付款') },
      { value: 'pending', label: t('order_management.payment_pending', '付款確認中') },
      { value: 'paid', label: t('order_management.payment_paid', '已付款') },
      { value: 'failed', label: t('order_management.payment_failed', '付款失敗') },
      { value: 'refunded', label: t('order_management.payment_refunded', '已退款') },
    ],
    [t]
  );

  const shippingStatusOptions = useMemo(
    () => [
      { value: 'pending', label: t('order_management.shipping_pending', '待處理') },
      { value: 'processing', label: t('order_management.shipping_processing', '處理中') },
      { value: 'ready_to_ship', label: t('order_management.shipping_ready', '可供出貨') },
      { value: 'shipped', label: t('order_management.shipping_shipped', '發貨中') },
      { value: 'delivered', label: t('order_management.shipping_delivered', '已送達') },
    ],
    [t]
  );

  const deliveryStatusOptions = useMemo(
    () => [
      { value: 'preparing', label: t('order_management.delivery_preparing', '備貨中') },
      { value: 'packing', label: t('order_management.delivery_packing', '包裝中') },
      { value: 'shipping', label: t('order_management.delivery_shipping', '配送中') },
      { value: 'completed', label: t('order_management.delivery_completed', '配送完成') },
    ],
    [t]
  );

  const statusLabel = (status: string) => orderStatusOptions.find((item) => item.value === status)?.label ?? status;
  const paymentStatusLabel = (status: string) => paymentStatusOptions.find((item) => item.value === status)?.label ?? status;

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, membersRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('members').select('id, name, email, phone'),
      ]);
      if (ordersRes.error && !isMissingSupabaseTableError(ordersRes.error)) throw ordersRes.error;
      if (membersRes.error && !isMissingSupabaseTableError(membersRes.error)) throw membersRes.error;

      setOrders((ordersRes.data || []) as Order[]);
      const memberMap = new Map<string, Member>();
      (membersRes.data || []).forEach((member) => memberMap.set(member.id, member as Member));
      setMembers(memberMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('order_management.load_failed', '讀取訂單失敗'));
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetailData = async (orderId: string, withTimeline = supportsOrderTimeline) => {
    const [itemsRes, payRes, msgRes, eventRes] = await Promise.all([
      supabase.from('order_items').select('*').eq('order_id', orderId),
      supabase.from('payments').select('*').eq('order_id', orderId).order('created_at', { ascending: false }),
      withTimeline
        ? supabase.from('order_messages').select('*').eq('order_id', orderId).order('created_at', { ascending: false })
        : emptyTimelineResult,
      withTimeline
        ? supabase.from('order_events').select('*').eq('order_id', orderId).order('created_at', { ascending: false })
        : emptyTimelineResult,
    ]);

    if (itemsRes.error && !isMissingSupabaseTableError(itemsRes.error)) throw itemsRes.error;
    if (payRes.error && !isMissingSupabaseTableError(payRes.error)) throw payRes.error;
    if (msgRes.error && !isMissingSupabaseTableError(msgRes.error)) throw msgRes.error;
    if (eventRes.error && !isMissingSupabaseTableError(eventRes.error)) throw eventRes.error;

    if (isMissingSupabaseTableError(msgRes.error) || isMissingSupabaseTableError(eventRes.error)) {
      setSupportsOrderTimeline(false);
    }

    setOrderItems((itemsRes.data || []) as OrderItem[]);
    setPayments((payRes.data || []) as PaymentRecord[]);
    setMessages((msgRes.data || []) as OrderMessage[]);
    setEvents((eventRes.data || []) as OrderEvent[]);
  };

  const getMember = (memberId: string | null) => {
    if (!memberId) return { name: t('order_management.guest', '訪客'), email: '', phone: '' };
    const member = members.get(memberId);
    return {
      name: member?.name || t('member_management.unnamed_member', '未命名會員'),
      email: member?.email || '',
      phone: member?.phone || '',
    };
  };

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      if (!query) return true;
      const member = getMember(order.member_id);
      return (
        (order.order_number || '').toLowerCase().includes(query) ||
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query)
      );
    });
  }, [orders, searchTerm, members, t]);

  const openDetail = async (order: Order) => {
    const hasExtendedOrderFields = Object.prototype.hasOwnProperty.call(order, 'communication_notes');
    if (!hasExtendedOrderFields) setSupportsOrderTimeline(false);
    const member = getMember(order.member_id);

    setViewingOrder(order);
    setStatusEdit(order.status || 'pending');
    setPaymentStatusEdit(order.payment_status || 'unpaid');
    setShippingStatusEdit(order.shipping_status || 'ready_to_ship');
    setDeliveryStatusEdit(order.delivery_status || 'preparing');
    setOrderNoteEdit(order.notes || '');
    setCompanyNameEdit(order.company_name || '');
    setCompanyTaxIdEdit(order.company_tax_id || '');
    setCustomerNameEdit(order.customer_name || member.name);
    setCustomerEmailEdit(order.customer_email || member.email);
    setCustomerPhoneEdit(order.customer_phone || member.phone);
    setCustomerAccountEdit(order.customer_account || '');
    setShippingMethodEdit(order.shipping_method || '');
    setRecipientNameEdit(order.recipient_name || getAddressField(order.shipping_address, ['name', 'recipient_name']));
    setRecipientPhoneEdit(order.recipient_phone || getAddressField(order.shipping_address, ['phone', 'recipient_phone']));
    setTrackingNumberEdit(order.tracking_number || '');
    setShippingCountryEdit(order.shipping_country || getAddressField(order.shipping_address, ['country']));
    setShippingPostalCodeEdit(order.shipping_postal_code || getAddressField(order.shipping_address, ['postal_code', 'zip', 'zipcode']));
    setShippingCityEdit(order.shipping_city || getAddressField(order.shipping_address, ['city']));
    setShippingDistrictEdit(order.shipping_district || getAddressField(order.shipping_address, ['district', 'area']));
    setShippingLine1Edit(order.shipping_line1 || getAddressField(order.shipping_address, ['address', 'line1', 'street']));
    setShippingNotesEdit(order.shipping_notes || '');
    setSubscribeNoticeEdit(Boolean(order.subscribed_order_notifications));
    setCommunicationNotesEdit(order.communication_notes || '');
    setMessageDraft('');
    await loadOrderDetailData(order.id, hasExtendedOrderFields && supportsOrderTimeline);
  };

  const pushEvent = async (orderId: string, description: string) => {
    if (!supportsOrderTimeline) return;
    await supabase.from('order_events').insert({
      order_id: orderId,
      event_type: 'update',
      description,
      actor_name: 'admin',
      actor_type: 'admin',
    });
  };

  const saveOrder = async () => {
    if (!viewingOrder) return;
    setSaving(true);
    try {
      const completedAt = statusEdit === 'completed' ? viewingOrder.completed_at || new Date().toISOString() : null;
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: statusEdit,
          payment_status: paymentStatusEdit,
          completed_at: completedAt,
          notes: orderNoteEdit,
          company_name: companyNameEdit,
          company_tax_id: companyTaxIdEdit,
          customer_name: customerNameEdit,
          customer_email: customerEmailEdit,
          customer_phone: customerPhoneEdit,
          customer_account: customerAccountEdit,
          subscribed_order_notifications: subscribeNoticeEdit,
          shipping_status: shippingStatusEdit,
          delivery_status: deliveryStatusEdit,
          shipping_method: shippingMethodEdit,
          recipient_name: recipientNameEdit,
          recipient_phone: recipientPhoneEdit,
          tracking_number: trackingNumberEdit,
          shipping_country: shippingCountryEdit,
          shipping_postal_code: shippingPostalCodeEdit,
          shipping_city: shippingCityEdit,
          shipping_district: shippingDistrictEdit,
          shipping_line1: shippingLine1Edit,
          shipping_notes: shippingNotesEdit,
          communication_notes: communicationNotesEdit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', viewingOrder.id);
      if (updateError) throw updateError;

      await pushEvent(
        viewingOrder.id,
        t('order_management.event_status_updated', '更新訂單狀態為 {status}，付款狀態為 {payment}').replace('{status}', statusLabel(statusEdit)).replace('{payment}', paymentStatusLabel(paymentStatusEdit))
      );
      await loadData();
      await loadOrderDetailData(viewingOrder.id);
      alert(t('order_management.save_success', '訂單已儲存'));
    } catch (err) {
      alert(err instanceof Error ? err.message : t('order_management.save_failed', '儲存失敗'));
    } finally {
      setSaving(false);
    }
  };

  const addMessage = async () => {
    if (!viewingOrder || !messageDraft.trim()) return;
    if (!supportsOrderTimeline) {
      alert(
        t('order_management.timeline_missing', '尚未建立 order_messages / order_events，請先套用 {migration}')
          .replace('{migration}', ORDER_EXTENSION_MIGRATION)
      );
      return;
    }
    try {
      const { error: insertError } = await supabase.from('order_messages').insert({
        order_id: viewingOrder.id,
        message: messageDraft.trim(),
        is_starred: false,
        author_name: 'admin',
        author_email: '',
      });
      if (insertError) throw insertError;
      await pushEvent(viewingOrder.id, t('order_management.event_message_added', '新增留言'));
      setMessageDraft('');
      await loadOrderDetailData(viewingOrder.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('order_management.add_message_failed', '新增留言失敗'));
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('order_management.title', '訂單管理')}</h1>
          <p className="mt-2 text-slate-600">{t('order_management.subtitle', '完善訂單資料、付款、配送與客服表單。')}</p>
        </div>
        <button
          onClick={() => void loadData()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          {t('common.refresh', '重新整理')}
        </button>
      </div>

      {!supportsOrderTimeline && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t('order_management.timeline_missing_banner', '尚未建立 `order_messages` / `order_events`，已切為相容模式。請套用 migration：')}
          <span className="ml-1 font-mono">{ORDER_EXTENSION_MIGRATION}</span>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('order_management.search_placeholder', '搜尋訂單號碼 / 會員')}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
            {t('common.loading', '載入中...')}
          </div>
        ) : error ? (
          <div className="p-6 text-rose-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t('order_management.column_order_number', '訂單號碼')}</th>
                  <th className="px-4 py-3">{t('order_management.column_customer', '訂購人')}</th>
                  <th className="px-4 py-3">{t('order_management.column_status', '狀態')}</th>
                  <th className="px-4 py-3">{t('order_management.column_payment', '付款')}</th>
                  <th className="px-4 py-3">{t('order_management.column_amount', '金額')}</th>
                  <th className="px-4 py-3">{t('order_management.column_date', '日期')}</th>
                  <th className="px-4 py-3 text-right">{t('order_management.column_actions', '操作')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const member = getMember(order.member_id);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-sm">{order.order_number}</td>
                      <td className="px-4 py-3 text-sm">{order.customer_name || member.name}</td>
                      <td className="px-4 py-3 text-sm">{statusLabel(order.status)}</td>
                      <td className="px-4 py-3 text-sm">{paymentStatusLabel(order.payment_status)}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(order.total)}</td>
                      <td className="px-4 py-3 text-sm">{formatDateTime(order.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => void openDetail(order)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
                        >
                          <Eye className="h-4 w-4" />
                          {t('order_management.view', '查看')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewingOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto w-full max-w-6xl rounded-xl bg-white">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold">{t('order_management.detail_title', '訂單詳情')}</h2>
                <p className="font-mono text-sm text-slate-500">{viewingOrder.order_number}</p>
              </div>
              <button onClick={() => setViewingOrder(null)} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6 pb-28">
              <section className="grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
                <h3 className="md:col-span-2 text-lg font-semibold">{t('order_management.order_info', '訂單資料')}</h3>
                <Field label={t('order_management.order_number', '訂單號碼')} value={viewingOrder.order_number} />
                <Field label={t('order_management.order_date', '訂單日期')} value={formatDateTime(viewingOrder.created_at)} />
                <Field label={t('order_management.order_status', '訂單狀態')} value={statusLabel(statusEdit)} />
                <Field label={t('order_management.completed_at', '完成時間')} value={formatDateTime(viewingOrder.completed_at)} />
                <Field label={t('order_management.channel', '訂單成立於')} value={viewingOrder.channel || t('order_management.frontend_store', '前台購物網站')} />
                <Field label={t('order_management.source', '訂單來源')} value={viewingOrder.source || t('order_management.frontend_store', '前台購物網站')} />
                <Input label={t('order_management.company_name', '公司名稱')} value={companyNameEdit} onChange={setCompanyNameEdit} />
                <Input label={t('order_management.company_tax_id', '統一編號')} value={companyTaxIdEdit} onChange={setCompanyTaxIdEdit} />
                <Input label={t('order_management.customer_name', '訂購人')} value={customerNameEdit} onChange={setCustomerNameEdit} />
                <Input label={t('order_management.customer_email', '訂單 Email')} value={customerEmailEdit} onChange={setCustomerEmailEdit} />
                <Input label={t('order_management.customer_phone', '電話號碼')} value={customerPhoneEdit} onChange={setCustomerPhoneEdit} />
                <Input label={t('order_management.customer_account', '訂購帳號')} value={customerAccountEdit} onChange={setCustomerAccountEdit} />
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs text-slate-500">{t('order_management.order_notes', '訂單備註')}</label>
                  <textarea
                    value={orderNoteEdit}
                    onChange={(e) => setOrderNoteEdit(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={subscribeNoticeEdit}
                    onChange={(e) => setSubscribeNoticeEdit(e.target.checked)}
                  />
                  {t('order_management.subscribe_notifications', '訂閱訂單通知')}
                </label>
              </section>

              <section className="grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
                <h3 className="md:col-span-2 text-lg font-semibold">{t('order_management.payment_info', '付款資料')}</h3>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">{t('order_management.payment_status', '付款狀態')}</label>
                  <select
                    value={paymentStatusEdit}
                    onChange={(e) => setPaymentStatusEdit(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {paymentStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">{t('order_management.order_status', '訂單狀態')}</label>
                  <select
                    value={statusEdit}
                    onChange={(e) => setStatusEdit(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {orderStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {payments[0] ? (
                  <>
                    <Field label={t('order_management.payment_method', '付款方法')} value={payments[0].method || '-'} />
                    <Field label={t('order_management.paid_amount', '收取金額')} value={formatCurrency(payments[0].amount)} />
                    <Field label={t('order_management.transaction_id', '交易序號')} value={payments[0].transaction_id || '-'} />
                    <Field label={t('order_management.paid_at', '交易時間')} value={formatDateTime(payments[0].paid_at || payments[0].created_at)} />
                    <Field label={t('order_management.transaction_status', '交易狀態')} value={payments[0].provider_status || payments[0].status || '-'} />
                  </>
                ) : (
                  <p className="md:col-span-2 text-sm text-slate-500">{t('order_management.no_payment', '尚無付款紀錄')}</p>
                )}
              </section>

              <section className="grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
                <h3 className="md:col-span-2 text-lg font-semibold">{t('order_management.shipping_info', '配送 / 送貨資料')}</h3>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">{t('order_management.shipping_status', '配送狀態')}</label>
                  <select
                    value={shippingStatusEdit}
                    onChange={(e) => setShippingStatusEdit(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {shippingStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">{t('order_management.delivery_status', '送貨狀態')}</label>
                  <select
                    value={deliveryStatusEdit}
                    onChange={(e) => setDeliveryStatusEdit(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {deliveryStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Input label={t('order_management.shipping_method', '送貨方式')} value={shippingMethodEdit} onChange={setShippingMethodEdit} />
                <Input label={t('order_management.recipient_name', '收件人')} value={recipientNameEdit} onChange={setRecipientNameEdit} />
                <Input label={t('order_management.recipient_phone', '收件人電話')} value={recipientPhoneEdit} onChange={setRecipientPhoneEdit} />
                <Input label={t('order_management.tracking_number', '託運編號')} value={trackingNumberEdit} onChange={setTrackingNumberEdit} />
                <Field label={t('order_management.shipping_fee', '送貨費用')} value={formatCurrency(viewingOrder.shipping)} />
                <Input label={t('order_management.country', '國家')} value={shippingCountryEdit} onChange={setShippingCountryEdit} />
                <Input label={t('order_management.postal_code', '郵遞區號')} value={shippingPostalCodeEdit} onChange={setShippingPostalCodeEdit} />
                <Input label={t('order_management.city', '城市')} value={shippingCityEdit} onChange={setShippingCityEdit} />
                <Input label={t('order_management.district', '行政區')} value={shippingDistrictEdit} onChange={setShippingDistrictEdit} />
                <div className="md:col-span-2">
                  <Input label={t('order_management.address', '地址')} value={shippingLine1Edit} onChange={setShippingLine1Edit} />
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="mb-3 text-lg font-semibold">{t('order_management.items_title', '商品詳情')}</h3>
                <div className="space-y-3">
                  {orderItems.map((item) => (
                    <div key={item.id} className="rounded-lg bg-slate-50 p-3">
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-slate-600">
                        {item.quantity} x {formatCurrency(item.price)} = {formatCurrency(item.total)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
                  <Field label={t('order_management.subtotal', '商品小計')} value={formatCurrency(viewingOrder.subtotal)} />
                  <Field label={t('order_management.tax', '稅額')} value={formatCurrency(viewingOrder.tax)} />
                  <Field label={t('order_management.shipping_fee', '運費')} value={formatCurrency(viewingOrder.shipping)} />
                  <Field label={t('order_management.total', '訂單合計')} value={formatCurrency(viewingOrder.total)} />
                </div>
              </section>

              <section className="grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
                <h3 className="md:col-span-2 text-lg font-semibold">{t('order_management.messages_title', '訂單通訊')}</h3>
                {!supportsOrderTimeline && (
                  <p className="md:col-span-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    {t(
                      'order_management.timeline_feature_hint',
                      '若尚未建立顧客通訊摘要 / 出貨備註 / 留言與活動紀錄，請先套用 migration 後再使用。'
                    )}
                  </p>
                )}
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs text-slate-500">{t('order_management.add_message', '加入備註')}</label>
                  <div className="flex gap-2">
                    <input
                      value={messageDraft}
                      onChange={(e) => setMessageDraft(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder={t('order_management.message_placeholder', '請輸入留言')}
                    />
                    <button
                      disabled={!supportsOrderTimeline}
                      onClick={() => void addMessage()}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      {t('order_management.add', '新增')}
                    </button>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  {messages.map((msg) => (
                    <div key={msg.id} className="rounded-lg bg-slate-50 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                          {msg.author_name || t('order_management.system', '系統')} · {formatDateTime(msg.created_at)}
                        </div>
                        {msg.is_starred && <Star className="h-4 w-4 text-amber-500" />}
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-slate-800">{msg.message}</p>
                    </div>
                  ))}
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs text-slate-500">{t('order_management.communication_notes', '顧客通訊摘要')}</label>
                  <textarea
                    value={communicationNotesEdit}
                    onChange={(e) => setCommunicationNotesEdit(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder={t(
                      'order_management.communication_notes_placeholder',
                      '例如：已通知補貨、同意升級品項、客服回覆重點'
                    )}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs text-slate-500">{t('order_management.shipping_notes', '出貨備註')}</label>
                  <textarea
                    value={shippingNotesEdit}
                    onChange={(e) => setShippingNotesEdit(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="mb-3 text-lg font-semibold">{t('order_management.events_title', '訂單活動紀錄')}</h3>
                {!supportsOrderTimeline && <p className="text-sm text-slate-500">{t('order_management.events_hint', '需套用 migration 後顯示活動紀錄。')}</p>}
                <div className="space-y-2">
                  {events.map((evt) => (
                    <div key={evt.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <div className="font-medium text-slate-800">{evt.description}</div>
                      <div className="text-xs text-slate-500">
                        {evt.actor_name || t('order_management.system', '系統')} · {formatDateTime(evt.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <button onClick={() => setViewingOrder(null)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                {t('common.cancel', '取消')}
              </button>
              <button
                onClick={() => void saveOrder()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('order_management.save_order', '儲存訂單')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-800">{value || '-'}</p>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
    </div>
  );
}

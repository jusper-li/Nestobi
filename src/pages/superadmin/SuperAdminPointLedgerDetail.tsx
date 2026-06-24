import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BedDouble, Coins, ExternalLink, Package, Repeat, Store, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDateTime, formatCurrency } from '../../lib/utils';

interface PointLedgerRow {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  reference_id: string | null;
  source_type: string | null;
  source_id: string | null;
  description: string | null;
  created_at: string;
}

interface MemberInfo {
  user_id: string;
  display_name?: string | null;
  role?: string | null;
}

interface BookingDetail {
  id: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  status: string;
  special_requests: string;
  tbl_rooms?: {
    id: string;
    name?: string | null;
    room_type?: string | null;
    vendors?: { id?: string | null; name?: string | null } | null;
  } | null;
}

interface OrderDetail {
  id: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  purchase_records?: {
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    products?: {
      id: string;
      name?: string | null;
      sku?: string | null;
      vendors?: { id?: string | null; name?: string | null } | null;
    } | null;
  }[] | null;
}

interface SubscriptionDetail {
  id: string;
  monthly_amount: number;
  status: string;
  next_bill_at?: string | null;
  last_billed_at?: string | null;
  notes?: string | null;
  products?: {
    id: string;
    name?: string | null;
    sku?: string | null;
    vendors?: { id?: string | null; name?: string | null } | null;
  } | null;
  orders?: {
    id: string;
    total_amount?: number | null;
    status?: string | null;
    payment_status?: string | null;
    created_at?: string | null;
  } | null;
}

export default function SuperAdminPointLedgerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [point, setPoint] = useState<PointLedgerRow | null>(null);
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      setPoint(null);
      setMember(null);
      setBooking(null);
      setOrder(null);
      setSubscription(null);

      const { data: pointRow, error: pointError } = await supabase
        .from('points')
        .select('id,user_id,amount,transaction_type,reference_id,source_type,source_id,description,created_at')
        .eq('id', id)
        .maybeSingle();

      if (pointError) {
        setError(pointError.message);
        setLoading(false);
        return;
      }

      if (!pointRow) {
        setError('找不到這筆點數紀錄。');
        setLoading(false);
        return;
      }

      const row = pointRow as PointLedgerRow;
      setPoint(row);

      const [profileRes, authRes] = await Promise.all([
        supabase.from('tbl_mn5wgzh0').select('user_id,display_name').eq('user_id', row.user_id).maybeSingle(),
        supabase.from('tbl_user_auth').select('user_id,role').eq('user_id', row.user_id).maybeSingle(),
      ]);

      setMember({
        user_id: row.user_id,
        display_name: (profileRes.data as any)?.display_name || null,
        role: (authRes.data as any)?.role || null,
      });

      const sourceId = row.source_id || row.reference_id;

      if (row.source_type === 'booking' && sourceId) {
        const { data } = await supabase
          .from('tbl_bookings')
          .select('id,check_in_date,check_out_date,total_price,status,special_requests,tbl_rooms(id,name,room_type,vendors(id,name))')
          .eq('id', sourceId)
          .maybeSingle();
        setBooking((data as BookingDetail) || null);
      } else if (row.source_type === 'order' && sourceId) {
        const { data } = await supabase
          .from('orders')
          .select('id,total_amount,status,payment_status,created_at,purchase_records(id,quantity,unit_price,total_price,products(id,name,sku,vendors(id,name)))')
          .eq('id', sourceId)
          .maybeSingle();
        const orderRow = (data as OrderDetail) || null;
        setOrder(orderRow);

        if (orderRow?.id) {
          const { data: subData } = await supabase
            .from('product_subscriptions')
            .select('id,monthly_amount,status,next_bill_at,last_billed_at,notes,products(id,name,sku,vendors(id,name)),orders(id,total_amount,status,payment_status,created_at)')
            .eq('id', row.source_id || row.reference_id)
            .maybeSingle();
          setSubscription((subData as SubscriptionDetail) || null);
        }
      } else if (row.source_type === 'subscription' && sourceId) {
        const { data } = await supabase
          .from('product_subscriptions')
          .select('id,monthly_amount,status,next_bill_at,last_billed_at,notes,products(id,name,sku,vendors(id,name)),orders(id,total_amount,status,payment_status,created_at)')
          .eq('id', sourceId)
          .maybeSingle();
        const subRow = (data as SubscriptionDetail) || null;
        setSubscription(subRow);
        if (subRow?.orders?.id) {
          const { data: orderData } = await supabase
            .from('orders')
            .select('id,total_amount,status,payment_status,created_at,purchase_records(id,quantity,unit_price,total_price,products(id,name,sku,vendors(id,name)))')
            .eq('id', subRow.orders.id)
            .maybeSingle();
          setOrder((orderData as OrderDetail) || null);
        }
      }

      setLoading(false);
    };

    load();
  }, [id]);

  const summaryCards = useMemo(() => {
    if (!point) return [];
    return [
      { label: '點數', value: `${point.amount >= 0 ? '+' : ''}${point.amount}` },
      { label: '類型', value: point.transaction_type },
      { label: '來源', value: point.source_type || '-' },
      { label: '建立時間', value: formatDateTime(point.created_at) },
    ];
  }, [point]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/superadmin/points-ledger')}
          className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-800"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </button>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!point) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/superadmin/points-ledger')}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </button>
        <div className="rounded-xl bg-amber-100 p-2">
          <Coins className="h-6 w-6 text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">點數明細</h1>
          <p className="text-sm text-gray-500">{point.id}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {summaryCards.map(card => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="mt-2 break-words text-lg font-bold text-gray-900">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">基本資料</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-gray-500">會員</p>
                <Link
                  to={`/superadmin/users?q=${encodeURIComponent(point.user_id)}`}
                  className="mt-1 inline-flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-800 hover:underline"
                >
                  {member?.display_name || point.user_id.slice(0, 8).toUpperCase()}
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <p className="text-xs text-gray-400">{point.user_id}{member?.role ? ` · ${member.role}` : ''}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">說明</p>
                <p className="mt-1 text-sm text-gray-700">{point.description || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">來源類型</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{point.source_type || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Reference</p>
                <p className="mt-1 break-all text-sm text-gray-700">{point.reference_id || '-'}</p>
              </div>
            </div>
          </div>

          {booking && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <BedDouble className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-bold text-gray-900">訂房來源</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-gray-500">房型</p>
                  {booking.tbl_rooms?.id && booking.tbl_rooms?.name ? (
                    <Link
                      to={`/superadmin/rooms/detail/${booking.tbl_rooms.id}`}
                      className="mt-1 inline-flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-800 hover:underline"
                    >
                      {booking.tbl_rooms.name}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <p className="mt-1 font-semibold text-gray-900">-</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {booking.tbl_rooms?.room_type || '-'}
                    {booking.tbl_rooms?.vendors?.id ? (
                      <>
                        {' '}
                        ·
                        <Link to={`/superadmin/vendors/detail/${booking.tbl_rooms.vendors.id}`} className="ml-1 hover:text-gray-600 hover:underline">
                          {booking.tbl_rooms.vendors.name || booking.tbl_rooms.vendors.id}
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">金額</p>
                  <p className="mt-1 font-semibold text-gray-900">{formatCurrency(booking.total_price)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">入住 / 退房</p>
                  <p className="mt-1 text-sm text-gray-700">{booking.check_in_date} 至 {booking.check_out_date}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">狀態</p>
                  <p className="mt-1 text-sm text-gray-700">{booking.status}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500">特殊需求</p>
                <p className="mt-1 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">{booking.special_requests || '-'}</p>
              </div>
            </div>
          )}

          {order && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-bold text-gray-900">訂單來源</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-gray-500">訂單金額</p>
                  <p className="mt-1 font-semibold text-gray-900">{formatCurrency(order.total_amount)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">付款狀態</p>
                  <p className="mt-1 text-sm text-gray-700">{order.payment_status}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">訂單狀態</p>
                  <p className="mt-1 text-sm text-gray-700">{order.status}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">建立時間</p>
                  <p className="mt-1 text-sm text-gray-700">{formatDateTime(order.created_at)}</p>
                </div>
              </div>
              {order.purchase_records && order.purchase_records.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-medium text-gray-500">品項</p>
                  {order.purchase_records.map(item => (
                    <div key={item.id} className="rounded-2xl bg-gray-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          {item.products?.id && item.products?.name ? (
                            <Link
                              to={`/superadmin/products/detail/${item.products.id}`}
                              className="inline-flex items-center gap-1 font-semibold text-gray-900 hover:text-amber-700 hover:underline"
                            >
                              {item.products.name}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          ) : (
                            <p className="font-semibold text-gray-900">-</p>
                          )}
                          <p className="text-xs text-gray-400">{item.products?.sku || item.id}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.total_price)}</p>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {item.quantity} x {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {subscription && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Repeat className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-bold text-gray-900">訂閱來源</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-gray-500">商品</p>
                  {subscription.products?.id && subscription.products?.name ? (
                    <Link
                      to={`/superadmin/products/detail/${subscription.products.id}`}
                      className="mt-1 inline-flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-800 hover:underline"
                    >
                      {subscription.products.name}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <p className="mt-1 font-semibold text-gray-900">-</p>
                  )}
                  {subscription.products?.vendors?.id ? (
                    <p className="mt-1 text-xs text-gray-400">
                      供應商{' '}
                      <Link to={`/superadmin/vendors/detail/${subscription.products.vendors.id}`} className="hover:text-gray-600 hover:underline">
                        {subscription.products.vendors.name || subscription.products.vendors.id}
                      </Link>
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">每月金額</p>
                  <p className="mt-1 font-semibold text-gray-900">{formatCurrency(subscription.monthly_amount)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">狀態</p>
                  <p className="mt-1 text-sm text-gray-700">{subscription.status}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">上次扣款</p>
                  <p className="mt-1 text-sm text-gray-700">{subscription.last_billed_at ? formatDateTime(subscription.last_billed_at) : '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">下次扣款</p>
                  <p className="mt-1 text-sm text-gray-700">{subscription.next_bill_at ? formatDateTime(subscription.next_bill_at) : '-'}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500">備註</p>
                <p className="mt-1 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">{subscription.notes || '-'}</p>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">原始資料</h2>
            <pre className="overflow-x-auto rounded-2xl bg-gray-50 p-4 text-xs text-gray-700">{JSON.stringify({ point, booking, order, subscription }, null, 2)}</pre>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <Users className="h-4 w-4" />
              查詢說明
            </div>
            <p className="mt-2 leading-6">
              這個頁面可直接追到會員、訂房、訂單與訂閱來源，方便後台確認點數發放的依據。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

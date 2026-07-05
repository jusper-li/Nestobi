import { useEffect, useMemo, useState } from 'react';
import { CreditCard, DollarSign, RefreshCw, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

type PaymentRow = {
  id: string;
  order_id: string;
  amount: number;
  method: string;
  status: string;
  gateway_name?: string | null;
  transaction_id?: string | null;
  paid_at?: string | null;
  created_at: string;
  order?: {
    order_number?: string;
    customer_name?: string;
  } | null;
};

const formatCurrency = (amount: number) => `NT$ ${Number(amount || 0).toLocaleString('zh-TW')}`;

const statusStyle = (status: string) => {
  const key = (status || '').toLowerCase();
  if (key === 'paid') return 'bg-emerald-100 text-emerald-700';
  if (key === 'pending') return 'bg-amber-100 text-amber-700';
  if (key === 'failed') return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
};

const statusText = (status: string) => {
  const key = (status || '').toLowerCase();
  if (key === 'paid') return '已付款';
  if (key === 'pending') return '待付款';
  if (key === 'failed') return '付款失敗';
  return status || '未知';
};

export default function PaymentManagement() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PaymentRow[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id,order_id,amount,method,status,gateway_name,transaction_id,paid_at,created_at,orders(order_number,customer_name)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      const normalized = (data || []).map((item: any) => ({
        ...item,
        order: Array.isArray(item.orders) ? item.orders[0] : item.orders,
      }));
      setRows(normalized as PaymentRow[]);
    } catch (error) {
      console.error('Failed to load payments:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => {
    const paidRows = rows.filter((x) => (x.status || '').toLowerCase() === 'paid');
    const pendingRows = rows.filter((x) => (x.status || '').toLowerCase() === 'pending');
    const totalRevenue = paidRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return {
      totalRevenue,
      paidCount: paidRows.length,
      pendingCount: pendingRows.length,
    };
  }, [rows]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('payment_management.title', '金流管理')}</h1>
          <p className="mt-2 text-slate-600">{t('payment_management.subtitle', '查看付款交易、狀態與藍新回寫結果。')}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh', '重新整理')}
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-slate-900">{formatCurrency(stats.totalRevenue)}</div>
          <div className="text-sm text-slate-600">{t('payment_management.total_revenue', '已收款總額')}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-slate-900">{stats.paidCount}</div>
          <div className="text-sm text-slate-600">{t('payment_management.paid_count', '已付款筆數')}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-slate-900">{stats.pendingCount}</div>
          <div className="text-sm text-slate-600">{t('payment_management.pending_count', '待付款筆數')}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900">{t('payment_management.records_title', '交易紀錄')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{t('payment_management.column_order', '訂單')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{t('payment_management.column_amount', '金額')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{t('payment_management.column_method', '付款方式')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{t('payment_management.column_gateway', '金流')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{t('payment_management.column_status', '狀態')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{t('payment_management.column_transaction', '交易編號')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{t('payment_management.column_time', '時間')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                    {loading ? t('common.loading', '載入中…') : t('payment_management.empty_state', '目前沒有交易資料')}
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{row.order?.order_number || '-'}</div>
                    <div className="text-xs text-slate-500">{row.order?.customer_name || ''}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{formatCurrency(Number(row.amount || 0))}</td>
                  <td className="px-6 py-4 text-slate-600">{row.method || '-'}</td>
                  <td className="px-6 py-4 text-slate-600">{row.gateway_name || 'manual'}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle(row.status)}`}>
                      {statusText(row.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">{row.transaction_id || '-'}</td>
                  <td className="px-6 py-4 text-slate-500">{new Date(row.paid_at || row.created_at).toLocaleString('zh-TW')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

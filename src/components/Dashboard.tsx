import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, DollarSign, Loader2, Package, RefreshCw, ShoppingCart, Users } from 'lucide-react';
import { isMissingSupabaseTableError, isSupabaseContentEnabled, supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

type DashboardOrder = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
};

type DashboardProduct = {
  id: string;
  name: string;
  stock: number;
  is_active: boolean;
  created_at: string;
};

type DashboardMember = {
  id: string;
  name: string | null;
  email: string | null;
  created_at: string;
};

type DashboardMetrics = {
  totalMembers: number;
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  paidRevenue: number;
  pendingOrders: number;
  lowStockCount: number;
};

const EMPTY_METRICS: DashboardMetrics = {
  totalMembers: 0,
  totalProducts: 0,
  activeProducts: 0,
  totalOrders: 0,
  paidRevenue: 0,
  pendingOrders: 0,
  lowStockCount: 0,
};

const LOW_STOCK_THRESHOLD = 10;

export default function Dashboard() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics>(EMPTY_METRICS);
  const [recentOrders, setRecentOrders] = useState<DashboardOrder[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<DashboardProduct[]>([]);
  const [newMembers, setNewMembers] = useState<DashboardMember[]>([]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(value);

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  const getOrderStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: t('admin.dashboard.status.pending', '待處理'),
      processing: t('admin.dashboard.status.processing', '處理中'),
      completed: t('admin.dashboard.status.completed', '已完成'),
      cancelled: t('admin.dashboard.status.cancelled', '已取消'),
    };
    return map[status] ?? status;
  };

  const getOrderStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-700',
      processing: 'bg-blue-100 text-blue-700',
      completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-rose-100 text-rose-700',
    };
    return map[status] ?? 'bg-slate-100 text-slate-700';
  };

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [ordersRes, productsRes, membersRes] = await Promise.all([
        supabase.from('orders').select('id, order_number, status, payment_status, total, created_at').order('created_at', { ascending: false }),
        supabase.from('products').select('id, name, stock, is_active, created_at').order('created_at', { ascending: false }),
        supabase.from('members').select('id, name, email, created_at').order('created_at', { ascending: false }),
      ]);

      const maybeErrors = [ordersRes.error, productsRes.error, membersRes.error].filter(Boolean);
      const blockingError = maybeErrors.find((item) => item && !isMissingSupabaseTableError(item));
      if (blockingError) throw blockingError;

      const orders = (ordersRes.data ?? []) as DashboardOrder[];
      const products = (productsRes.data ?? []) as DashboardProduct[];
      const members = (membersRes.data ?? []) as DashboardMember[];

      const paidRevenue = orders
        .filter((order) => order.payment_status === 'paid' || order.status === 'completed')
        .reduce((sum, order) => sum + Number(order.total || 0), 0);

      const pendingOrders = orders.filter((order) => ['pending', 'processing'].includes(order.status)).length;
      const lowStock = products
        .filter((product) => Number(product.stock ?? 0) <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => Number(a.stock ?? 0) - Number(b.stock ?? 0))
        .slice(0, 6);

      setMetrics({
        totalMembers: members.length,
        totalProducts: products.length,
        activeProducts: products.filter((product) => product.is_active).length,
        totalOrders: orders.length,
        paidRevenue,
        pendingOrders,
        lowStockCount: lowStock.length,
      });
      setRecentOrders(orders.slice(0, 8));
      setLowStockProducts(lowStock);
      setNewMembers(members.slice(0, 6));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      const message = err instanceof Error ? err.message : t('admin.dashboard.error.default', '讀取失敗');
      setError(message);
      setMetrics(EMPTY_METRICS);
      setRecentOrders([]);
      setLowStockProducts([]);
      setNewMembers([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isSupabaseContentEnabled) {
      setLoading(false);
      setError(t('admin.dashboard.error.noSupabase', '目前是本地展示模式，未啟用 Supabase 內容資料。'));
      return;
    }
    void loadDashboard();
  }, [loadDashboard, t]);

  const cards = useMemo(
    () => [
      { label: t('admin.dashboard.card.members', '會員總數'), value: metrics.totalMembers.toLocaleString('zh-TW'), icon: Users, tone: 'bg-blue-500' },
      {
        label: t('admin.dashboard.card.products', '商品總數'),
        value: `${metrics.totalProducts}${t('admin.dashboard.card.activeSuffix', '（上架')} ${metrics.activeProducts}${t('admin.dashboard.card.activeSuffixEnd', '）')}`,
        icon: Package,
        tone: 'bg-emerald-500',
      },
      { label: t('admin.dashboard.card.orders', '訂單總數'), value: metrics.totalOrders.toLocaleString('zh-TW'), icon: ShoppingCart, tone: 'bg-orange-500' },
      { label: t('admin.dashboard.card.revenue', '已收款營收'), value: formatCurrency(metrics.paidRevenue), icon: DollarSign, tone: 'bg-violet-500' },
    ],
    [metrics, t]
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('admin.dashboard.title', '儀錶板')}</h1>
          <p className="mt-2 text-slate-600">{t('admin.dashboard.subtitle', '即時顯示會員、商品、訂單與營收狀態。')}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading || !isSupabaseContentEnabled}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('admin.dashboard.refresh', '重新整理')}
        </button>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-slate-500" />
          {t('admin.dashboard.loading', '載入儀錶板資料中...')}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4" />
            {t('admin.dashboard.error.title', '儀錶板資料目前不可用')}
          </div>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <section key={card.label} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.tone}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <p className="text-xs tracking-wide text-slate-500">{card.label}</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{card.value}</p>
                </section>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">{t('admin.dashboard.recentOrders', '最新訂單')}</h2>
                <span className="text-sm text-slate-500">
                  {t('admin.dashboard.pendingLabel', '待處理：')}
                  {metrics.pendingOrders}
                </span>
              </div>

              {recentOrders.length === 0 ? (
                <p className="text-sm text-slate-500">{t('admin.dashboard.noOrders', '目前沒有訂單資料。')}</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <div className="font-mono text-sm text-slate-900">{order.order_number || order.id}</div>
                        <div className="text-xs text-slate-500">{formatDateTime(order.created_at)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900">{formatCurrency(Number(order.total || 0))}</div>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${getOrderStatusBadge(order.status)}`}>
                          {getOrderStatusLabel(order.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">{t('admin.dashboard.lowStock', '低庫存商品')}</h2>
                {lowStockProducts.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {t('admin.dashboard.lowStockEmpty', `沒有低庫存商品（≦ ${LOW_STOCK_THRESHOLD}）。`)}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {lowStockProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <div className="pr-3 text-sm text-slate-800">{product.name}</div>
                        <div className="text-sm font-semibold text-orange-600">{product.stock}</div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-4 text-xs text-slate-500">
                  {t('admin.dashboard.lowStockCount', '目前低庫存筆數：')}
                  {metrics.lowStockCount}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">{t('admin.dashboard.newMembers', '最新會員')}</h2>
                {newMembers.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('admin.dashboard.noMembers', '目前沒有會員資料。')}</p>
                ) : (
                  <div className="space-y-3">
                    {newMembers.map((member) => (
                      <div key={member.id} className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-sm font-medium text-slate-900">{member.name || t('admin.dashboard.memberUnknown', '未命名會員')}</p>
                        <p className="text-xs text-slate-500">{member.email || t('admin.dashboard.memberNoEmail', '無 Email')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

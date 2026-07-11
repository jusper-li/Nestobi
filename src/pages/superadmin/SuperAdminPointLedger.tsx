import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Coins, Eye, Filter, RefreshCw, Search, User, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDateTime } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';

type TransactionType = 'all' | 'earned' | 'spent' | 'manual' | 'redemption' | 'store_redemption';
type SourceType = 'all' | 'booking' | 'order' | 'subscription' | 'manual' | 'redemption' | 'store_redemption';

interface PointLedgerRow {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  reference_id: string | null;
  source_type: string | null;
  source_id: string | null;
  vendor_id: string | null;
  store_location_id: string | null;
  description: string | null;
  created_at: string;
}

interface MemberInfo {
  user_id: string;
  display_name?: string | null;
  role?: string | null;
}

const PAGE_SIZE = 25;

const SOURCE_LABELS: Record<string, string> = {
  booking: 'Booking',
  order: 'Order',
  subscription: 'Subscription',
  manual: 'Manual',
  redemption: 'Redemption',
  store_redemption: 'Store redemption',
};

const TRANSACTION_LABELS: Record<string, string> = {
  earned: 'Earned',
  spent: 'Spent',
  manual: 'Manual',
  redemption: 'Redemption',
  store_redemption: 'Store redemption',
};

const SuperAdminPointLedger: React.FC = () => {
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);
  const navigate = useNavigate();

  const [rows, setRows] = useState<PointLedgerRow[]>([]);
  const [members, setMembers] = useState<Record<string, MemberInfo>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>('all');
  const [sourceType, setSourceType] = useState<SourceType>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (nextPage = page) => {
    setLoading(true);
    setError('');

    let query = supabase
      .from('points')
      .select('id,user_id,amount,transaction_type,reference_id,source_type,source_id,vendor_id,store_location_id,description,created_at', { count: 'exact' });

    if (transactionType !== 'all') query = query.eq('transaction_type', transactionType);
    if (sourceType !== 'all') query = query.eq('source_type', sourceType);
    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`);
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59.999`);

    const keyword = search.trim();
    if (keyword) {
      const safeKeyword = keyword.replace(/[%_,]/g, '');
      if (safeKeyword) {
        query = query.or([
          `description.ilike.%${safeKeyword}%`,
          `user_id.ilike.%${safeKeyword}%`,
          `reference_id.ilike.%${safeKeyword}%`,
          `source_id.ilike.%${safeKeyword}%`,
          `source_type.ilike.%${safeKeyword}%`,
        ].join(','));
      }
    }

    const { data, count, error: queryError } = await query
      .order('created_at', { ascending: false })
      .range(nextPage * PAGE_SIZE, nextPage * PAGE_SIZE + PAGE_SIZE - 1);

    if (queryError) {
      setError(queryError.message);
      setRows([]);
      setMembers({});
      setTotal(0);
      setLoading(false);
      return;
    }

    const rowsData = (data || []) as PointLedgerRow[];
    const userIds = Array.from(new Set(rowsData.map(row => row.user_id).filter(Boolean)));

    const [profileRes, authRes] = await Promise.all([
      userIds.length
        ? supabase.from('tbl_mn5wgzh0').select('user_id,display_name').in('user_id', userIds)
        : Promise.resolve({ data: [] as any[] }),
      userIds.length
        ? supabase.from('tbl_user_auth').select('user_id,role').in('user_id', userIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const memberMap: Record<string, MemberInfo> = {};
    (profileRes.data || []).forEach((row: any) => {
      memberMap[row.user_id] = { ...(memberMap[row.user_id] || { user_id: row.user_id }), display_name: row.display_name };
    });
    (authRes.data || []).forEach((row: any) => {
      memberMap[row.user_id] = { ...(memberMap[row.user_id] || { user_id: row.user_id }), role: row.role };
    });

    setRows(rowsData);
    setMembers(memberMap);
    setTotal(count || 0);
    setLoading(false);
  };

  useEffect(() => {
    loadData(0);
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionType, sourceType, dateFrom, dateTo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(page);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    loadData(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const pageStats = useMemo(() => {
    const earned = rows.filter(row => row.amount > 0).reduce((sum, row) => sum + row.amount, 0);
    const spent = rows.filter(row => row.amount < 0).reduce((sum, row) => sum + Math.abs(row.amount), 0);
    const net = rows.reduce((sum, row) => sum + row.amount, 0);
    return { earned, spent, net };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  const resetFilters = () => {
    setSearch('');
    setTransactionType('all');
    setSourceType('all');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadData(page);
    setRefreshing(false);
  };

  const memberLabel = (row: PointLedgerRow) => {
    const info = members[row.user_id];
    return info?.display_name || row.user_id.slice(0, 8).toUpperCase();
  };

  const roleLabel = (row: PointLedgerRow) => {
    const role = members[row.user_id]?.role;
    if (!role) return '';
    const labels: Record<string, string> = {
      superadmin: 'Super Admin',
      admin: 'Admin',
      vendor: 'Vendor',
      user: 'User',
    };
    return labels[role] || role;
  };

  const sourceLabel = (source: string | null) => {
    if (!source) return pick('未指定', 'Unassigned', '未設定', '미지정');
    return SOURCE_LABELS[source] || source;
  };

  const transactionLabel = (type: string) => TRANSACTION_LABELS[type] || type;

  if (loading && rows.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-xl bg-amber-100 p-2">
          <Coins className="h-6 w-6 text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pick('點數明細', 'Points Ledger', 'ポイント履歴', '포인트 내역')}</h1>
          <p className="text-sm text-gray-500">{pick('查看每一筆點數交易與來源資訊。', 'Review every points transaction with source context.', '各ポイント取引の内容と発生元を確認します。', '각 포인트 거래와 출처를 확인합니다.')}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {pick('重新整理', 'Refresh', '更新', '새로고침')}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: pick('本頁收入', 'Earned on page', 'このページの獲得', '현재 페이지 적립'), value: `+${pageStats.earned}` },
          { label: pick('本頁支出', 'Spent on page', 'このページの消費', '현재 페이지 사용'), value: `-${pageStats.spent}` },
          { label: pick('本頁淨額', 'Net on page', 'このページの合計', '현재 페이지 순액'), value: `${pageStats.net >= 0 ? '+' : ''}${pageStats.net}` },
        ].map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-2xl bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter className="h-4 w-4 text-amber-600" />
          {pick('篩選', 'Filters', 'フィルター', '필터')}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder={pick('搜尋會員、描述、來源 ID', 'Search member, description, source ID', '会員、説明、ソース ID を検索', '회원, 설명, source ID 검색')}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-amber-400"
            />
          </div>

          <select
            value={transactionType}
            onChange={e => {
              setTransactionType(e.target.value as TransactionType);
              setPage(0);
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400"
          >
            <option value="all">{pick('全部類型', 'All types', 'すべての種類', '모든 유형')}</option>
            <option value="earned">{pick('收入', 'Earned', '獲得', '적립')}</option>
            <option value="spent">{pick('支出', 'Spent', '消費', '사용')}</option>
            <option value="manual">{pick('手動', 'Manual', '手動', '수동')}</option>
            <option value="redemption">{pick('兌換', 'Redemption', '交換', '교환')}</option>
            <option value="store_redemption">{pick('門市兌換', 'Store redemption', '店舗交換', '매장 교환')}</option>
          </select>

          <select
            value={sourceType}
            onChange={e => {
              setSourceType(e.target.value as SourceType);
              setPage(0);
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400"
          >
            <option value="all">{pick('全部來源', 'All sources', 'すべてのソース', '모든 출처')}</option>
            <option value="booking">{pick('訂房', 'Booking', '宿泊', '예약')}</option>
            <option value="order">{pick('訂單', 'Order', '注文', '주문')}</option>
            <option value="subscription">{pick('訂閱', 'Subscription', 'サブスクリプション', '구독')}</option>
            <option value="manual">{pick('手動', 'Manual', '手動', '수동')}</option>
            <option value="redemption">{pick('兌換', 'Redemption', '交換', '교환')}</option>
            <option value="store_redemption">{pick('門市兌換', 'Store redemption', '店舗交換', '매장 교환')}</option>
          </select>

          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => {
                setDateFrom(e.target.value);
                setPage(0);
              }}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-amber-400"
            />
          </div>

          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={dateTo}
              onChange={e => {
                setDateTo(e.target.value);
                setPage(0);
              }}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-amber-400"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {pick('清除篩選', 'Clear filters', 'フィルターをクリア', '필터 초기화')}
          </button>
          <span className="text-sm text-gray-500">
            {pick('目前結果', 'Current results', '現在の結果', '현재 결과')}: <strong className="text-gray-900">{total}</strong>
          </span>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-500">{pick('時間', 'Time', '時間', '시간')}</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-500">{pick('會員', 'Member', '会員', '회원')}</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-500">{pick('點數', 'Points', 'ポイント', '포인트')}</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-500">{pick('類型', 'Type', '種類', '유형')}</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-500">{pick('來源', 'Source', 'ソース', '출처')}</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-500">{pick('描述', 'Description', '説明', '설명')}</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-500">Reference</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">{pick('操作', 'Action', '操作', '작업')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                    <Users className="mx-auto mb-2 h-10 w-10 opacity-20" />
                    {pick('沒有符合條件的點數紀錄', 'No points records match your filters', '条件に一致するポイント履歴はありません', '필터에 맞는 포인트 기록이 없습니다')}
                  </td>
                </tr>
              ) : (
                rows.map(row => (
                  <tr
                    key={row.id}
                    className="align-top hover:bg-amber-50/30"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/superadmin/points-ledger/${row.id}`)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/superadmin/points-ledger/${row.id}`);
                      }
                    }}
                  >
                    <td className="whitespace-nowrap px-4 py-4 text-gray-600">{formatDateTime(row.created_at)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                          {memberLabel(row).slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{memberLabel(row)}</p>
                          <p className="flex items-center gap-1 text-xs text-gray-400">
                            <User className="h-3 w-3" />
                            {row.user_id.slice(0, 8).toUpperCase()} {roleLabel(row) ? `· ${roleLabel(row)}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={`whitespace-nowrap px-4 py-4 font-bold ${row.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {row.amount >= 0 ? '+' : ''}
                      {row.amount}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{transactionLabel(row.transaction_type)}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">{sourceLabel(row.source_type)}</span>
                        <span className="text-xs text-gray-400">
                          {row.vendor_id ? `Vendor: ${row.vendor_id.slice(0, 8).toUpperCase()}` : ''}
                          {row.store_location_id ? ` ${row.vendor_id ? '· ' : ''}Store: ${row.store_location_id.slice(0, 8).toUpperCase()}` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-4 text-gray-600">
                      <p className="line-clamp-2">{row.description || '-'}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-500">
                      <div className="space-y-1">
                        <div>{row.reference_id || '-'}</div>
                        {row.source_id && row.source_id !== row.reference_id && <div>{row.source_id}</div>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation();
                          navigate(`/superadmin/points-ledger/${row.id}`);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {pick('查看', 'View', '詳細', '보기')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-4">
          <p className="text-sm text-gray-500">
            {pick('第', 'Page', 'ページ', '페이지')} {page + 1} / {totalPages} · {pick('每頁', 'per page', '1ページあたり', '페이지당')} {PAGE_SIZE} {pick('筆', 'rows', '件', '건')}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(prev => Math.max(0, prev - 1))}
              disabled={!canPrev}
              className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              {pick('上一頁', 'Previous', '前へ', '이전')}
            </button>
            <button
              type="button"
              onClick={() => setPage(prev => prev + 1)}
              disabled={!canNext}
              className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pick('下一頁', 'Next', '次へ', '다음')}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminPointLedger;

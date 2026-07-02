import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  CalendarClock,
  ChevronRight,
  Clock3,
  Database,
  Filter,
  Search,
  ShieldCheck,
  Tag,
  User,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { formatDateTime } from '../../lib/utils';

type AdminActivityLog = {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

type AdminProfile = {
  user_id: string;
  role: string;
  is_active?: boolean | null;
};

const actionLabels: Record<string, string> = {
  create_vendor: '建立廠商',
  update_vendor: '更新廠商',
  delete_vendor: '刪除廠商',
  link_vendor_user: '綁定廠商帳號',
  unlink_vendor_user: '解除廠商帳號',
  promote_admin: '升級管理員',
  update_admin_permissions: '更新權限',
  revoke_admin: '撤銷管理員',
  update_order_status: '更新訂單狀態',
  delete_blog_post: '刪除文章',
  delete_blog_category: '刪除文章分類',
  delete_faq: '刪除 FAQ',
  update_point_reward_rule: '更新點數回饋規則',
};

const entityLabels: Record<string, string> = {
  vendors: '廠商',
  orders: '訂單',
  tbl_user_auth: '管理員帳號',
  user_permissions: '權限',
  blog_posts: '文章',
  blog_categories: '文章分類',
  faqs: 'FAQ',
  point_reward_rules: '點數回饋',
};

const SuperAdminActivityLogs: React.FC = () => {
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);

  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [profiles, setProfiles] = useState<Record<string, AdminProfile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AdminActivityLog | null>(null);

  const labels = {
    title: pick('管理員操作紀錄', 'Admin Activity Logs', '管理者操作履歴', '관리자 작업 기록'),
    subtitle: pick('查看所有超級管理員與管理員在系統中的操作軌跡。', 'Review every action performed by superadmins and admins across the system.', 'スーパー管理者と管理者の操作履歴を確認できます。', '슈퍼관리자와 관리자의 시스템 작업 내역을 확인합니다.'),
    search: pick('搜尋 action / entity / ID / 詳細', 'Search action / entity / ID / details', 'action / entity / ID / 詳細を検索', 'action / entity / ID / 상세 검색'),
    all: pick('全部', 'All', 'すべて', '전체'),
    actor: pick('操作者', 'Actor', '実行者', '작업자'),
    action: pick('動作', 'Action', '操作', '작업'),
    entity: pick('資料類型', 'Entity', '対象', '대상'),
    entityId: pick('資料 ID', 'Entity ID', 'ID', 'ID'),
    details: pick('詳細', 'Details', '詳細', '상세'),
    createdAt: pick('建立時間', 'Created at', '作成日時', '생성 시간'),
    today: pick('今天', 'Today', '今日', '오늘'),
    total: pick('總紀錄', 'Total logs', '総件数', '총 기록'),
    actors: pick('操作者數', 'Actors', '実行者数', '작업자 수'),
    empty: pick('目前沒有符合條件的操作紀錄。', 'No activity logs match your filters yet.', '条件に一致する履歴はありません。', '조건에 맞는 기록이 없습니다.'),
    loadFailed: pick('操作紀錄載入失敗，請稍後再試。', 'Failed to load activity logs. Please try again later.', '履歴の読み込みに失敗しました。後でもう一度お試しください。', '기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'),
  };

  const actionOptions = useMemo(() => {
    const values = Array.from(new Set(logs.map(log => log.action))).sort();
    return [labels.all, ...values];
  }, [logs, labels.all]);

  const entityOptions = useMemo(() => {
    const values = Array.from(new Set(logs.map(log => log.entity_type))).sort();
    return [labels.all, ...values];
  }, [logs, labels.all]);

  const todayCount = useMemo(() => {
    const today = new Date();
    return logs.filter(log => {
      const created = new Date(log.created_at);
      return created.getFullYear() === today.getFullYear()
        && created.getMonth() === today.getMonth()
        && created.getDate() === today.getDate();
    }).length;
  }, [logs]);

  const uniqueActors = useMemo(() => new Set(logs.map(log => log.actor_user_id).filter(Boolean)).size, [logs]);

  const filteredLogs = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return logs.filter(log => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (entityFilter !== 'all' && log.entity_type !== entityFilter) return false;
      if (!keyword) return true;
      const blob = [
        log.action,
        log.entity_type,
        log.entity_id || '',
        log.actor_user_id || '',
        JSON.stringify(log.details || {}),
      ].join(' ').toLowerCase();
      return blob.includes(keyword);
    });
  }, [actionFilter, entityFilter, logs, query]);

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('admin_activity_logs')
        .select('id,actor_user_id,action,entity_type,entity_id,details,created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (fetchError) throw fetchError;

      const list = (data || []) as AdminActivityLog[];
      setLogs(list);

      const actorIds = Array.from(new Set(list.map(item => item.actor_user_id).filter(Boolean))) as string[];
      if (actorIds.length > 0) {
        const { data: profileData } = await supabase
          .from('tbl_user_auth')
          .select('user_id, role, is_active')
          .in('user_id', actorIds);

        const profileMap = Object.fromEntries((profileData || []).map((row: any) => [row.user_id, row])) as Record<string, AdminProfile>;
        setProfiles(profileMap);
      } else {
        setProfiles({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    if (selectedLog && !logs.some(log => log.id === selectedLog.id)) {
      setSelectedLog(null);
    }
  }, [logs, selectedLog]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800/10 bg-gradient-to-br from-slate-950 to-emerald-900 p-5 text-white shadow-lg shadow-emerald-950/10 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
              <ShieldCheck className="h-4 w-4" />
              <span>{labels.title}</span>
            </div>
            <h1 className="mt-4 text-2xl font-bold leading-tight md:text-3xl">{labels.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-emerald-50/85 md:text-[15px]">{labels.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={loadLogs}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            <Activity className="h-4 w-4" />
            {pick('重新整理', 'Refresh', '更新', '새로고침')}
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: labels.total, value: logs.length, icon: <Database className="h-5 w-5" /> },
            { label: labels.today, value: todayCount, icon: <CalendarClock className="h-5 w-5" /> },
            { label: labels.actors, value: uniqueActors, icon: <User className="h-5 w-5" /> },
            { label: labels.entity, value: entityFilter === 'all' ? entityOptions.length - 1 : 1, icon: <Tag className="h-5 w-5" /> },
          ].map(item => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-100/80">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold">{item.value}</p>
                </div>
                <div className="text-emerald-100">{item.icon}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm md:p-5">
        <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2.5 focus-within:ring-2 focus-within:ring-emerald-500">
            <Search className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={labels.search}
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="rounded-2xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {actionOptions.map(option => (
              <option key={option} value={option === labels.all ? 'all' : option}>
                {option === labels.all ? labels.all : actionLabels[option] || option}
              </option>
            ))}
          </select>
          <select
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
            className="rounded-2xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {entityOptions.map(option => (
              <option key={option} value={option === labels.all ? 'all' : option}>
                {option === labels.all ? labels.all : entityLabels[option] || option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">{pick('載入操作紀錄中...', 'Loading activity logs...', '操作履歴を読み込み中...', '작업 기록을 불러오는 중...')}</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
          <ShieldCheck className="mx-auto mb-3 h-12 w-12 text-gray-200" />
          <p className="text-gray-400">{labels.empty}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            {filteredLogs.map(log => {
              const actor = log.actor_user_id ? profiles[log.actor_user_id] : null;
              const detailText = JSON.stringify(log.details || {});
              return (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => setSelectedLog(log)}
                  className={`w-full rounded-3xl border p-4 text-left transition hover:border-emerald-200 hover:shadow-sm ${
                    selectedLog?.id === log.id ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-100 bg-white'
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          {actionLabels[log.action] || log.action}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                          {entityLabels[log.entity_type] || log.entity_type}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-gray-900">
                        {log.entity_id ? `${log.entity_id}` : '-'}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {actor?.role || labels.actor}: {log.actor_user_id || '-'}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">{detailText === '{}' ? '-' : detailText}</p>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-gray-900">{pick('紀錄詳情', 'Log Details', '履歴詳細', '기록 상세')}</h2>
              {selectedLog ? (
                <div className="mt-4 space-y-3">
                  <DetailRow label={labels.action} value={actionLabels[selectedLog.action] || selectedLog.action} />
                  <DetailRow label={labels.entity} value={entityLabels[selectedLog.entity_type] || selectedLog.entity_type} />
                  <DetailRow label={labels.entityId} value={selectedLog.entity_id || '-'} mono />
                  <DetailRow label={labels.actor} value={selectedLog.actor_user_id || '-'} mono />
                  <DetailRow
                    label={labels.createdAt}
                    value={formatDateTime(selectedLog.created_at)}
                  />
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-400">{labels.details}</p>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                      {JSON.stringify(selectedLog.details || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-6 text-sm text-gray-500">
                  {pick('點選左側任一筆紀錄即可查看詳細內容。', 'Select any record on the left to inspect details.', '左の履歴を選択すると詳細が表示されます。', '왼쪽 기록을 선택하면 상세를 볼 수 있습니다.')}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-5 text-sm text-emerald-900">
              <p className="font-semibold">{pick('說明', 'Notes', '補足', '안내')}</p>
              <p className="mt-2 leading-7 text-emerald-900/80">
                {pick(
                  '這些紀錄來自系統內已呼叫 logAdminAction 的超級管理員操作。若你要記錄更多動作，只要在對應功能加上 logAdminAction 即可。',
                  'These records come from superadmin actions that already call logAdminAction. Add logAdminAction to any new admin feature to keep the trail complete.',
                  'この履歴は logAdminAction を呼び出す管理者操作から取得しています。新しい管理機能にも logAdminAction を追加すると履歴が残ります。',
                  '이 기록은 logAdminAction을 호출하는 관리자 작업에서 가져옵니다. 새 관리 기능에도 logAdminAction을 추가하면 기록이 남습니다.'
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className={`mt-1 text-sm font-medium text-gray-900 ${mono ? 'break-all font-mono text-xs' : ''}`}>{value || '-'}</p>
    </div>
  );
}

export default SuperAdminActivityLogs;

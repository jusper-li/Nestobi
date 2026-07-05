import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, Clock3, RefreshCcw, ShieldCheck, Sparkles, Tag } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { APP_BUILD_LABEL, APP_COMMIT_LONG, APP_COMMIT_SHA } from '../../lib/appVersion';
import { logSystemCheck, recordVersionBaseline } from '../../lib/auditLog';
import { supabase } from '../../lib/supabase';
import { formatDateTime } from '../../lib/utils';

type SystemRecord = {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  record_type: 'change' | 'check' | 'baseline';
  status: 'pending' | 'completed' | 'failed';
  summary: string | null;
  route: string | null;
  version_label: string | null;
  commit_sha: string | null;
  completed_at: string | null;
  created_at: string;
};

type AdminProfile = {
  user_id: string;
  role: string;
  is_active?: boolean | null;
};

const typeLabels: Record<SystemRecord['record_type'], string> = {
  baseline: '版本基線',
  check: '檢查紀錄',
  change: '修改紀錄',
};

const statusLabels: Record<SystemRecord['status'], string> = {
  pending: '進行中',
  completed: '已完成',
  failed: '失敗',
};

const SuperAdminVersionLogs: React.FC = () => {
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);

  const [records, setRecords] = useState<SystemRecord[]>([]);
  const [profiles, setProfiles] = useState<Record<string, AdminProfile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<SystemRecord | null>(null);
  const [recording, setRecording] = useState(false);
  const [filterType, setFilterType] = useState<'all' | SystemRecord['record_type']>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | SystemRecord['status']>('all');
  const [query, setQuery] = useState('');
  const [sessionNotice, setSessionNotice] = useState('');

  const labels = {
    title: pick('版本與稽核紀錄', 'Version & Audit Logs', 'バージョンと監査ログ', '버전 및 감사 로그'),
    subtitle: pick(
      '每次進入後台、執行檢查、修改資料時，都會寫入版本與稽核紀錄，方便回溯與復原。',
      'Every admin check and change is written with the current build version so you can trace and recover safely.',
      '管理画面での確認や更新は現在のビルド情報と一緒に記録され、追跡と復旧がしやすくなります。',
      '관리자 확인과 수정은 현재 빌드 버전과 함께 기록되어 추적과 복구가 쉬워집니다.'
    ),
    currentVersion: pick('目前版本', 'Current version', '現在のバージョン', '현재 버전'),
    currentCommit: pick('提交代碼', 'Commit', 'コミット', '커밋'),
    baselineTime: pick('版本基線時間', 'Baseline time', '基準記録時刻', '기준 기록 시각'),
    lastCheck: pick('最近檢查', 'Latest check', '最新チェック', '최근 점검'),
    lastChange: pick('最近修改', 'Latest change', '最新変更', '최근 변경'),
    total: pick('總筆數', 'Total records', '合計件数', '총 건수'),
    refresh: pick('重新整理', 'Refresh', '更新', '새로고침'),
    recordVersion: pick('記錄目前版本', 'Record current version', '現在のバージョンを記録', '현재 버전 기록'),
    runCheck: pick('執行系統檢查', 'Run system check', 'システム確認を記録', '시스템 점검 기록'),
    all: pick('全部', 'All', 'すべて', '전체'),
    search: pick('搜尋 action / entity / ID / version', 'Search action / entity / ID / version', 'action / entity / ID / version を検索', 'action / entity / ID / version 검색'),
    status: pick('狀態', 'Status', 'ステータス', '상태'),
    type: pick('類型', 'Type', '種類', '유형'),
    completedAt: pick('完成時間', 'Completed at', '完了時刻', '완료 시각'),
    createdAt: pick('檢查時間', 'Checked at', '確認時刻', '점검 시각'),
    entity: pick('目標', 'Target', '対象', '대상'),
    details: pick('詳細資料', 'Details', '詳細', '상세'),
    empty: pick('目前沒有版本或稽核紀錄。', 'No version or audit records yet.', 'まだバージョンや監査の記録がありません。', '아직 버전 또는 감사 기록이 없습니다.'),
    loadFailed: pick('載入版本紀錄失敗，請稍後再試。', 'Failed to load version logs. Please try again later.', 'バージョン記録の読み込みに失敗しました。', '버전 기록을 불러오지 못했습니다.'),
    baselineHelp: pick(
      '基線只會保留同一版本的第一筆紀錄，避免重複灌入。',
      'Baseline snapshots are deduplicated per version so you always keep one recoverable anchor.',
      '基準記録は同じバージョンにつき1件だけ保存されます。',
      '기준 기록은 같은 버전당 1건만 저장됩니다.'
    ),
  };

  const fetchRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('admin_activity_logs')
        .select('id,actor_user_id,action,entity_type,entity_id,details,record_type,status,summary,route,version_label,commit_sha,completed_at,created_at')
        .order('created_at', { ascending: false })
        .limit(150);

      if (fetchError) throw fetchError;

      const list = (data || []) as SystemRecord[];
      setRecords(list);
      setSelected(prev => (prev ? list.find(item => item.id === prev.id) || list[0] || null : list[0] || null));

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
    void fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latestBaseline = useMemo(() => records.find(record => record.record_type === 'baseline') || null, [records]);
  const latestCheck = useMemo(() => records.find(record => record.record_type === 'check') || null, [records]);
  const latestChange = useMemo(() => records.find(record => record.record_type === 'change') || null, [records]);

  const filteredRecords = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return records.filter(record => {
      if (filterType !== 'all' && record.record_type !== filterType) return false;
      if (filterStatus !== 'all' && record.status !== filterStatus) return false;
      if (!keyword) return true;
      const blob = [
        record.action,
        record.entity_type,
        record.entity_id || '',
        record.summary || '',
        record.route || '',
        record.version_label || '',
        record.commit_sha || '',
        JSON.stringify(record.details || {}),
      ].join(' ').toLowerCase();
      return blob.includes(keyword);
    });
  }, [filterStatus, filterType, query, records]);

  const todayStats = useMemo(() => {
    const today = new Date();
    const sameDay = (value: string) => {
      const dt = new Date(value);
      return dt.getFullYear() === today.getFullYear()
        && dt.getMonth() === today.getMonth()
        && dt.getDate() === today.getDate();
    };
    return {
      checks: records.filter(record => record.record_type === 'check' && sameDay(record.created_at)).length,
      changes: records.filter(record => record.record_type === 'change' && sameDay(record.created_at)).length,
      baselines: records.filter(record => record.record_type === 'baseline' && sameDay(record.created_at)).length,
    };
  }, [records]);

  const runVersionBaseline = async () => {
    setRecording(true);
    try {
      await recordVersionBaseline(APP_BUILD_LABEL, {
        source: 'manual-action',
        commit: APP_COMMIT_LONG,
        page: '/superadmin/version-logs',
      }, {
        route: '/superadmin/version-logs',
        summary: 'manual baseline snapshot',
      });
      await fetchRecords();
      setSessionNotice(pick('已記錄目前版本。', 'Current version recorded.', '現在のバージョンを記録しました。', '현재 버전을 기록했습니다.'));
      setTimeout(() => setSessionNotice(''), 2500);
    } finally {
      setRecording(false);
    }
  };

  const runSystemCheck = async () => {
    setRecording(true);
    try {
      await logSystemCheck('manual_system_check', {
        source: 'manual-action',
        commit: APP_COMMIT_LONG,
        page: '/superadmin/version-logs',
      }, {
        route: '/superadmin/version-logs',
        summary: 'manual system check',
      });
      await fetchRecords();
      setSessionNotice(pick('已完成系統檢查。', 'System check completed.', 'システム確認を記録しました。', '시스템 점검을 기록했습니다.'));
      setTimeout(() => setSessionNotice(''), 2500);
    } finally {
      setRecording(false);
    }
  };

  const topStats = [
    { label: labels.total, value: records.length, icon: <Tag className="h-5 w-5" /> },
    { label: labels.lastCheck, value: latestCheck ? formatDateTime(latestCheck.created_at) : '-', icon: <Clock3 className="h-5 w-5" /> },
    { label: labels.lastChange, value: latestChange ? formatDateTime(latestChange.created_at) : '-', icon: <ShieldCheck className="h-5 w-5" /> },
    { label: labels.baselineTime, value: latestBaseline ? formatDateTime(latestBaseline.created_at) : '-', icon: <BadgeCheck className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-slate-800/10 bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 p-5 text-white shadow-lg md:p-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
              <Sparkles className="h-4 w-4" />
              <span>{labels.title}</span>
            </div>
            <h1 className="mt-4 text-2xl font-bold leading-tight md:text-3xl">{labels.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-emerald-50/85 md:text-[15px]">{labels.subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchRecords}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <RefreshCcw className="h-4 w-4" />
              {labels.refresh}
            </button>
            <button
              type="button"
              onClick={runVersionBaseline}
              disabled={recording}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <BadgeCheck className="h-4 w-4" />
              {labels.recordVersion}
            </button>
            <button
              type="button"
              onClick={runSystemCheck}
              disabled={recording}
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200/40 bg-emerald-500/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4" />
              {labels.runCheck}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {topStats.map(item => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-100/80">{item.label}</p>
                  <p className="mt-1 break-all text-sm font-semibold leading-6 text-white">{item.value}</p>
                </div>
                <div className="text-emerald-100">{item.icon}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: labels.currentVersion, value: APP_BUILD_LABEL, note: labels.baselineHelp, color: 'from-emerald-50 to-white' },
          { label: labels.currentCommit, value: APP_COMMIT_SHA, note: pick('可用於回溯與比對版本。', 'Use this to trace the exact deploy.', '復旧時の追跡に使えます。', '배포 추적에 사용할 수 있습니다.'), color: 'from-slate-50 to-white' },
          { label: labels.lastCheck, value: latestCheck ? formatDateTime(latestCheck.created_at) : '-', note: `${todayStats.checks} ${pick('筆今日檢查', 'checks today', '件の本日のチェック', '건 오늘 점검')}`, color: 'from-amber-50 to-white' },
          { label: labels.lastChange, value: latestChange ? formatDateTime(latestChange.created_at) : '-', note: `${todayStats.changes} ${pick('筆今日修改', 'changes today', '件の本日の変更', '건 오늘 변경')}`, color: 'from-blue-50 to-white' },
        ].map(card => (
          <div key={card.label} className={`rounded-3xl border border-gray-100 bg-gradient-to-br ${card.color} p-5 shadow-sm`}>
            <p className="text-sm font-semibold text-gray-500">{card.label}</p>
            <p className="mt-2 break-all text-lg font-bold text-gray-900">{card.value}</p>
            <p className="mt-2 text-sm leading-6 text-gray-500">{card.note}</p>
          </div>
        ))}
      </div>

      {sessionNotice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {sessionNotice}
        </div>
      ) : null}

      <div className="grid gap-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm md:grid-cols-[1.2fr_0.8fr_0.8fr] md:p-5">
        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2.5 focus-within:ring-2 focus-within:ring-emerald-500">
          <Sparkles className="h-4 w-4 flex-shrink-0 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={labels.search}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as typeof filterType)}
          className="rounded-2xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">{labels.all} {labels.type}</option>
          <option value="baseline">{typeLabels.baseline}</option>
          <option value="check">{typeLabels.check}</option>
          <option value="change">{typeLabels.change}</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="rounded-2xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">{labels.all} {labels.status}</option>
          <option value="completed">{statusLabels.completed}</option>
          <option value="pending">{statusLabels.pending}</option>
          <option value="failed">{statusLabels.failed}</option>
        </select>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">Loading version logs...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
          <ShieldCheck className="mx-auto mb-3 h-12 w-12 text-gray-200" />
          <p className="text-gray-400">{labels.empty}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            {filteredRecords.map(record => {
              const actor = record.actor_user_id ? profiles[record.actor_user_id] : null;
              const detailText = JSON.stringify(record.details || {});
              return (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setSelected(record)}
                  className={`w-full rounded-3xl border p-4 text-left transition hover:border-emerald-200 hover:shadow-sm ${
                    selected?.id === record.id ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-100 bg-white'
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          {typeLabels[record.record_type]}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                          {statusLabels[record.status]}
                        </span>
                        {record.version_label ? (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            {record.version_label}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-gray-900">
                        {record.summary || record.action}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>{record.action}</span>
                        <span>{record.entity_type}{record.entity_id ? ` / ${record.entity_id}` : ''}</span>
                        <span>{record.route || '-'}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDateTime(record.created_at)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          {record.completed_at ? formatDateTime(record.completed_at) : '-'}
                        </span>
                        <span>{actor?.role || 'actor'}: {record.actor_user_id || '-'}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">{detailText === '{}' ? '-' : detailText}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-gray-900">{labels.details}</h2>
              {selected ? (
                <div className="mt-4 space-y-3">
                  <InfoRow label={labels.type} value={typeLabels[selected.record_type]} />
                  <InfoRow label={labels.status} value={statusLabels[selected.status]} />
                  <InfoRow label={labels.currentVersion} value={selected.version_label || APP_BUILD_LABEL} />
                  <InfoRow label={labels.currentCommit} value={selected.commit_sha || APP_COMMIT_SHA} mono />
                  <InfoRow label={labels.entity} value={`${selected.entity_type}${selected.entity_id ? ` / ${selected.entity_id}` : ''}`} />
                  <InfoRow label={labels.createdAt} value={formatDateTime(selected.created_at)} />
                  <InfoRow label={labels.completedAt} value={selected.completed_at ? formatDateTime(selected.completed_at) : '-'} />
                  <InfoRow label="Route" value={selected.route || '-'} />
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-400">JSON</p>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                      {JSON.stringify(selected.details || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-6 text-sm text-gray-500">
                  {labels.empty}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5 text-sm text-emerald-900">
              <p className="font-semibold">{pick('自動記錄規則', 'Automatic logging', '自動記録ルール', '자동 기록 규칙')}</p>
              <p className="mt-2 leading-7 text-emerald-900/80">
                {pick(
                  '所有呼叫 logAdminAction 的後台修改，都會寫入版本與完成時間；超級管理員切換頁面時，也會自動寫入檢查紀錄。',
                  'Every admin change that calls logAdminAction now carries the version label and completion time; superadmin route changes also log a check record automatically.',
                  'logAdminAction を呼ぶ変更はすべてバージョンと完了時刻つきで保存され、管理画面の移動時には自動でチェック記録も残します。',
                  'logAdminAction이 호출된 수정은 모두 버전과 완료 시간과 함께 저장되고, 슈퍼관리자 화면 이동 시 자동으로 점검 기록도 남습니다.'
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className={`mt-1 text-sm font-medium text-gray-900 ${mono ? 'break-all font-mono text-xs' : ''}`}>{value || '-'}</p>
    </div>
  );
}

export default SuperAdminVersionLogs;

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Coins, Database, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDateTime } from '../../lib/utils';
import { logAdminAction } from '../../lib/auditLog';
import PageShell from '../../components/ui/PageShell';
import { useLanguage } from '../../contexts/LanguageContext';

interface PointRewardRule {
  source_type: string;
  label: string;
  points_per_100: number;
  is_active: boolean;
  notes: string;
  updated_at: string;
  created_at: string;
}

const SOURCE_TYPES = ['booking', 'order', 'subscription'];

const SOURCE_LABELS: Record<string, string> = {
  booking: '住宿訂房',
  order: '商品訂單',
  subscription: '訂閱制訂單',
};

const SOURCE_HELP: Record<string, string> = {
  booking: '會員完成住宿訂房付款後，依實付金額換算可獲得的點數。',
  order: '會員完成商城商品付款後，依實付金額換算可獲得的點數。',
  subscription: '會員完成訂閱制扣款後，依每期實付金額換算可獲得的點數。',
};

const DEFAULT_POINTS: Record<string, number> = {
  booking: 10,
  order: 5,
  subscription: 5,
};

const buildFallbackRules = (): PointRewardRule[] =>
  SOURCE_TYPES.map(sourceType => ({
    source_type: sourceType,
    label: SOURCE_LABELS[sourceType],
    points_per_100: DEFAULT_POINTS[sourceType],
    is_active: true,
    notes: '',
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }));

export default function SuperAdminPointRewards() {
  const { t } = useLanguage();
  const [rules, setRules] = useState<PointRewardRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTableMissing(false);

    const { data, error: loadError } = await supabase
      .from('point_reward_rules')
      .select('*')
      .in('source_type', SOURCE_TYPES)
      .order('created_at', { ascending: true });

    if (loadError) {
      const isMissingTable =
        loadError.code === '42P01' ||
        loadError.message.toLowerCase().includes('schema cache') ||
        loadError.message.toLowerCase().includes('could not find the table');

      if (isMissingTable) {
        setTableMissing(true);
        setError('找不到 public.point_reward_rules 資料表，請確認點數獎勵 migration 已完成。');
      } else {
        setError(loadError.message);
      }
      setRules(buildFallbackRules());
    } else {
      const next = SOURCE_TYPES.map(sourceType => {
        const existing = (data || []).find(item => item.source_type === sourceType) as PointRewardRule | undefined;
        return existing || {
          source_type: sourceType,
          label: SOURCE_LABELS[sourceType],
          points_per_100: DEFAULT_POINTS[sourceType],
          is_active: true,
          notes: '',
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
      });
      setRules(next);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const totalEnabled = useMemo(() => rules.filter(rule => rule.is_active).length, [rules]);
  const averagePoints = useMemo(() => {
    if (rules.length === 0) return 0;
    const total = rules.reduce((sum, rule) => sum + Number(rule.points_per_100 || 0), 0);
    return Math.round(total / rules.length);
  }, [rules]);

  const updateRule = (sourceType: string, patch: Partial<PointRewardRule>) => {
    setRules(prev => prev.map(rule => (rule.source_type === sourceType ? { ...rule, ...patch } : rule)));
  };

  const saveRule = async (rule: PointRewardRule) => {
    if (tableMissing) {
      setError('資料表尚未建立，請先套用 point_reward_rules migration 後再儲存。');
      return;
    }

    setSaving(rule.source_type);
    setError(null);

    try {
      const payload = {
        source_type: rule.source_type,
        label: rule.label.trim(),
        points_per_100: Math.max(0, Math.floor(Number(rule.points_per_100 || 0))),
        is_active: Boolean(rule.is_active),
        notes: rule.notes.trim(),
        updated_at: new Date().toISOString(),
      };

      const { error: saveError } = await supabase
        .from('point_reward_rules')
        .upsert(payload, { onConflict: 'source_type' });

      if (saveError) throw saveError;

      await logAdminAction('update_point_reward_rule', 'point_reward_rules', rule.source_type, payload);
      setSaved(prev => new Set([...prev, rule.source_type]));
      setTimeout(() => {
        setSaved(prev => {
          const next = new Set(prev);
          next.delete(rule.source_type);
          return next;
        });
      }, 2500);
      await loadRules();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '儲存點數獎勵規則失敗');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <PageShell
      title={t('points.rewards.title', '點數獎勵')}
      subtitle={t('points.rewards.subtitle', '設定訂房、商品訂單與訂閱制每消費 NT$100 可回饋多少點數。')}
      eyebrow={t('backoffice.superAdmin', '超級管理員')}
      icon={<Award className="h-6 w-6" />}
      actions={[{
        label: t('common.refresh', '重新整理'),
        onClick: () => void loadRules(),
        icon: <RefreshCw className="h-4 w-4" />,
      }]}
      stats={[
        { label: t('points.rewards.enabled', '啟用規則'), value: `${totalEnabled} / ${rules.length}`, icon: <ShieldCheck className="h-5 w-5" /> },
        { label: t('points.rewards.average', '平均回饋'), value: `${averagePoints} ${t('points.unit', '點')} / NT$100`, icon: <Coins className="h-5 w-5" /> },
        { label: t('points.rewards.source', '資料來源'), value: 'point_reward_rules', icon: <Database className="h-5 w-5" /> },
      ]}
      tone="amber"
    >
      <div className="space-y-5">

      {error ? (
        <div className={`rounded-2xl px-4 py-3 text-sm ${tableMissing ? 'border border-amber-200 bg-amber-50 text-amber-800' : 'border border-red-200 bg-red-50 text-red-700'}`}>
          {error}
          {tableMissing ? (
            <p className="mt-1 text-xs leading-5 text-amber-700">
              請確認 `supabase/migrations/20260624170000_add_point_reward_rules.sql` 已套用到目前 Supabase 專案。
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4">
        {rules.map(rule => (
          <motion.div
            key={rule.source_type}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-700" />
                  <h2 className="text-lg font-bold text-gray-900">{rule.label || SOURCE_LABELS[rule.source_type]}</h2>
                </div>
                <p className="mt-1 text-sm text-gray-500">{SOURCE_HELP[rule.source_type]}</p>
              </div>
              <label className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                <input
                  type="checkbox"
                  checked={rule.is_active}
                  onChange={e => updateRule(rule.source_type, { is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-amber-700 focus:ring-amber-600"
                />
                啟用獎勵
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-gray-700">規則名稱</span>
                  <input
                    value={rule.label}
                    onChange={e => updateRule(rule.source_type, { label: e.target.value })}
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-gray-700">備註</span>
                  <textarea
                    value={rule.notes}
                    onChange={e => updateRule(rule.source_type, { notes: e.target.value })}
                    rows={3}
                    placeholder="可填寫回饋規則說明，方便管理員辨識。"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                </label>
              </div>

              <div className="space-y-3 rounded-2xl bg-gray-50 p-4">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-gray-700">每 NT$100 回饋點數</span>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={rule.points_per_100}
                      onChange={e => updateRule(rule.source_type, { points_per_100: Number(e.target.value) })}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-16 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">點</span>
                  </div>
                </label>

                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-600">
                  目前規則：
                  <span className="font-semibold text-gray-900">{Math.max(0, Math.floor(Number(rule.points_per_100 || 0)))}</span>
                  點 / NT$100
                </div>

                <button
                  type="button"
                  onClick={() => void saveRule(rule)}
                  disabled={saving === rule.source_type || tableMissing}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50 ${
                    saved.has(rule.source_type) ? 'bg-emerald-600' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {saving === rule.source_type ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {tableMissing ? '資料表未建立' : saved.has(rule.source_type) ? '已儲存' : '儲存規則'}
                </button>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-400">最後更新：{formatDateTime(rule.updated_at)}</div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-5 text-sm text-gray-600">
        <p className="font-semibold text-gray-900">目前串接位置</p>
        <ul className="mt-2 space-y-1.5">
          <li>住宿訂房完成後：`private.sync_booking_points()`</li>
          <li>商品訂單付款完成後：`newebpay-mpg-webhook`</li>
          <li>訂閱制扣款完成後：`newebpay-period-webhook`</li>
        </ul>
      </div>
      </div>
    </PageShell>
  );
}

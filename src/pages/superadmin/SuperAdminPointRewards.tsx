import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, RefreshCw, Save, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDateTime } from '../../lib/utils';
import { logAdminAction } from '../../lib/auditLog';

interface PointRewardRule {
  source_type: string;
  label: string;
  points_per_100: number;
  is_active: boolean;
  notes: string;
  updated_at: string;
  created_at: string;
}

const SOURCE_LABELS: Record<string, string> = {
  booking: '訂房回饋',
  order: '商城回饋',
  subscription: '定期便回饋',
};

const SOURCE_HELP: Record<string, string> = {
  booking: '影響住宿與訂房完成後的點數贈送。',
  order: '影響一般商品結帳成功後的點數贈送。',
  subscription: '影響咖啡定期便每次扣款成功後的點數贈送。',
};

export default function SuperAdminPointRewards() {
  const [rules, setRules] = useState<PointRewardRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  const buildFallbackRules = (): PointRewardRule[] => [
    {
      source_type: 'booking',
      label: SOURCE_LABELS.booking,
      points_per_100: 10,
      is_active: true,
      notes: '',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      source_type: 'order',
      label: SOURCE_LABELS.order,
      points_per_100: 5,
      is_active: true,
      notes: '',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      source_type: 'subscription',
      label: SOURCE_LABELS.subscription,
      points_per_100: 5,
      is_active: true,
      notes: '',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ];

  const loadRules = async () => {
    setLoading(true);
    setError(null);
    setTableMissing(false);
    const { data, error: loadError } = await supabase
      .from('point_reward_rules')
      .select('*')
      .in('source_type', ['booking', 'order', 'subscription'])
      .order('created_at', { ascending: true });

    if (loadError) {
      const isMissingTable =
        loadError.code === '42P01' ||
        loadError.status === 404 ||
        loadError.message.toLowerCase().includes('schema cache') ||
        loadError.message.toLowerCase().includes('could not find the table');

      if (isMissingTable) {
        setTableMissing(true);
        setError('找不到 public.point_reward_rules，請先套用資料庫 migration。');
        setRules(buildFallbackRules());
      } else {
        setError(loadError.message);
        setRules(buildFallbackRules());
      }
    } else {
      const next = ['booking', 'order', 'subscription'].map(sourceType => {
        const existing = (data || []).find(item => item.source_type === sourceType) as PointRewardRule | undefined;
        return existing || {
          source_type: sourceType,
          label: SOURCE_LABELS[sourceType],
          points_per_100: sourceType === 'booking' ? 10 : 5,
          is_active: true,
          notes: '',
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
      });
      setRules(next);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadRules();
  }, []);

  const totalEnabled = useMemo(() => rules.filter(rule => rule.is_active).length, [rules]);

  const updateRule = (sourceType: string, patch: Partial<PointRewardRule>) => {
    setRules(prev => prev.map(rule => (rule.source_type === sourceType ? { ...rule, ...patch } : rule)));
  };

  const saveRule = async (rule: PointRewardRule) => {
    if (tableMissing) {
      setError('資料表尚未建立，無法儲存。請先同步 point_reward_rules migration。');
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
      setError(saveError instanceof Error ? saveError.message : '儲存失敗');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C09A6A] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="rounded-3xl bg-gradient-to-br from-[#24180d] via-[#3a2817] to-[#8B6840] p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide">
              <ShieldCheck className="h-4 w-4" />
              點數回饋邏輯管理
            </div>
            <h1 className="text-3xl font-bold">後台調整每 100 元回饋點數</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/80">
              訂房、商城、定期便三種來源都會讀這裡的規則。你調整倍率後，新的訂單與扣款就會依最新設定發點數。
            </p>
          </div>
          <button
            type="button"
            onClick={loadRules}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            <RefreshCw className="h-4 w-4" />
            重新載入
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/80">
          <span className="rounded-full bg-white/10 px-3 py-1">啟用中 {totalEnabled} / {rules.length}</span>
          <span className="rounded-full bg-white/10 px-3 py-1">資料表：point_reward_rules</span>
          <span className="rounded-full bg-white/10 px-3 py-1">計算函式：calculate_point_reward_points()</span>
        </div>
      </div>

      {error ? (
        <div className={`rounded-2xl px-4 py-3 text-sm ${tableMissing ? 'border border-amber-200 bg-amber-50 text-amber-800' : 'border border-red-200 bg-red-50 text-red-700'}`}>
          {error}
          {tableMissing ? (
            <p className="mt-1 text-xs leading-5 text-amber-700">
              頁面已先顯示預設規則，但尚未找到資料表，儲存也會失敗。請先把 `supabase/migrations/20260624170000_add_point_reward_rules.sql` 套用到遠端資料庫。
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
            className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-[#8B6840]" />
                  <h2 className="text-lg font-bold text-[#2C1F10]">{rule.label || SOURCE_LABELS[rule.source_type]}</h2>
                </div>
                <p className="mt-1 text-sm text-gray-500">{SOURCE_HELP[rule.source_type]}</p>
              </div>
              <label className="inline-flex items-center gap-2 rounded-full bg-[#fcf8f0] px-3 py-2 text-sm font-medium text-[#8B6840]">
                <input
                  type="checkbox"
                  checked={rule.is_active}
                  onChange={e => updateRule(rule.source_type, { is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-[#8B6840] focus:ring-[#8B6840]"
                />
                啟用回饋
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-gray-700">規則名稱</span>
                  <input
                    value={rule.label}
                    onChange={e => updateRule(rule.source_type, { label: e.target.value })}
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#8B6840] focus:ring-2 focus:ring-[#8B6840]/20"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-gray-700">備註</span>
                  <textarea
                    value={rule.notes}
                    onChange={e => updateRule(rule.source_type, { notes: e.target.value })}
                    rows={3}
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#8B6840] focus:ring-2 focus:ring-[#8B6840]/20"
                  />
                </label>
              </div>

              <div className="space-y-3 rounded-2xl bg-[#fcf8f0] p-4">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-gray-700">每 100 元回饋</span>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={rule.points_per_100}
                      onChange={e => updateRule(rule.source_type, { points_per_100: Number(e.target.value) })}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-16 text-sm outline-none transition focus:border-[#8B6840] focus:ring-2 focus:ring-[#8B6840]/20"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">點</span>
                  </div>
                </label>

                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-600">
                  目前換算：<span className="font-semibold text-[#2C1F10]">{Math.max(0, Math.floor(Number(rule.points_per_100 || 0)))}</span> 點 / 100 元
                </div>

                <button
                  type="button"
                  onClick={() => void saveRule(rule)}
                  disabled={saving === rule.source_type || tableMissing}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50 ${
                    saved.has(rule.source_type) ? 'bg-emerald-600' : 'bg-[#8B6840] hover:bg-[#6f5231]'
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

            <div className="mt-4 text-xs text-gray-400">
              最後更新：{formatDateTime(rule.updated_at)}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-[#eadfce] bg-white p-5 text-sm text-gray-600">
        <p className="font-semibold text-[#2C1F10]">實際套用位置</p>
        <ul className="mt-2 space-y-1.5">
          <li>訂房完成後：`private.sync_booking_points()`</li>
          <li>一般商品付款成功：`newebpay-mpg-webhook`</li>
          <li>咖啡定期便每月扣款成功：`newebpay-period-webhook`</li>
        </ul>
      </div>
    </div>
  );
}


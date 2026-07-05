import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BarChart3, Clock, MessageSquare, RefreshCw, TrendingUp } from 'lucide-react';
import { isMissingSupabaseTableError, supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

type UsageStat = {
  id: string;
  date: string;
  total_requests: number;
  total_tokens: number;
  avg_response_time: number;
};

type ChatLog = {
  id: string;
  message: string;
  tokens_used: number;
  created_at: string;
};

type LearningLog = {
  id: string;
  question: string;
  confidence_score: number;
  knowledge_id: string | null;
  created_at: string;
};

const TOKEN_COST_PER_1K_TWD = 0.03;

const formatNumber = (value: number) => new Intl.NumberFormat('zh-TW').format(Math.round(value));
const formatMoney = (value: number) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 2 }).format(value);
const toDayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);

export default function AIAnalytics() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStat[]>([]);
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [learningLogs, setLearningLogs] = useState<LearningLog[]>([]);
  const [days, setDays] = useState(30);

  useEffect(() => {
    void loadData();
  }, [days]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days + 1);
    const fromDateKey = fromDate.toISOString().slice(0, 10);

    try {
      const [usageRes, chatRes, learningRes] = await Promise.all([
        supabase.from('ai_usage_stats').select('*').gte('date', fromDateKey).order('date', { ascending: true }),
        supabase.from('ai_chat_logs').select('id, message, tokens_used, created_at').gte('created_at', `${fromDateKey}T00:00:00Z`).order('created_at', { ascending: false }).limit(1000),
        supabase.from('ai_learning_logs').select('id, question, confidence_score, knowledge_id, created_at').gte('created_at', `${fromDateKey}T00:00:00Z`).order('created_at', { ascending: false }).limit(1000),
      ]);

      if (usageRes.error && !isMissingSupabaseTableError(usageRes.error)) throw usageRes.error;
      if (chatRes.error && !isMissingSupabaseTableError(chatRes.error)) throw chatRes.error;
      if (learningRes.error && !isMissingSupabaseTableError(learningRes.error)) throw learningRes.error;

      setUsageStats((usageRes.data || []) as UsageStat[]);
      setChatLogs((chatRes.data || []) as ChatLog[]);
      setLearningLogs((learningRes.data || []) as LearningLog[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai_analytics.error_generic', 'AI 分析資料載入失敗。'));
    } finally {
      setLoading(false);
    }
  };

  const dailySeries = useMemo(() => {
    const byDay = new Map<string, { requests: number; tokens: number; responseTotal: number; responseCount: number }>();

    usageStats.forEach((item) => {
      byDay.set(item.date, {
        requests: Number(item.total_requests || 0),
        tokens: Number(item.total_tokens || 0),
        responseTotal: Number(item.avg_response_time || 0),
        responseCount: Number(item.total_requests || 0) > 0 ? 1 : 0,
      });
    });

    if (usageStats.length === 0) {
      chatLogs.forEach((log) => {
        const day = toDayKey(log.created_at);
        const prev = byDay.get(day) || { requests: 0, tokens: 0, responseTotal: 0, responseCount: 0 };
        prev.requests += 1;
        prev.tokens += Number(log.tokens_used || 0);
        byDay.set(day, prev);
      });
    }

    return Array.from(byDay.entries())
      .map(([date, value]) => ({
        date,
        requests: value.requests,
        tokens: value.tokens,
        avgResponseTime: value.responseCount > 0 ? value.responseTotal / value.responseCount : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-days);
  }, [usageStats, chatLogs, days]);

  const summary = useMemo(() => {
    const totalRequests = dailySeries.reduce((sum, item) => sum + item.requests, 0);
    const totalTokens = dailySeries.reduce((sum, item) => sum + item.tokens, 0);
    const avgResponseTime = dailySeries.length > 0 ? dailySeries.reduce((sum, item) => sum + item.avgResponseTime, 0) / dailySeries.length : 0;
    const matched = learningLogs.filter((item) => item.knowledge_id).length;
    const accuracy = learningLogs.length > 0 ? (matched / learningLogs.length) * 100 : 0;
    const estimatedCost = (totalTokens / 1000) * TOKEN_COST_PER_1K_TWD;
    return { totalRequests, totalTokens, avgResponseTime, accuracy, estimatedCost };
  }, [dailySeries, learningLogs]);

  const topQuestions = useMemo(() => {
    const map = new Map<string, number>();
    learningLogs.forEach((log) => {
      const key = (log.question || '').trim();
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([question, count]) => ({ question, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [learningLogs]);

  const maxRequest = Math.max(1, ...dailySeries.map((item) => item.requests));

  const cards = [
    { label: t('ai_analytics.requests', '總請求數'), value: formatNumber(summary.totalRequests), icon: MessageSquare, color: 'bg-blue-500' },
    { label: t('ai_analytics.response_time', '平均回應時間'), value: `${summary.avgResponseTime.toFixed(2)}s`, icon: Clock, color: 'bg-green-500' },
    { label: t('ai_analytics.tokens', 'Token 使用量'), value: formatNumber(summary.totalTokens), icon: BarChart3, color: 'bg-orange-500' },
    { label: t('ai_analytics.cost', '估算成本'), value: formatMoney(summary.estimatedCost), icon: TrendingUp, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('ai_analytics.title', 'AI 數據分析')}</h1>
          <p className="mt-2 text-slate-600">{t('ai_analytics.subtitle', '查看對話量、Token、回應速度與成本趨勢。')}</p>
        </div>

        <div className="flex items-center gap-2">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value={7}>{t('ai_analytics.last_7_days', '最近 7 天')}</option>
            <option value={30}>{t('ai_analytics.last_30_days', '最近 30 天')}</option>
            <option value={90}>{t('ai_analytics.last_90_days', '最近 90 天')}</option>
          </select>
          <button onClick={() => void loadData()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh', '重新整理')}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4" />
            {t('ai_analytics.error_title', '資料載入失敗')}
          </div>
          <p className="mt-1">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-xs text-slate-500">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? '-' : card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-3">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">{t('ai_analytics.chart_title', '每日趨勢')}</h3>
          {dailySeries.length === 0 ? (
            <p className="text-sm text-slate-500">{t('ai_analytics.empty_chart', '目前沒有可用的 AI 分析資料。')}</p>
          ) : (
            <div className="flex h-64 items-end gap-2">
              {dailySeries.map((day) => (
                <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-t-md bg-slate-900/90" style={{ height: `${Math.max(6, (day.requests / maxRequest) * 100)}%` }} />
                  <div className="text-[10px] text-slate-500">{day.date.slice(5)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">{t('ai_analytics.top_questions', '熱門問題')}</h3>
          {topQuestions.length === 0 ? (
            <p className="text-sm text-slate-500">{t('ai_analytics.empty_questions', '目前沒有熱門問題。')}</p>
          ) : (
            <div className="space-y-3">
              {topQuestions.map((item) => (
                <div key={item.question} className="rounded-lg bg-slate-50 p-3">
                  <p className="line-clamp-2 text-sm text-slate-800">{item.question}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t('ai_analytics.count', '出現次數')} {item.count}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-lg font-semibold text-slate-900">{t('ai_analytics.summary_title', '模型概況')}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{t('ai_analytics.accuracy', '匹配率')}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{loading ? '-' : `${summary.accuracy.toFixed(1)}%`}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{t('ai_analytics.training_logs', '訓練紀錄')}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{formatNumber(learningLogs.length)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{t('ai_analytics.data_source', '資料來源')}</p>
            <p className="mt-1 text-sm text-slate-700">
              {usageStats.length > 0 ? 'ai_usage_stats + ai_learning_logs' : 'ai_chat_logs + ai_learning_logs'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

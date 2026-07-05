import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { AlertCircle, Brain, MessageSquare, RefreshCw, Search, ThumbsDown, ThumbsUp, Wand2 } from 'lucide-react';
import { isMissingSupabaseTableError, supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

interface LearningLog {
  id: string;
  question: string;
  answer: string;
  knowledge_id: string | null;
  confidence_score: number;
  was_helpful: boolean | null;
  created_at: string;
}

interface KnowledgeBase {
  id: string;
  question: string;
  answer: string;
}

interface KnowledgeCategory {
  id: string;
  name: string;
}

type ConfidenceFilter = 'all' | 'low' | 'medium' | 'high' | 'unmatched';

const getConfidenceBucket = (score: number) => {
  if (score >= 30) return 'high';
  if (score >= 15) return 'medium';
  return 'low';
};

const getConfidenceStyle = (score: number) => {
  if (score >= 30) return 'bg-emerald-100 text-emerald-700';
  if (score >= 15) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
};

const formatDateTime = (value: string) => new Date(value).toLocaleString('zh-TW');

export default function AITraining() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<LearningLog[]>([]);
  const [knowledge, setKnowledge] = useState<Record<string, KnowledgeBase>>({});
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ConfidenceFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [days, setDays] = useState(30);

  useEffect(() => {
    void loadData();
  }, [days]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days + 1);
      const fromIso = fromDate.toISOString();

      const [logsRes, knowledgeRes, categoriesRes] = await Promise.all([
        supabase.from('ai_learning_logs').select('*').gte('created_at', fromIso).order('created_at', { ascending: false }).limit(500),
        supabase.from('knowledge_base').select('id, question, answer'),
        supabase.from('knowledge_categories').select('id, name').eq('is_active', true).order('name'),
      ]);

      if (logsRes.error && !isMissingSupabaseTableError(logsRes.error)) throw logsRes.error;
      if (knowledgeRes.error && !isMissingSupabaseTableError(knowledgeRes.error)) throw knowledgeRes.error;
      if (categoriesRes.error && !isMissingSupabaseTableError(categoriesRes.error)) throw categoriesRes.error;

      const knowledgeMap: Record<string, KnowledgeBase> = {};
      (knowledgeRes.data || []).forEach((item) => {
        knowledgeMap[item.id] = item;
      });

      setLogs((logsRes.data || []) as LearningLog[]);
      setKnowledge(knowledgeMap);
      setCategories((categoriesRes.data || []) as KnowledgeCategory[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai_training.error_generic', 'AI 訓練資料載入失敗。'));
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return logs.filter((log) => {
      const bucket = getConfidenceBucket(Number(log.confidence_score || 0));
      const matchedConfidence = filter === 'all' || (filter === 'unmatched' ? !log.knowledge_id : bucket === filter);
      const matchedSearch =
        q.length === 0 ||
        log.question.toLowerCase().includes(q) ||
        log.answer.toLowerCase().includes(q) ||
        (log.knowledge_id && knowledge[log.knowledge_id]?.question.toLowerCase().includes(q));
      return matchedConfidence && matchedSearch;
    });
  }, [logs, searchTerm, filter, knowledge]);

  const stats = useMemo(() => {
    const totalQueries = logs.length;
    const avgConfidence = logs.length > 0 ? logs.reduce((sum, log) => sum + Number(log.confidence_score || 0), 0) / logs.length : 0;
    const matchedQueries = logs.filter((log) => log.knowledge_id !== null).length;
    const unmatchedQueries = totalQueries - matchedQueries;
    const helpfulCount = logs.filter((log) => log.was_helpful === true).length;
    const feedbackCount = logs.filter((log) => log.was_helpful !== null).length;
    const helpfulRate = feedbackCount > 0 ? (helpfulCount / feedbackCount) * 100 : 0;
    return { totalQueries, avgConfidence, matchedQueries, unmatchedQueries, helpfulRate };
  }, [logs]);

  const unmatchedTop = useMemo(() => {
    const map = new Map<string, { question: string; count: number; latestAt: string }>();
    logs
      .filter((log) => !log.knowledge_id)
      .forEach((log) => {
        const key = log.question.trim();
        if (!key) return;
        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
          if (new Date(log.created_at).getTime() > new Date(existing.latestAt).getTime()) {
            existing.latestAt = log.created_at;
          }
        } else {
          map.set(key, { question: key, count: 1, latestAt: log.created_at });
        }
      });

    return Array.from(map.values())
      .sort((a, b) => (b.count === a.count ? new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime() : b.count - a.count))
      .slice(0, 10);
  }, [logs]);

  const addToKnowledgeBase = async (question: string) => {
    const fallbackCategory = categories[0]?.id;
    if (!fallbackCategory) {
      alert(t('ai_training.no_category', '目前沒有可用的知識分類，請先建立分類。'));
      return;
    }

    setSyncing(true);
    try {
      const { error: insertError } = await supabase.from('knowledge_base').insert({
        category_id: fallbackCategory,
        question,
        answer: t('ai_training.default_answer', '請先參考客服知識庫內容。'),
        keywords: ['ai_learning', 'unmatched'],
        priority: 20,
        is_active: true,
      });
      if (insertError) throw insertError;
      alert(t('ai_training.added', '已加入知識庫。'));
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('ai_training.add_failed', '新增到知識庫失敗。'));
    } finally {
      setSyncing(false);
    }
  };

  const filterCounts = {
    all: logs.length,
    high: logs.filter((l) => getConfidenceBucket(Number(l.confidence_score || 0)) === 'high').length,
    medium: logs.filter((l) => getConfidenceBucket(Number(l.confidence_score || 0)) === 'medium').length,
    low: logs.filter((l) => getConfidenceBucket(Number(l.confidence_score || 0)) === 'low').length,
    unmatched: logs.filter((l) => !l.knowledge_id).length,
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('ai_training.title', 'AI 訓練分析')}</h1>
          <p className="mt-2 text-slate-600">{t('ai_training.subtitle', '查看問答學習紀錄，協助補強知識庫內容。')}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value={7}>{t('ai_training.last_7_days', '最近 7 天')}</option>
            <option value={30}>{t('ai_training.last_30_days', '最近 30 天')}</option>
            <option value={90}>{t('ai_training.last_90_days', '最近 90 天')}</option>
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
            {t('ai_training.error_title', '資料載入失敗')}
          </div>
          <p className="mt-1">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <MetricCard title={t('ai_training.metric_total', '總問題數')} value={stats.totalQueries} icon={MessageSquare} tone="bg-blue-100 text-blue-600" />
        <MetricCard title={t('ai_training.metric_matched', '已匹配')} value={stats.matchedQueries} icon={ThumbsUp} tone="bg-emerald-100 text-emerald-600" />
        <MetricCard title={t('ai_training.metric_unmatched', '未匹配')} value={stats.unmatchedQueries} icon={ThumbsDown} tone="bg-rose-100 text-rose-600" />
        <MetricCard title={t('ai_training.metric_confidence', '平均信心')} value={`${stats.avgConfidence.toFixed(1)}%`} icon={Brain} tone="bg-amber-100 text-amber-600" />
        <MetricCard title={t('ai_training.metric_helpful', '有用率')} value={`${stats.helpfulRate.toFixed(1)}%`} icon={Wand2} tone="bg-violet-100 text-violet-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-3">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('ai_training.search_placeholder', '搜尋問題 / 回答 / 知識庫')}
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-slate-900 focus:outline-none"
              />
            </div>
            {(['all', 'high', 'medium', 'low', 'unmatched'] as ConfidenceFilter[]).map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-lg px-3 py-2 text-xs ${filter === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {key === 'all'
                  ? t('ai_training.filter_all', '全部')
                  : key === 'high'
                    ? t('ai_training.filter_high', '高信心')
                    : key === 'medium'
                      ? t('ai_training.filter_medium', '中信心')
                      : key === 'low'
                        ? t('ai_training.filter_low', '低信心')
                        : t('ai_training.filter_unmatched', '未匹配')}{' '}
                ({filterCounts[key]})
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500">{t('ai_training.loading', '載入中...')}</p>
            ) : filteredLogs.length === 0 ? (
              <p className="text-sm text-slate-500">{t('ai_training.empty_logs', '目前沒有符合條件的學習紀錄。')}</p>
            ) : (
              filteredLogs.slice(0, 80).map((log) => (
                <article key={log.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${getConfidenceStyle(Number(log.confidence_score || 0))}`}>
                      {t('ai_training.confidence_label', '信心')} {Number(log.confidence_score || 0).toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-500">{formatDateTime(log.created_at)}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{log.question}</p>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-600">{log.answer}</p>
                  {log.knowledge_id && knowledge[log.knowledge_id] ? (
                    <div className="mt-2 rounded bg-blue-50 px-3 py-2 text-xs text-blue-700">
                      {t('ai_training.matched_to', '對應知識：')}
                      {knowledge[log.knowledge_id].question}
                    </div>
                  ) : (
                    <div className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-700">{t('ai_training.unmatched', '尚未匹配到知識庫')}</div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">{t('ai_training.top_unmatched', '高頻未匹配問題')}</h3>
          <div className="space-y-3">
            {unmatchedTop.length === 0 ? (
              <p className="text-sm text-slate-500">{t('ai_training.no_unmatched', '目前沒有未匹配問題。')}</p>
            ) : (
              unmatchedTop.map((item) => (
                <div key={item.question} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-900">{item.question}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">{t('ai_training.count', '出現次數')} {item.count}</p>
                    <button
                      disabled={syncing}
                      onClick={() => void addToKnowledgeBase(item.question)}
                      className="rounded bg-slate-900 px-2 py-1 text-xs text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {t('ai_training.add_to_kb', '加入知識庫')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className={`rounded-lg p-2 ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs text-slate-500">{title}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

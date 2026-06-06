import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, BookMarked, CheckCircle, Clock, Loader2, MapPin, RefreshCw, Sparkles, Trash2, Users } from 'lucide-react';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { callAI } from '../../lib/openai';
import { supabase } from '../../lib/supabase';

type Locale = 'zh-TW' | 'en' | 'ja' | 'ko';
type BudgetKey = 'budget' | 'standard' | 'luxury';
type InterestKey = 'food' | 'culture' | 'shopping' | 'nature' | 'adventure' | 'family' | 'art' | 'nightlife';

type Activity = { time: string; title: string; description: string };
type DayPlan = { day: number; date: string; theme: string; activities: Activity[]; dining: string; tip: string };
type AiItineraryResult = { intro?: string; days?: DayPlan[] };
type SavedPlan = {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  plan_data?: {
    itinerary?: DayPlan[];
    budget?: BudgetKey;
    interests?: InterestKey[];
    requiredPlaces?: string[];
    groupSize?: number;
    sourcePlanTitle?: string;
  };
};

const STORAGE_KEY = 'nestobi_itinerary_plans_fallback';
const BUDGETS: BudgetKey[] = ['budget', 'standard', 'luxury'];
const INTERESTS: InterestKey[] = ['food', 'culture', 'shopping', 'nature', 'adventure', 'family', 'art', 'nightlife'];

const readLocalPlans = (userId: string): SavedPlan[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, SavedPlan[]>;
    return all[userId] || [];
  } catch {
    return [];
  }
};

const writeLocalPlans = (userId: string, plans: SavedPlan[]) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, SavedPlan[]>) : {};
    all[userId] = plans;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Local fallback is best-effort only.
  }
};

export default function ItineraryPlanner() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang) as Locale;
  const dateLocale = pickByLang(locale, 'zh-TW', 'en-US', 'ja-JP', 'ko-KR');
  const t = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);

  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupSize, setGroupSize] = useState(2);
  const [budget, setBudget] = useState<BudgetKey>('standard');
  const [interests, setInterests] = useState<InterestKey[]>([]);
  const [requiredPlacesInput, setRequiredPlacesInput] = useState('');
  const [itinerary, setItinerary] = useState<DayPlan[] | null>(null);
  const [currentSourceTitle, setCurrentSourceTitle] = useState('');
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const days = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return Math.max(1, Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
  }, [startDate, endDate]);

  const requiredPlaces = useMemo(
    () =>
      requiredPlacesInput
        .split(/[\n,，、]/)
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, 20),
    [requiredPlacesInput],
  );

  useEffect(() => {
    const loadPlans = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('itinerary_plans')
        .select('id,title,destination,start_date,end_date,plan_data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        setUseLocalFallback(true);
        setPlans(readLocalPlans(user.id));
        return;
      }

      setUseLocalFallback(false);
      setPlans((data as SavedPlan[]) || []);
    };

    void loadPlans();
  }, [user]);

  const budgetLabel = (value: BudgetKey) => {
    if (value === 'budget') return t('精省', 'Budget', '節約', '실속');
    if (value === 'luxury') return t('奢華', 'Luxury', 'ラグジュアリー', '럭셔리');
    return t('標準', 'Standard', '標準', '표준');
  };

  const interestLabel = (key: InterestKey) => {
    switch (key) {
      case 'food':
        return t('美食', 'Food', 'グルメ', '맛집');
      case 'culture':
        return t('文化', 'Culture', '文化', '문화');
      case 'shopping':
        return t('購物', 'Shopping', 'ショッピング', '쇼핑');
      case 'nature':
        return t('自然', 'Nature', '自然', '자연');
      case 'adventure':
        return t('冒險', 'Adventure', '冒険', '모험');
      case 'family':
        return t('親子', 'Family', 'ファミリー', '가족');
      case 'art':
        return t('藝術', 'Art', 'アート', '예술');
      case 'nightlife':
        return t('夜生活', 'Nightlife', 'ナイトライフ', '나이트라이프');
    }
  };

  const generateFallbackPlan = (): DayPlan[] => {
    const start = startDate ? new Date(startDate) : new Date();
    const dayCount = days || 1;

    return Array.from({ length: dayCount }, (_, index) => {
      const current = new Date(start);
      current.setDate(start.getDate() + index);
      const required = requiredPlaces[index % Math.max(1, requiredPlaces.length)];

      return {
        day: index + 1,
        date: current.toLocaleDateString(dateLocale, { month: 'numeric', day: 'numeric', weekday: 'short' }),
        theme: t(`第 ${index + 1} 天行程`, `Day ${index + 1} Plan`, `${index + 1}日目の旅程`, `${index + 1}일차 일정`),
        activities: [
          {
            time: '09:00',
            title: required || t('在地散策', 'Local Walk', 'ローカル散策', '현지 산책'),
            description: required
              ? t(`優先安排 ${required}，並預留交通與拍照時間。`, `Prioritize ${required}, with transit and photo time included.`, `${required}を優先し、移動と撮影時間も確保します。`, `${required}을 우선 배치하고 이동과 사진 시간을 확보합니다.`)
              : t('探索在地街區與代表景點。', 'Explore local neighborhoods and signature spots.', '地域の街並みと代表スポットを巡ります。', '현지 동네와 대표 명소를 둘러봅니다.'),
          },
          {
            time: '14:00',
            title: t('特色體驗', 'Signature Experience', '特色体験', '대표 체험'),
            description: t('安排一段符合興趣的體驗，避免行程過滿。', 'Add one interest-matched experience without overpacking the day.', '興味に合う体験を入れつつ、詰め込みすぎを避けます。', '관심사에 맞는 체험을 넣되 일정을 과하게 채우지 않습니다.'),
          },
        ],
        dining: t('餐飲建議：選擇動線附近的在地特色餐廳。', 'Dining pick: choose a local restaurant near the route.', '食事提案：動線近くの地域らしい店を選びます。', '식사 제안: 동선 근처의 현지 식당을 선택하세요.'),
        tip: t('提醒：熱門景點與餐廳建議提早預約。', 'Tip: reserve popular spots and restaurants early.', 'ヒント：人気スポットやレストランは早めに予約しましょう。', '팁: 인기 명소와 식당은 미리 예약하세요.'),
      };
    });
  };

  const normalizeAIPlan = (result: AiItineraryResult): DayPlan[] => {
    const aiDays = Array.isArray(result.days) ? result.days : [];
    const fallbackDates = generateFallbackPlan();
    if (!aiDays.length) throw new Error(t('AI 沒有回傳有效行程，請再試一次。', 'AI did not return a valid itinerary. Please try again.', 'AIが有効な旅程を返しませんでした。もう一度お試しください。', 'AI가 유효한 일정을 반환하지 않았습니다. 다시 시도해주세요.'));

    return aiDays.slice(0, days || aiDays.length).map((day, index) => {
      const fallback = fallbackDates[index] || fallbackDates[0];
      const activities = Array.isArray(day.activities) && day.activities.length ? day.activities : fallback.activities;
      return {
        day: Number(day.day) || index + 1,
        date: day.date || fallback.date,
        theme: day.theme || fallback.theme,
        activities: activities.slice(0, 6).map((activity, activityIndex) => ({
          time: activity.time || `${9 + activityIndex * 2}:00`,
          title: activity.title || fallback.activities[0]?.title || '',
          description: activity.description || fallback.activities[0]?.description || '',
        })),
        dining: day.dining || fallback.dining,
        tip: day.tip || fallback.tip,
      };
    });
  };

  const saveCurrentPlan = async (options: { silent?: boolean } = {}) => {
    if (!user || !itinerary) return null;

    const title = `${destination || t('我的旅程', 'My Trip', 'マイトリップ', '내 여행')} ${t('行程', 'Plan', 'プラン', '일정')}`;
    const planData = { itinerary, budget, interests, requiredPlaces, groupSize, sourcePlanTitle: currentSourceTitle };
    const payload = {
      user_id: user.id,
      title,
      destination,
      start_date: startDate,
      end_date: endDate,
      plan_data: planData,
    };

    if (useLocalFallback) {
      const savedPlan: SavedPlan = {
        id: `local-${Date.now()}`,
        title,
        destination,
        start_date: startDate,
        end_date: endDate,
        plan_data: planData,
      };
      const next = [savedPlan, ...plans].slice(0, 10);
      setPlans(next);
      writeLocalPlans(user.id, next);
      if (!options.silent) setMessage({ type: 'success', text: t('行程已保留。', 'Plan saved.', '旅程を保存しました。', '일정을 저장했습니다.') });
      return savedPlan;
    }

    const { data, error } = await supabase
      .from('itinerary_plans')
      .insert(payload)
      .select('id,title,destination,start_date,end_date,plan_data')
      .single();

    if (error) {
      if (!options.silent) setMessage({ type: 'error', text: error.message });
      return null;
    }

    if (data) setPlans(prev => [data as SavedPlan, ...prev].slice(0, 10));
    if (!options.silent) setMessage({ type: 'success', text: t('行程已保留。', 'Plan saved.', '旅程を保存しました。', '일정을 저장했습니다.') });
    return (data as SavedPlan) || null;
  };

  const generateItinerary = async (options: { preserveCurrent?: boolean } = {}) => {
    if (!startDate || !endDate || generating) return;
    setGenerating(true);
    setMessage(null);

    try {
      let preservedCurrent = false;
      if (options.preserveCurrent && itinerary) {
        const saved = await saveCurrentPlan({ silent: true });
        preservedCurrent = Boolean(saved);
      }

      const result = await callAI<AiItineraryResult>('itinerary', {
        destination,
        startDate,
        endDate,
        days: days || 1,
        groupSize,
        budget,
        interests,
        requiredPlaces,
        previousPlan: itinerary,
        sourcePlanTitle: currentSourceTitle,
        language: locale,
      });

      setItinerary(normalizeAIPlan(result));
      setCurrentSourceTitle('');
      setMessage({
        type: 'success',
        text: options.preserveCurrent && preservedCurrent
          ? t('已保留目前版本，並重新產生新行程。', 'Current version saved and a new plan was generated.', '現在の版を保存し、新しい旅程を生成しました。', '현재 버전을 저장하고 새 일정을 생성했습니다.')
          : options.preserveCurrent
            ? t('已重新產生新行程，但目前版本未成功儲存。', 'A new plan was generated, but the current version was not saved.', '新しい旅程を生成しましたが、現在の版は保存できませんでした。', '새 일정을 생성했지만 현재 버전은 저장되지 않았습니다.')
          : t('AI 已產生較完整的行程。', 'AI generated a stronger itinerary.', 'AIがより充実した旅程を作成しました。', 'AI가 더 완성도 높은 일정을 생성했습니다.'),
      });
    } catch (error) {
      setItinerary(generateFallbackPlan());
      setMessage({
        type: 'error',
        text: error instanceof Error
          ? error.message
          : t('AI 暫時無法產生行程，已先顯示基本草稿。', 'AI could not generate now, so a basic draft is shown.', 'AIが一時的に旅程を作成できないため、基本案を表示します。', 'AI가 일시적으로 일정을 생성하지 못해 기본 초안을 표시합니다.'),
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault();
    await generateItinerary();
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    await saveCurrentPlan();
    setSaving(false);
  };

  const loadPlanForReplanning = (plan: SavedPlan) => {
    setDestination(plan.destination || '');
    setStartDate(plan.start_date || '');
    setEndDate(plan.end_date || '');
    setBudget(plan.plan_data?.budget || 'standard');
    setInterests(plan.plan_data?.interests || []);
    setGroupSize(plan.plan_data?.groupSize || 2);
    setRequiredPlacesInput((plan.plan_data?.requiredPlaces || []).join('\n'));
    setItinerary(plan.plan_data?.itinerary || null);
    setCurrentSourceTitle(plan.title);
    setExpandedId(plan.id);
    setMessage({ type: 'success', text: t('已載入舊行程，可調整必去項目後重新規劃。', 'Saved plan loaded. Adjust must-visit items and regenerate.', '保存済み旅程を読み込みました。必須スポットを調整して再生成できます。', '저장된 일정을 불러왔습니다. 꼭 갈 곳을 조정한 뒤 다시 생성할 수 있습니다.') });
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    if (useLocalFallback || id.startsWith('local-')) {
      const next = plans.filter(plan => plan.id !== id);
      setPlans(next);
      writeLocalPlans(user.id, next);
      return;
    }

    await supabase.from('itinerary_plans').delete().eq('id', id);
    setPlans(prev => prev.filter(plan => plan.id !== id));
  };

  const itineraryRequiredSummary = requiredPlaces.length
    ? requiredPlaces.join(' / ')
    : t('未指定', 'Not specified', '未指定', '지정 안 함');

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title={t('AI 行程規劃', 'AI Itinerary Planner', 'AI旅程プランナー', 'AI 일정 플래너')}
        description={t(
          '依照目的地、偏好與必去景點，產生可保留並重新規劃的旅遊行程。',
          'Create saved, regeneratable itineraries from your destination, preferences, and must-visit places.',
          '目的地、好み、必須スポットから、保存して再生成できる旅程を作成します。',
          '목적지, 취향, 꼭 갈 곳을 바탕으로 저장하고 다시 생성할 수 있는 여행 일정을 만듭니다.',
        )}
      />
      <Navigation />

      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">{t('AI 行程規劃', 'AI Itinerary Planner', 'AI旅程プランナー', 'AI 일정 플래너')}</h1>
          <p className="mt-1.5 text-gray-500">
            {t(
              '先指定日期、偏好與必去行程；產出後可保留目前版本，再重新規劃下一版。',
              'Set dates, preferences, and must-visit items; save a version before regenerating the next one.',
              '日程、好み、必須スポットを指定し、生成後は保存してから次の版を再生成できます。',
              '날짜, 취향, 꼭 갈 곳을 지정하고 생성 후 현재 버전을 저장한 뒤 다음 버전을 다시 만들 수 있습니다.',
            )}
          </p>
        </div>

        {message && (
          <div className={`mb-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                <MapPin className="h-5 w-5 text-sky-600" />
                {t('行程設定', 'Settings', '設定', '설정')}
              </h2>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('目的地', 'Destination', '目的地', '목적지')}</label>
                  <input
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    placeholder={t('例：沖繩、東京、台南', 'e.g. Okinawa, Tokyo, Tainan', '例：沖縄、東京、台南', '예: 오키나와, 도쿄, 타이난')}
                    className="w-full rounded-xl border px-4 py-2.5 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('開始日期', 'Start date', '開始日', '시작일')}</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('結束日期', 'End date', '終了日', '종료일')}</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm" />
                  </div>
                </div>

                {days > 0 && (
                  <div className="rounded-lg bg-sky-50 py-1.5 text-center text-sm font-medium text-sky-700">
                    {days} {t('天', 'days', '日', '일')}
                  </div>
                )}

                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-gray-700">
                    <Users className="h-3.5 w-3.5" />
                    {t('同行人數', 'Group size', '人数', '인원')}
                  </label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setGroupSize(s => Math.max(1, s - 1))} className="h-8 w-8 rounded-full bg-gray-100">
                      -
                    </button>
                    <span className="w-6 text-center text-lg font-semibold">{groupSize}</span>
                    <button type="button" onClick={() => setGroupSize(s => Math.min(20, s + 1))} className="h-8 w-8 rounded-full bg-gray-100">
                      +
                    </button>
                    <span className="text-sm text-gray-500">{t('人', 'people', '人', '명')}</span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">{t('預算', 'Budget', '予算', '예산')}</label>
                  <div className="flex gap-2">
                    {BUDGETS.map(value => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setBudget(value)}
                        className={`flex-1 rounded-xl border py-2 text-xs ${
                          budget === value ? 'border-sky-600 bg-sky-600 text-white' : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {budgetLabel(value)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {t('興趣偏好（可複選）', 'Interests (multi-select)', '興味（複数選択可）', '관심사(복수 선택)')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map(value => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setInterests(prev => (prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]))
                        }
                        className={`rounded-full border px-2.5 py-1 text-xs ${
                          interests.includes(value) ? 'border-sky-600 bg-sky-600 text-white' : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {interestLabel(value)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('指定必去行程', 'Must-visit items', '必須スポット', '꼭 갈 곳')}</label>
                  <textarea
                    value={requiredPlacesInput}
                    onChange={e => setRequiredPlacesInput(e.target.value)}
                    rows={4}
                    placeholder={t('每行一個，例如：首里城、GLITCH COFFEE、國際通', 'One per line, e.g. Shuri Castle, GLITCH COFFEE, Kokusai Street', '1行に1つ。例：首里城、GLITCH COFFEE、国際通り', '한 줄에 하나씩: 슈리성, GLITCH COFFEE, 국제거리')}
                    className="w-full resize-none rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {t('AI 會盡量把這些點排入每日動線。', 'AI will try to include these places in the route.', 'AIがこれらの場所を行程に組み込みます。', 'AI가 이 장소들을 일정 동선에 포함하려고 합니다.')}
                  </p>
                </div>

                {currentSourceTitle && (
                  <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {t('目前以已儲存行程重新規劃：', 'Replanning from saved plan: ', '保存済み旅程から再生成：', '저장된 일정에서 다시 생성: ')}
                    {currentSourceTitle}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={generating || !startDate || !endDate}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                  {itinerary ? t('重新規劃', 'Regenerate plan', '再生成', '다시 생성') : t('行程生成', 'Generate plan', '旅程生成', '일정 생성')}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-3">
            {itinerary && (
              <div className="rounded-2xl border bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{destination || t('新行程', 'New itinerary', '新しい旅程', '새 일정')}</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {t('必去：', 'Must visit: ', '必須：', '꼭 갈 곳: ')}
                      {itineraryRequiredSummary}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSave} disabled={saving} className="rounded-xl border px-3 py-2 text-xs disabled:opacity-50">
                      {saving ? t('儲存中...', 'Saving...', '保存中...', '저장 중...') : t('儲存行程', 'Save plan', 'プランを保存', '일정 저장')}
                    </button>
                    <button
                      onClick={() => generateItinerary({ preserveCurrent: true })}
                      disabled={generating || saving}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {t('保留並重新規劃', 'Save and regenerate', '保存して再生成', '저장 후 다시 생성')}
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {t('預算', 'Budget', '予算', '예산')}: {budgetLabel(budget)} / {t('興趣', 'Interests', '興味', '관심사')}:{' '}
                  {interests.length ? interests.map(interestLabel).join(' / ') : t('無', 'none', 'なし', '없음')}
                </div>
                <div className="mt-4 space-y-3">
                  {itinerary.map(day => (
                    <div key={`${day.day}-${day.date}`} className="rounded-xl border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-gray-900">{day.theme}</p>
                        <p className="text-xs text-gray-500">{day.date}</p>
                      </div>
                      <div className="mt-3 space-y-3">
                        {day.activities.map((activity, index) => (
                          <div key={`${day.day}-${activity.time}-${index}`} className="rounded-lg bg-slate-50 p-3">
                            <div className="flex items-center gap-2 text-xs text-sky-600">
                              <Clock className="h-3.5 w-3.5" />
                              {activity.time}
                            </div>
                            <div className="mt-1 font-medium text-gray-900">{activity.title}</div>
                            <p className="mt-1 text-sm text-gray-600">{activity.description}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{day.dining}</div>
                        <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900">{day.tip}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border bg-white p-5">
              <div className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                <Clock className="h-4 w-4 text-sky-600" />
                {t('已儲存的行程', 'Saved Itineraries', '保存済みの旅程', '저장된 일정')}
              </div>
              {plans.length === 0 ? (
                <p className="text-sm text-gray-500">{t('目前還沒有儲存的行程。', 'No saved plans yet.', 'まだ保存された旅程はありません。', '저장된 일정이 아직 없습니다.')}</p>
              ) : (
                <div className="space-y-2">
                  {plans.map(plan => {
                    const open = expandedId === plan.id;
                    const savedItinerary = plan.plan_data?.itinerary || [];
                    return (
                      <div key={plan.id} className="rounded-xl border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <button className="text-left" onClick={() => setExpandedId(open ? null : plan.id)}>
                            <p className="font-semibold text-gray-900">{plan.title}</p>
                            <p className="text-xs text-gray-500">
                              {plan.start_date} ~ {plan.end_date}
                            </p>
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => loadPlanForReplanning(plan)}
                              className="rounded-lg border px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                            >
                              {t('載入重新規劃', 'Load to replan', '再生成用に読込', '다시 생성')}
                            </button>
                            <button onClick={() => handleDelete(plan.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" aria-label="delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {open && savedItinerary.length > 0 && (
                          <div className="mt-3 space-y-2 border-t pt-3">
                            <p className="text-xs text-gray-500">
                              {t('必去：', 'Must visit: ', '必須：', '꼭 갈 곳: ')}
                              {(plan.plan_data?.requiredPlaces || []).join(' / ') || t('未指定', 'Not specified', '未指定', '지정 안 함')}
                            </p>
                            {savedItinerary.slice(0, 2).map(day => (
                              <div key={`${plan.id}-${day.day}`} className="rounded-lg bg-slate-50 p-2 text-sm">
                                <p className="font-medium text-gray-800">{day.theme}</p>
                                <p className="mt-0.5 text-xs text-gray-500">{day.activities?.[0]?.title}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-4">
                <Link to="/ai/passport" className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:underline">
                  <BookMarked className="h-4 w-4" />
                  {t('旅遊護照', 'Travel Passport', '旅のパスポート', '여행 패스포트')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

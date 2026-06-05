import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, BookMarked, CheckCircle, Clock, Loader2, MapPin, Sparkles, Trash2, Users } from 'lucide-react';
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
    // ignore localStorage errors
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
  const [itinerary, setItinerary] = useState<DayPlan[] | null>(null);
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const days = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return Math.max(1, Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
  }, [startDate, endDate]);

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
    if (value === 'budget') return t('節約', 'Budget', '節約', '절약');
    if (value === 'luxury') return t('奢華', 'Luxury', 'ラグジュアリー', '럭셔리');
    return t('標準', 'Standard', '標準', '표준');
  };

  const interestLabel = (key: InterestKey) => {
    switch (key) {
      case 'food':
        return t('美食', 'Food', 'グルメ', '맛집');
      case 'culture':
        return t('文化古蹟', 'Culture', '文化', '문화');
      case 'shopping':
        return t('購物', 'Shopping', 'ショッピング', '쇼핑');
      case 'nature':
        return t('自然景觀', 'Nature', '自然', '자연');
      case 'adventure':
        return t('冒險運動', 'Adventure', 'アドベンチャー', '모험');
      case 'family':
        return t('家庭親子', 'Family', 'ファミリー', '가족');
      case 'art':
        return t('藝術博物館', 'Art', 'アート', '예술');
      case 'nightlife':
        return t('夜生活', 'Nightlife', 'ナイトライフ', '야간생활');
    }
  };

  const generatePlan = (): DayPlan[] => {
    const start = new Date(startDate);
    const dayCount = days || 1;

    return Array.from({ length: dayCount }, (_, index) => {
      const current = new Date(start);
      current.setDate(start.getDate() + index);

      return {
        day: index + 1,
        date: current.toLocaleDateString(dateLocale, { month: 'numeric', day: 'numeric', weekday: 'short' }),
        theme: t(`第 ${index + 1} 天行程`, `Day ${index + 1} Plan`, `${index + 1}日目の旅程`, `${index + 1}일차 일정`),
        activities: [
          {
            time: '09:00',
            title: t('文化散步', 'Culture Walk', '文化散策', '문화 산책'),
            description: t('走訪在地文化景點與特色街區。', 'Explore local culture spots and neighborhoods.', 'ローカルの文化スポットや街歩きを楽しみます。', '지역 문화 명소와 골목을 둘러봅니다.'),
          },
          {
            time: '14:00',
            title: t('體驗活動', 'Signature Experience', '体験アクティビティ', '체험 활동'),
            description: t('安排一個在地手作或特色體驗。', 'Enjoy one local hands-on activity.', 'その土地ならではの体験や手作りアクティビティを楽しみます。', '현지의 손수 체험이나 시그니처 활동을 즐깁니다.'),
          },
        ],
        dining: t('餐食推薦：在地特色料理。', 'Dining pick: local signature dish.', 'おすすめの食事：地元の名物料理。', '식사 추천: 현지 대표 요리.'),
        tip: t('小提醒：熱門地點建議提早預約。', 'Tip: reserve popular places early.', 'ヒント：人気スポットは早めの予約がおすすめです。', '팁: 인기 장소는 미리 예약하는 것이 좋습니다.'),
      };
    });
  };

  const normalizeAIPlan = (result: AiItineraryResult): DayPlan[] => {
    const aiDays = Array.isArray(result.days) ? result.days : [];
    const fallbackDates = generatePlan();
    if (!aiDays.length) throw new Error(t('AI 沒有回傳有效行程，請再試一次。', 'AI did not return a valid itinerary. Please try again.', 'AIが有効な旅程を返しませんでした。もう一度お試しください。', 'AI가 유효한 일정을 반환하지 않았습니다. 다시 시도해주세요.'));

    return aiDays.slice(0, days || aiDays.length).map((day, index) => {
      const fallback = fallbackDates[index] || fallbackDates[0];
      const activities = Array.isArray(day.activities) && day.activities.length ? day.activities : fallback.activities;
      return {
        day: Number(day.day) || index + 1,
        date: day.date || fallback.date,
        theme: day.theme || fallback.theme,
        activities: activities.slice(0, 5).map((activity, activityIndex) => ({
          time: activity.time || `${9 + activityIndex * 2}:00`,
          title: activity.title || fallback.activities[0]?.title || '',
          description: activity.description || fallback.activities[0]?.description || '',
        })),
        dining: day.dining || fallback.dining,
        tip: day.tip || fallback.tip,
      };
    });
  };

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!startDate || !endDate || generating) return;
    setGenerating(true);
    setMessage(null);
    try {
      const result = await callAI<AiItineraryResult>('itinerary', {
        destination,
        startDate,
        endDate,
        days: days || 1,
        groupSize,
        budget,
        interests,
        language: locale,
      });
      setItinerary(normalizeAIPlan(result));
      setMessage({ type: 'success', text: t('AI 已產生較完整的行程。', 'AI generated a stronger itinerary.', 'AIがより充実した旅程を作成しました。', 'AI가 더 완성도 높은 일정을 생성했습니다.') });
    } catch (error) {
      setItinerary(generatePlan());
      setMessage({ type: 'error', text: error instanceof Error ? error.message : t('AI 暫時無法產生行程，已先顯示基本草稿。', 'AI could not generate now, so a basic draft is shown.', 'AIが一時的に旅程を作成できないため、基本案を表示します。', 'AI가 일시적으로 일정을 생성하지 못해 기본 초안을 표시합니다.') });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!user || !itinerary) return;

    const title = `${destination || t('我的旅程', 'My Trip', 'マイトリップ', '내 여행')} ${t('行程', 'Plan', 'プラン', '일정')}`;
    const payload = {
      user_id: user.id,
      title,
      destination,
      start_date: startDate,
      end_date: endDate,
      plan_data: { itinerary, budget, interests },
    };

    if (useLocalFallback) {
      const next: SavedPlan[] = [
        {
          id: `local-${Date.now()}`,
          title,
          destination,
          start_date: startDate,
          end_date: endDate,
          plan_data: { itinerary, budget, interests },
        },
        ...plans,
      ].slice(0, 10);
      setPlans(next);
      writeLocalPlans(user.id, next);
      return;
    }

    const { data, error } = await supabase
      .from('itinerary_plans')
      .insert(payload)
      .select('id,title,destination,start_date,end_date,plan_data')
      .single();

    if (error) return;
    if (data) setPlans(prev => [data as SavedPlan, ...prev].slice(0, 10));
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

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title={t('AI 行程規劃', 'AI Itinerary Planner', 'AI旅程プランナー', 'AI 일정 플래너')}
        description={t(
          '依照你的目的地與喜好，快速產生可編輯的旅遊行程。',
          'Create editable plans from your destination and preferences.',
          '目的地と好みに合わせて、編集可能な旅行プランを素早く作成します。',
          '여행지와 취향에 맞춰 편집 가능한 여행 일정을 빠르게 생성합니다.',
        )}
      />
      <Navigation />

      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">{t('AI 行程規劃', 'AI Itinerary Planner', 'AI旅程プランナー', 'AI 일정 플래너')}</h1>
          <p className="mt-1.5 text-gray-500">
            {t(
              '依照你的目的地與喜好，快速產生可編輯的旅遊行程。',
              'Create editable plans from your destination and preferences.',
              '目的地と好みに合わせて、編集可能な旅行プランを素早く作成します。',
              '여행지와 취향에 맞춰 편집 가능한 여행 일정을 빠르게 생성합니다.',
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
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('出發日期', 'Start date', '出発日', '출발일')}</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('回程日期', 'End date', '戻り日', '복귀일')}</label>
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
                    {t('出行人數', 'Group size', '人数', '인원')}
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
                    {t('興趣（可複選）', 'Interests (multi-select)', '興味（複数選択）', '관심사(복수 선택)')}
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

                <button
                  type="submit"
                  disabled={generating}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                  {t('行程生成', 'Generate plan', '旅程生成', '일정 생성')}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-3">
            {itinerary && (
              <div className="rounded-2xl border bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-gray-900">{destination || t('新行程', 'New itinerary', '新しい旅程', '새 일정')}</h3>
                  <button onClick={handleSave} className="rounded-xl border px-3 py-2 text-xs">
                    {t('儲存行程', 'Save plan', 'プランを保存', '일정 저장')}
                  </button>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {t('預算', 'Budget', '予算', '예산')}: {budgetLabel(budget)} · {t('興趣', 'Interests', '興味', '관심사')}:{' '}
                  {interests.length ? interests.map(interestLabel).join(' / ') : t('無', 'none', 'なし', '없음')}
                </div>
                <div className="mt-4 space-y-3">
                  {itinerary.map(day => (
                    <div key={`${day.day}-${day.date}`} className="rounded-xl border p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-900">{day.theme}</p>
                        <p className="text-xs text-gray-500">{day.date}</p>
                      </div>
                      <div className="mt-3 space-y-3">
                        {day.activities.map(activity => (
                          <div key={`${day.day}-${activity.time}`} className="rounded-lg bg-slate-50 p-3">
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
                    return (
                      <div key={plan.id} className="rounded-xl border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <button className="text-left" onClick={() => setExpandedId(open ? null : plan.id)}>
                            <p className="font-semibold text-gray-900">{plan.title}</p>
                            <p className="text-xs text-gray-500">
                              {plan.start_date} ~ {plan.end_date}
                            </p>
                          </button>
                          <button onClick={() => handleDelete(plan.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" aria-label="delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-4">
                <Link to="/ai/passport" className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:underline">
                  <BookMarked className="h-4 w-4" />
                  {t('旅遊護照', 'Travel Passport', '旅のパスポート', '여행 여권')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

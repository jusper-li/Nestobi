import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookMarked, Clock, MapPin, Sparkles, Trash2, Users } from 'lucide-react';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { localeByLang, normalizeLang, pickByLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';

type Activity = { time: string; title: string; description: string };
type DayPlan = { day: number; date: string; theme: string; activities: Activity[]; dining: string; tip: string };
type SavedPlan = {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  plan_data?: { itinerary?: DayPlan[]; budget?: string; groupSize?: number; interests?: string[] };
};

const STORAGE_KEY = 'nestobi_ai_travel_plans_fallback';
const BUDGETS = ['budget', 'standard', 'luxury'] as const;
const INTERESTS = ['food', 'culture', 'shopping', 'nature', 'adventure', 'family', 'art', 'nightlife'] as const;

const makeId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
    // noop
  }
};

export default function ItineraryPlanner() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const locale = localeByLang(normalizedLang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);

  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupSize, setGroupSize] = useState(2);
  const [budget, setBudget] = useState<(typeof BUDGETS)[number]>('standard');
  const [interests, setInterests] = useState<string[]>([]);
  const [itinerary, setItinerary] = useState<DayPlan[] | null>(null);
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [useLocalFallback, setUseLocalFallback] = useState(false);

  const budgetLabels = [
    pick('經濟實惠', 'Budget', '節約', '절약형'),
    pick('中等預算', 'Standard', '標準', '표준형'),
    pick('奢華享受', 'Luxury', '贅沢', '럭셔리'),
  ];

  const interestLabels = [
    pick('美食', 'Food', 'グルメ', '미식'),
    pick('文化古蹟', 'Culture', '文化', '문화'),
    pick('購物', 'Shopping', 'ショッピング', '쇼핑'),
    pick('自然景觀', 'Nature', '自然', '자연'),
    pick('冒險運動', 'Adventure', '冒険', '모험'),
    pick('家庭親子', 'Family', '家族', '가족'),
    pick('藝術博物館', 'Art & Museum', '美術館', '예술/박물관'),
    pick('夜生活', 'Nightlife', 'ナイトライフ', '나이트라이프'),
  ];

  const days = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return Math.max(1, Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
  }, [startDate, endDate]);

  const generatePlan = (): DayPlan[] => {
    const start = new Date(startDate);
    return Array.from({ length: days || 1 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return {
        day: i + 1,
        date: d.toLocaleDateString(locale, { month: 'numeric', day: 'numeric', weekday: 'short' }),
        theme: pick(`第 ${i + 1} 天重點`, `Day ${i + 1} Highlights`, `${i + 1}日目の見どころ`, `${i + 1}일차 하이라이트`),
        activities: [
          {
            time: '09:00',
            title: pick('文化探索', 'Cultural Spot', '文化スポット', '문화 탐방'),
            description: pick('探索當地歷史文化，感受城市故事。', 'Explore local culture and stories.', '地域の歴史と文化を体験します。', '지역의 역사와 문화를 체험합니다.'),
          },
          {
            time: '14:00',
            title: pick('特色體驗', 'Signature Experience', '特別な体験', '시그니처 체험'),
            description: pick('安排互動式行程，享受在地生活節奏。', 'Enjoy a hands-on local experience.', '現地らしい体験を楽しみます。', '현지 체험을 즐깁니다.'),
          },
        ],
        dining: pick('推薦一間在地餐廳，品嚐代表料理。', 'Try a local specialty dish.', '地元の名物料理を楽しみましょう。', '현지 대표 음식을 맛보세요.'),
        tip: pick('熱門景點建議提前預約，行程更順。', 'Reserve popular places early.', '人気スポットは事前予約がおすすめです。', '인기 장소는 사전 예약을 추천합니다.'),
      };
    });
  };

  useEffect(() => {
    const loadPlans = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('ai_travel_plans')
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
    loadPlans();
  }, [user]);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    setItinerary(generatePlan());
  };

  const handleSave = async () => {
    if (!user || !itinerary) return;
    const payload = {
      user_id: user.id,
      title: `${destination || pick('旅程', 'Trip', '旅', '여행')} ${pick('計畫', 'Plan', 'プラン', '플랜')}`,
      destination,
      start_date: startDate,
      end_date: endDate,
      plan_data: { itinerary, budget, groupSize, interests },
    };
    if (useLocalFallback) {
      const item: SavedPlan = { id: makeId(), title: payload.title, destination, start_date: startDate, end_date: endDate, plan_data: payload.plan_data };
      const next = [item, ...plans].slice(0, 10);
      setPlans(next);
      writeLocalPlans(user.id, next);
      return;
    }
    const { data, error } = await supabase
      .from('ai_travel_plans')
      .insert(payload)
      .select('id,title,destination,start_date,end_date,plan_data')
      .single();
    if (error) {
      setUseLocalFallback(true);
      const item: SavedPlan = { id: makeId(), title: payload.title, destination, start_date: startDate, end_date: endDate, plan_data: payload.plan_data };
      const next = [item, ...plans].slice(0, 10);
      setPlans(next);
      writeLocalPlans(user.id, next);
      return;
    }
    if (data) setPlans((prev) => [data as SavedPlan, ...prev].slice(0, 10));
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (useLocalFallback || id.startsWith('local-')) {
      const next = plans.filter((p) => p.id !== id);
      setPlans(next);
      writeLocalPlans(user.id, next);
      return;
    }
    await supabase.from('ai_travel_plans').delete().eq('id', id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title={pick('AI 行程規劃', 'AI Itinerary Planner', 'AI 旅程プランナー', 'AI 여행 플래너')}
        description={pick('從目的地與偏好快速產生可編輯行程。', 'Create editable plans from your destination and preferences.', '目的地と好みから編集可能な旅程を作成します。', '목적지와 취향으로 수정 가능한 일정을 생성합니다.')}
      />
      <Navigation />
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">{pick('AI 行程規劃', 'AI Itinerary Planner', 'AI 旅程プランナー', 'AI 여행 플래너')}</h1>
          <p className="mt-1.5 text-gray-500">{pick('從目的地與偏好快速產生可編輯行程。', 'Create editable plans from your destination and preferences.', '目的地と好みから編集可能な旅程を作成します。', '목적지와 취향으로 수정 가능한 일정을 생성합니다.')}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                <MapPin className="h-5 w-5 text-sky-600" />
                {pick('行程設定', 'Settings', '設定', '설정')}
              </h2>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{pick('目的地', 'Destination', '目的地', '목적지')}</label>
                  <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={pick('例如：沖繩、東京、台南', 'e.g. Okinawa, Tokyo, Tainan', '例：沖縄、東京、台南', '예: 오키나와, 도쿄, 타이난')} className="w-full rounded-xl border px-4 py-2.5 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">{pick('出發日期', 'Start date', '開始日', '시작일')}</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">{pick('回程日期', 'End date', '終了日', '종료일')}</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm" />
                  </div>
                </div>
                {days > 0 && <div className="rounded-lg bg-sky-50 py-1.5 text-center text-sm font-medium text-sky-700">{pick(`${days} 天`, `${days} days`, `${days}日間`, `${days}일`)}</div>}
                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-gray-700">
                    <Users className="h-3.5 w-3.5" />
                    {pick('出行人數', 'Group size', '人数', '인원')}
                  </label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setGroupSize((s) => Math.max(1, s - 1))} className="h-8 w-8 rounded-full bg-gray-100">
                      -
                    </button>
                    <span className="w-6 text-center text-lg font-semibold">{groupSize}</span>
                    <button type="button" onClick={() => setGroupSize((s) => Math.min(20, s + 1))} className="h-8 w-8 rounded-full bg-gray-100">
                      +
                    </button>
                    <span className="text-sm text-gray-500">{pick('人', 'people', '人', '명')}</span>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">{pick('預算等級', 'Budget', '予算', '예산')}</label>
                  <div className="flex gap-2">
                    {BUDGETS.map((b, idx) => (
                      <button key={b} type="button" onClick={() => setBudget(b)} className={`flex-1 rounded-xl border py-2 text-xs ${budget === b ? 'border-sky-600 bg-sky-600 text-white' : 'border-gray-200 text-gray-600'}`}>
                        {budgetLabels[idx]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">{pick('旅遊興趣（可多選）', 'Interests (multi-select)', '興味（複数選択）', '관심사(다중 선택)')}</label>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map((interest, idx) => (
                      <button key={interest} type="button" onClick={() => setInterests((prev) => (prev.includes(interest) ? prev.filter((x) => x !== interest) : [...prev, interest]))} className={`rounded-full border px-2.5 py-1 text-xs ${interests.includes(interest) ? 'border-sky-600 bg-sky-600 text-white' : 'border-gray-200 text-gray-600'}`}>
                        {interestLabels[idx]}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 font-semibold text-white">
                  <Sparkles className="h-5 w-5" />
                  {pick('產生行程', 'Generate plan', 'プラン作成', '일정 생성')}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-3">
            {itinerary && (
              <div className="rounded-2xl border bg-white p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{destination || pick('新行程', 'New itinerary', '新しい旅程', '새 일정')}</h3>
                  <button onClick={handleSave} className="rounded-xl border px-3 py-2 text-xs">
                    {pick('儲存行程', 'Save plan', '保存', '저장')}
                  </button>
                </div>
              </div>
            )}

            {plans.length > 0 && (
              <div className="rounded-2xl border bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                    <Clock className="h-4 w-4 text-sky-600" />
                    {pick('已儲存行程', 'Saved itineraries', '保存済み旅程', '저장된 일정')}
                  </h3>
                  <Link to="/ai/passport" className="flex items-center gap-1 text-xs font-medium text-amber-600">
                    <BookMarked className="h-3.5 w-3.5" />
                    {pick('旅遊護照', 'Travel passport', '旅のパスポート', '여행 패스포트')}
                  </Link>
                </div>
                <div className="space-y-2">
                  {plans.map((plan) => {
                    const open = expandedId === plan.id;
                    const itineraryData = plan.plan_data?.itinerary || [];
                    return (
                      <div key={plan.id} className="overflow-hidden rounded-xl border bg-slate-50">
                        <div className="flex cursor-pointer items-center justify-between p-3" onClick={() => setExpandedId(open ? null : plan.id)}>
                          <div>
                            <p className="text-sm font-medium">{plan.title}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(plan.start_date).toLocaleDateString(locale)} ~ {new Date(plan.end_date).toLocaleDateString(locale)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(plan.id);
                            }}
                            className="p-1.5 text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {open && itineraryData.length > 0 && (
                          <div className="space-y-3 border-t bg-white p-3">
                            {itineraryData.map((d, i) => (
                              <div key={`${plan.id}-${i}`} className="rounded-xl border p-3">
                                <p className="mb-1 text-sm font-semibold">
                                  D{d.day} - {d.theme}
                                </p>
                                <p className="mb-2 text-xs text-gray-500">{d.date}</p>
                                <div className="mb-2 space-y-1.5">
                                  {d.activities.map((a, j) => (
                                    <p key={`${plan.id}-${i}-${j}`} className="text-xs text-gray-700">
                                      {a.time} - {a.title}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


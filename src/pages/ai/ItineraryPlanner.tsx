import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookMarked, Calendar, Clock, MapPin, Sparkles, Trash2, Users } from 'lucide-react';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
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
    // ignore
  }
};

export default function ItineraryPlanner() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const locale = lang === 'ja' ? 'ja-JP' : lang === 'ko' ? 'ko-KR' : lang === 'en' ? 'en-US' : 'zh-TW';
  const pick = (zh: string, en: string, ja: string, ko: string) => (lang === 'en' ? en : lang === 'ja' ? ja : lang === 'ko' ? ko : zh);
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
    pick('經濟實惠', 'Budget', '節約', '가성비'),
    pick('中等預算', 'Standard', '標準', '표준'),
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
    pick('夜生活', 'Nightlife', 'ナイトライフ', '야간활동'),
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
        theme: pick(`第 ${i + 1} 天行程`, `Day ${i + 1} Highlights`, `${i + 1}日目ハイライト`, `${i + 1}일차 하이라이트`),
        activities: [
          { time: '09:00', title: pick('文化探索', 'Cultural Spot', '文化探索', '문화 탐방'), description: pick('探索在地文化與故事。', 'Explore local culture and stories.', '地域文化を体験します。', '지역 문화와 이야기를 경험합니다.') },
          { time: '14:00', title: pick('特色體驗', 'Signature Experience', '特別体験', '시그니처 체험'), description: pick('安排一段在地互動活動。', 'Enjoy a hands-on local experience.', '現地体験を楽しみます。', '현지 체험 활동을 즐깁니다.') },
        ],
        dining: pick('推薦一間在地人氣餐廳。', 'Try a local specialty dish.', '人気のローカル料理を試しましょう。', '현지 인기 음식을 추천합니다.'),
        tip: pick('熱門景點建議提早預約。', 'Reserve popular places early.', '人気スポットは事前予約がおすすめです。', '인기 장소는 사전 예약을 권장합니다.'),
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
      title: `${destination || pick('旅程', 'Trip', '旅行', '여행')} ${pick('計畫', 'Plan', 'プラン', '플랜')}`,
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
    const { data, error } = await supabase.from('ai_travel_plans').insert(payload).select('id,title,destination,start_date,end_date,plan_data').single();
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
      <SEOHead title={t.ai.itinerary.title} description={t.ai.itinerary.subtitle} />
      <Navigation />
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{t.ai.itinerary.title}</h1>
          <p className="text-gray-500 mt-1.5">{t.ai.itinerary.subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-sky-600" />{t.ai.itinerary.itinerarySetting}</h2>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.ai.itinerary.destination}</label>
                  <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={t.ai.itinerary.destinationPlaceholder} className="w-full px-4 py-2.5 border rounded-xl text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{t.ai.itinerary.startDate}</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.ai.itinerary.endDate}</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl text-sm" />
                  </div>
                </div>
                {days > 0 && <div className="text-center text-sm text-sky-700 bg-sky-50 py-1.5 rounded-lg font-medium">{pick(`${days} 天`, `${days} days`, `${days}日`, `${days}일`)}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1"><Users className="w-3.5 h-3.5" />{t.ai.itinerary.groupSize}</label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setGroupSize((s) => Math.max(1, s - 1))} className="w-8 h-8 rounded-full bg-gray-100">-</button>
                    <span className="text-lg font-semibold w-6 text-center">{groupSize}</span>
                    <button type="button" onClick={() => setGroupSize((s) => Math.min(20, s + 1))} className="w-8 h-8 rounded-full bg-gray-100">+</button>
                    <span className="text-sm text-gray-500">{t.ai.itinerary.persons}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.ai.itinerary.budget}</label>
                  <div className="flex gap-2">
                    {BUDGETS.map((b, idx) => (
                      <button key={b} type="button" onClick={() => setBudget(b)} className={`flex-1 text-xs py-2 rounded-xl border ${budget === b ? 'bg-sky-600 text-white border-sky-600' : 'border-gray-200 text-gray-600'}`}>{budgetLabels[idx]}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{pick('旅遊興趣（可多選）', 'Interests (multi-select)', '興味（複数選択）', '관심사 (복수 선택)')}</label>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map((interest, idx) => (
                      <button key={interest} type="button" onClick={() => setInterests((prev) => (prev.includes(interest) ? prev.filter((x) => x !== interest) : [...prev, interest]))} className={`px-2.5 py-1 rounded-full text-xs border ${interests.includes(interest) ? 'bg-sky-600 text-white border-sky-600' : 'border-gray-200 text-gray-600'}`}>{interestLabels[idx]}</button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"><Sparkles className="w-5 h-5" />{t.ai.itinerary.generate}</button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {itinerary && (
              <div className="bg-white rounded-2xl border p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{destination || pick('新行程', 'New itinerary', '新しい旅程', '새 일정')}</h3>
                  <button onClick={handleSave} className="text-xs px-3 py-2 rounded-xl border">{pick('儲存行程', 'Save Plan', '保存', '저장')}</button>
                </div>
              </div>
            )}
            {plans.length > 0 && (
              <div className="bg-white rounded-2xl border p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Clock className="w-4 h-4 text-sky-600" />{pick('已儲存的行程', 'Saved Itineraries', '保存済み旅程', '저장된 일정')}</h3>
                  <Link to="/ai/passport" className="flex items-center gap-1 text-xs text-amber-600 font-medium"><BookMarked className="w-3.5 h-3.5" />{pick('旅遊護照', 'Travel Passport', 'トラベルパスポート', '여행 패스포트')}</Link>
                </div>
                <div className="space-y-2">
                  {plans.map((plan) => {
                    const open = expandedId === plan.id;
                    const itineraryData = plan.plan_data?.itinerary || [];
                    return (
                      <div key={plan.id} className="bg-slate-50 rounded-xl border overflow-hidden">
                        <div className="p-3 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(open ? null : plan.id)}>
                          <div>
                            <p className="font-medium text-sm">{plan.title}</p>
                            <p className="text-xs text-gray-500">{new Date(plan.start_date).toLocaleDateString(locale)} ~ {new Date(plan.end_date).toLocaleDateString(locale)}</p>
                          </div>
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(plan.id); }} className="p-1.5 text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        {open && itineraryData.length > 0 && (
                          <div className="border-t bg-white p-3 space-y-3">
                            {itineraryData.map((d, i) => (
                              <div key={`${plan.id}-${i}`} className="rounded-xl border p-3">
                                <p className="font-semibold text-sm mb-1">D{d.day} - {d.theme}</p>
                                <p className="text-xs text-gray-500 mb-2">{d.date}</p>
                                <div className="space-y-1.5 mb-2">{d.activities.map((a, j) => <p key={`${plan.id}-${i}-${j}`} className="text-xs text-gray-700">{a.time} - {a.title}</p>)}</div>
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

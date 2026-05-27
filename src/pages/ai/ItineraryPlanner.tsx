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
  plan_data?: { itinerary?: DayPlan[] };
};

const STORAGE_KEY = 'nestobi_ai_travel_plans_fallback';
const BUDGETS = ['budget', 'standard', 'luxury'] as const;
const INTERESTS = ['food', 'culture', 'shopping', 'nature', 'adventure', 'family', 'art', 'nightlife'] as const;

const EN_BUDGET = ['Budget', 'Standard', 'Luxury'];
const ZH_BUDGET = ['經濟實惠', '中等預算', '奢華享受'];
const EN_INTEREST = ['Food', 'Culture', 'Shopping', 'Nature', 'Adventure', 'Family', 'Art & Museum', 'Nightlife'];
const ZH_INTEREST = ['美食', '文化古蹟', '購物', '自然景觀', '冒險運動', '家庭親子', '藝術博物館', '夜生活'];

function makeId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readLocalPlans(userId: string): SavedPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, SavedPlan[]>;
    return all[userId] || [];
  } catch {
    return [];
  }
}

function writeLocalPlans(userId: string, plans: SavedPlan[]) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, SavedPlan[]>) : {};
    all[userId] = plans;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

function generatePlan(startDate: string, endDate: string, lang: string): DayPlan[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dayCount = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
  return Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      day: i + 1,
      date: d.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' }),
      theme: lang === 'en' ? `Day ${i + 1} Highlights` : `第 ${i + 1} 天精選`,
      activities: [
        {
          time: '09:00',
          title: lang === 'en' ? 'Cultural Spot' : '文化探索',
          description: lang === 'en' ? 'Explore local culture and stories.' : '探索在地文化與歷史脈絡。',
        },
        {
          time: '14:00',
          title: lang === 'en' ? 'Signature Experience' : '特色體驗',
          description: lang === 'en' ? 'Enjoy a hands-on local experience.' : '安排一段在地特色體驗行程。',
        },
      ],
      dining: lang === 'en' ? 'Try a local specialty dish.' : '推薦在地特色美食。',
      tip: lang === 'en' ? 'Reserve popular places early.' : '熱門行程建議提早預約。',
    };
  });
}

export default function ItineraryPlanner() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
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

  const budgetLabels = lang === 'en' ? EN_BUDGET : ZH_BUDGET;
  const interestLabels = lang === 'en' ? EN_INTEREST : ZH_INTEREST;

  const days = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return Math.max(1, Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
  }, [startDate, endDate]);

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
        // Table missing / proxy 404 -> fallback to local storage to avoid noisy failures.
        if (error.code === 'PGRST205' || `${error.message}`.includes('404') || `${error.message}`.includes('Not Found')) {
          setUseLocalFallback(true);
          setPlans(readLocalPlans(user.id));
          return;
        }
        setPlans([]);
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
    setItinerary(generatePlan(startDate, endDate, lang));
  };

  const handleSave = async () => {
    if (!user || !itinerary) return;
    const payload = {
      user_id: user.id,
      title: `${destination || (lang === 'en' ? 'Trip' : '旅程')} ${lang === 'en' ? 'Plan' : '行程'}`,
      destination,
      start_date: startDate,
      end_date: endDate,
      plan_data: { itinerary, budget, groupSize, interests },
    };

    if (useLocalFallback) {
      const item: SavedPlan = {
        id: makeId(),
        title: payload.title,
        destination: payload.destination,
        start_date: payload.start_date,
        end_date: payload.end_date,
        plan_data: payload.plan_data,
      };
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
      const item: SavedPlan = {
        id: makeId(),
        title: payload.title,
        destination: payload.destination,
        start_date: payload.start_date,
        end_date: payload.end_date,
        plan_data: payload.plan_data,
      };
      const next = [item, ...plans].slice(0, 10);
      setPlans(next);
      writeLocalPlans(user.id, next);
      return;
    }

    if (data) setPlans(prev => [data as SavedPlan, ...prev].slice(0, 10));
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (useLocalFallback || id.startsWith('local-')) {
      const next = plans.filter(p => p.id !== id);
      setPlans(next);
      writeLocalPlans(user.id, next);
      return;
    }
    await supabase.from('ai_travel_plans').delete().eq('id', id);
    setPlans(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead title="AI Itinerary Planner" description="Create editable plans from your destination and preferences." />
      <Navigation />
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{t.ai.itinerary.title}</h1>
          <p className="text-gray-500 mt-1.5">{t.ai.itinerary.subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-sky-600" />{t.ai.itinerary.itinerarySetting}
              </h2>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.ai.itinerary.destination}</label>
                  <input value={destination} onChange={e => setDestination(e.target.value)} placeholder={t.ai.itinerary.destinationPlaceholder} className="w-full px-4 py-2.5 border rounded-xl text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{t.ai.itinerary.startDate}</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.ai.itinerary.endDate}</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl text-sm" />
                  </div>
                </div>
                {days > 0 && <div className="text-center text-sm text-sky-700 bg-sky-50 py-1.5 rounded-lg font-medium">{lang === 'en' ? `${days} days` : `${days} 天`}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1"><Users className="w-3.5 h-3.5" />{t.ai.itinerary.groupSize}</label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setGroupSize(s => Math.max(1, s - 1))} className="w-8 h-8 rounded-full bg-gray-100">-</button>
                    <span className="text-lg font-semibold w-6 text-center">{groupSize}</span>
                    <button type="button" onClick={() => setGroupSize(s => Math.min(20, s + 1))} className="w-8 h-8 rounded-full bg-gray-100">+</button>
                    <span className="text-sm text-gray-500">{t.ai.itinerary.persons}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.ai.itinerary.budget}</label>
                  <div className="flex gap-2">
                    {BUDGETS.map((b, idx) => (
                      <button key={b} type="button" onClick={() => setBudget(b)} className={`flex-1 text-xs py-2 rounded-xl border ${budget === b ? 'bg-sky-600 text-white border-sky-600' : 'border-gray-200 text-gray-600'}`}>
                        {budgetLabels[idx]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'en' ? `${t.ai.itinerary.interests} (multi-select)` : '旅遊興趣（可多選）'}</label>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map((interest, idx) => (
                      <button key={interest} type="button" onClick={() => setInterests(prev => (prev.includes(interest) ? prev.filter(x => x !== interest) : [...prev, interest]))} className={`px-2.5 py-1 rounded-full text-xs border ${interests.includes(interest) ? 'bg-sky-600 text-white border-sky-600' : 'border-gray-200 text-gray-600'}`}>
                        {interestLabels[idx]}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />{t.ai.itinerary.generate}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {itinerary && (
              <div className="bg-white rounded-2xl border p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{destination || (lang === 'en' ? 'New itinerary' : '新行程')}</h3>
                  <button onClick={handleSave} className="text-xs px-3 py-2 rounded-xl border">{lang === 'en' ? 'Save Plan' : '儲存行程'}</button>
                </div>
              </div>
            )}

            {plans.length > 0 && (
              <div className="bg-white rounded-2xl border p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Clock className="w-4 h-4 text-sky-600" />{lang === 'en' ? 'Saved Itineraries' : '已儲存的行程'}</h3>
                  <Link to="/ai/passport" className="flex items-center gap-1 text-xs text-amber-600 font-medium"><BookMarked className="w-3.5 h-3.5" />{lang === 'en' ? 'Travel Passport' : '旅遊護照'}</Link>
                </div>
                <div className="space-y-2">
                  {plans.map(plan => {
                    const open = expandedId === plan.id;
                    const itineraryData = plan.plan_data?.itinerary || [];
                    return (
                      <div key={plan.id} className="bg-slate-50 rounded-xl border overflow-hidden">
                        <div className="p-3 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(open ? null : plan.id)}>
                          <div>
                            <p className="font-medium text-sm">{plan.title}</p>
                            <p className="text-xs text-gray-500">{new Date(plan.start_date).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-TW')} ~ {new Date(plan.end_date).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-TW')}</p>
                          </div>
                          <button type="button" onClick={e => { e.stopPropagation(); handleDelete(plan.id); }} className="p-1.5 text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        {open && itineraryData.length > 0 && (
                          <div className="border-t bg-white p-3 space-y-3">
                            {itineraryData.map((d, i) => (
                              <div key={`${plan.id}-${i}`} className="rounded-xl border p-3">
                                <p className="font-semibold text-sm mb-1">D{d.day} · {d.theme}</p>
                                <p className="text-xs text-gray-500 mb-2">{d.date}</p>
                                <div className="space-y-1.5 mb-2">
                                  {d.activities.map((a, j) => <p key={`${plan.id}-${i}-${j}`} className="text-xs text-gray-700">{a.time} · {a.title}</p>)}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="bg-orange-50 rounded-lg p-2">
                                    <p className="text-xs font-semibold text-orange-600 mb-0.5">{lang === 'en' ? "Today's Dining Pick" : '推薦美食'}</p>
                                    <p className="text-xs text-gray-600">{d.dining}</p>
                                  </div>
                                  <div className="bg-amber-50 rounded-lg p-2">
                                    <p className="text-xs font-semibold text-amber-600 mb-0.5">{lang === 'en' ? 'Tip' : '小貼士'}</p>
                                    <p className="text-xs text-gray-600">{d.tip}</p>
                                  </div>
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


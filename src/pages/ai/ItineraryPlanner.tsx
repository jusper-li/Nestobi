import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, Sparkles, Save, Trash2, ChevronDown,
  ChevronUp, Clock, Utensils, Camera, ShoppingBag, Users,
  DollarSign, Sunrise, Sun, Moon, Star, CheckCircle,
  Pencil, X, PlusCircle, BookMarked
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { callAI } from '../../lib/openai';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';

const INTERESTS = ['美食', '文化古蹟', '購物', '自然景觀', '冒險運動', '家庭親子', '藝術博物館', '夜生活'];
const BUDGETS = ['經濟實惠', '中等預算', '奢華享受'];

interface DayActivity { time: string; icon: string; title: string; description: string; }
interface DayPlan { day: number; date: string; theme: string; activities: DayActivity[]; dining: string; tip: string; }
interface SavedPlan { id: string; title: string; destination: string; start_date: string; end_date: string; created_at: string; plan_data?: { itinerary?: DayPlan[]; budget?: string; groupSize?: number }; }

const DESTINATION_DB: Record<string, {
  image: string;
  intro: string;
  activities: { title: string; description: string; icon: string; category: string }[];
  dining: string[];
  tips: string[];
}> = {
  '台北': {
    image: 'https://images.pexels.com/photos/1307698/pexels-photo-1307698.jpeg?auto=compress&cs=tinysrgb&w=800',
    intro: '台灣首都，融合現代與傳統的多元城市',
    activities: [
      { title: '故宮博物院', description: '收藏超過70萬件中華文物，世界頂級博物館之一', icon: 'culture', category: '文化古蹟' },
      { title: '象山步道', description: '登頂俯瞰101大樓，日出日落皆是絕景', icon: 'nature', category: '自然景觀' },
      { title: '士林夜市', description: '台北最大夜市，美食與小吃的天堂', icon: 'food', category: '美食' },
      { title: '西門町', description: '流行時尚購物聖地，年輕人最愛的潮流區域', icon: 'shopping', category: '購物' },
      { title: '淡水老街', description: '百年歷史老街，品嚐阿給、魚丸等在地小吃', icon: 'food', category: '美食' },
      { title: '國立台灣博物館', description: '台灣歷史與自然科學的珍貴展覽館', icon: 'culture', category: '文化古蹟' },
      { title: '大安森林公園', description: '都市之肺，市民休閒的綠色天地', icon: 'nature', category: '自然景觀' },
      { title: '饒河街夜市', description: '排隊必吃胡椒餅、藥燉排骨麵線', icon: 'food', category: '美食' },
    ],
    dining: ['鼎泰豐（小籠包）', '阜杭豆漿（早餐）', '寧夏夜市（台灣小吃）', '天母商圈（異國料理）'],
    tips: ['捷運系統便利，建議購買悠遊卡', '3月~5月、9月~11月氣候最宜人', '夜市建議攜帶現金', '台灣人非常友善，不懂可以詢問'],
  },
  '京都': {
    image: 'https://images.pexels.com/photos/590478/pexels-photo-590478.jpeg?auto=compress&cs=tinysrgb&w=800',
    intro: '千年古都，日本文化精髓的最佳展現地',
    activities: [
      { title: '金閣寺', description: '金箔覆蓋的三層閣樓倒映湖面，日本國寶級景點', icon: 'culture', category: '文化古蹟' },
      { title: '嵐山竹林', description: '漫步於高聳竹林間，感受靜謐禪意', icon: 'nature', category: '自然景觀' },
      { title: '祇園花見小路', description: '舞妓藝妓聚集的傳統茶屋街，最具京都風情', icon: 'culture', category: '文化古蹟' },
      { title: '伏見稻荷大社', description: '千本鳥居連綿壯觀，日本最受歡迎景點之一', icon: 'culture', category: '文化古蹟' },
      { title: '哲學之道', description: '沿疏水道的浪漫小徑，春天賞櫻最佳地點', icon: 'nature', category: '自然景觀' },
      { title: '錦市場', description: '「京都廚房」，各式漬物、豆腐料理、和菓子', icon: 'food', category: '美食' },
      { title: '二条城', description: '德川幕府象徵，UNESCO世界遺產', icon: 'culture', category: '文化古蹟' },
      { title: '京都御所', description: '千年皇宮遺址，感受帝王氣象', icon: 'culture', category: '文化古蹟' },
    ],
    dining: ['懷石料理（傳統日式多道菜）', '京豆腐料理', '湯葉料理', '抹茶甜點（一保堂茶舖）'],
    tips: ['JR Pass購買划算', '春秋兩季極度擁擠，宜提早訂房', '騎自行車是最佳遊覽方式', '許多景點需脫鞋，穿著方便的鞋子'],
  },
  '峇里島': {
    image: 'https://images.pexels.com/photos/2166553/pexels-photo-2166553.jpeg?auto=compress&cs=tinysrgb&w=800',
    intro: '神明之島，結合靈性、自然與頂級SPA的度假天堂',
    activities: [
      { title: '海神廟日落', description: '建於海中岩石的神廟，日落時分最為震撼', icon: 'culture', category: '文化古蹟' },
      { title: '梯田漫步', description: '翠綠梯田景色如畫，感受峇里農村生活', icon: 'nature', category: '自然景觀' },
      { title: '烏布傳統市場', description: '各式手工藝品、布料、紀念品的採購天堂', icon: 'shopping', category: '購物' },
      { title: '衝浪課程', description: '庫塔和水明漾海灘是衝浪初學者的最佳地點', icon: 'adventure', category: '冒險運動' },
      { title: '傳統SPA', description: '體驗峇里式全身按摩和花瓣浴，身心徹底放鬆', icon: 'culture', category: '美食' },
      { title: '聖泉廟', description: '神聖的泉水沐浴儀式，體驗當地宗教文化', icon: 'culture', category: '文化古蹟' },
      { title: '阿雲火山健行', description: '清晨攻頂，俯瞰峇里島全景與雲海', icon: 'nature', category: '冒險運動' },
      { title: 'Seminyak海灘俱樂部', description: '頂級海灘酒吧，享受日落雞尾酒', icon: 'culture', category: '夜生活' },
    ],
    dining: ['Nasi Goreng（炒飯）', 'Babi Guling（烤乳豬）', 'Jimbaran海鮮燒烤', '有機咖啡廳（烏布）'],
    tips: ['必帶防曬乳和防蚊噴霧', '雨季（10月~3月）雨水充沛', '租機車是最方便的交通方式', '寺廟參觀需穿沙龍（入口有租借）'],
  },
  '東京': {
    image: 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=800',
    intro: '世界最繁華都市，傳統與未來科技的完美融合',
    activities: [
      { title: '淺草寺', description: '東京最古老的寺廟，仲見世商店街充滿江戶風情', icon: 'culture', category: '文化古蹟' },
      { title: '築地場外市場', description: '新鮮生魚片、海鮮丼，壽司愛好者的朝聖地', icon: 'food', category: '美食' },
      { title: '澀谷十字路口', description: '世界最繁忙路口，感受東京的超高速節奏', icon: 'culture', category: '文化古蹟' },
      { title: '新宿御苑', description: '四季皆美的皇家庭園，春天賞櫻首選', icon: 'nature', category: '自然景觀' },
      { title: '秋葉原電器街', description: '動漫、電玩、電器天堂，御宅族必訪聖地', icon: 'shopping', category: '購物' },
      { title: '原宿竹下通', description: '日本青少年流行文化、可愛風格時裝集中地', icon: 'shopping', category: '購物' },
      { title: '東京晴空塔', description: '世界第二高塔，360度俯瞰東京全景', icon: 'culture', category: '文化古蹟' },
      { title: '台場', description: '未來感十足的人工島，購物娛樂一站搞定', icon: 'shopping', category: '購物' },
    ],
    dining: ['壽司（築地）', '拉麵（新宿、澀谷）', '天婦羅（淺草）', '懷石料理（高級日式料理）'],
    tips: ['購買IC卡（Suica/Pasmo）交通更便利', '餐廳有時需要排隊，注意用餐時間', '24小時便利商店是生活必需品', '大多數地方接受信用卡，但建議備有現金'],
  },
  '大阪': {
    image: 'https://images.pexels.com/photos/2614818/pexels-photo-2614818.jpeg?auto=compress&cs=tinysrgb&w=800',
    intro: '關西美食之都，日本人最愛的庶民文化城市',
    activities: [
      { title: '大阪城', description: '豐臣秀吉的象徵，春天被櫻花環繞格外美麗', icon: 'culture', category: '文化古蹟' },
      { title: '道頓堀', description: '美食、招牌霓虹燈與格力高跑步男廣告地標', icon: 'food', category: '美食' },
      { title: 'USJ環球影城', description: '哈利波特、任天堂世界，刺激遊樂設施一網打盡', icon: 'adventure', category: '冒險運動' },
      { title: '黑門市場', description: '大阪廚房，品嚐河豚、生蠔等新鮮海鮮', icon: 'food', category: '美食' },
      { title: '心齋橋', description: '大阪最繁華的購物商圈，品牌應有盡有', icon: 'shopping', category: '購物' },
      { title: '住吉大社', description: '全日本住吉神社的總社，歷史可追溯1800年', icon: 'culture', category: '文化古蹟' },
    ],
    dining: ['章魚燒（道頓堀）', '大阪燒（美津の）', '串炸（新世界）', '拉麵（難波）'],
    tips: ['Osaka Amazing Pass交通+景點一次搞定', '大阪人熱情開朗，不懂可大膽詢問', '超市打烊前食品大特價', '從大阪可輕鬆day trip到京都、奈良'],
  },
  '首爾': {
    image: 'https://images.pexels.com/photos/237211/pexels-photo-237211.jpeg?auto=compress&cs=tinysrgb&w=800',
    intro: 'K-Pop流行文化發源地，購物美食時尚的亞洲潮流中心',
    activities: [
      { title: '景福宮', description: '朝鮮王朝的主宮殿，換穿韓服體驗宮廷風情', icon: 'culture', category: '文化古蹟' },
      { title: '明洞購物街', description: '美妝、流行服飾、街邊小吃的韓流購物聖地', icon: 'shopping', category: '購物' },
      { title: '北村韓屋村', description: '600年歷史的傳統韓式房屋聚落，拍照打卡必來', icon: 'culture', category: '文化古蹟' },
      { title: '東大門設計廣場', description: '24小時不打烊的韓國流行時尚批發市場', icon: 'shopping', category: '購物' },
      { title: '南山首爾塔', description: '首爾地標，纜車上山俯瞰城市全景', icon: 'culture', category: '文化古蹟' },
      { title: '弘大街區', description: '年輕人聚集的大學城，街頭表演、個性小店', icon: 'culture', category: '夜生活' },
    ],
    dining: ['韓式烤肉（삼겹살）', '石鍋拌飯', '部隊鍋', '韓式炸雞＋啤酒（치맥）'],
    tips: ['T-money卡可搭乘地鐵和公車', '韓國美妝產品CP值超高，大量採購', '夏天（7-8月）非常炎熱潮濕', '手機叫車APP（Kakao T）非常方便'],
  },
};

function getDestinationKey(input: string): string {
  return Object.keys(DESTINATION_DB).find(k => input.includes(k)) || '';
}

function generateItinerary(destination: string, startDate: string, endDate: string, selectedInterests: string[], budget: string): DayPlan[] {
  const destKey = getDestinationKey(destination);
  const db = DESTINATION_DB[destKey];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

  const allActivities = db
    ? (selectedInterests.length > 0
      ? [...db.activities.filter(a => selectedInterests.includes(a.category)), ...db.activities.filter(a => !selectedInterests.includes(a.category))]
      : db.activities)
    : [
      { title: '探索當地地標', description: '參觀當地最著名的觀光景點', icon: 'culture', category: '文化古蹟' },
      { title: '品嚐在地美食', description: '到當地市場品嚐道地料理', icon: 'food', category: '美食' },
      { title: '文化體驗', description: '深入了解當地文化與傳統', icon: 'culture', category: '文化古蹟' },
      { title: '自然景觀', description: '欣賞當地自然風光', icon: 'nature', category: '自然景觀' },
      { title: '購物紀念品', description: '採購特色紀念品與伴手禮', icon: 'shopping', category: '購物' },
    ];

  const themes = ['抵達與初探', '深度文化巡禮', '自然探索日', '美食購物日', '隱藏景點探險', '悠閒放鬆日', '道別之旅'];
  const timeSlots = [
    { time: '08:00', label: '早晨' },
    { time: '11:00', label: '上午' },
    { time: '14:00', label: '下午' },
    { time: '19:00', label: '晚間' },
  ];

  const dining = db ? db.dining : ['在地料理', '特色餐廳', '街邊小吃', '傳統市場美食'];
  const tips = db ? db.tips : ['提早預訂交通與住宿', '備好當地貨幣', '下載離線地圖', '尊重當地文化習俗'];

  const budgetNote = budget === '經濟實惠' ? '（建議選擇青年旅館或民宿）' : budget === '中等預算' ? '（建議選擇3-4星級飯店）' : '（建議選擇5星級豪華飯店）';

  return Array.from({ length: days }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateStr = date.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' });

    const dayActivities: DayActivity[] = timeSlots.slice(0, i === 0 ? 3 : i === days - 1 ? 2 : 4).map((slot, j) => {
      const act = allActivities[(i * 4 + j) % allActivities.length];
      return { time: slot.time, icon: act.icon, title: act.title, description: act.description };
    });

    return {
      day: i + 1,
      date: dateStr,
      theme: themes[i % themes.length],
      activities: dayActivities,
      dining: dining[i % dining.length],
      tip: tips[i % tips.length] + (i === 0 ? budgetNote : ''),
    };
  });
}

const iconMap: Record<string, React.ReactNode> = {
  food: <Utensils className="w-3.5 h-3.5" />,
  culture: <Camera className="w-3.5 h-3.5" />,
  shopping: <ShoppingBag className="w-3.5 h-3.5" />,
  nature: <MapPin className="w-3.5 h-3.5" />,
  adventure: <Star className="w-3.5 h-3.5" />,
};

const timeIcon = (time: string) => {
  const h = parseInt(time);
  if (h < 10) return <Sunrise className="w-4 h-4 text-amber-500" />;
  if (h < 15) return <Sun className="w-4 h-4 text-yellow-500" />;
  return <Moon className="w-4 h-4 text-blue-400" />;
};

const ItineraryPlanner: React.FC = () => {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [budget, setBudget] = useState('中等預算');
  const [groupSize, setGroupSize] = useState(2);
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<DayPlan[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [expandedPlanDay, setExpandedPlanDay] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingActivity, setEditingActivity] = useState<{ dayIdx: number; actIdx: number } | null>(null);
  const [editForm, setEditForm] = useState({ time: '', title: '', description: '' });
  const [stampedKeys, setStampedKeys] = useState<Set<string>>(new Set());

  const destKey = getDestinationKey(destination);
  const destInfo = DESTINATION_DB[destKey];

  const fetchPlans = useCallback(async () => {
    if (!user) { setLoadingPlans(false); return; }
    const { data } = await supabase.from('itinerary_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setPlans(data || []);
    setLoadingPlans(false);
  }, [user]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const toggleInterest = (i: string) => setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !startDate || !endDate) return;
    setLoading(true);
    setSaved(false);
    setItinerary(null);

    let result: DayPlan[];
    try {
      const aiResult = await callAI<{ intro?: string; days?: Array<{ day: number; theme: string; activities: DayActivity[]; dining: string; tip: string }> }>('itinerary', {
        destination,
        days,
        interests,
        budget,
        startDate,
        language: lang,
      });
      const start = new Date(startDate);
      result = (aiResult.days || []).map((d, i) => {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const dateStr = date.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' });
        return { day: d.day, date: dateStr, theme: d.theme, activities: d.activities || [], dining: d.dining || '', tip: d.tip || '' };
      });
      if (result.length === 0) throw new Error('Empty AI result');
    } catch {
      result = generateItinerary(destination, startDate, endDate, interests, budget);
    }

    setItinerary(result);
    setExpandedDay(0);
    if (user) {
      await supabase.from('user_usage').upsert(
        { user_id: user.id, feature_type: 'itinerary', usage_count: 1, last_used_at: new Date().toISOString() },
        { onConflict: 'user_id,feature_type' }
      );
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user || !itinerary) return;
    const days = itinerary.length;
    await supabase.from('itinerary_plans').insert({
      user_id: user.id,
      title: `${destination} ${days}天${days - 1}夜`,
      destination,
      start_date: startDate,
      end_date: endDate,
      interests,
      plan_data: { itinerary, budget, groupSize },
      status: 'draft',
    });
    setSaved(true);
    fetchPlans();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('itinerary_plans').delete().eq('id', id);
    setPlans(prev => prev.filter(p => p.id !== id));
  };

  const days = startDate && endDate
    ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
    : 0;

  const handleSaveActivity = (dayIdx: number, actIdx: number) => {
    if (!itinerary) return;
    const updated = itinerary.map((d, di) =>
      di !== dayIdx ? d : {
        ...d,
        activities: d.activities.map((a, ai) =>
          ai !== actIdx ? a : { ...a, time: editForm.time, title: editForm.title, description: editForm.description }
        ),
      }
    );
    setItinerary(updated);
    setEditingActivity(null);
  };

  const handleDeleteActivity = (dayIdx: number, actIdx: number) => {
    if (!itinerary) return;
    setItinerary(itinerary.map((d, di) =>
      di !== dayIdx ? d : { ...d, activities: d.activities.filter((_, ai) => ai !== actIdx) }
    ));
    setStampedKeys(prev => {
      const next = new Set(prev);
      next.delete(`${dayIdx}-${actIdx}`);
      return next;
    });
  };

  const handleAddActivity = (dayIdx: number) => {
    if (!itinerary) return;
    const newAct: DayActivity = { time: '10:00', icon: 'culture', title: '新行程', description: '在此輸入說明' };
    setItinerary(itinerary.map((d, di) =>
      di !== dayIdx ? d : { ...d, activities: [...d.activities, newAct] }
    ));
  };

  const handleEditDayTheme = (dayIdx: number, theme: string) => {
    if (!itinerary) return;
    setItinerary(itinerary.map((d, di) => di !== dayIdx ? d : { ...d, theme }));
  };

  const handleStamp = async (dayIdx: number, actIdx: number, act: DayActivity) => {
    if (!user) return;
    const key = `${dayIdx}-${actIdx}`;
    if (stampedKeys.has(key)) return;
    await supabase.from('travel_passport').insert({
      user_id: user.id,
      place_name: act.title,
      destination,
      category: act.icon === 'food' ? 'food' : act.icon === 'shopping' ? 'shopping' : act.icon === 'nature' ? 'nature' : act.icon === 'adventure' ? 'adventure' : 'culture',
      notes: act.description,
      source: 'itinerary',
    });
    setStampedKeys(prev => new Set([...prev, key]));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead title="AI 行程規劃" description="AI 智慧行程規劃工具，輸入目的地與日期即可自動生成完整旅遊行程，支援台北、東京、京都、大阪等熱門城市。" keywords="AI行程規劃, 旅遊行程, 自動規劃, 台灣旅遊, 日本旅遊" pageType="default" breadcrumbs={[{name:'首頁',url:'/'},{name:'AI 行程規劃',url:'/ai/itinerary'}]} />
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-sky-500 to-blue-700 rounded-2xl mb-4 shadow-lg">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t.ai.itinerary.title}</h1>
          <p className="text-gray-500 mt-1.5">{t.ai.itinerary.subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-sky-600" />行程設定
              </h2>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">目的地</label>
                  <input
                    type="text"
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    required
                    placeholder={t.ai.itinerary.destinationPlaceholder}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                  {destInfo && (
                    <div className="mt-2 text-xs text-sky-600 bg-sky-50 px-3 py-1.5 rounded-lg">
                      {destInfo.intro}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />出發日期
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">回程日期</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      required
                      min={startDate || new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {days > 0 && (
                  <div className="text-center text-sm text-sky-700 bg-sky-50 py-1.5 rounded-lg font-medium">
                    共 {days} 天 {days - 1} 夜
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />出行人數
                  </label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setGroupSize(s => Math.max(1, s - 1))} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600">-</button>
                    <span className="text-lg font-semibold text-gray-900 w-6 text-center">{groupSize}</span>
                    <button type="button" onClick={() => setGroupSize(s => Math.min(20, s + 1))} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600">+</button>
                    <span className="text-sm text-gray-500">人</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />預算等級
                  </label>
                  <div className="flex gap-2">
                    {BUDGETS.map(b => (
                      <button key={b} type="button" onClick={() => setBudget(b)}
                        className={`flex-1 text-xs py-2 rounded-xl border transition font-medium ${budget === b ? 'bg-sky-600 text-white border-sky-600' : 'border-gray-200 text-gray-600 hover:border-sky-300'}`}>
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">旅遊興趣（可多選）</label>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map(interest => (
                      <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${interests.includes(interest) ? 'bg-sky-600 text-white border-sky-600' : 'border-gray-200 text-gray-600 hover:border-sky-300'}`}>
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t.ai.itinerary.generating}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      {t.ai.itinerary.generate}
                    </>
                  )}
                </button>
              </form>
            </div>

            {destInfo && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <img src={destInfo.image} alt={destKey} className="w-full h-36 object-cover" />
                <div className="p-4">
                  <p className="text-sm font-semibold text-gray-800 mb-2">推薦美食</p>
                  <ul className="space-y-1">
                    {destInfo.dining.slice(0, 3).map((d, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                        <Utensils className="w-3 h-3 text-orange-400" />{d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 space-y-4">
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mb-4" />
                  <p className="text-gray-600 font-medium">AI 正在為您規劃最佳行程…</p>
                  <p className="text-gray-400 text-sm mt-1">分析目的地特色與您的偏好</p>
                </motion.div>
              )}

              {!loading && itinerary && (
                <motion.div key="result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-bold text-gray-900 text-lg">{destination} 行程規劃</h2>
                        <p className="text-gray-500 text-sm">{itinerary.length} 天 {itinerary.length - 1} 夜 · {budget} · {groupSize} 人</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                        <button
                          onClick={() => { setEditMode(m => !m); setEditingActivity(null); }}
                          className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition font-medium border ${editMode ? 'bg-sky-600 text-white border-sky-600' : 'bg-white border-gray-200 text-gray-600 hover:border-sky-300'}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />{editMode ? '完成編輯' : '手動調整'}
                        </button>
                        <Link to="/ai/passport" className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition font-medium">
                          <BookMarked className="w-3.5 h-3.5" />旅遊護照
                        </Link>
                        {!saved ? (
                          <button onClick={handleSave} className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-100 transition font-medium">
                            <Save className="w-3.5 h-3.5" />儲存行程
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />已儲存
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {itinerary.map((day, i) => (
                      <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <button
                          onClick={() => setExpandedDay(expandedDay === i ? null : i)}
                          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              D{day.day}
                            </div>
                            <div className="text-left">
                              {editMode ? (
                                <input
                                  value={day.theme}
                                  onChange={e => handleEditDayTheme(i, e.target.value)}
                                  onClick={e => e.stopPropagation()}
                                  className="font-semibold text-gray-900 text-sm bg-transparent border-b border-sky-300 focus:outline-none w-36"
                                />
                              ) : (
                                <p className="font-semibold text-gray-900 text-sm">{day.theme}</p>
                              )}
                              <p className="text-gray-400 text-xs">{day.date}</p>
                            </div>
                          </div>
                          {expandedDay === i ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>

                        <AnimatePresence>
                          {expandedDay === i && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-100">
                              <div className="p-4 space-y-3">
                                {day.activities.map((act, j) => {
                                  const isEditing = editingActivity?.dayIdx === i && editingActivity?.actIdx === j;
                                  const stampKey = `${i}-${j}`;
                                  const isStamped = stampedKeys.has(stampKey);
                                  return (
                                    <div key={j} className="flex items-start gap-3">
                                      <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                                          {timeIcon(act.time)}
                                          <span>{act.time}</span>
                                        </div>
                                        {j < day.activities.length - 1 && <div className="w-px h-6 bg-gray-200 mt-1" />}
                                      </div>
                                      {isEditing ? (
                                        <div className="flex-1 bg-sky-50 border border-sky-200 rounded-xl p-3 space-y-2">
                                          <div className="flex gap-2">
                                            <input
                                              value={editForm.time}
                                              onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))}
                                              className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
                                              placeholder="時間"
                                            />
                                            <input
                                              value={editForm.title}
                                              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                                              className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
                                              placeholder="地點名稱"
                                            />
                                          </div>
                                          <textarea
                                            value={editForm.description}
                                            onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-1 focus:ring-sky-400"
                                            rows={2}
                                            placeholder="說明"
                                          />
                                          <div className="flex gap-2">
                                            <button onClick={() => handleSaveActivity(i, j)} className="flex-1 text-xs bg-sky-600 text-white py-1.5 rounded-lg font-medium hover:bg-sky-700 transition">儲存</button>
                                            <button onClick={() => setEditingActivity(null)} className="flex-1 text-xs border border-gray-200 text-gray-500 py-1.5 rounded-lg hover:bg-gray-50 transition">取消</button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex-1 bg-slate-50 rounded-xl p-3">
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="text-sky-600">{iconMap[act.icon]}</span>
                                                <p className="font-medium text-gray-900 text-sm">{act.title}</p>
                                              </div>
                                              <p className="text-gray-500 text-xs leading-relaxed">{act.description}</p>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                              <button
                                                onClick={() => handleStamp(i, j, act)}
                                                title="此一遊 — 加入旅遊護照"
                                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition ${isStamped ? 'bg-amber-100 text-amber-700 cursor-default' : 'hover:bg-amber-50 text-gray-400 hover:text-amber-600 border border-transparent hover:border-amber-200'}`}
                                              >
                                                <BookMarked className="w-3.5 h-3.5" />
                                                {isStamped ? '已蓋章' : '此一遊'}
                                              </button>
                                              {editMode && (
                                                <>
                                                  <button
                                                    onClick={() => { setEditingActivity({ dayIdx: i, actIdx: j }); setEditForm({ time: act.time, title: act.title, description: act.description }); }}
                                                    className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition"
                                                  >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button
                                                    onClick={() => handleDeleteActivity(i, j)}
                                                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                                                  >
                                                    <X className="w-3.5 h-3.5" />
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}

                                {editMode && (
                                  <button
                                    onClick={() => handleAddActivity(i)}
                                    className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-sky-300 hover:text-sky-500 transition text-xs font-medium"
                                  >
                                    <PlusCircle className="w-4 h-4" />新增活動
                                  </button>
                                )}

                                <div className="border-t border-dashed border-gray-200 pt-3 grid grid-cols-2 gap-2">
                                  <div className="bg-orange-50 rounded-xl p-2.5">
                                    {editMode ? (
                                      <>
                                        <p className="text-xs font-semibold text-orange-600 mb-1 flex items-center gap-1"><Utensils className="w-3 h-3" />今日推薦美食</p>
                                        <input
                                          value={day.dining}
                                          onChange={e => setItinerary(it => it!.map((d, di) => di !== i ? d : { ...d, dining: e.target.value }))}
                                          className="w-full px-2 py-1 border border-orange-200 rounded-lg text-xs bg-white focus:outline-none"
                                        />
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-xs font-semibold text-orange-600 mb-0.5 flex items-center gap-1"><Utensils className="w-3 h-3" />今日推薦美食</p>
                                        <p className="text-xs text-gray-600">{day.dining}</p>
                                      </>
                                    )}
                                  </div>
                                  <div className="bg-amber-50 rounded-xl p-2.5">
                                    {editMode ? (
                                      <>
                                        <p className="text-xs font-semibold text-amber-600 mb-1 flex items-center gap-1"><Star className="w-3 h-3" />旅遊小貼士</p>
                                        <input
                                          value={day.tip}
                                          onChange={e => setItinerary(it => it!.map((d, di) => di !== i ? d : { ...d, tip: e.target.value }))}
                                          className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs bg-white focus:outline-none"
                                        />
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-xs font-semibold text-amber-600 mb-0.5 flex items-center gap-1"><Star className="w-3 h-3" />旅遊小貼士</p>
                                        <p className="text-xs text-gray-600">{day.tip}</p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {!loading && !itinerary && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
                  <Sparkles className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">填寫左側表單，AI 立即為您生成行程</p>
                  <p className="text-gray-300 text-sm mt-1">支援台北、東京、京都、大阪、首爾、峇里島等熱門目的地</p>
                </motion.div>
              )}
            </AnimatePresence>

            {plans.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-600" />已儲存的行程
                  </h3>
                  <Link to="/ai/passport" className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium transition">
                    <BookMarked className="w-3.5 h-3.5" />旅遊護照
                  </Link>
                </div>
                <div className="space-y-2">
                  {plans.map(plan => {
                    const planItinerary = plan.plan_data?.itinerary || [];
                    const isOpen = expandedPlanId === plan.id;
                    return (
                      <div key={plan.id} className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                        <div
                          role="button"
                          tabIndex={0}
                          className="w-full flex items-center justify-between p-3 hover:bg-slate-100 transition text-left cursor-pointer"
                          onClick={() => {
                            setExpandedPlanId(isOpen ? null : plan.id);
                            setExpandedPlanDay(null);
                          }}
                          onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setExpandedPlanId(isOpen ? null : plan.id);
                              setExpandedPlanDay(null);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">{plan.title}</p>
                              <p className="text-gray-400 text-xs mt-0.5">
                                {new Date(plan.start_date).toLocaleDateString('zh-TW')} ~ {new Date(plan.end_date).toLocaleDateString('zh-TW')}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); handleDelete(plan.id); }}
                            className="text-red-400 hover:text-red-600 transition p-1.5 hover:bg-red-50 rounded-lg flex-shrink-0 ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <AnimatePresence>
                          {isOpen && planItinerary.length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden border-t border-slate-200"
                            >
                              <div className="p-3 space-y-2">
                                {planItinerary.map((day, i) => (
                                  <div key={i} className="bg-white rounded-xl overflow-hidden border border-slate-100">
                                    <button
                                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition"
                                      onClick={() => setExpandedPlanDay(expandedPlanDay === i ? null : i)}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                          D{day.day}
                                        </div>
                                        <div className="text-left">
                                          <p className="text-sm font-semibold text-gray-900">{day.theme}</p>
                                          <p className="text-xs text-gray-400">{day.date}</p>
                                        </div>
                                      </div>
                                      {expandedPlanDay === i
                                        ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                                        : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                                    </button>

                                    <AnimatePresence>
                                      {expandedPlanDay === i && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.15 }}
                                          className="overflow-hidden border-t border-slate-100"
                                        >
                                          <div className="p-3 space-y-2">
                                            {day.activities.map((act, j) => (
                                              <div key={j} className="flex items-start gap-2">
                                                <div className="flex flex-col items-center">
                                                  <div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                                                    {timeIcon(act.time)}
                                                    <span>{act.time}</span>
                                                  </div>
                                                  {j < day.activities.length - 1 && <div className="w-px h-5 bg-gray-200 mt-1" />}
                                                </div>
                                                <div className="flex-1 bg-slate-50 rounded-lg p-2">
                                                  <div className="flex items-center gap-1 mb-0.5">
                                                    <span className="text-sky-600">{iconMap[act.icon]}</span>
                                                    <p className="font-medium text-gray-900 text-xs">{act.title}</p>
                                                  </div>
                                                  <p className="text-gray-400 text-xs leading-relaxed">{act.description}</p>
                                                </div>
                                              </div>
                                            ))}
                                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-dashed border-gray-200">
                                              <div className="bg-orange-50 rounded-lg p-2">
                                                <p className="text-xs font-semibold text-orange-600 mb-0.5 flex items-center gap-1"><Utensils className="w-3 h-3" />推薦美食</p>
                                                <p className="text-xs text-gray-500">{day.dining}</p>
                                              </div>
                                              <div className="bg-amber-50 rounded-lg p-2">
                                                <p className="text-xs font-semibold text-amber-600 mb-0.5 flex items-center gap-1"><Star className="w-3 h-3" />小貼士</p>
                                                <p className="text-xs text-gray-500">{day.tip}</p>
                                              </div>
                                            </div>
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!loadingPlans && plans.length === 0 && !itinerary && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-center text-gray-400 text-sm">
                尚無儲存的行程
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItineraryPlanner;

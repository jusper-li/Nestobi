import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookMarked, Calendar, Compass, Globe, MapPin, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';

interface Stamp {
  id: string;
  place_name: string;
  destination: string;
  visited_date: string | null;
  category: string;
  notes: string;
  source: string;
}

const CATEGORIES = ['all', 'culture', 'food', 'nature', 'shopping', 'adventure', 'nightlife'] as const;

const TravelPassport: React.FC = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const locale = lang === 'ja' ? 'ja' : lang === 'ko' ? 'ko' : lang === 'en' ? 'en' : 'zh';
  const pick = (zh: string, en: string, ja: string, ko: string) => (locale === 'en' ? en : locale === 'ja' ? ja : locale === 'ko' ? ko : zh);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof CATEGORIES)[number]>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ place_name: '', destination: '', visited_date: '', category: 'culture', notes: '' });

  const labels = useMemo(() => ({
    all: pick('全部', 'All', 'すべて', '전체'),
    culture: pick('文化古蹟', 'Culture', '文化', '문화'),
    food: pick('美食', 'Food', 'グルメ', '미식'),
    nature: pick('自然景觀', 'Nature', '自然', '자연'),
    shopping: pick('購物', 'Shopping', '買い物', '쇼핑'),
    adventure: pick('冒險運動', 'Adventure', '冒険', '모험'),
    nightlife: pick('夜生活', 'Nightlife', '夜遊び', '야간활동'),
  }), [locale]);

  useEffect(() => {
    const fetchStamps = async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('travel_passport').select('*').eq('user_id', user.id).order('visited_date', { ascending: false, nullsFirst: false });
      setStamps((data || []) as Stamp[]);
      setLoading(false);
    };
    fetchStamps();
  }, [user]);

  const filtered = stamps.filter((s) => filter === 'all' || s.category === filter);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.place_name || !form.destination) return;
    await supabase.from('travel_passport').insert({
      user_id: user.id,
      place_name: form.place_name,
      destination: form.destination,
      visited_date: form.visited_date || null,
      category: form.category,
      notes: form.notes,
      source: 'manual',
    });
    setForm({ place_name: '', destination: '', visited_date: '', category: 'culture', notes: '' });
    setShowForm(false);
    const { data } = await supabase.from('travel_passport').select('*').eq('user_id', user.id).order('visited_date', { ascending: false, nullsFirst: false });
    setStamps((data || []) as Stamp[]);
  };

  const onDelete = async (id: string) => {
    await supabase.from('travel_passport').delete().eq('id', id);
    setStamps((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead title={pick('旅遊護照', 'Travel Passport', 'トラベルパスポート', '여행 패스포트')} description={pick('紀錄每一個走過的足跡', 'Track your travel stamps', '旅の記録を残す', '여행 기록을 남기기')} />
      <Navigation />
      <div className="bg-gradient-to-r from-[#C09A6A] to-[#8B6840] text-white">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <p className="text-white/70 text-xs font-semibold tracking-widest uppercase mb-1">Nestobi Travel</p>
          <h1 className="text-3xl font-bold mb-1">{pick('旅遊護照', 'Travel Passport', 'トラベルパスポート', '여행 패스포트')}</h1>
          <p className="text-white/80 text-sm">{pick('紀錄每一個走過的足跡，蓋上專屬章。', 'Collect your travel stamps and memories.', '旅の足跡を記録しましょう。', '여행의 발자취를 기록하세요.')}</p>
          <div className="mt-4 flex items-center gap-3">
            <Link to="/ai/itinerary" className="flex items-center gap-1.5 px-4 py-2 bg-white/20 rounded-xl text-sm border border-white/30"><BookMarked className="w-4 h-4" />{pick('行程規劃', 'Itinerary', '旅程', '일정')}</Link>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 bg-white text-[#8B6840] rounded-xl text-sm font-bold"><Plus className="w-4 h-4" />{pick('新增足跡', 'Add Stamp', 'スタンプ追加', '기록 추가')}</button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 rounded-full text-xs border ${filter === c ? 'bg-[#1a2744] text-white border-[#1a2744]' : 'bg-white border-gray-200 text-gray-600'}`}>
              {labels[c]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-[#C09A6A] border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Compass className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-gray-400 font-medium text-lg mb-1">{pick('護照還是空的', 'Passport is empty', 'まだスタンプがありません', '아직 기록이 없습니다')}</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((stamp) => (
              <div key={stamp.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 relative group">
                <div className="absolute top-4 right-4 text-xs text-[#8B6840]">{labels[(stamp.category as keyof typeof labels) || 'all']}</div>
                <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">{stamp.place_name}</h3>
                <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2"><MapPin className="w-3.5 h-3.5 text-[#C09A6A]" /><span>{stamp.destination}</span></div>
                {stamp.visited_date && <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2"><Calendar className="w-3.5 h-3.5" />{new Date(stamp.visited_date).toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'ja' ? 'ja-JP' : lang === 'ko' ? 'ko-KR' : 'zh-TW')}</div>}
                {stamp.notes && <p className="text-xs text-gray-500 leading-relaxed mt-2">{stamp.notes}</p>}
                <button onClick={() => onDelete(stamp.id)} className="absolute bottom-3 right-3 p-1.5 rounded-lg text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-4">{pick('新增旅遊足跡', 'Add Travel Stamp', '旅行スタンプを追加', '여행 기록 추가')}</h2>
            <form onSubmit={onAdd} className="space-y-3">
              <input required value={form.place_name} onChange={(e) => setForm((f) => ({ ...f, place_name: e.target.value }))} placeholder={pick('地點名稱', 'Place name', '場所名', '장소명')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              <input required value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} placeholder={pick('城市 / 地區', 'City / Region', '都市 / 地域', '도시 / 지역')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              <input type="date" value={form.visited_date} onChange={(e) => setForm((f) => ({ ...f, visited_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white">
                {CATEGORIES.filter((c) => c !== 'all').map((c) => <option key={c} value={c}>{labels[c]}</option>)}
              </select>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder={pick('備註', 'Notes', 'メモ', '메모')} rows={3} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" />
              <button type="submit" className="w-full bg-[#C09A6A] hover:bg-[#8B6840] text-white font-semibold py-3 rounded-xl">{pick('儲存', 'Save', '保存', '저장')}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelPassport;

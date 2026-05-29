import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookMarked, Calendar, Compass, MapPin, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { localeByLang, normalizeLang, pickByLang } from '../../lib/i18n';

interface Stamp {
  id: string;
  place_name: string;
  destination: string;
  visited_date: string | null;
  category: string;
  notes: string;
}

const CATEGORIES = ['all', 'culture', 'food', 'nature', 'shopping', 'adventure', 'nightlife'] as const;

const TravelPassport: React.FC = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const locale = localeByLang(normalizedLang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);

  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof CATEGORIES)[number]>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    place_name: '',
    destination: '',
    visited_date: '',
    category: 'culture',
    notes: '',
  });

  const labels = useMemo(
    () => ({
      all: pick('全部', 'All', 'すべて', '전체'),
      culture: pick('文化古蹟', 'Culture', '文化', '문화'),
      food: pick('美食', 'Food', 'グルメ', '미식'),
      nature: pick('自然景觀', 'Nature', '自然', '자연'),
      shopping: pick('購物', 'Shopping', 'ショッピング', '쇼핑'),
      adventure: pick('冒險運動', 'Adventure', '冒険', '모험'),
      nightlife: pick('夜生活', 'Nightlife', 'ナイトライフ', '야간활동'),
    }),
    [normalizedLang]
  );

  useEffect(() => {
    const fetchStamps = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('travel_passport')
        .select('id,place_name,destination,visited_date,category,notes')
        .eq('user_id', user.id)
        .order('visited_date', { ascending: false, nullsFirst: false });
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
    const { data } = await supabase
      .from('travel_passport')
      .select('id,place_name,destination,visited_date,category,notes')
      .eq('user_id', user.id)
      .order('visited_date', { ascending: false, nullsFirst: false });
    setStamps((data || []) as Stamp[]);
  };

  const onDelete = async (id: string) => {
    await supabase.from('travel_passport').delete().eq('id', id);
    setStamps((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title={pick('旅遊護照', 'Travel Passport', '旅のパスポート', '여행 패스포트')}
        description={pick('記錄每一次旅行足跡與回憶。', 'Track your travel stamps and memories.', '旅の足跡と記録を残しましょう。', '여행 기록과 추억을 저장하세요.')}
      />
      <Navigation />

      <div className="bg-gradient-to-r from-[#C09A6A] to-[#8B6840] text-white">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/70">Nestobi Travel</p>
          <h1 className="mb-1 text-3xl font-bold">{pick('旅遊護照', 'Travel Passport', '旅のパスポート', '여행 패스포트')}</h1>
          <p className="text-sm text-white/80">{pick('記錄每一趟旅程，蓋上專屬旅行印章。', 'Collect your travel moments and stamps.', '旅の思い出にスタンプを追加しましょう。', '여행 순간을 스탬프로 남겨보세요.')}</p>
          <div className="mt-4 flex items-center gap-3">
            <Link to="/ai/itinerary" className="flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/20 px-4 py-2 text-sm">
              <BookMarked className="h-4 w-4" />
              {pick('行程規劃', 'Itinerary', '旅程プラン', '일정 플래너')}
            </Link>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#8B6840]">
              <Plus className="h-4 w-4" />
              {pick('新增足跡', 'Add Stamp', 'スタンプ追加', '스탬프 추가')}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                filter === c ? 'border-[#1a2744] bg-[#1a2744] text-white' : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              {labels[c]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#C09A6A] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Compass className="mx-auto mb-4 h-16 w-16 text-slate-200" />
            <p className="mb-1 text-lg font-medium text-gray-400">{pick('護照還是空的', 'Passport is empty', 'まだ記録がありません', '아직 기록이 없습니다')}</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((stamp) => (
              <div key={stamp.id} className="group relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="absolute right-4 top-4 text-xs text-[#8B6840]">{labels[(stamp.category as keyof typeof labels) || 'all']}</div>
                <h3 className="mb-1 text-base font-bold leading-tight text-gray-900">{stamp.place_name}</h3>
                <div className="mb-2 flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin className="h-3.5 w-3.5 text-[#C09A6A]" />
                  <span>{stamp.destination}</span>
                </div>
                {stamp.visited_date && (
                  <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-400">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(stamp.visited_date).toLocaleDateString(locale)}
                  </div>
                )}
                {stamp.notes && <p className="mt-2 text-xs leading-relaxed text-gray-500">{stamp.notes}</p>}
                <button onClick={() => onDelete(stamp.id)} className="absolute bottom-3 right-3 rounded-lg p-1.5 text-gray-300 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold text-gray-900">{pick('新增旅遊足跡', 'Add Travel Stamp', '旅の記録を追加', '여행 기록 추가')}</h2>
            <form onSubmit={onAdd} className="space-y-3">
              <input
                required
                value={form.place_name}
                onChange={(e) => setForm((f) => ({ ...f, place_name: e.target.value }))}
                placeholder={pick('地點名稱', 'Place name', '場所名', '장소 이름')}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              />
              <input
                required
                value={form.destination}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                placeholder={pick('城市 / 地區', 'City / Region', '都市 / 地域', '도시 / 지역')}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              />
              <input
                type="date"
                value={form.visited_date}
                onChange={(e) => setForm((f) => ({ ...f, visited_date: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              />
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
              >
                {CATEGORIES.filter((c) => c !== 'all').map((c) => (
                  <option key={c} value={c}>
                    {labels[c]}
                  </option>
                ))}
              </select>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder={pick('備註', 'Notes', 'メモ', '메모')}
                rows={3}
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              />
              <button type="submit" className="w-full rounded-xl bg-[#C09A6A] py-3 font-semibold text-white hover:bg-[#8B6840]">
                {pick('儲存', 'Save', '保存', '저장')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelPassport;


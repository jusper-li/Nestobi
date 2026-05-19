import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookMarked, MapPin, Calendar, Plus, Trash2, X,
  Globe, Award, Camera, Utensils, ShoppingBag, Star, Compass, Moon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
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
  created_at: string;
}

const CATEGORIES = [
  { key: 'all',       label: '全部',   icon: Globe,      color: 'bg-slate-100 text-slate-600' },
  { key: 'culture',   label: '文化古蹟', icon: Camera,     color: 'bg-sky-100 text-sky-700' },
  { key: 'food',      label: '美食',   icon: Utensils,   color: 'bg-orange-100 text-orange-700' },
  { key: 'nature',    label: '自然景觀', icon: MapPin,     color: 'bg-green-100 text-green-700' },
  { key: 'shopping',  label: '購物',   icon: ShoppingBag,color: 'bg-pink-100 text-pink-700' },
  { key: 'adventure', label: '冒險運動', icon: Star,       color: 'bg-yellow-100 text-yellow-700' },
  { key: 'nightlife', label: '夜生活',  icon: Moon,       color: 'bg-indigo-100 text-indigo-700' },
];

const CAT_BADGE: Record<string, string> = {
  culture:   'bg-sky-100 text-sky-700 border-sky-200',
  food:      'bg-orange-100 text-orange-700 border-orange-200',
  nature:    'bg-green-100 text-green-700 border-green-200',
  shopping:  'bg-pink-100 text-pink-700 border-pink-200',
  adventure: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  nightlife: 'bg-slate-100 text-slate-600 border-slate-200',
};

const CAT_LABEL: Record<string, string> = {
  culture: '文化古蹟', food: '美食', nature: '自然景觀',
  shopping: '購物', adventure: '冒險運動', nightlife: '夜生活',
};

const EMPTY_FORM = { place_name: '', destination: '', visited_date: '', category: 'culture', notes: '' };

const TravelPassport: React.FC = () => {
  const { user } = useAuth();
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [destFilter, setDestFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchStamps = async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('travel_passport')
      .select('*')
      .eq('user_id', user.id)
      .order('visited_date', { ascending: false, nullsFirst: false });
    setStamps((data || []) as Stamp[]);
    setLoading(false);
  };

  useEffect(() => { fetchStamps(); }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.place_name || !form.destination) return;
    setSaving(true);
    await supabase.from('travel_passport').insert({
      user_id: user.id,
      place_name: form.place_name,
      destination: form.destination,
      visited_date: form.visited_date || null,
      category: form.category,
      notes: form.notes,
      source: 'manual',
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
    fetchStamps();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('travel_passport').delete().eq('id', id);
    setStamps(prev => prev.filter(s => s.id !== id));
  };

  const destinations = ['all', ...Array.from(new Set(stamps.map(s => s.destination).filter(Boolean)))];

  const filtered = stamps.filter(s =>
    (filter === 'all' || s.category === filter) &&
    (destFilter === 'all' || s.destination === destFilter)
  );

  const totalDests = new Set(stamps.map(s => s.destination).filter(Boolean)).size;
  const catCounts = stamps.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1; return acc;
  }, {});
  const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead title="旅遊護照" description="記錄每一個走過的足跡，建立專屬的旅遊印章護照，回顧您的旅行回憶。" keywords="旅遊護照, 旅行紀錄, 旅遊印章, 足跡" pageType="default" breadcrumbs={[{name:'首頁',url:'/'},{name:'旅遊護照',url:'/ai/passport'}]} />
      <Navigation />

      {/* Passport cover header */}
      <div className="bg-gradient-to-r from-[#C09A6A] to-[#8B6840] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />
        <div className="relative max-w-5xl mx-auto px-4 py-10 flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-shrink-0 w-24 h-32 bg-white/20 border-2 border-white/40 rounded-xl flex flex-col items-center justify-center gap-2 shadow-inner">
            <Compass className="w-10 h-10 text-white" />
            <span className="text-[10px] text-white/80 font-bold tracking-widest uppercase">Passport</span>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-white/70 text-xs font-semibold tracking-widest uppercase mb-1">Nestobi Travel</p>
            <h1 className="text-3xl font-bold mb-1">旅遊護照</h1>
            <p className="text-white/70 text-sm">記錄每一個走過的足跡，蓋上專屬的旅遊印章</p>
            <div className="flex flex-wrap gap-4 mt-4 justify-center sm:justify-start">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stamps.length}</p>
                <p className="text-xs text-white/60">總印章數</p>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{totalDests}</p>
                <p className="text-xs text-white/60">目的地</p>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{topCat ? CAT_LABEL[topCat[0]] || topCat[0] : '—'}</p>
                <p className="text-xs text-white/60">最多類型</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link to="/ai/itinerary" className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition border border-white/30">
              <BookMarked className="w-4 h-4" />行程規劃
            </Link>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-[#8B6840] hover:bg-white/90 rounded-xl text-sm font-bold transition shadow-md"
            >
              <Plus className="w-4 h-4" />新增足跡
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition border ${filter === key ? 'bg-[#1a2744] text-white border-[#1a2744]' : 'bg-white border-gray-200 text-gray-600 hover:border-[#1a2744]/30'}`}
            >
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {destinations.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {destinations.map(d => (
              <button
                key={d}
                onClick={() => setDestFilter(d)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition border ${destFilter === d ? 'bg-[#C09A6A] text-white border-[#C09A6A]' : 'bg-white border-gray-200 text-gray-600 hover:border-[#C09A6A]/40'}`}
              >
                {d === 'all' ? '所有目的地' : d}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#C09A6A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Compass className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-gray-400 font-medium text-lg mb-1">護照還是空的</p>
            <p className="text-gray-300 text-sm mb-6">去行程規劃頁面點擊「此一遊」，或手動新增旅行足跡</p>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C09A6A] text-white rounded-xl font-medium hover:bg-[#8B6840] transition">
              <Plus className="w-4 h-4" />新增第一個足跡
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filtered.map((stamp, idx) => (
              <motion.div
                key={stamp.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 relative group hover:shadow-md transition-shadow"
              >
                {/* Stamp circle decoration */}
                <div className="absolute top-4 right-4 w-14 h-14 rounded-full border-2 border-dashed border-[#C09A6A]/30 flex items-center justify-center opacity-40 group-hover:opacity-70 transition-opacity">
                  <Award className="w-6 h-6 text-[#C09A6A]" />
                </div>

                <div className="pr-12">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border mb-3 ${CAT_BADGE[stamp.category] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {CAT_LABEL[stamp.category] || stamp.category}
                  </span>
                  <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">{stamp.place_name}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-[#C09A6A]" />
                    <span>{stamp.destination}</span>
                  </div>
                  {stamp.visited_date && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(stamp.visited_date).toLocaleDateString('zh-TW')}
                    </div>
                  )}
                  {stamp.notes && (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mt-2 pt-2 border-t border-gray-50">{stamp.notes}</p>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(stamp.id)}
                  className="absolute bottom-3 right-3 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {stamp.source === 'itinerary' && (
                  <div className="absolute bottom-3 left-5 text-[10px] text-gray-300 flex items-center gap-0.5">
                    <BookMarked className="w-3 h-3" />行程匯入
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Add Stamp Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">新增旅行足跡</h2>
                  <p className="text-gray-400 text-xs mt-0.5">將已去過的地方加入您的旅遊護照</p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">地點名稱 *</label>
                  <input
                    value={form.place_name}
                    onChange={e => setForm(f => ({ ...f, place_name: e.target.value }))}
                    required
                    placeholder="如：故宮博物院、士林夜市"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C09A6A]/40 focus:border-[#C09A6A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">目的地 / 城市 *</label>
                  <input
                    value={form.destination}
                    onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                    required
                    placeholder="如：台北、東京、首爾"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C09A6A]/40 focus:border-[#C09A6A]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">造訪日期</label>
                    <input
                      type="date"
                      value={form.visited_date}
                      onChange={e => setForm(f => ({ ...f, visited_date: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C09A6A]/40 focus:border-[#C09A6A]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">分類</label>
                    <select
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C09A6A]/40 focus:border-[#C09A6A] bg-white"
                    >
                      {CATEGORIES.slice(1).map(c => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">旅遊回憶 / 備註</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="寫下這趟旅行的回憶、心得或小貼士…"
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C09A6A]/40 focus:border-[#C09A6A] resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-[#C09A6A] hover:bg-[#8B6840] text-white font-semibold py-3 rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <BookMarked className="w-4 h-4" />}
                  蓋上印章
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TravelPassport;

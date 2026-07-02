import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, Save, X, Eye, EyeOff, GripVertical, Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/auditLog';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_published: boolean;
}

const EMPTY: Omit<FAQ, 'id'> = {
  question: '',
  answer: '',
  category: '一般',
  sort_order: 0,
  is_published: true,
};

const SuperAdminFAQ: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FAQ | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [saving, setSaving] = useState(false);

  const fetchFaqs = async () => {
    const { data } = await supabase
      .from('faqs')
      .select('*')
      .order('category')
      .order('sort_order');
    setFaqs((data || []) as FAQ[]);
    setLoading(false);
  };

  useEffect(() => { fetchFaqs(); }, []);

  const categories = ['all', ...Array.from(new Set(faqs.map(f => f.category)))];

  const filtered = faqs.filter(f => {
    if (filterCat !== 'all' && f.category !== filterCat) return false;
    if (search && !f.question.includes(search) && !f.answer.includes(search)) return false;
    return true;
  });

  const handleSave = async () => {
    if (!editing || !editing.question.trim() || !editing.answer.trim()) return;
    setSaving(true);
    if (isNew) {
      const { question, answer, category, sort_order, is_published } = editing;
      const { data, error } = await supabase.from('faqs').insert({ question, answer, category, sort_order, is_published }).select('id').maybeSingle();
      if (!error) await logAdminAction('create_faq', 'faqs', data?.id || null, { question, category, sort_order, is_published });
    } else {
      const { id, ...rest } = editing;
      const { error } = await supabase.from('faqs').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id);
      if (!error) await logAdminAction('update_faq', 'faqs', id, { question: rest.question, category: rest.category, sort_order: rest.sort_order, is_published: rest.is_published });
    }
    setEditing(null);
    setIsNew(false);
    setSaving(false);
    fetchFaqs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此 FAQ？')) return;
    await supabase.from('faqs').delete().eq('id', id);
    await logAdminAction('delete_faq', 'faqs', id);
    fetchFaqs();
  };

  const togglePublish = async (faq: FAQ) => {
    await supabase.from('faqs').update({ is_published: !faq.is_published }).eq('id', faq.id);
    await logAdminAction(faq.is_published ? 'unpublish_faq' : 'publish_faq', 'faqs', faq.id, { question: faq.question, category: faq.category });
    fetchFaqs();
  };

  const startNew = () => {
    setEditing({ id: '', ...EMPTY, sort_order: faqs.length });
    setIsNew(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">常見問題管理</h1>
          <p className="text-gray-500 text-sm mt-0.5">管理前台 FAQ 頁面的問答內容</p>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />新增問題
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋問題或答案..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition ${filterCat === cat ? 'bg-amber-500 text-white border-amber-500' : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300'}`}
            >
              {cat === 'all' ? '全部' : cat}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-3">共 {filtered.length} 筆</p>

      {/* Edit Modal */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">{isNew ? '新增常見問題' : '編輯常見問題'}</h3>
                <button onClick={() => { setEditing(null); setIsNew(false); }} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分類</label>
                  <input
                    type="text"
                    value={editing.category}
                    onChange={e => setEditing({ ...editing, category: e.target.value })}
                    placeholder="例如：訂房服務、AI 功能"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    list="faq-categories"
                  />
                  <datalist id="faq-categories">
                    {Array.from(new Set(faqs.map(f => f.category))).map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">問題</label>
                  <input
                    type="text"
                    value={editing.question}
                    onChange={e => setEditing({ ...editing, question: e.target.value })}
                    placeholder="輸入問題..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">答案</label>
                  <textarea
                    value={editing.answer}
                    onChange={e => setEditing({ ...editing, answer: e.target.value })}
                    placeholder="輸入答案..."
                    rows={5}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 resize-none"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">排序（數字越小越前面）</label>
                    <input
                      type="number"
                      value={editing.sort_order}
                      onChange={e => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    />
                  </div>
                  <div className="pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editing.is_published}
                        onChange={e => setEditing({ ...editing, is_published: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                      />
                      <span className="text-sm text-gray-700">公開顯示</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
                <button onClick={() => { setEditing(null); setIsNew(false); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition">取消</button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editing.question.trim() || !editing.answer.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 disabled:opacity-50 transition"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  儲存
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAQ List */}
      <div className="space-y-2">
        {filtered.map(faq => (
          <div
            key={faq.id}
            className={`bg-white rounded-xl border shadow-sm p-4 flex gap-3 items-start ${faq.is_published ? 'border-gray-100' : 'border-orange-200 bg-orange-50/30'}`}
          >
            <GripVertical className="w-4 h-4 text-gray-300 mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{faq.category}</span>
                {!faq.is_published && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">隱藏中</span>}
              </div>
              <p className="font-medium text-gray-900 text-sm">{faq.question}</p>
              <p className="text-gray-500 text-xs mt-1 line-clamp-2">{faq.answer}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => togglePublish(faq)} className="p-1.5 hover:bg-gray-100 rounded-lg transition" title={faq.is_published ? '隱藏' : '顯示'}>
                {faq.is_published ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
              </button>
              <button onClick={() => { setEditing(faq); setIsNew(false); }} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <Pencil className="w-4 h-4 text-gray-400" />
              </button>
              <button onClick={() => handleDelete(faq.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            {search || filterCat !== 'all' ? '沒有符合條件的問題' : '尚未建立常見問題'}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminFAQ;

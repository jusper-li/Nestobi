import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Save, X, Eye, EyeOff, GripVertical, Search } from 'lucide-react';
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
  category: 'General',
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
    const { data } = await supabase.from('faqs').select('*').order('category').order('sort_order');
    setFaqs((data || []) as FAQ[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const categories = useMemo(() => ['all', ...Array.from(new Set(faqs.map(item => item.category)))], [faqs]);

  const filtered = faqs.filter(item => {
    if (filterCat !== 'all' && item.category !== filterCat) return false;
    if (search && !item.question.toLowerCase().includes(search.toLowerCase()) && !item.answer.toLowerCase().includes(search.toLowerCase())) return false;
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
    if (!window.confirm('確定要刪除這則 FAQ 嗎？')) return;
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FAQ 管理</h1>
          <p className="mt-0.5 text-sm text-gray-500">編輯常見問題並控制是否公開顯示。</p>
        </div>
        <button onClick={startNew} className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600">
          <Plus className="h-4 w-4" />
          新增 FAQ
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋問題或答案"
            className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setFilterCat(category)}
              className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${filterCat === category ? 'border-amber-500 bg-amber-500 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300'}`}
            >
              {category === 'all' ? '全部' : category}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-3 text-xs text-gray-400">Total {filtered.length} items</p>

      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h3 className="font-semibold text-gray-900">{isNew ? '新增 FAQ' : '編輯 FAQ'}</h3>
                <button onClick={() => { setEditing(null); setIsNew(false); }} className="rounded-lg p-1 hover:bg-gray-100">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">分類</label>
                  <input
                    type="text"
                    value={editing.category}
                    onChange={e => setEditing({ ...editing, category: e.target.value })}
                    placeholder="例如：訂房 / 付款 / 帳號"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    list="faq-categories"
                  />
                  <datalist id="faq-categories">
                    {Array.from(new Set(faqs.map(item => item.category))).map(category => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">問題</label>
                  <input
                    type="text"
                    value={editing.question}
                    onChange={e => setEditing({ ...editing, question: e.target.value })}
                    placeholder="請輸入問題"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">答案</label>
                  <textarea
                    value={editing.answer}
                    onChange={e => setEditing({ ...editing, answer: e.target.value })}
                    placeholder="請輸入答案"
                    rows={5}
                    className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="mb-1 block text-sm font-medium text-gray-700">排序</label>
                    <input
                      type="number"
                      value={editing.sort_order}
                      onChange={e => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    />
                  </div>
                  <div className="pt-6">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editing.is_published}
                        onChange={e => setEditing({ ...editing, is_published: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                      />
                      <span className="text-sm text-gray-700">已發布</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
                <button onClick={() => { setEditing(null); setIsNew(false); }} className="rounded-xl px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-100">取消</button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editing.question.trim() || !editing.answer.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                >
                  {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-4 w-4" />}
                  儲存
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {filtered.map(faq => (
          <div key={faq.id} className={`flex items-start gap-3 rounded-xl border bg-white p-4 shadow-sm ${faq.is_published ? 'border-gray-100' : 'border-orange-200 bg-orange-50/30'}`}>
            <GripVertical className="mt-1 h-4 w-4 flex-shrink-0 text-gray-300" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{faq.category}</span>
                {!faq.is_published && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-600">隱藏</span>}
              </div>
              <p className="text-sm font-medium text-gray-900">{faq.question}</p>
              <p className="mt-1 line-clamp-2 text-xs text-gray-500">{faq.answer}</p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              <button onClick={() => togglePublish(faq)} className="rounded-lg p-1.5 transition hover:bg-gray-100" title={faq.is_published ? '取消發布' : '發布'}>
                {faq.is_published ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
              </button>
              <button onClick={() => { setEditing(faq); setIsNew(false); }} className="rounded-lg p-1.5 transition hover:bg-gray-100">
                <Pencil className="h-4 w-4 text-gray-400" />
              </button>
              <button onClick={() => handleDelete(faq.id)} className="rounded-lg p-1.5 transition hover:bg-red-50">
                <Trash2 className="h-4 w-4 text-red-400" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-400">
            {search || filterCat !== 'all' ? '找不到符合條件的 FAQ。' : '目前尚無 FAQ。'}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminFAQ;

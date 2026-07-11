import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, FolderTree, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/auditLog';
import { getCategoryDepth, getCategoryOptionLabel, sortCategoriesForTree, type CategoryTreeItem } from '../../lib/categoryTree';
import { sanitizeText } from '../../lib/security';

interface CategoryRow extends CategoryTreeItem {
  created_at?: string;
  updated_at?: string;
}

interface CategoryForm {
  name: string;
  slug: string;
  parent_id: string;
}

const emptyForm: CategoryForm = { name: '', slug: '', parent_id: '' };

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export default function SuperAdminProductCategories() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [primaryCounts, setPrimaryCounts] = useState<Record<string, number>>({});
  const [linkedCounts, setLinkedCounts] = useState<Record<string, number>>({});
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const orderedCategories = useMemo(() => sortCategoriesForTree(categories), [categories]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    const [categoryRes, productRes, linkRes] = await Promise.all([
      supabase.from('categories').select('id,name,slug,parent_id,created_at,updated_at').order('name', { ascending: true }),
      supabase.from('products').select('category_id'),
      supabase.from('product_category_links').select('category_id'),
    ]);

    if (categoryRes.error) setError(categoryRes.error.message);
    setCategories((categoryRes.data || []) as CategoryRow[]);

    const nextPrimaryCounts: Record<string, number> = {};
    for (const product of productRes.data || []) {
      const categoryId = product.category_id;
      if (categoryId) nextPrimaryCounts[categoryId] = (nextPrimaryCounts[categoryId] || 0) + 1;
    }
    setPrimaryCounts(nextPrimaryCounts);

    const nextLinkedCounts: Record<string, number> = {};
    for (const link of linkRes.data || []) {
      const categoryId = link.category_id;
      if (categoryId) nextLinkedCounts[categoryId] = (nextLinkedCounts[categoryId] || 0) + 1;
    }
    setLinkedCounts(nextLinkedCounts);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setMessage('');
    setError('');
  };

  const startEdit = (category: CategoryRow) => {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      parent_id: category.parent_id || '',
    });
    setMessage('');
    setError('');
  };

  const handleNameChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      name: value,
      slug: prev.slug && editingId ? prev.slug : slugify(value),
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const payload = {
      name: sanitizeText(form.name, 120),
      slug: sanitizeText(form.slug || slugify(form.name), 120),
      parent_id: form.parent_id || null,
      updated_at: new Date().toISOString(),
    };

    if (!payload.name || !payload.slug) {
      setSaving(false);
      setError('請輸入分類名稱與 slug。');
      return;
    }

    if (editingId && payload.parent_id === editingId) {
      setSaving(false);
      setError('分類不能把自己設為父分類。');
      return;
    }

    const result = editingId
      ? await supabase.from('categories').update(payload).eq('id', editingId)
      : await supabase.from('categories').insert(payload);

    if (result.error) {
      setError(result.error.message);
    } else {
      await logAdminAction(editingId ? 'update_product_category' : 'create_product_category', 'categories', editingId || null, {
        name: payload.name,
        slug: payload.slug,
        parent_id: payload.parent_id,
      });
      setMessage(editingId ? '分類已更新' : '分類已新增');
      setEditingId(null);
      setForm(emptyForm);
      await loadData();
    }

    setSaving(false);
  };

  const handleDelete = async (category: CategoryRow) => {
    const usedCount = (primaryCounts[category.id] || 0) + (linkedCounts[category.id] || 0);
    const confirmed = window.confirm(
      usedCount > 0
        ? `「${category.name}」仍有 ${usedCount} 筆商品關聯。刪除後商品會保留，但分類關聯會被移除，確定刪除？`
        : `確定刪除「${category.name}」？`,
    );
    if (!confirmed) return;

    const { error: deleteError } = await supabase.from('categories').delete().eq('id', category.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await logAdminAction('delete_product_category', 'categories', category.id, {
      name: category.name,
      slug: category.slug,
    });

    await loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
            <FolderTree className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">商品分類管理</h1>
            <p className="text-sm text-gray-500">管理大分類、次分類與商品分類樹。</p>
          </div>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          <Plus className="h-4 w-4" />
          新增分類
        </button>
      </div>

      {(message || error) && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${error ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          {error || message}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
                  <tr>
                    <th className="px-5 py-3 text-left">分類</th>
                    <th className="px-4 py-3 text-left">Slug</th>
                    <th className="px-4 py-3 text-right">主分類商品</th>
                    <th className="px-4 py-3 text-right">所有關聯</th>
                    <th className="px-5 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orderedCategories.map(category => {
                    const depth = getCategoryDepth(category, categories);
                    return (
                      <tr key={category.id} className="hover:bg-amber-50/30">
                        <td className="px-5 py-3">
                          <div style={{ paddingLeft: depth * 18 }} className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${depth === 0 ? 'bg-amber-500' : 'bg-gray-300'}`} />
                            <span className="font-semibold text-gray-900">{category.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{category.slug}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{primaryCounts[category.id] || 0}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{linkedCounts[category.id] || 0}</td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => startEdit(category)} className="rounded-lg p-2 text-gray-500 transition hover:bg-amber-100 hover:text-amber-700" aria-label="編輯分類">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => handleDelete(category)} className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600" aria-label="刪除分類">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">{editingId ? '編輯分類' : '新增分類'}</h2>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">分類名稱</span>
              <input value={form.name} onChange={event => handleNameChange(event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-amber-400" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Slug</span>
              <input value={form.slug} onChange={event => setForm(prev => ({ ...prev, slug: slugify(event.target.value) }))} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:ring-2 focus:ring-amber-400" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">父分類</span>
              <select value={form.parent_id} onChange={event => setForm(prev => ({ ...prev, parent_id: event.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-amber-400">
                <option value="">大分類</option>
                {orderedCategories.filter(category => category.id !== editingId).map(category => (
                  <option key={category.id} value={category.id}>{getCategoryOptionLabel(category, categories)}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-5 flex gap-3">
            <button type="button" onClick={startCreate} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
              清空
            </button>
            <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60">
              <Save className="h-4 w-4" />
              {saving ? '儲存中' : '儲存'}
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}

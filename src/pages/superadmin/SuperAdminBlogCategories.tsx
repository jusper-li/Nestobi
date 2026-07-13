import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check, Eye, EyeOff, FolderTree, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/auditLog';
import { sanitizeText } from '../../lib/security';
import { getCategoryDepth, getCategoryOptionLabel, sortCategoriesForTree, type CategoryTreeItem } from '../../lib/categoryTree';

interface CategoryRow extends CategoryTreeItem {
  description: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  display_order: number;
  parent_id: string;
  is_active: boolean;
}

type ModalMode = 'create' | 'edit' | null;

const emptyForm: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  display_order: 0,
  parent_id: '',
  is_active: true,
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function getNextDisplayOrder(categories: CategoryRow[]) {
  if (!categories.length) return 10;
  return Math.max(...categories.map(category => category.display_order || 0)) + 10;
}

export default function SuperAdminBlogCategories() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [primaryCounts, setPrimaryCounts] = useState<Record<string, number>>({});
  const [linkedCounts, setLinkedCounts] = useState<Record<string, number>>({});
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const orderedCategories = useMemo(() => sortCategoriesForTree(categories), [categories]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    const [categoryRes, postRes, linkRes] = await Promise.all([
      supabase
        .from('blog_categories')
        .select('id,name,slug,description,display_order,is_active,parent_id,created_at,updated_at')
        .order('display_order', { ascending: true }),
      supabase.from('blog_posts').select('category'),
      supabase.from('blog_post_category_links').select('category_id'),
    ]);

    if (categoryRes.error) setError(categoryRes.error.message);

    const nextCategories = (categoryRes.data || []) as CategoryRow[];
    setCategories(nextCategories);

    const nameToIds = new Map<string, string[]>();
    for (const category of nextCategories) {
      const ids = nameToIds.get(category.name) || [];
      ids.push(category.id);
      nameToIds.set(category.name, ids);
    }

    const nextPrimaryCounts: Record<string, number> = {};
    for (const post of postRes.data || []) {
      for (const id of nameToIds.get(post.category) || []) {
        nextPrimaryCounts[id] = (nextPrimaryCounts[id] || 0) + 1;
      }
    }
    setPrimaryCounts(nextPrimaryCounts);

    const nextLinkedCounts: Record<string, number> = {};
    for (const link of linkRes.data || []) {
      if (link.category_id) nextLinkedCounts[link.category_id] = (nextLinkedCounts[link.category_id] || 0) + 1;
    }
    setLinkedCounts(nextLinkedCounts);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setForm(emptyForm);
  };

  const startCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      display_order: getNextDisplayOrder(categories),
    });
    setMessage('');
    setError('');
    setModalMode('create');
  };

  const startEdit = (category: CategoryRow) => {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      display_order: category.display_order || 0,
      parent_id: category.parent_id || '',
      is_active: category.is_active,
    });
    setMessage('');
    setError('');
    setModalMode('edit');
  };

  const handleNameChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      name: value,
      slug: prev.slug && editingId ? prev.slug : slugify(value),
    }));
  };

  const updateFormField = <K extends keyof CategoryForm>(key: K, value: CategoryForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const payload = {
        name: sanitizeText(form.name, 120),
        slug: sanitizeText(form.slug || slugify(form.name), 120),
        description: sanitizeText(form.description, 500),
        display_order: Number.isFinite(form.display_order) ? form.display_order : 0,
        parent_id: form.parent_id || null,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      if (!payload.name || !payload.slug) {
        setError('請輸入分類名稱與 slug。');
        return;
      }

      if (editingId && payload.parent_id === editingId) {
        setError('上層分類不能選自己。');
        return;
      }

      const result = editingId
        ? await supabase.from('blog_categories').update(payload).eq('id', editingId)
        : await supabase.from('blog_categories').insert(payload);

      if (result.error) {
        setError(result.error.message);
        return;
      }

      await logAdminAction(editingId ? 'update_blog_category' : 'create_blog_category', 'blog_categories', editingId || null, {
        name: payload.name,
        slug: payload.slug,
        parent_id: payload.parent_id,
      });

      setMessage(editingId ? '文章分類已更新。' : '文章分類已建立。');
      await loadData();
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (category: CategoryRow) => {
    const { error: toggleError } = await supabase
      .from('blog_categories')
      .update({ is_active: !category.is_active, updated_at: new Date().toISOString() })
      .eq('id', category.id);

    if (toggleError) {
      setError(toggleError.message);
      return;
    }

    await logAdminAction(category.is_active ? 'disable_blog_category' : 'enable_blog_category', 'blog_categories', category.id, {
      name: category.name,
      is_active: !category.is_active,
    });

    setCategories(items => items.map(item => (item.id === category.id ? { ...item, is_active: !item.is_active } : item)));
  };

  const handleDelete = async (category: CategoryRow) => {
    const usedCount = (primaryCounts[category.id] || 0) + (linkedCounts[category.id] || 0);
    const confirmed = window.confirm(
      usedCount > 0
        ? `${category.name} 目前被 ${usedCount} 筆資料使用，刪除後相關關聯會失效，確定要刪除嗎？`
        : `確定要刪除分類「${category.name}」嗎？`,
    );
    if (!confirmed) return;

    const { error: deleteError } = await supabase.from('blog_categories').delete().eq('id', category.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await logAdminAction('delete_blog_category', 'blog_categories', category.id);
    setMessage('文章分類已刪除。');
    if (editingId === category.id) closeModal();
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
            <h1 className="text-2xl font-bold text-gray-900">文章分類</h1>
            <p className="text-sm text-gray-500">管理部落格分類、階層與啟用狀態。</p>
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
        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
            error ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {error ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          {error || message}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
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
                  <th className="px-4 py-3 text-right">文章數</th>
                  <th className="px-4 py-3 text-right">關聯數</th>
                  <th className="px-4 py-3 text-center">狀態</th>
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
                          <div>
                            <p className="font-semibold text-gray-900">{category.name}</p>
                            {category.description && <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">{category.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{category.slug}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{primaryCounts[category.id] || 0}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{linkedCounts[category.id] || 0}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(category)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            category.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {category.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {category.is_active ? '啟用' : '停用'}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(category)}
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-amber-100 hover:text-amber-700"
                            aria-label="編輯分類"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(category)}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                            aria-label="刪除分類"
                          >
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
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeModal}>
          <div
            className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="關閉"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-gray-100 px-6 py-5">
              <h3 className="text-lg font-bold text-gray-900">{modalMode === 'edit' ? '編輯分類' : '新增分類'}</h3>
              <p className="mt-1 text-sm text-gray-500">可修改分類名稱、Slug、上層分類、描述、排序與狀態。</p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">分類名稱</span>
                  <input
                    value={form.name}
                    onChange={event => handleNameChange(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-amber-400"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Slug</span>
                  <input
                    value={form.slug}
                    onChange={event => updateFormField('slug', slugify(event.target.value))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:ring-2 focus:ring-amber-400"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">上層分類</span>
                  <select
                    value={form.parent_id}
                    onChange={event => updateFormField('parent_id', event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">無</option>
                    {orderedCategories
                      .filter(category => category.id !== editingId)
                      .map(category => (
                        <option key={category.id} value={category.id}>
                          {getCategoryOptionLabel(category, categories)}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">分類描述</span>
                  <textarea
                    value={form.description}
                    onChange={event => updateFormField('description', event.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-amber-400"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">排序</span>
                    <input
                      type="number"
                      value={form.display_order}
                      onChange={event => updateFormField('display_order', Number(event.target.value))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-amber-400"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">狀態</span>
                    <select
                      value={form.is_active ? 'active' : 'inactive'}
                      onChange={event => updateFormField('is_active', event.target.value === 'active')}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="active">啟用</option>
                      <option value="inactive">停用</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? '儲存中' : '儲存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

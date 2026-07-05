import { useEffect, useMemo, useState } from 'react';
import { FolderPlus, Plus, RefreshCw, Save, Search, Trash2, X, CreditCard as Edit } from 'lucide-react';
import { BLOG_ARTICLES, BLOG_CATEGORIES, type BlogCategory } from '../../data/blogContent';
import {
  type BlogArticleCategoryMap,
  type LoadedBlogArticle,
  loadBlogData,
  normalizeBlogSlug,
  saveBlogArticleCategoryMap,
  saveBlogCategories,
} from '../../lib/blog';
import { supabase } from '../../lib/supabase';
import ImageUpload from '../ImageUpload';
import RichTextEditor from '../RichTextEditor';
import { useLanguage } from '../../contexts/LanguageContext';

interface ArticleFormState {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image: string;
  status: 'draft' | 'published';
  published_at: string;
  category_slug: string;
}

interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

const emptyArticleForm = (categorySlug = ''): ArticleFormState => ({
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  featured_image: '',
  status: 'draft',
  published_at: '',
  category_slug: categorySlug,
});

const emptyCategoryForm = (sortOrder: number): CategoryFormState => ({
  name: '',
  slug: '',
  description: '',
  sort_order: sortOrder,
  is_active: true,
});

const toDatetimeLocal = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const dateLabel = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('zh-TW').format(date);
};

const localCategoryMap = BLOG_ARTICLES.reduce<BlogArticleCategoryMap>((acc, article) => {
  acc[article.slug] = article.category_slug;
  return acc;
}, {});

export default function ArticleManagement() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'articles' | 'categories'>('articles');
  const [searchTerm, setSearchTerm] = useState('');
  const [articles, setArticles] = useState<LoadedBlogArticle[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>(BLOG_CATEGORIES);
  const [articleCategoryMap, setArticleCategoryMap] = useState<BlogArticleCategoryMap>(localCategoryMap);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<LoadedBlogArticle | null>(null);
  const [editingCategorySlug, setEditingCategorySlug] = useState<string | null>(null);
  const [articleForm, setArticleForm] = useState<ArticleFormState>(emptyArticleForm(BLOG_CATEGORIES[0]?.slug));
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm(BLOG_CATEGORIES.length + 1));

  const categoriesBySlug = useMemo(() => new Map(categories.map((category) => [category.slug, category])), [categories]);

  const loadData = async () => {
    setLoading(true);
    const data = await loadBlogData({ publishedOnly: false });
    setArticles(data.articles);
    setCategories(data.categories);
    setArticleCategoryMap(data.categoryMap);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getArticleCategorySlug = (article: LoadedBlogArticle) => articleCategoryMap[article.slug] || article.category_slug || categories[0]?.slug || '';
  const getArticleCategoryName = (article: LoadedBlogArticle) => categoriesBySlug.get(getArticleCategorySlug(article))?.name || article.category_name || t('article_management.uncategorized', '未分類');

  const filteredArticles = articles.filter((article) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return `${article.title} ${article.excerpt} ${getArticleCategoryName(article)}`.toLowerCase().includes(query);
  });

  const categoryCounts = categories.reduce<Record<string, number>>((acc, category) => {
    acc[category.slug] = articles.filter((article) => getArticleCategorySlug(article) === category.slug).length;
    return acc;
  }, {});

  const openArticleForm = (article?: LoadedBlogArticle) => {
    if (article) {
      setEditingArticle(article);
      setArticleForm({
        title: article.title,
        slug: article.slug,
        content: article.content || '',
        excerpt: article.excerpt || '',
        featured_image: article.featured_image || '',
        status: article.status,
        published_at: toDatetimeLocal(article.published_at),
        category_slug: getArticleCategorySlug(article),
      });
    } else {
      setEditingArticle(null);
      setArticleForm(emptyArticleForm(categories[0]?.slug || ''));
    }

    setShowArticleForm(true);
  };

  const openCategoryForm = (category?: BlogCategory) => {
    if (category) {
      setEditingCategorySlug(category.slug);
      setCategoryForm({
        name: category.name,
        slug: category.slug,
        description: category.description,
        sort_order: category.sort_order,
        is_active: category.is_active,
      });
    } else {
      setEditingCategorySlug(null);
      setCategoryForm(emptyCategoryForm(categories.length + 1));
    }

    setShowCategoryForm(true);
  };

  const saveArticle = async () => {
    if (!articleForm.title.trim() || !articleForm.slug.trim()) {
      alert(t('article_management.fill_required', '請先填寫文章標題與網址代碼。'));
      return;
    }

    setSaving(true);
    try {
      const articleData = {
        title: articleForm.title.trim(),
        slug: articleForm.slug.trim(),
        content: articleForm.content,
        excerpt: articleForm.excerpt,
        featured_image: articleForm.featured_image || null,
        status: articleForm.status,
        published_at: articleForm.published_at ? new Date(articleForm.published_at).toISOString() : null,
      };

      if (editingArticle?.id) {
        const { error } = await supabase.from('articles').update(articleData).eq('id', editingArticle.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('articles').upsert(articleData, { onConflict: 'slug' });
        if (error) throw error;
      }

      const nextMap = { ...articleCategoryMap };
      if (editingArticle?.slug && editingArticle.slug !== articleForm.slug) {
        delete nextMap[editingArticle.slug];
      }
      nextMap[articleForm.slug] = articleForm.category_slug;
      await saveBlogArticleCategoryMap(nextMap);

      setShowArticleForm(false);
      setEditingArticle(null);
      await loadData();
    } catch (error) {
      console.error('Failed to save article:', error);
      alert(t('article_management.save_failed', '文章儲存失敗，請稍後再試或檢查 Supabase 連線。'));
    } finally {
      setSaving(false);
    }
  };

  const deleteArticle = async (article: LoadedBlogArticle) => {
    if (!article.id) {
      alert(t('article_management.not_saved', '這篇文章尚未寫入資料庫，請先儲存後再刪除。'));
      return;
    }

    if (!confirm(t('article_management.delete_article_confirm', `確定要刪除文章「${article.title}」嗎？`))) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('articles').delete().eq('id', article.id);
      if (error) throw error;

      const nextMap = { ...articleCategoryMap };
      delete nextMap[article.slug];
      await saveBlogArticleCategoryMap(nextMap);
      await loadData();
    } catch (error) {
      console.error('Failed to delete article:', error);
      alert(t('article_management.delete_failed', '刪除文章失敗，請稍後再試。'));
    } finally {
      setSaving(false);
    }
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim() || !categoryForm.slug.trim()) {
      alert(t('article_management.fill_category_required', '請先填寫分類名稱與網址代碼。'));
      return;
    }

    setSaving(true);
    try {
      const nextCategory: BlogCategory = {
        name: categoryForm.name.trim(),
        slug: normalizeBlogSlug(categoryForm.slug.trim()),
        description: categoryForm.description,
        sort_order: categoryForm.sort_order,
        is_active: categoryForm.is_active,
      };

      const nextCategories = editingCategorySlug
        ? categories.map((category) => (category.slug === editingCategorySlug ? nextCategory : category))
        : [...categories, nextCategory];

      await saveBlogCategories(nextCategories);
      setCategories(nextCategories);
      setShowCategoryForm(false);
      setEditingCategorySlug(null);
      await loadData();
    } catch (error) {
      console.error('Failed to save category:', error);
      alert(t('article_management.category_save_failed', '分類儲存失敗，請稍後再試。'));
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (category: BlogCategory) => {
    const count = categoryCounts[category.slug] || 0;
    if (count > 0) {
      alert(t('article_management.category_has_articles', `分類「${category.name}」底下還有 ${count} 篇文章，請先移動或刪除文章再刪分類。`));
      return;
    }

    if (!confirm(t('article_management.delete_category_confirm', `確定要刪除分類「${category.name}」嗎？`))) return;

    setSaving(true);
    try {
      const nextCategories = categories.filter((item) => item.slug !== category.slug);
      await saveBlogCategories(nextCategories);
      setCategories(nextCategories);
      await loadData();
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert(t('article_management.category_delete_failed', '刪除分類失敗，請稍後再試。'));
    } finally {
      setSaving(false);
    }
  };

  const importArticles = async () => {
    if (!confirm(t('article_management.import_confirm', `即將匯入 ${BLOG_ARTICLES.length} 篇文章與 ${BLOG_CATEGORIES.length} 個分類，確定要繼續嗎？`))) return;
    try {
      await saveBlogCategories(BLOG_CATEGORIES);
      await saveBlogArticleCategoryMap(localCategoryMap);
      await loadData();
      alert(t('article_management.import_done', '文章與分類匯入完成。'));
    } catch (error) {
      console.error('Failed to import articles:', error);
      alert(t('article_management.import_failed', '匯入失敗，請確認 Supabase 權限與連線狀態。'));
    }
  };

  if (loading) {
    return <div className="p-6">{t('common.loading', '載入中...')}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('article_management.title', '文章管理')}</h1>
          <p className="mt-2 text-slate-600">{t('article_management.subtitle', '集中管理文章、分類與發佈狀態，方便後台快速維護內容。')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={importArticles} className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" />
            {t('article_management.import', '同步匯入文章')}
          </button>
          <button onClick={() => openCategoryForm()} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">
            <FolderPlus className="h-4 w-4" />
            {t('article_management.add_category', '新增分類')}
          </button>
          <button onClick={() => openArticleForm()} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">
            <Plus className="h-4 w-4" />
            {t('article_management.add_article', '新增文章')}
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-2 border-b border-slate-200">
        <button onClick={() => setActiveTab('articles')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'articles' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500'}`}>
          {t('article_management.tab_articles', '文章')}
        </button>
        <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'categories' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500'}`}>
          {t('article_management.tab_categories', '分類')}
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('article_management.search_placeholder', '搜尋文章標題、摘要或分類')}
            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-slate-900 focus:outline-none"
          />
        </div>
      </div>

      {activeTab === 'articles' ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{t('article_management.column_article', '文章')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{t('article_management.column_category', '分類')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{t('article_management.column_status', '狀態')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{t('article_management.column_date', '發布日期')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{t('article_management.column_source', '來源')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">{t('article_management.column_actions', '操作')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredArticles.map((article) => (
                <tr key={article.id || article.slug} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{article.title}</div>
                    <div className="text-xs text-slate-500">{article.slug}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{getArticleCategoryName(article)}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${article.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {article.status === 'published' ? t('article_management.published', '已發布') : t('article_management.draft', '草稿')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{dateLabel(article.published_at)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{(article as LoadedBlogArticle & { source?: string }).source || t('article_management.local', '本地')}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button onClick={() => openArticleForm(article)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900" aria-label={t('article_management.edit_article', '編輯文章')}>
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteArticle(article)} className="rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-700" aria-label={t('article_management.delete_article', '刪除文章')}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <div key={category.slug} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{category.name}</h3>
                  <p className="text-xs text-slate-500">{t('article_management.article_count', '{count} 篇文章').replace('{count}', String(categoryCounts[category.slug] || 0))}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openCategoryForm(category)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900" aria-label={t('article_management.edit_category', '編輯分類')}>
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteCategory(category)} className="rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-700" aria-label={t('article_management.delete_category', '刪除分類')}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="min-h-[3rem] text-sm leading-6 text-slate-500">{category.description || t('article_management.no_description', '尚未填寫分類描述。')}</p>
              <div className="mt-3 text-xs text-slate-500">{category.is_active ? t('article_management.active', '啟用中') : t('article_management.inactive', '停用中')}</div>
            </div>
          ))}
        </div>
      )}

      {showArticleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">{editingArticle ? t('article_management.edit_article', '編輯文章') : t('article_management.add_article', '新增文章')}</h2>
              <button onClick={() => setShowArticleForm(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('article_management.article_title', '文章標題')} *</label>
                <input
                  value={articleForm.title}
                  onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t('article_management.article_category', '文章分類')}</label>
                  <select
                    value={articleForm.category_slug}
                    onChange={(e) => setArticleForm({ ...articleForm, category_slug: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    {categories.map((category) => (
                      <option key={category.slug} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t('article_management.slug', 'Slug（網址）')} *</label>
                  <input
                    value={articleForm.slug}
                    onChange={(e) => setArticleForm({ ...articleForm, slug: normalizeBlogSlug(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('article_management.excerpt', '文章摘要')}</label>
                <textarea value={articleForm.excerpt} onChange={(e) => setArticleForm({ ...articleForm, excerpt: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" rows={3} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('article_management.featured_image', '封面圖片')}</label>
                <ImageUpload value={articleForm.featured_image} onChange={(url) => setArticleForm({ ...articleForm, featured_image: url })} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('article_management.content', '文章內容')}</label>
                <RichTextEditor
                  value={articleForm.content}
                  onChange={(nextValue) => setArticleForm({ ...articleForm, content: nextValue })}
                  placeholder={t('article_management.content_placeholder', '請輸入文章內容，可直接排版、加連結與圖片')}
                />
                <p className="mt-2 text-xs text-slate-400">{t('article_management.html_hint', '可切換 HTML 模式，方便做進階微調。')}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t('article_management.status', '狀態')}</label>
                  <select value={articleForm.status} onChange={(e) => setArticleForm({ ...articleForm, status: e.target.value as 'draft' | 'published' })} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                    <option value="draft">{t('article_management.draft', '草稿')}</option>
                    <option value="published">{t('article_management.published', '已發布')}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t('article_management.published_at', '發布時間')}</label>
                  <input type="datetime-local" value={articleForm.published_at} onChange={(e) => setArticleForm({ ...articleForm, published_at: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 p-6">
              <button onClick={() => setShowArticleForm(false)} className="rounded-lg px-4 py-2 text-slate-700 hover:bg-slate-100">{t('common.cancel', '取消')}</button>
              <button onClick={saveArticle} disabled={saving} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60">
                <Save className="h-4 w-4" />
                {t('article_management.save_article', '儲存文章')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">{editingCategorySlug ? t('article_management.edit_category', '編輯分類') : t('article_management.add_category', '新增分類')}</h2>
              <button onClick={() => setShowCategoryForm(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('article_management.category_name', '分類名稱')} *</label>
                <input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('article_management.slug', 'Slug（網址）')} *</label>
                <input value={categoryForm.slug} onChange={(e) => setCategoryForm({ ...categoryForm, slug: normalizeBlogSlug(e.target.value) })} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('article_management.category_description', '分類描述')}</label>
                <textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" rows={4} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('article_management.sort_order', '排序')}</label>
                <input type="number" value={categoryForm.sort_order} onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: Number(e.target.value) })} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={categoryForm.is_active} onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })} />
                <span className="text-sm font-medium text-slate-700">{t('article_management.category_active', '分類啟用中')}</span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 p-6">
              <button onClick={() => setShowCategoryForm(false)} className="rounded-lg px-4 py-2 text-slate-700 hover:bg-slate-100">{t('common.cancel', '取消')}</button>
              <button onClick={saveCategory} disabled={saving} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60">
                <Save className="h-4 w-4" />
                {t('article_management.save_category', '儲存分類')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

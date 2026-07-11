import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Save, ArrowLeft, X, Plus, ExternalLink, CheckCircle, AlertCircle, Sparkles, Link as LinkIcon, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { logAdminAction } from '../../lib/auditLog';
import { supabase } from '../../lib/supabase';
import HtmlEditor from '../../components/HtmlEditor';
import { sanitizeHtml, sanitizeText } from '../../lib/security';
import { getCategoryOptionLabel, sortCategoriesForTree, type CategoryTreeItem } from '../../lib/categoryTree';

interface PostForm {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  author_name: string;
  tags: string[];
  category: string;
  status: 'draft' | 'published';
  meta_description: string;
}

interface ScraperResult {
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  author_name: string;
  tags: string[];
  category: string;
  meta_description: string;
  published_date: string | null;
}

interface BlogCategory extends CategoryTreeItem {
  display_order?: number | null;
  is_active?: boolean;
}

const EMPTY_FORM: PostForm = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image_url: '',
  author_name: 'Nestobi',
  tags: [],
  category: '',
  status: 'draft',
  meta_description: '',
};

function toSlug(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[\s\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || `post-${Date.now()}`
  );
}

const SuperAdminBlogForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<PostForm>(EMPTY_FORM);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [contentPreview, setContentPreview] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [slugManual, setSlugManual] = useState(false);

  const [showScraper, setShowScraper] = useState(!isEdit);
  const [scraperUrl, setScraperUrl] = useState('');
  const [scraperStep, setScraperStep] = useState<'input' | 'loading' | 'review'>('input');
  const [scraperResult, setScraperResult] = useState<ScraperResult | null>(null);
  const [scraperError, setScraperError] = useState('');
  const scraperUrlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: cats } = await supabase
        .from('blog_categories')
        .select('id,name,slug,parent_id,display_order,is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      const orderedCats = sortCategoriesForTree((cats || []) as BlogCategory[]);
      const catNames = orderedCats.map(c => c.name);
      setCategories(orderedCats);

      if (isEdit && id) {
        const { data } = await supabase.from('blog_posts').select('*').eq('id', id).maybeSingle();
        if (data) {
          setForm({
            title: data.title || '',
            slug: data.slug || '',
            excerpt: data.excerpt || '',
            content: data.content || '',
            cover_image_url: data.cover_image_url || '',
            author_name: data.author_name || 'Nestobi',
            tags: data.tags || [],
            category: data.category || catNames[0] || '',
            status: data.status || 'draft',
            meta_description: data.meta_description || '',
          });
          setSlugManual(true);
        }
      } else {
        setForm(current => ({ ...current, category: catNames[0] || '' }));
      }
      setLoading(false);
    };
    init();
  }, [id, isEdit]);

  const handleTitleChange = (title: string) => {
    setForm(current => ({ ...current, title, ...(!slugManual ? { slug: toSlug(title) } : {}) }));
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm(current => ({ ...current, tags: [...current.tags, tag] }));
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setForm(current => ({ ...current, tags: current.tags.filter(item => item !== tag) }));
  };

  const handleScrape = async () => {
    if (!scraperUrl.trim()) {
      setScraperError('Please enter a URL');
      return;
    }
    setScraperError('');
    setScraperStep('loading');
    try {
      const { data, error } = await supabase.functions.invoke('scrape-url', {
        body: { url: scraperUrl.trim(), type: 'blog' },
      });
      if (error || data?.error) {
        setScraperError(data?.error || error?.message || 'Scrape failed');
        setScraperStep('input');
        return;
      }
      setScraperResult(data.result);
      setScraperStep('review');
    } catch (e: any) {
      setScraperError(e.message || 'Scrape failed');
      setScraperStep('input');
    }
  };

  const applyScraperResult = () => {
    if (!scraperResult) return;
    const categoryNames = categories.map(category => category.name);
    const category = categoryNames.includes(scraperResult.category) ? scraperResult.category : categoryNames[0] || '';
    const title = scraperResult.title || '';
    setForm(current => ({
      ...current,
      title,
      slug: slugManual ? current.slug : toSlug(title),
      excerpt: scraperResult.excerpt || current.excerpt,
      content: scraperResult.content || current.content,
      cover_image_url: scraperResult.cover_image_url || current.cover_image_url,
      author_name: scraperResult.author_name || current.author_name,
      tags: scraperResult.tags?.length ? scraperResult.tags : current.tags,
      category,
      meta_description: scraperResult.meta_description || current.meta_description,
    }));
    setShowScraper(false);
    setScraperStep('input');
    setScraperResult(null);
    setScraperUrl('');
  };

  const resetScraper = () => {
    setScraperStep('input');
    setScraperResult(null);
    setScraperError('');
  };

  const handleSave = async (statusOverride?: 'draft' | 'published') => {
    if (!form.title.trim() || !form.slug.trim()) return;
    setSaving(true);
    setSaveStatus('idle');

    const payload = {
      ...form,
      title: sanitizeText(form.title, 160),
      excerpt: sanitizeText(form.excerpt, 500),
      content: sanitizeHtml(form.content),
      author_name: sanitizeText(form.author_name, 120),
      meta_description: sanitizeText(form.meta_description, 180),
      status: statusOverride || form.status,
      slug: sanitizeText(form.slug || toSlug(form.title), 180),
      updated_at: new Date().toISOString(),
      ...(statusOverride === 'published' && form.status !== 'published' ? { published_at: new Date().toISOString() } : {}),
    };

    const { error } = isEdit
      ? await supabase.from('blog_posts').update(payload).eq('id', id)
      : await supabase.from('blog_posts').insert(payload);

    if (error) {
      setSaveStatus('error');
    } else {
      await logAdminAction(isEdit ? 'update_blog_post' : 'create_blog_post', 'blog_posts', (isEdit ? id : null) || null, {
        title: payload.title,
        slug: payload.slug,
        status: payload.status,
        category: payload.category,
      });
      setSaveStatus('success');
      if (statusOverride) setForm(current => ({ ...current, status: statusOverride }));
      setTimeout(() => {
        setSaveStatus('idle');
        if (!isEdit) navigate('/superadmin/blog');
      }, 1200);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-700 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/superadmin/blog')} className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-center gap-2">
          <Coffee className="h-5 w-5 text-amber-700" />
          <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Blog Post' : 'New Blog Post'}</h1>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <span className="flex items-center gap-1 text-sm font-medium text-green-600">
              <CheckCircle className="h-4 w-4" />
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-sm font-medium text-red-500">
              <AlertCircle className="h-4 w-4" />
              Save failed
            </span>
          )}
          <button
            onClick={() => handleSave('draft')}
            disabled={saving || !form.title}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
          >
            Save draft
          </button>
          <button
            onClick={() => handleSave('published')}
            disabled={saving || !form.title}
            className="flex items-center gap-1.5 rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:bg-gray-200"
          >
            {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-4 w-4" />}
            Publish
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
        <button onClick={() => setShowScraper(value => !value)} className="flex w-full items-center justify-between px-5 py-3.5 transition hover:bg-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
              <Sparkles className="h-4 w-4 text-amber-700" />
            </div>
            <span className="text-sm font-semibold text-gray-800">AI Scraper</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">optional</span>
          </div>
          {showScraper ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>

        <AnimatePresence initial={false}>
          {showScraper && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="border-t border-amber-50 px-5 pb-5">
                {scraperStep === 'input' && (
                  <div className="space-y-3 pt-4">
                    {scraperError && (
                      <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        {scraperError}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">Paste an article URL from a supported source and let AI fill the draft fields.</p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          ref={scraperUrlRef}
                          type="url"
                          value={scraperUrl}
                          onChange={e => setScraperUrl(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleScrape()}
                          placeholder="https://example.com/article"
                          className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                      <button onClick={handleScrape} disabled={!scraperUrl.trim()} className="flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:bg-gray-200 disabled:text-gray-400">
                        <Sparkles className="h-4 w-4" />
                        Fetch
                      </button>
                    </div>
                  </div>
                )}

                {scraperStep === 'loading' && (
                  <div className="flex flex-col items-center gap-3 py-8 pt-4">
                    <div className="relative">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                        <Sparkles className="h-6 w-6 text-amber-600" />
                      </div>
                      <div className="absolute inset-0 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Scraping article content...</p>
                    <p className="text-xs text-gray-400">This usually takes a few seconds.</p>
                  </div>
                )}

                {scraperStep === 'review' && scraperResult && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                        <CheckCircle className="h-4 w-4 text-amber-600" />
                        Review scraped content
                      </p>
                      <button onClick={resetScraper} className="flex items-center gap-1 text-xs text-gray-400 transition hover:text-gray-600">
                        <X className="h-3.5 w-3.5" />
                        Reset
                      </button>
                    </div>

                    <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                      {scraperResult.cover_image_url && (
                        <img src={scraperResult.cover_image_url} alt="cover" className="h-36 w-full rounded-lg object-cover" />
                      )}
                      <div>
                        <p className="mb-0.5 text-xs text-gray-400">Title</p>
                        <p className="text-sm font-semibold text-gray-900">{scraperResult.title || '-'}</p>
                      </div>
                      <div>
                        <p className="mb-0.5 text-xs text-gray-400">Excerpt</p>
                        <p className="line-clamp-2 text-sm text-gray-700">{scraperResult.excerpt || '-'}</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <div>
                          <p className="mb-0.5 text-xs text-gray-400">Category</p>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{scraperResult.category || '-'}</span>
                        </div>
                        <div>
                          <p className="mb-0.5 text-xs text-gray-400">Author</p>
                          <p className="text-xs text-gray-700">{scraperResult.author_name || '-'}</p>
                        </div>
                        {scraperResult.published_date && (
                          <div>
                            <p className="mb-0.5 text-xs text-gray-400">Published</p>
                            <p className="text-xs text-gray-700">{scraperResult.published_date}</p>
                          </div>
                        )}
                      </div>
                      {scraperResult.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {scraperResult.tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600">
                              <Tag className="h-2.5 w-2.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div>
                        <p className="mb-0.5 text-xs text-gray-400">Content preview</p>
                        <div className="prose prose-sm line-clamp-3 max-w-none text-xs text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml((scraperResult.content || '').slice(0, 300) + '...') }} />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={applyScraperResult} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-700 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800">
                        <CheckCircle className="h-4 w-4" />
                        Apply to form
                      </button>
                      <button onClick={resetScraper} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Title <span className="text-red-500">*</span></label>
              <input
                value={form.title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Enter a title"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Slug <span className="text-gray-400">(manual if needed)</span></label>
              <div className="flex gap-2">
                <span className="flex items-center rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 px-3 text-sm text-gray-400">/blog/</span>
                <input
                  value={form.slug}
                  onChange={e => {
                    setSlugManual(true);
                    setForm(current => ({ ...current, slug: e.target.value }));
                  }}
                  placeholder="coffee-travel-guide"
                  className="flex-1 rounded-r-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Excerpt</label>
              <textarea
                value={form.excerpt}
                onChange={e => setForm(current => ({ ...current, excerpt: e.target.value }))}
                rows={2}
                placeholder="Short summary for list pages"
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                Content <span className="text-red-500">*</span>
              </label>
              {isEdit && form.status === 'published' && (
                <a href={`/blog/${form.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-amber-700 hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open live post
                </a>
              )}
            </div>
            <HtmlEditor
              value={form.content}
              onChange={value => setForm(current => ({ ...current, content: value }))}
              rows={20}
              preview={contentPreview}
              onTogglePreview={() => setContentPreview(current => !current)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Publish settings</h3>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(current => ({ ...current, status: e.target.value as 'draft' | 'published' }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(current => ({ ...current, category: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.name}>
                    {getCategoryOptionLabel(category, categories)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Author</label>
              <input
                value={form.author_name}
                onChange={e => setForm(current => ({ ...current, author_name: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Cover image</h3>
            <input
              value={form.cover_image_url}
              onChange={e => setForm(current => ({ ...current, cover_image_url: e.target.value }))}
              placeholder="https://..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {form.cover_image_url && (
              <motion.img
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={form.cover_image_url}
                alt="cover"
                className="h-32 w-full rounded-xl border border-gray-200 object-cover"
              />
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Tags</h3>
            <div className="flex min-h-[32px] flex-wrap gap-1.5">
              {form.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="transition hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add a tag"
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button onClick={handleAddTag} className="rounded-xl bg-amber-50 p-2 text-amber-700 transition hover:bg-amber-100">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">SEO description</h3>
            <textarea
              value={form.meta_description}
              onChange={e => setForm(current => ({ ...current, meta_description: e.target.value }))}
              rows={3}
              placeholder="Meta description"
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <p className="text-xs text-gray-400">{form.meta_description.length} / 160</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminBlogForm;

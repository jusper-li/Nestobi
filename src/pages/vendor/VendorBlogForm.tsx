import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Save, ArrowLeft, X, Plus, ExternalLink, CheckCircle, AlertCircle, Upload, Sparkles, Link, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { logAdminAction } from '../../lib/auditLog';
import HtmlEditor from '../../components/HtmlEditor';
import { sanitizeHtml, sanitizeText } from '../../lib/security';

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

const CATEGORIES = ['咖啡旅行', '旅遊指南', '美食探索', '住宿推薦', '旅行日記', '咖啡知識', '旅遊美食'];

const EMPTY_FORM: PostForm = {
  title: '', slug: '', excerpt: '', content: '', cover_image_url: '',
  author_name: '', tags: [], category: '咖啡旅行',
  status: 'draft', meta_description: '',
};

function toSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[\s\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || `post-${Date.now()}`;
}

const VendorBlogForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [form, setForm] = useState<PostForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [contentPreview, setContentPreview] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  // AI scraper state
  const [showScraper, setShowScraper] = useState(!isEdit);
  const [scraperUrl, setScraperUrl] = useState('');
  const [scraperStep, setScraperStep] = useState<'input' | 'loading' | 'review'>('input');
  const [scraperResult, setScraperResult] = useState<ScraperResult | null>(null);
  const [scraperError, setScraperError] = useState('');
  const scraperUrlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('vendors').select('id, name').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setVendorId(data.id);
        setVendorName(data.name);
        if (!isEdit) setForm(f => ({ ...f, author_name: data.name }));
      } else {
        setLoading(false);
      }
    });
  }, [user, isEdit]);

  useEffect(() => {
    if (isEdit && id && vendorId) {
      supabase.from('blog_posts').select('*').eq('id', id).eq('vendor_id', vendorId).maybeSingle().then(({ data }) => {
        if (data) {
          setForm({
            title: data.title || '',
            slug: data.slug || '',
            excerpt: data.excerpt || '',
            content: data.content || '',
            cover_image_url: data.cover_image_url || '',
            author_name: data.author_name || '',
            tags: data.tags || [],
            category: data.category || '咖啡旅行',
            status: data.status || 'draft',
            meta_description: data.meta_description || '',
          });
          setSlugManual(true);
        }
        setLoading(false);
      });
    } else if (!isEdit) {
      setLoading(false);
    }
  }, [id, isEdit, vendorId]);

  const handleTitleChange = (title: string) => {
    setForm(f => ({ ...f, title, ...(!slugManual ? { slug: toSlug(title) } : {}) }));
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) setForm(f => ({ ...f, tags: [...f.tags, tag] }));
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setCoverUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `blog/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('site-assets').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('site-assets').getPublicUrl(path);
      setForm(f => ({ ...f, cover_image_url: data.publicUrl }));
    } finally {
      setCoverUploading(false);
      e.target.value = '';
    }
  };

  const handleScrape = async () => {
    if (!scraperUrl.trim()) { setScraperError('請輸入文章網址'); return; }
    setScraperError('');
    setScraperStep('loading');
    try {
      const { data, error } = await supabase.functions.invoke('scrape-url', {
        body: { url: scraperUrl.trim(), type: 'blog' },
      });
      if (error || data?.error) {
        setScraperError(data?.error || error?.message || '解析失敗，請確認網址是否正確');
        setScraperStep('input');
        return;
      }
      setScraperResult(data.result);
      setScraperStep('review');
    } catch (e: any) {
      setScraperError(e.message || '解析失敗');
      setScraperStep('input');
    }
  };

  const applyScraperResult = () => {
    if (!scraperResult) return;
    const validCategories = CATEGORIES;
    const cat = validCategories.includes(scraperResult.category) ? scraperResult.category : '咖啡旅行';
    const title = scraperResult.title || '';
    setForm(f => ({
      ...f,
      title,
      slug: slugManual ? f.slug : toSlug(title),
      excerpt: scraperResult.excerpt || f.excerpt,
      content: scraperResult.content || f.content,
      cover_image_url: scraperResult.cover_image_url || f.cover_image_url,
      author_name: scraperResult.author_name || f.author_name,
      tags: scraperResult.tags?.length ? scraperResult.tags : f.tags,
      category: cat,
      meta_description: scraperResult.meta_description || f.meta_description,
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
    if (!vendorId || !form.title.trim() || !form.slug.trim()) return;
    setSaving(true);
    setSaveStatus('idle');

    const payload = {
      ...form,
      vendor_id: vendorId,
      title: sanitizeText(form.title, 160),
      excerpt: sanitizeText(form.excerpt, 500),
      content: sanitizeHtml(form.content),
      author_name: sanitizeText(form.author_name, 120),
      meta_description: sanitizeText(form.meta_description, 180),
      status: statusOverride || form.status,
      slug: sanitizeText(form.slug || toSlug(form.title), 180),
      updated_at: new Date().toISOString(),
      ...(statusOverride === 'published' && form.status !== 'published'
        ? { published_at: new Date().toISOString() }
        : {}),
    };

    const { error } = isEdit
      ? await supabase.from('blog_posts').update(payload).eq('id', id).eq('vendor_id', vendorId)
      : await supabase.from('blog_posts').insert(payload);

    if (error) {
      setSaveStatus('error');
    } else {
      await logAdminAction(isEdit ? 'update_blog_post' : 'create_blog_post', 'blog_posts', isEdit ? id : null, {
        title: payload.title,
        slug: payload.slug,
        status: payload.status,
        vendor_id: vendorId,
      });
      setSaveStatus('success');
      if (statusOverride) setForm(f => ({ ...f, status: statusOverride }));
      setTimeout(() => { setSaveStatus('idle'); if (!isEdit) navigate('/vendor/blog'); }, 1200);
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/vendor/blog')} className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <FileText className="w-5 h-5 text-emerald-700" />
          <h1 className="text-xl font-bold text-gray-900">{isEdit ? '編輯文章' : '新增文章'}</h1>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />已儲存
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-red-500 text-sm font-medium">
              <AlertCircle className="w-4 h-4" />儲存失敗
            </span>
          )}
          <button
            onClick={() => handleSave('draft')}
            disabled={saving || !form.title || !vendorId}
            className="px-4 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition font-medium text-gray-700"
          >
            存為草稿
          </button>
          <button
            onClick={() => handleSave('published')}
            disabled={saving || !form.title || !vendorId}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-200 text-white font-semibold transition shadow-sm"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            發布
          </button>
        </div>
      </div>

      {/* AI Scraper Panel */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowScraper(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-emerald-50/50 transition"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-700" />
            </div>
            <span className="font-semibold text-gray-800 text-sm">AI 爬蟲 — 從網址自動擷取文章內容</span>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">智能解析</span>
          </div>
          {showScraper ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        <AnimatePresence initial={false}>
          {showScraper && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 border-t border-emerald-50">
                {/* Input step */}
                {scraperStep === 'input' && (
                  <div className="pt-4 space-y-3">
                    {scraperError && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{scraperError}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">輸入文章網址（支援 Vocus、Medium、部落格等），AI 會自動擷取標題、內容、封面、標籤等資訊。</p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          ref={scraperUrlRef}
                          type="url"
                          value={scraperUrl}
                          onChange={e => setScraperUrl(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleScrape()}
                          placeholder="https://vocus.cc/article/..."
                          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                      <button
                        onClick={handleScrape}
                        disabled={!scraperUrl.trim()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition"
                      >
                        <Sparkles className="w-4 h-4" />解析
                      </button>
                    </div>
                  </div>
                )}

                {/* Loading step */}
                {scraperStep === 'loading' && (
                  <div className="pt-4 flex flex-col items-center gap-3 py-8">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="absolute inset-0 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">AI 正在解析文章內容...</p>
                    <p className="text-xs text-gray-400">擷取標題、內文、圖片、標籤，約需 10–20 秒</p>
                  </div>
                )}

                {/* Review step */}
                {scraperStep === 'review' && scraperResult && (
                  <div className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />解析完成，請確認內容後填入表單
                      </p>
                      <button onClick={resetScraper} className="text-xs text-gray-400 hover:text-gray-600 transition flex items-center gap-1">
                        <X className="w-3.5 h-3.5" />重新解析
                      </button>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                      {scraperResult.cover_image_url && (
                        <img src={scraperResult.cover_image_url} alt="封面" className="w-full h-36 object-cover rounded-lg" />
                      )}
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">標題</p>
                        <p className="text-sm font-semibold text-gray-900">{scraperResult.title || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">摘要</p>
                        <p className="text-sm text-gray-700 line-clamp-2">{scraperResult.excerpt || '—'}</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">分類</p>
                          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">{scraperResult.category || '—'}</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">作者</p>
                          <p className="text-xs text-gray-700">{scraperResult.author_name || '—'}</p>
                        </div>
                        {scraperResult.published_date && (
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">發布日期</p>
                            <p className="text-xs text-gray-700">{scraperResult.published_date}</p>
                          </div>
                        )}
                      </div>
                      {scraperResult.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {scraperResult.tags.map(t => (
                            <span key={t} className="flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                              <Tag className="w-2.5 h-2.5" />{t}
                            </span>
                          ))}
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">內容預覽</p>
                        <div
                          className="text-xs text-gray-600 line-clamp-3 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(scraperResult.content?.slice(0, 300) + '...' || '—') }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={applyScraperResult}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition"
                      >
                        <CheckCircle className="w-4 h-4" />填入表單
                      </button>
                      <button
                        onClick={resetScraper}
                        className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm rounded-xl transition"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main form */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">文章標題 <span className="text-red-500">*</span></label>
              <input
                value={form.title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="輸入吸引人的標題..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-lg font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">文章代稱（Slug）</label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-400">/blog/</span>
                <input
                  value={form.slug}
                  onChange={e => { setSlugManual(true); setForm(f => ({ ...f, slug: e.target.value })); }}
                  placeholder="coffee-travel-guide"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">文章摘要</label>
              <textarea
                value={form.excerpt}
                onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                rows={2}
                placeholder="簡短描述文章內容（顯示於列表頁）..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm resize-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">文章內容（支援 HTML）<span className="text-red-500">*</span></label>
              {isEdit && form.status === 'published' && (
                <a href={`/blog/${form.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-emerald-700 hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" />前往查看
                </a>
              )}
            </div>
            <HtmlEditor
              value={form.content}
              onChange={v => setForm(f => ({ ...f, content: v }))}
              rows={20}
              preview={contentPreview}
              onTogglePreview={() => setContentPreview(p => !p)}
              accentClass="focus:ring-emerald-400"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 text-sm">發布設定</h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">狀態</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as 'draft' | 'published' }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="draft">草稿</option>
                <option value="published">已發布</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">分類</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">作者名稱</label>
              <input
                value={form.author_name}
                onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))}
                placeholder={vendorName || '作者名稱'}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">封面圖片</h3>
            <input
              value={form.cover_image_url}
              onChange={e => setForm(f => ({ ...f, cover_image_url: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <label className={`flex items-center justify-center gap-2 w-full py-2 border border-dashed border-gray-200 rounded-xl text-sm text-gray-500 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50 transition ${coverUploading ? 'opacity-60 pointer-events-none' : ''}`}>
              {coverUploading
                ? <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                : <Upload className="w-4 h-4 text-emerald-500" />
              }
              {coverUploading ? '上傳中...' : '上傳封面圖片'}
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </label>
            {form.cover_image_url && (
              <motion.img
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={form.cover_image_url}
                alt="封面預覽"
                className="w-full h-32 object-cover rounded-xl border border-gray-200"
              />
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">標籤</h3>
            <div className="flex flex-wrap gap-1.5 min-h-[32px]">
              {form.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-emerald-50 text-emerald-800 text-xs px-2.5 py-1 rounded-full">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500 transition">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="輸入標籤後按 Enter"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button onClick={handleAddTag} className="p-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">SEO 說明</h3>
            <textarea
              value={form.meta_description}
              onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))}
              rows={3}
              placeholder="搜尋引擎顯示的文章說明（建議 120–160 字）..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            />
            <p className="text-xs text-gray-400">{form.meta_description.length} / 160 字</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorBlogForm;

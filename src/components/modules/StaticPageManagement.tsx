import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, FileText, Plus, Save, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

interface PageSection {
  type: 'intro' | 'section';
  title: string;
  content: string;
}

interface StaticPageData {
  id: string;
  slug: string;
  title: string;
  meta_description: string;
  sections: PageSection[];
  is_published: boolean;
  updated_at: string;
}

const PRESET_PAGES = [
  { slug: 'about', label: '關於我們', path: '/about' },
  { slug: 'story', label: '品牌故事', path: '/story' },
  { slug: 'contact', label: '聯絡我們', path: '/contact' },
  { slug: 'privacy', label: '隱私權政策', path: '/privacy' },
  { slug: 'terms', label: '服務條款', path: '/terms' },
  { slug: 'shipping', label: '配送說明', path: '/shipping' },
  { slug: 'returns', label: '退換貨政策', path: '/returns' },
];

export default function StaticPageManagement() {
  const { t } = useLanguage();
  const [pages, setPages] = useState<StaticPageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<StaticPageData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadPages();
  }, []);

  const loadPages = async () => {
    try {
      const { data, error } = await supabase.from('static_pages').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      setPages((data || []) as StaticPageData[]);
    } catch (error) {
      console.error('Failed to load pages:', error);
      alert(t('static_pages.load_failed', '載入頁面資料失敗'));
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (page: StaticPageData) => {
    setEditingPage({ ...page, sections: [...page.sections] });
  };

  const saveEdit = async () => {
    if (!editingPage) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('static_pages')
        .update({
          title: editingPage.title,
          meta_description: editingPage.meta_description,
          sections: editingPage.sections,
          is_published: editingPage.is_published,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingPage.id);
      if (error) throw error;
      await loadPages();
      setEditingPage(null);
    } catch (error) {
      console.error('Failed to save page:', error);
      alert(t('static_pages.save_failed', '儲存失敗，請重試'));
    } finally {
      setSaving(false);
    }
  };

  const updateSection = (index: number, field: keyof PageSection, value: string) => {
    if (!editingPage) return;
    const sections = [...editingPage.sections];
    sections[index] = { ...sections[index], [field]: value };
    setEditingPage({ ...editingPage, sections });
  };

  const addSection = () => {
    if (!editingPage) return;
    setEditingPage({
      ...editingPage,
      sections: [...editingPage.sections, { type: 'section', title: '', content: '' }],
    });
  };

  const removeSection = (index: number) => {
    if (!editingPage) return;
    const sections = [...editingPage.sections];
    sections.splice(index, 1);
    setEditingPage({ ...editingPage, sections });
  };

  const moveSection = (index: number, dir: 'up' | 'down') => {
    if (!editingPage) return;
    const sections = [...editingPage.sections];
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    setEditingPage({ ...editingPage, sections });
  };

  const getPageMeta = (slug: string) => PRESET_PAGES.find((p) => p.slug === slug);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });

  const sortedPages = useMemo(() => pages.slice(), [pages]);

  if (loading) return <div className="p-6 text-slate-500">{t('common.loading', '載入中...')}</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">{t('static_pages.title', '靜態頁面管理')}</h1>
        <p className="text-slate-600">
          {t('static_pages.subtitle', '管理隱私權政策、服務條款、配送說明及退換貨政策等頁面內容')}
        </p>
      </div>

      {editingPage ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{t('static_pages.editing', '編輯：')}{editingPage.title || getPageMeta(editingPage.slug)?.label}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('static_pages.path', '路徑：')}/{editingPage.slug}</p>
            </div>
            <button onClick={() => setEditingPage(null)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('static_pages.page_title', '頁面標題')}</label>
                <input
                  type="text"
                  value={editingPage.title}
                  onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder={t('static_pages.page_title_placeholder', '例如：隱私權政策')}
                />
              </div>
              <div className="flex items-end gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingPage.is_published}
                    onChange={(e) => setEditingPage({ ...editingPage, is_published: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm text-slate-700">{t('static_pages.published', '已發布')}</span>
                </label>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t('static_pages.meta_description', 'SEO 描述')}</label>
              <input
                type="text"
                value={editingPage.meta_description}
                onChange={(e) => setEditingPage({ ...editingPage, meta_description: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder={t('static_pages.meta_placeholder', '搜尋引擎顯示的描述文字')}
              />
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">{t('static_pages.sections', '頁面內容區塊')}</label>
                <button onClick={addSection} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-slate-800">
                  <Plus className="h-4 w-4" />
                  {t('static_pages.add_section', '新增區塊')}
                </button>
              </div>

              <div className="space-y-4">
                {editingPage.sections.map((section, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <select
                          value={section.type}
                          onChange={(e) => updateSection(index, 'type', e.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                        >
                          <option value="intro">{t('static_pages.section_intro', '引言區塊')}</option>
                          <option value="section">{t('static_pages.section_content', '內容區塊')}</option>
                        </select>
                        <span className="text-xs text-slate-400">{t('static_pages.section_number', '區塊')} {index + 1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveSection(index, 'up')}
                          disabled={index === 0}
                          className="rounded p-1 text-slate-400 transition-colors hover:text-slate-700 disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => moveSection(index, 'down')}
                          disabled={index === editingPage.sections.length - 1}
                          className="rounded p-1 text-slate-400 transition-colors hover:text-slate-700 disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button onClick={() => removeSection(index)} className="rounded p-1 text-red-400 transition-colors hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSection(index, 'title', e.target.value)}
                        placeholder={t('static_pages.section_title_placeholder', '區塊標題')}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                      <textarea
                        value={section.content}
                        onChange={(e) => updateSection(index, 'content', e.target.value)}
                        placeholder={t('static_pages.section_content_placeholder', '區塊內容（可換行）')}
                        rows={4}
                        className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? t('common.saving', '儲存中...') : t('static_pages.save_page', '儲存頁面')}
              </button>
              <button onClick={() => setEditingPage(null)} className="rounded-lg px-4 py-3 text-slate-700 transition-colors hover:bg-slate-100">
                {t('common.cancel', '取消')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedPages.map((page) => {
            const meta = getPageMeta(page.slug);
            return (
              <div key={page.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <h3 className="truncate text-lg font-semibold text-slate-900">{page.title || meta?.label || page.slug}</h3>
                    </div>
                    <p className="text-sm text-slate-500">{page.meta_description || t('static_pages.no_description', '尚無描述')}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {t('static_pages.updated_at', '最後更新：')}{formatDate(page.updated_at)}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${page.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {page.is_published ? t('static_pages.published', '已發布') : t('static_pages.draft', '草稿')}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">{page.sections.length} {t('static_pages.sections_count', '個區塊')}</span>
                  <button
                    onClick={() => startEdit(page)}
                    className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t('common.edit', '編輯')}
                  </button>
                </div>
              </div>
            );
          })}
          {sortedPages.length === 0 && <p className="text-slate-500">{t('static_pages.empty', '尚無靜態頁面資料')}</p>}
        </div>
      )}
    </div>
  );
}

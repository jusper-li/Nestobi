import { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2, X, Eye, Globe, FileText, Search, CreditCard as Edit } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ImageUpload from '../ImageUpload';
import { useLanguage } from '../../contexts/LanguageContext';

interface SEOSetting {
  id: string;
  page_path: string;
  title: string;
  description: string;
  keywords: string;
  og_image: string | null;
  canonical_url: string | null;
  robots: string | null;
  schema_markup: any;
}

export default function SEOManagement() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [seoSettings, setSeoSettings] = useState<SEOSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSeo, setEditingSeo] = useState<SEOSetting | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [seoForm, setSeoForm] = useState({
    page_path: '',
    title: '',
    description: '',
    keywords: '',
    og_image: '',
    canonical_url: '',
    robots: 'index, follow',
    schema_markup: null as any,
  });

  useEffect(() => {
    void loadSeoSettings();
  }, []);

  const loadSeoSettings = async () => {
    try {
      const { data, error } = await supabase.from('seo_settings').select('*').order('page_path');
      if (error) throw error;
      setSeoSettings((data || []) as SEOSetting[]);
    } catch (error) {
      console.error('Failed to load SEO settings:', error);
      alert(t('seo_management.load_failed', '載入 SEO 設定失敗'));
    } finally {
      setLoading(false);
    }
  };

  const saveSeoSetting = async () => {
    try {
      if (!seoForm.page_path.trim()) {
        alert(t('seo_management.require_path', '請填寫頁面路徑'));
        return;
      }
      if (!seoForm.title.trim()) {
        alert(t('seo_management.require_title', '請填寫頁面標題'));
        return;
      }

      if (editingSeo) {
        const { error } = await supabase.from('seo_settings').update(seoForm).eq('id', editingSeo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('seo_settings').insert([seoForm]);
        if (error) throw error;
      }

      await loadSeoSettings();
      closeForm();
      alert(t('seo_management.save_success', '儲存成功'));
    } catch (error) {
      console.error('Failed to save SEO setting:', error);
      alert(
        t('seo_management.save_failed', '儲存失敗')
          + ': '
          + (error instanceof Error ? error.message : t('seo_management.unknown_error', '未知錯誤'))
      );
    }
  };

  const deleteSeoSetting = async (id: string) => {
    if (!confirm(t('seo_management.delete_confirm', '確定要刪除此 SEO 設定嗎？'))) return;

    try {
      const { error } = await supabase.from('seo_settings').delete().eq('id', id);
      if (error) throw error;
      await loadSeoSettings();
      alert(t('seo_management.delete_success', '刪除成功'));
    } catch (error) {
      console.error('Failed to delete SEO setting:', error);
      alert(t('seo_management.delete_failed', '刪除失敗'));
    }
  };

  const openForm = (seo?: SEOSetting) => {
    if (seo) {
      setEditingSeo(seo);
      setSeoForm({
        page_path: seo.page_path,
        title: seo.title,
        description: seo.description || '',
        keywords: seo.keywords || '',
        og_image: seo.og_image || '',
        canonical_url: seo.canonical_url || '',
        robots: seo.robots || 'index, follow',
        schema_markup: seo.schema_markup || null,
      });
    } else {
      setEditingSeo(null);
      setSeoForm({
        page_path: '',
        title: '',
        description: '',
        keywords: '',
        og_image: '',
        canonical_url: '',
        robots: 'index, follow',
        schema_markup: null,
      });
    }
    setShowPreview(false);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingSeo(null);
  };

  const filteredSettings = useMemo(
    () =>
      seoSettings.filter(
        (seo) =>
          seo.page_path.toLowerCase().includes(searchTerm.toLowerCase()) ||
          seo.title.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [searchTerm, seoSettings]
  );

  if (loading) {
    return <div className="p-6">{t('common.loading', '載入中...')}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('seo_management.title', 'SEO 管理')}</h1>
          <p className="mt-2 text-slate-600">{t('seo_management.subtitle', '管理頁面 SEO 設定與優化')}</p>
        </div>
        <button
          onClick={() => openForm()}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          {t('seo_management.add', '新增頁面')}
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-700" />
            <h3 className="font-bold text-blue-900">{t('seo_management.tip_title', 'SEO 最佳實踐')}</h3>
          </div>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>{t('seo_management.tip_1', '標題保持在 50-60 字元')}</li>
            <li>{t('seo_management.tip_2', '描述保持在 150-160 字元')}</li>
            <li>{t('seo_management.tip_3', '每頁使用唯一的標題和描述')}</li>
            <li>{t('seo_management.tip_4', '包含目標關鍵字')}</li>
          </ul>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-700" />
            <h3 className="font-bold text-green-900">{t('seo_management.schema_title', '結構化資料')}</h3>
          </div>
          <ul className="space-y-1 text-sm text-green-800">
            <li>{t('seo_management.schema_1', '使用 Schema.org 標記')}</li>
            <li>{t('seo_management.schema_2', '產品頁面使用 Product')}</li>
            <li>{t('seo_management.schema_3', '文章使用 Article')}</li>
            <li>{t('seo_management.schema_4', '組織資訊使用 Organization')}</li>
          </ul>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Eye className="h-5 w-5 text-amber-700" />
            <h3 className="font-bold text-amber-900">{t('seo_management.image_title', '圖片優化')}</h3>
          </div>
          <ul className="space-y-1 text-sm text-amber-800">
            <li>{t('seo_management.image_1', 'OG 圖片: 1200x630px')}</li>
            <li>{t('seo_management.image_2', '使用描述性檔名')}</li>
            <li>{t('seo_management.image_3', '壓縮圖片大小')}</li>
            <li>{t('seo_management.image_4', '添加 alt 屬性')}</li>
          </ul>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('seo_management.search_placeholder', '搜尋頁面...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredSettings.length === 0 ? (
            <div className="p-12 text-center">
              <Globe className="mx-auto mb-4 h-16 w-16 text-slate-300" />
              <h3 className="mb-2 text-lg font-bold text-slate-900">{t('seo_management.empty_title', '尚未設定 SEO')}</h3>
              <p className="mb-4 text-slate-600">
                {searchTerm
                  ? t('seo_management.empty_filtered', '找不到符合的頁面設定')
                  : t('seo_management.empty_default', '開始為您的頁面添加 SEO 設定')}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => openForm()}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  {t('seo_management.add_first', '新增第一個頁面')}
                </button>
              )}
            </div>
          ) : (
            filteredSettings.map((seo) => (
              <div key={seo.id} className="p-6 hover:bg-slate-50">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="rounded-lg bg-slate-100 px-3 py-1 font-mono text-sm text-slate-700">{seo.page_path}</span>
                      {seo.robots && (
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            seo.robots.includes('noindex') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {seo.robots}
                        </span>
                      )}
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-slate-900">{seo.title}</h3>
                    {seo.description && <p className="mb-2 line-clamp-2 text-sm text-slate-600">{seo.description}</p>}
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      {seo.keywords && <span>{t('seo_management.keywords', '關鍵字')}: {seo.keywords}</span>}
                      {seo.og_image && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {t('seo_management.og_image', '有 OG 圖片')}
                        </span>
                      )}
                      {seo.canonical_url && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {t('seo_management.canonical', '有 Canonical URL')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openForm(seo)}
                      className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteSeoSetting(seo.id)}
                      className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 py-8">
          <div className="mx-4 w-full max-w-3xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingSeo ? t('seo_management.edit_title', '編輯 SEO 設定') : t('seo_management.add_title', '新增 SEO 設定')}
              </h2>
              <button onClick={closeForm} className="rounded-lg p-2 transition-colors hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(100vh-16rem)] space-y-6 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t('seo_management.page_path', '頁面路徑')} *</label>
                  <input
                    type="text"
                    value={seoForm.page_path}
                    onChange={(e) => setSeoForm({ ...seoForm, page_path: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    placeholder="/about"
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">{t('seo_management.page_path_hint', '例如: /, /shop, /product/example')}</p>
                </div>

                <div className="col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {t('seo_management.title', '頁面標題')} * <span className="font-normal text-slate-500">({seoForm.title.length}/60)</span>
                  </label>
                  <input
                    type="text"
                    value={seoForm.title}
                    onChange={(e) => setSeoForm({ ...seoForm, title: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder={t('seo_management.title_placeholder', '精確描述頁面內容')}
                    maxLength={60}
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">{t('seo_management.title_hint', '建議 50-60 個字元')}</p>
                </div>

                <div className="col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Meta 描述 <span className="font-normal text-slate-500">({seoForm.description.length}/160)</span>
                  </label>
                  <textarea
                    value={seoForm.description}
                    onChange={(e) => setSeoForm({ ...seoForm, description: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    rows={3}
                    maxLength={160}
                    placeholder={t('seo_management.description_placeholder', '吸引用戶點擊的描述文字')}
                  />
                  <p className="mt-1 text-xs text-slate-500">{t('seo_management.description_hint', '建議 150-160 個字元')}</p>
                </div>

                <div className="col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t('seo_management.keywords', '關鍵字')}</label>
                  <input
                    type="text"
                    value={seoForm.keywords}
                    onChange={(e) => setSeoForm({ ...seoForm, keywords: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder={t('seo_management.keywords_placeholder', '關鍵字1, 關鍵字2, 關鍵字3')}
                  />
                  <p className="mt-1 text-xs text-slate-500">{t('seo_management.keywords_hint', '用逗號分隔多個關鍵字')}</p>
                </div>

                <div className="col-span-2">
                  <ImageUpload
                    value={seoForm.og_image}
                    onChange={(url) => setSeoForm({ ...seoForm, og_image: url })}
                    label={t('seo_management.og_image_label', 'OG 圖片 (社群分享圖)')}
                  />
                  <p className="mt-1 text-xs text-slate-500">{t('seo_management.og_image_hint', '建議尺寸: 1200x630 像素')}</p>
                </div>

                <div className="col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Canonical URL</label>
                  <input
                    type="url"
                    value={seoForm.canonical_url}
                    onChange={(e) => setSeoForm({ ...seoForm, canonical_url: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="https://example.com/original-page"
                  />
                  <p className="mt-1 text-xs text-slate-500">{t('seo_management.canonical_hint', '指定此頁面的正規網址（避免重複內容）')}</p>
                </div>

                <div className="col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t('seo_management.robots', 'Robots 設定')}</label>
                  <select
                    value={seoForm.robots}
                    onChange={(e) => setSeoForm({ ...seoForm, robots: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="index, follow">{t('seo_management.robots_index_follow', 'index, follow（允許索引和追蹤連結）')}</option>
                    <option value="noindex, follow">{t('seo_management.robots_noindex_follow', 'noindex, follow（不索引但追蹤連結）')}</option>
                    <option value="index, nofollow">{t('seo_management.robots_index_nofollow', 'index, nofollow（索引但不追蹤連結）')}</option>
                    <option value="noindex, nofollow">{t('seo_management.robots_noindex_nofollow', 'noindex, nofollow（不索引不追蹤）')}</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {t('seo_management.schema_markup', 'Schema.org 結構化資料 (JSON-LD)')}
                  </label>
                  <textarea
                    value={seoForm.schema_markup ? JSON.stringify(seoForm.schema_markup, null, 2) : ''}
                    onChange={(e) => {
                      try {
                        const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                        setSeoForm({ ...seoForm, schema_markup: parsed });
                      } catch {
                        // ignore invalid JSON while typing
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                    rows={6}
                    placeholder='{"@context": "https://schema.org", "@type": "Product", "name": "Product Name"}'
                  />
                  <p className="mt-1 text-xs text-slate-500">{t('seo_management.schema_hint', 'JSON-LD 格式的結構化資料')}</p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <button onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-2 text-slate-700 hover:text-slate-900">
                  <Eye className="h-4 w-4" />
                  {showPreview ? t('seo_management.hide_preview', '隱藏') : t('seo_management.show_preview', '顯示')}
                  {t('seo_management.preview_label', '搜尋結果預覽')}
                </button>

                {showPreview && (
                  <div className="mt-4 rounded-lg bg-slate-50 p-4">
                    <div className="max-w-2xl">
                      <div className="mb-1 text-xl text-blue-700 hover:underline">
                        {seoForm.title || t('seo_management.title_fallback', '頁面標題')}
                      </div>
                      <div className="mb-1 text-sm text-green-700">https://example.com{seoForm.page_path || '/'}</div>
                      <div className="text-sm text-slate-600">
                        {seoForm.description || t('seo_management.description_fallback', '頁面描述會顯示在這裡...')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 p-6">
              <button onClick={closeForm} className="rounded-lg px-4 py-2 text-slate-700 hover:bg-slate-100">
                {t('common.cancel', '取消')}
              </button>
              <button onClick={saveSeoSetting} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">
                <Save className="h-4 w-4" />
                {t('common.save', '儲存')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, CreditCard as Edit3, Save, X, ExternalLink, Clock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { sanitizeHtml, sanitizeText } from '../../lib/security';

interface StaticPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_description: string;
  updated_at: string;
  updated_by: string;
}

const PAGE_META: Record<string, { emoji: string; label: string; path: string }> = {
  about:   { emoji: '🏢', label: '關於 Nestobi', path: '/about' },
  privacy: { emoji: '🔒', label: '隱私政策', path: '/privacy' },
  terms:   { emoji: '📋', label: '服務條款', path: '/terms' },
  cookies: { emoji: '🍪', label: 'Cookie 政策', path: '/cookies' },
  'anti-fraud': { emoji: '盾', label: '防詐騙宣導', path: '/anti-fraud' },
};

const AdminStaticPages: React.FC = () => {
  const { user } = useAuth();
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editMeta, setEditMeta] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [previewMode, setPreviewMode] = useState(false);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('static_pages').select('*').order('slug');
    if (data) setPages(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const startEdit = (page: StaticPage) => {
    setEditingSlug(page.slug);
    setEditContent(page.content);
    setEditMeta(page.meta_description);
    setEditTitle(page.title);
    setPreviewMode(false);
    setSaveStatus('idle');
  };

  const cancelEdit = () => {
    setEditingSlug(null);
    setPreviewMode(false);
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    if (!editingSlug || !user) return;
    setSaving(true);
    setSaveStatus('idle');
    const { error } = await supabase
      .from('static_pages')
      .update({
        title: sanitizeText(editTitle, 120),
        content: sanitizeHtml(editContent),
        meta_description: sanitizeText(editMeta, 180),
        updated_at: new Date().toISOString(),
        updated_by: user.email || '',
      })
      .eq('slug', editingSlug);

    if (error) {
      setSaveStatus('error');
    } else {
      setSaveStatus('success');
      await fetchPages();
      setTimeout(() => { setEditingSlug(null); setSaveStatus('idle'); }, 1200);
    }
    setSaving(false);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (editingSlug) {
    const meta = PAGE_META[editingSlug];
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={cancelEdit} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <X className="w-5 h-5 text-gray-500" />
            </button>
            <span className="text-lg">{meta?.emoji}</span>
            <h2 className="text-xl font-bold text-gray-900">編輯頁面</h2>
          </div>
          <div className="flex items-center gap-2">
            <a href={meta?.path} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2C1F10] px-3 py-2 rounded-lg hover:bg-[#F0E4C8] transition">
              <ExternalLink className="w-4 h-4" />
              查看頁面
            </a>
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition ${previewMode ? 'bg-[#C09A6A] text-white' : 'text-gray-500 hover:text-[#2C1F10] hover:bg-[#F0E4C8]'}`}
            >
              {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {previewMode ? '編輯' : '預覽'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-[#C09A6A] hover:bg-[#8B6840] text-white px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-60"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              儲存
            </button>
          </div>
        </div>

        {saveStatus === 'success' && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
            <CheckCircle className="w-4 h-4" /> 儲存成功！
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            <AlertCircle className="w-4 h-4" /> 儲存失敗，請確認您有管理員權限。
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">頁面標題</label>
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SEO 描述</label>
            <input
              type="text"
              value={editMeta}
              onChange={e => setEditMeta(e.target.value)}
              placeholder="搜尋引擎顯示的摘要文字..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            頁面內容 <span className="text-gray-400 font-normal">（HTML 格式）</span>
          </label>

          <AnimatePresence mode="wait">
            {previewMode ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-h-[500px] bg-white border border-gray-200 rounded-xl p-8 overflow-auto prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(editContent) }}
              />
            ) : (
              <motion.textarea
                key="editor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={28}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2C1F10] resize-none bg-gray-50"
                placeholder="<section>...</section>"
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">靜態頁面管理</h1>
        <p className="text-gray-500 text-sm mt-1">編輯網站靜態頁面的內容，變更即時反映至前台。</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {pages.map((page, i) => {
          const meta = PAGE_META[page.slug];
          return (
            <motion.div
              key={page.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#F0E4C8] rounded-xl flex items-center justify-center text-lg">
                    {meta?.emoji}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{page.title}</h3>
                    <span className="text-xs text-gray-400 font-mono">/{page.slug}</span>
                  </div>
                </div>
                <a href={meta?.path} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 text-gray-400 hover:text-[#2C1F10] hover:bg-[#F0E4C8] rounded-lg transition">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {page.meta_description && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{page.meta_description}</p>
              )}

              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                <Clock className="w-3.5 h-3.5" />
                <span>最後更新：{formatDate(page.updated_at)}</span>
                {page.updated_by && <span className="text-gray-300">｜{page.updated_by}</span>}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEdit(page)}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#C09A6A] hover:bg-[#8B6840] text-white text-sm font-semibold py-2.5 rounded-xl transition"
                >
                  <Edit3 className="w-4 h-4" />
                  編輯內容
                </button>
                <a href={meta?.path} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 border border-gray-200 hover:border-[#2C1F10] hover:text-[#2C1F10] text-gray-500 text-sm font-medium py-2.5 px-4 rounded-xl transition">
                  <FileText className="w-4 h-4" />
                  查看
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <strong>提示：</strong>頁面內容使用 HTML 格式編輯。可使用 Tailwind CSS class 進行樣式設定。修改後請使用「預覽」功能確認顯示效果。
        </p>
      </div>
    </div>
  );
};

export default AdminStaticPages;

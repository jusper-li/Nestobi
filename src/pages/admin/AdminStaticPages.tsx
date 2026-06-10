import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Code2,
  Cookie,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Save,
  Shield,
  ShieldAlert,
  X,
} from 'lucide-react';
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

const PAGE_META: Record<string, { icon: React.ElementType; label: string; path: string }> = {
  about: { icon: FileText, label: '關於我們', path: '/about' },
  privacy: { icon: Shield, label: '隱私權政策', path: '/privacy' },
  terms: { icon: FileCheck2, label: '服務條款', path: '/terms' },
  cookies: { icon: Cookie, label: 'Cookie 設定', path: '/cookies' },
  'anti-fraud': { icon: ShieldAlert, label: '防詐騙專區', path: '/anti-fraud' },
};

const editorFormats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'align',
  'blockquote',
  'link',
  'image',
];

const BlockEmbed = Quill.import('blots/block/embed') as any;

class StyledImageBlot extends BlockEmbed {
  static blotName = 'image';
  static tagName = 'img';

  static create(value: { src?: string; alt?: string; width?: string; height?: string } | string) {
    const node = super.create() as HTMLImageElement;
    const data = typeof value === 'string' ? { src: value } : value;
    if (data.src) node.setAttribute('src', data.src);
    if (data.alt) node.setAttribute('alt', data.alt);
    if (data.width) node.style.width = data.width;
    if (data.height) node.style.height = data.height;
    node.style.maxWidth = '100%';
    node.style.display = 'block';
    return node;
  }

  static value(node: HTMLImageElement) {
    return {
      src: node.getAttribute('src') || '',
      alt: node.getAttribute('alt') || '',
      width: node.style.width || '',
      height: node.style.height || '',
    };
  }
}

const quillRegistry = Quill as unknown as {
  register: (blot: unknown, suppressWarning?: boolean) => void;
  __nestobiImageBlotRegistered?: boolean;
};

if (!quillRegistry.__nestobiImageBlotRegistered) {
  quillRegistry.register(StyledImageBlot, true);
  quillRegistry.__nestobiImageBlotRegistered = true;
}

type QuillEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onImagePick: () => void;
  canEdit: boolean;
  editorRef: React.MutableRefObject<Quill | null>;
};

function QuillEditor({ value, onChange, onImagePick, canEdit, editorRef }: QuillEditorProps) {
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const suppressChangeRef = useRef(false);

  useEffect(() => {
    if (!editorRootRef.current || quillRef.current) return;

    const quill = new Quill(editorRootRef.current, {
      theme: 'snow',
      placeholder: '請輸入頁面內容...',
      modules: {
        toolbar: {
          container: toolbarRef.current as HTMLDivElement,
          handlers: {
            image: () => {
              if (canEdit) onImagePick();
            },
          },
        },
      },
      formats: editorFormats,
    });

    quillRef.current = quill;
    editorRef.current = quill;

    quill.on('text-change', () => {
      if (suppressChangeRef.current) return;
      onChange(quill.root.innerHTML);
    });

    quill.clipboard.dangerouslyPasteHTML(value || '', 'silent');

    return () => {
      quillRef.current = null;
      editorRef.current = null;
      if (editorRootRef.current) editorRootRef.current.innerHTML = '';
    };
  }, [canEdit, editorRef, onChange, onImagePick, value]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;

    if (quill.root.innerHTML !== value) {
      suppressChangeRef.current = true;
      const selection = quill.getSelection();
      quill.clipboard.dangerouslyPasteHTML(value || '', 'silent');
      if (selection) quill.setSelection(selection.index, selection.length, 'silent');
      window.requestAnimationFrame(() => {
        suppressChangeRef.current = false;
      });
    }
  }, [value]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div ref={toolbarRef} className="ql-toolbar ql-snow">
        <span className="ql-formats">
          <select className="ql-header" defaultValue="">
            <option value="1">H1</option>
            <option value="2">H2</option>
            <option value="3">H3</option>
            <option value="">Normal</option>
          </select>
          <button type="button" className="ql-bold" />
          <button type="button" className="ql-italic" />
          <button type="button" className="ql-underline" />
          <button type="button" className="ql-strike" />
        </span>
        <span className="ql-formats">
          <button type="button" className="ql-list" value="ordered" />
          <button type="button" className="ql-list" value="bullet" />
          <button type="button" className="ql-blockquote" />
          <button type="button" className="ql-link" />
          <button
            type="button"
            className="ql-image"
            disabled={!canEdit}
            title={canEdit ? '插入圖片' : '目前沒有上傳圖片權限'}
          />
          <button type="button" className="ql-clean" />
        </span>
      </div>
      <div ref={editorRootRef} className="min-h-[540px] bg-white" />
    </div>
  );
}

const AdminStaticPages: React.FC = () => {
  const { user, role } = useAuth();
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editMeta, setEditMeta] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [editorView, setEditorView] = useState<'visual' | 'preview' | 'source'>('visual');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageDialogUrl, setImageDialogUrl] = useState('');
  const [imageDialogAlt, setImageDialogAlt] = useState('');
  const [imageDialogWidth, setImageDialogWidth] = useState('100%');
  const [imageDialogHeight, setImageDialogHeight] = useState('');
  const editorRef = useRef<Quill | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const imageSelectionRef = useRef<{ index: number; length: number } | null>(null);
  const canEditPages = role === 'admin' || role === 'superadmin';

  const fetchPages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('static_pages').select('*').order('slug');
    if (!error && data) setPages(data as StaticPage[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchPages();
  }, [fetchPages]);

  const editingPage = useMemo(
    () => pages.find(page => page.slug === editingSlug) || null,
    [pages, editingSlug],
  );

  const startEdit = (page: StaticPage) => {
    setEditingSlug(page.slug);
    setEditContent(page.content || '');
    setEditMeta(page.meta_description || '');
    setEditTitle(page.title || '');
    setEditorView('visual');
    setSaveStatus('idle');
    setSaveMessage('');
  };

  const cancelEdit = () => {
    setEditingSlug(null);
    setEditorView('visual');
    setSaveStatus('idle');
    setSaveMessage('');
  };

  const handleSave = async () => {
    if (!editingSlug || !user || saving) return;

    if (!canEditPages) {
      setSaveStatus('error');
      setSaveMessage(`目前登入角色是 ${role}，沒有靜態頁面編輯權限，請改用 admin / superadmin 帳號。`);
      return;
    }

    setSaving(true);
    setSaveStatus('idle');
    setSaveMessage('');

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
      setSaveMessage(`儲存失敗：${error.message}`);
    } else {
      setSaveStatus('success');
      setSaveMessage('已儲存更新');
      await fetchPages();
      window.setTimeout(() => {
        setEditingSlug(null);
        setSaveStatus('idle');
        setSaveMessage('');
      }, 1200);
    }

    setSaving(false);
  };

  const normalizeDimension = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    if (/^\d+(\.\d+)?(px|%)?$/.test(trimmed)) return trimmed.endsWith('%') || trimmed.endsWith('px') ? trimmed : `${trimmed}px`;
    if (trimmed === 'auto') return 'auto';
    return trimmed;
  };

  const insertImage = useCallback((payload: { src: string; alt?: string; width?: string; height?: string }) => {
    const quill = editorRef.current;
    if (!quill) {
      setSaveStatus('error');
      setSaveMessage('編輯器尚未就緒，無法插入圖片。');
      setImageUploading(false);
      return;
    }

    quill.focus();
    const range = imageSelectionRef.current || quill.getSelection(true);
    const index = range?.index ?? quill.getLength();
    quill.insertEmbed(index, 'image', payload, 'user');
    quill.setSelection(index + 1, 0, 'silent');
    setEditContent(quill.root.innerHTML);
    setImageDialogOpen(false);
  }, []);

  const handleImageButtonClick = useCallback(() => {
    if (!canEditPages) {
      setSaveStatus('error');
      setSaveMessage('目前登入帳號沒有上傳圖片權限。');
      return;
    }

    const quill = editorRef.current;
    imageSelectionRef.current = quill?.getSelection(true) || null;
    imageInputRef.current?.click();
  }, [canEditPages]);

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!canEditPages) {
      setSaveStatus('error');
      setSaveMessage('目前登入帳號沒有上傳圖片權限。');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setSaveStatus('error');
      setSaveMessage('請選擇圖片檔案。');
      return;
    }

    const uploadImage = async () => {
      setImageUploading(true);
      setSaveStatus('idle');
      setSaveMessage('');

      const safeName = file.name
        .trim()
        .replace(/[^\w.\-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '') || 'image';

      const fileName = `static-pages/${editingSlug || 'page'}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage
        .from('site-assets')
        .upload(fileName, file, { upsert: false, contentType: file.type });

      if (error) {
        setSaveStatus('error');
        setSaveMessage(`圖片上傳失敗：${error.message}`);
        setImageUploading(false);
        return;
      }

      const { data } = supabase.storage.from('site-assets').getPublicUrl(fileName);
      setImageDialogUrl(data.publicUrl);
      setImageDialogAlt(safeName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim());
      setImageDialogWidth('100%');
      setImageDialogHeight('');
      setImageDialogOpen(true);
      setImageUploading(false);
    };

    void uploadImage();
  }, [canEditPages, editingSlug]);

  const confirmImageInsert = useCallback(() => {
    if (!imageDialogUrl) {
      setSaveStatus('error');
      setSaveMessage('圖片網址不存在，無法插入。');
      return;
    }

    insertImage({
      src: imageDialogUrl,
      alt: imageDialogAlt.trim(),
      width: normalizeDimension(imageDialogWidth),
      height: normalizeDimension(imageDialogHeight),
    });
  }, [imageDialogAlt, imageDialogHeight, imageDialogUrl, imageDialogWidth, insertImage]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2C1F10] border-t-transparent" />
      </div>
    );
  }

  if (editingPage) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <button
              type="button"
              onClick={cancelEdit}
              className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-gray-500 shadow-sm ring-1 ring-gray-200 transition hover:text-gray-900"
            >
              <X className="h-4 w-4" />
              關閉
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0E4C8] text-[#2C1F10]">
                <FileText className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold text-gray-900">{editingPage.title}</h1>
                <p className="text-sm text-gray-500">/{editingPage.slug}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <a
              href={PAGE_META[editingPage.slug]?.path || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-[#2C1F10] hover:text-[#2C1F10]"
            >
              <ExternalLink className="h-4 w-4" />
              開啟頁面
            </a>
            <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
              <button
                onClick={() => setEditorView('visual')}
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${
                  editorView === 'visual'
                    ? 'bg-[#C09A6A] text-white'
                    : 'text-gray-500 hover:bg-[#F0E4C8] hover:text-[#2C1F10]'
                }`}
              >
                <Edit3 className="h-4 w-4" />
                編輯
              </button>
              <button
                onClick={() => setEditorView('preview')}
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${
                  editorView === 'preview'
                    ? 'bg-[#C09A6A] text-white'
                    : 'text-gray-500 hover:bg-[#F0E4C8] hover:text-[#2C1F10]'
                }`}
              >
                <Eye className="h-4 w-4" />
                預覽
              </button>
              <button
                onClick={() => setEditorView('source')}
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${
                  editorView === 'source'
                    ? 'bg-[#C09A6A] text-white'
                    : 'text-gray-500 hover:bg-[#F0E4C8] hover:text-[#2C1F10]'
                }`}
              >
                <Code2 className="h-4 w-4" />
                原始碼
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !canEditPages}
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-[#C09A6A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8B6840] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              儲存
            </button>
          </div>
        </div>

        {saveStatus === 'success' && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            {saveMessage || '已儲存更新'}
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {saveMessage || '儲存或上傳失敗，請稍後再試'}
          </div>
        )}

        {!canEditPages && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              目前登入角色是 <strong>{role}</strong>，這個頁面需要 <strong>admin / superadmin</strong> 權限才能儲存內容與上傳圖片。
            </div>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">頁面標題</label>
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">SEO 描述</label>
            <input
              type="text"
              value={editMeta}
              onChange={e => setEditMeta(e.target.value)}
              placeholder="建議 120 字以內，用於搜尋引擎摘要"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <label className="block text-sm font-medium text-gray-700">頁面內容</label>
            <span className="text-xs text-gray-400">可切換編輯、預覽與原始碼檢視</span>
          </div>

          <AnimatePresence mode="wait">
            {editorView === 'preview' ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="prose prose-slate min-h-[540px] max-w-none overflow-auto rounded-xl border border-gray-200 bg-white p-6"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(editContent) }}
              />
            ) : editorView === 'source' ? (
              <motion.div
                key="source"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  spellCheck={false}
                  className="min-h-[540px] w-full rounded-xl border border-gray-200 bg-slate-950 px-4 py-3 font-mono text-sm leading-6 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
                />
                <p className="mt-2 text-xs text-gray-500">
                  這裡可以直接檢視和編輯 HTML 原始碼。儲存時會自動做安全清理。
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="editor"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <QuillEditor
                  value={editContent}
                  onChange={setEditContent}
                  onImagePick={handleImageButtonClick}
                  canEdit={canEditPages}
                  editorRef={editorRef}
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                {imageUploading && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-500">
                    圖片上傳中，完成後會自動跳出尺寸設定視窗...
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {imageDialogOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">設定圖片尺寸</h3>
                  <p className="text-sm text-gray-500">確認網址後，設定寬高再插入內容。</p>
                </div>
                <button
                  type="button"
                  onClick={() => setImageDialogOpen(false)}
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">圖片網址</label>
                  <input
                    value={imageDialogUrl}
                    readOnly
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">替代文字</label>
                  <input
                    value={imageDialogAlt}
                    onChange={e => setImageDialogAlt(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
                    placeholder="輸入圖片說明"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">寬度</label>
                    <input
                      value={imageDialogWidth}
                      onChange={e => setImageDialogWidth(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
                      placeholder="100% / 600px"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">高度</label>
                    <input
                      value={imageDialogHeight}
                      onChange={e => setImageDialogHeight(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
                      placeholder="auto / 300px"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setImageDialogOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={confirmImageInsert}
                  className="rounded-xl bg-[#C09A6A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8B6840]"
                >
                  插入圖片
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>提醒：</strong>編輯內容、原始碼與圖片都會存進 Supabase。原始碼模式適合快速貼入 HTML，但仍會在儲存時做安全清理。
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">靜態頁面管理</h1>
        <p className="mt-1 text-sm text-gray-500">可編輯關於我們、隱私權政策、服務條款、Cookie 設定與防詐騙專區。</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {pages.map((page, index) => {
          const meta = PAGE_META[page.slug];
          const Icon = meta?.icon || FileText;

          return (
            <motion.div
              key={page.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0E4C8] text-[#2C1F10]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{page.title}</h3>
                    <p className="text-xs text-gray-400">/{page.slug}</p>
                  </div>
                </div>
                <a
                  href={meta?.path || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-[#F0E4C8] hover:text-[#2C1F10]"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              {page.meta_description && (
                <p className="mb-4 line-clamp-2 text-sm text-gray-500">{page.meta_description}</p>
              )}

              <div className="mb-4 flex items-center gap-2 text-xs text-gray-400">
                <Clock className="h-3.5 w-3.5" />
                <span>更新：{formatDate(page.updated_at)}</span>
                {page.updated_by && <span className="text-gray-300">｜ {page.updated_by}</span>}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEdit(page)}
                  type="button"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#C09A6A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8B6840]"
                >
                  <Edit3 className="h-4 w-4" />
                  編輯內容
                </button>
                <a
                  href={meta?.path || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-500 transition hover:border-[#2C1F10] hover:text-[#2C1F10]"
                >
                  <ExternalLink className="h-4 w-4" />
                  開啟
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default AdminStaticPages;

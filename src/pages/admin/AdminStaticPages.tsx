import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Cookie,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
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

const BlockEmbed = Quill.import('blots/block/embed');

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
};

function QuillEditor({ value, onChange, onImagePick }: QuillEditorProps) {
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const suppressChangeRef = useRef(false);

  useEffect(() => {
    if (!editorRootRef.current || quillRef.current) return;

    const quill = new Quill(editorRootRef.current, {
      theme: 'snow',
      placeholder: '輸入頁面內容...',
      modules: {
        toolbar: {
          container: toolbarRef.current as HTMLDivElement,
          handlers: {
            image: onImagePick,
          },
        },
      },
      formats: editorFormats,
    });

    quillRef.current = quill;

    quill.on('text-change', () => {
      if (suppressChangeRef.current) return;
      onChange(quill.root.innerHTML);
    });

    quill.clipboard.dangerouslyPasteHTML(value || '', 'silent');

    return () => {
      quillRef.current = null;
      if (editorRootRef.current) editorRootRef.current.innerHTML = '';
    };
  }, [onChange, onImagePick, value]);

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
    <div className="rounded-xl border border-gray-200 bg-white">
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
          <button type="button" className="ql-image" />
          <button type="button" className="ql-clean" />
        </span>
      </div>
      <div ref={editorRootRef} className="min-h-[540px] bg-white" />
    </div>
  );
}

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
  const [imageUploading, setImageUploading] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageDialogUrl, setImageDialogUrl] = useState('');
  const [imageDialogAlt, setImageDialogAlt] = useState('');
  const [imageDialogWidth, setImageDialogWidth] = useState('100%');
  const [imageDialogHeight, setImageDialogHeight] = useState('');
  const editorRef = useRef<Quill | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const imageSelectionRef = useRef<{ index: number; length: number } | null>(null);

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
    setPreviewMode(false);
    setSaveStatus('idle');
  };

  const cancelEdit = () => {
    setEditingSlug(null);
    setPreviewMode(false);
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    if (!editingSlug || !user || saving) return;

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
      window.setTimeout(() => {
        setEditingSlug(null);
        setSaveStatus('idle');
      }, 1200);
    }

    setSaving(false);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const normalizeDimension = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed === 'auto') return 'auto';
    if (/^\d+(\.\d+)?$/.test(trimmed)) return `${trimmed}px`;
    return trimmed;
  };

  const insertImage = useCallback((payload: { src: string; alt?: string; width?: string; height?: string }) => {
    const quill = editorRef.current;
    if (!quill) {
      setSaveStatus('error');
      setImageUploading(false);
      return;
    }

    quill.focus();
    const range = imageSelectionRef.current || quill.getSelection(true);
    const index = range ? range.index : quill.getLength();
    quill.insertEmbed(index, 'image', payload, 'user');
    quill.setSelection(index + 1, 0, 'silent');
    setEditContent(quill.root.innerHTML);
    setImageDialogOpen(false);
  }, []);

  const handleImageButtonClick = useCallback(() => {
    const quill = editorRef.current;
    imageSelectionRef.current = quill?.getSelection(true) || null;
    imageInputRef.current?.click();
  }, []);

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSaveStatus('error');
      return;
    }

    const uploadImage = async () => {
      setImageUploading(true);
      setSaveStatus('idle');

      const safeName = file.name
        .trim()
        .replace(/[^\w.\-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '') || 'image';
      const folder = editingSlug ? `static-pages/${editingSlug}` : 'static-pages/general';
      const ext = safeName.includes('.') ? safeName.split('.').pop() : file.type.split('/').pop() || 'png';
      const fileName = `${folder}/${Date.now()}-${safeName.replace(/\.[^.]+$/, '')}.${ext}`;

      const { error } = await supabase.storage
        .from('site-assets')
        .upload(fileName, file, { upsert: false, contentType: file.type });

      if (error) {
        setSaveStatus('error');
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
  }, [editingSlug]);

  const confirmImageInsert = useCallback(() => {
    if (!imageDialogUrl) return;
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

  if (editingSlug && editingPage) {
    const Icon = PAGE_META[editingSlug]?.icon || FileText;
    const meta = PAGE_META[editingSlug];

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button onClick={cancelEdit} className="rounded-lg p-2 transition hover:bg-gray-100" type="button">
              <X className="h-5 w-5 text-gray-500" />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0E4C8] text-[#2C1F10]">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{meta?.label || editingPage.title}</h2>
              <p className="text-sm text-gray-500">/{editingSlug}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={meta?.path || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 transition hover:bg-[#F0E4C8] hover:text-[#2C1F10]"
            >
              <ExternalLink className="h-4 w-4" />
              開啟頁面
            </a>
            <button
              onClick={() => setPreviewMode(prev => !prev)}
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${
                previewMode ? 'bg-[#C09A6A] text-white' : 'text-gray-500 hover:bg-[#F0E4C8] hover:text-[#2C1F10]'
              }`}
            >
              {previewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {previewMode ? '編輯' : '預覽'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
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
            已儲存更新
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            儲存或上傳失敗，請稍後再試
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
              placeholder="頁面摘要，用於搜尋引擎與分享預覽"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <label className="block text-sm font-medium text-gray-700">頁面內容</label>
            <span className="text-xs text-gray-400">可直接插入圖片，並在插入前設定尺寸</span>
          </div>

          <AnimatePresence mode="wait">
            {previewMode ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="min-h-[540px] overflow-auto rounded-xl border border-gray-200 bg-white p-6 prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(editContent) }}
              />
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
          <strong>提醒：</strong>編輯器支援標題、粗體、斜體、清單、引用、連結與圖片。圖片會先上傳到 Supabase Storage，再以正式網址插入內容。
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">靜態頁面管理</h1>
        <p className="mt-1 text-sm text-gray-500">集中編輯關於我們、隱私權政策、服務條款、Cookie 與防詐騙專區。</p>
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
                <span>更新於 {formatDate(page.updated_at)}</span>
                {page.updated_by && <span className="text-gray-300">· {page.updated_by}</span>}
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
                  <FileText className="h-4 w-4" />
                  查看
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminStaticPages;

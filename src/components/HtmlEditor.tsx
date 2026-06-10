import React, { useCallback, useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import {
  Bold,
  Code,
  Code2,
  Eye,
  EyeOff,
  Heading2,
  Heading3,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Type,
  Underline,
  X,
} from 'lucide-react';
import { sanitizeHtml } from '../lib/security';

interface HtmlEditorProps {
  value: string;
  onChange: (val: string) => void;
  rows?: number;
  placeholder?: string;
  preview?: boolean;
  onTogglePreview?: () => void;
  accentClass?: string;
}

type EditorMode = 'visual' | 'source';
type InsertAction = 'link' | 'image';

const editorFormats = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'blockquote', 'link', 'image'];
const BlockEmbed = Quill.import('blots/block/embed') as any;

class StyledImageBlot extends BlockEmbed {
  static blotName = 'image';
  static tagName = 'img';

  static create(value: { src?: string; alt?: string } | string) {
    const node = super.create() as HTMLImageElement;
    const data = typeof value === 'string' ? { src: value } : value;
    if (data.src) node.setAttribute('src', data.src);
    if (data.alt) node.setAttribute('alt', data.alt);
    node.style.maxWidth = '100%';
    node.style.display = 'block';
    return node;
  }

  static value(node: HTMLImageElement) {
    return {
      src: node.getAttribute('src') || '',
      alt: node.getAttribute('alt') || '',
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

function normalizeSelection(range: { index: number; length: number } | null, fallback: number) {
  return range ? { index: range.index, length: range.length } : { index: fallback, length: 0 };
}

function insertHtmlSnippet(source: string, selection: { index: number; length: number }, html: string) {
  const before = source.slice(0, selection.index);
  const selected = source.slice(selection.index, selection.index + selection.length);
  const after = source.slice(selection.index + selection.length);
  return before + html.replace('__TEXT__', selected || 'text') + after;
}

const ToolbarButton: React.FC<{
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  active?: boolean;
}> = ({ onClick, title, children, active }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`flex items-center justify-center rounded-md p-1.5 transition ${
      active ? 'bg-amber-100 text-amber-800' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
    }`}
  >
    {children}
  </button>
);

const Divider = () => <div className="mx-0.5 h-5 w-px bg-gray-300" />;

const HtmlEditor: React.FC<HtmlEditorProps> = ({
  value,
  onChange,
  rows = 16,
  placeholder = '<p>請輸入內容...</p>',
  preview = false,
  onTogglePreview,
  accentClass = 'focus:ring-amber-400',
}) => {
  const [mode, setMode] = useState<EditorMode>('visual');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<InsertAction | null>(null);
  const [dialogUrl, setDialogUrl] = useState('');
  const [dialogText, setDialogText] = useState('');
  const [dialogAlt, setDialogAlt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const suppressChangeRef = useRef(false);
  const sourceSelectionRef = useRef<{ index: number; length: number }>({ index: 0, length: 0 });
  const visualSelectionRef = useRef<{ index: number; length: number } | null>(null);

  const openDialog = useCallback((action: InsertAction) => {
    setDialogAction(action);
    setDialogUrl('');
    setDialogText('');
    setDialogAlt('');
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setDialogAction(null);
  }, []);

  useEffect(() => {
    if (!editorRootRef.current || quillRef.current) return;

    const quill = new Quill(editorRootRef.current, {
      theme: 'snow',
      placeholder,
      modules: {
        toolbar: {
          container: toolbarRef.current as HTMLDivElement,
          handlers: {
            link: () => {
              visualSelectionRef.current = quill.getSelection(true);
              openDialog('link');
            },
            image: () => {
              visualSelectionRef.current = quill.getSelection(true);
              openDialog('image');
            },
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
  }, [onChange, openDialog, placeholder, value]);

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

  const insertSourceMarkup = useCallback((markup: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const selection = {
      index: textarea.selectionStart,
      length: textarea.selectionEnd - textarea.selectionStart,
    };
    sourceSelectionRef.current = selection;
    const nextValue = insertHtmlSnippet(value, selection, markup);
    onChange(nextValue);
    window.requestAnimationFrame(() => {
      const cursor = selection.index + markup.replace('__TEXT__', value.slice(selection.index, selection.index + selection.length) || 'text').length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }, [onChange, value]);

  const handleSourceSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    sourceSelectionRef.current = {
      index: textarea.selectionStart,
      length: textarea.selectionEnd - textarea.selectionStart,
    };
  };

  const applyDialog = useCallback(() => {
    if (!dialogAction || !dialogUrl.trim()) return;

    if (mode === 'source') {
      const selection = sourceSelectionRef.current;
      const inserted =
        dialogAction === 'link'
          ? `<a href="${dialogUrl.trim()}" target="_blank" rel="noopener noreferrer">${dialogText.trim() || '__TEXT__'}</a>`
          : `<img src="${dialogUrl.trim()}" alt="${dialogAlt.trim()}" style="max-width:100%;height:auto;display:block;" />`;
      const nextValue = insertHtmlSnippet(value, selection, inserted);
      onChange(nextValue);
      window.requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const cursor = selection.index + inserted.length;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
      });
      closeDialog();
      return;
    }

    const quill = quillRef.current;
    if (!quill) return;

    const range = normalizeSelection(visualSelectionRef.current || quill.getSelection(true), quill.getLength());
    quill.focus();

    if (dialogAction === 'link') {
      const text = dialogText.trim() || 'link';
      if (range.length > 0) {
        quill.formatText(range.index, range.length, 'link', dialogUrl.trim(), 'user');
      } else {
        quill.insertText(range.index, text, { link: dialogUrl.trim() }, 'user');
        quill.setSelection(range.index + text.length, 0, 'silent');
      }
    } else {
      quill.insertEmbed(range.index, 'image', { src: dialogUrl.trim(), alt: dialogAlt.trim() }, 'user');
      quill.setSelection(range.index + 1, 0, 'silent');
    }

    onChange(quill.root.innerHTML);
    closeDialog();
  }, [closeDialog, dialogAction, dialogAlt, dialogText, dialogUrl, mode, onChange, value]);

  const iconSize = 'h-3.5 w-3.5';

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
        {onTogglePreview && (
          <ToolbarButton title={preview ? '切回編輯' : '預覽 HTML'} onClick={onTogglePreview} active={preview}>
            {preview ? <EyeOff className={iconSize} /> : <Eye className={iconSize} />}
          </ToolbarButton>
        )}
        <ToolbarButton
          title={mode === 'source' ? '切回視覺編輯' : '查看原始碼'}
          onClick={() => setMode(prev => (prev === 'source' ? 'visual' : 'source'))}
          active={mode === 'source'}
        >
          <Code2 className={iconSize} />
        </ToolbarButton>
      </div>

      {!preview && mode === 'visual' && (
        <div ref={toolbarRef} className="ql-toolbar ql-snow border-x-0 border-t-0">
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
      )}

      {!preview && mode === 'source' && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
          <ToolbarButton title="段落 <p>" onClick={() => insertSourceMarkup('<p>__TEXT__</p>')}>
            <Type className={iconSize} />
          </ToolbarButton>
          <ToolbarButton title="H2" onClick={() => insertSourceMarkup('<h2>__TEXT__</h2>')}>
            <Heading2 className={iconSize} />
          </ToolbarButton>
          <ToolbarButton title="H3" onClick={() => insertSourceMarkup('<h3>__TEXT__</h3>')}>
            <Heading3 className={iconSize} />
          </ToolbarButton>
          <Divider />
          <ToolbarButton title="粗體 <strong>" onClick={() => insertSourceMarkup('<strong>__TEXT__</strong>')}>
            <Bold className={iconSize} />
          </ToolbarButton>
          <ToolbarButton title="斜體 <em>" onClick={() => insertSourceMarkup('<em>__TEXT__</em>')}>
            <Italic className={iconSize} />
          </ToolbarButton>
          <ToolbarButton title="底線 <u>" onClick={() => insertSourceMarkup('<u>__TEXT__</u>')}>
            <Underline className={iconSize} />
          </ToolbarButton>
          <ToolbarButton title="刪除線 <s>" onClick={() => insertSourceMarkup('<s>__TEXT__</s>')}>
            <Strikethrough className={iconSize} />
          </ToolbarButton>
          <ToolbarButton title="程式碼 <code>" onClick={() => insertSourceMarkup('<code>__TEXT__</code>')}>
            <Code className={iconSize} />
          </ToolbarButton>
          <Divider />
          <ToolbarButton title="項目清單 <ul>" onClick={() => insertSourceMarkup('<ul>\n  <li>__TEXT__</li>\n</ul>')}>
            <List className={iconSize} />
          </ToolbarButton>
          <ToolbarButton title="編號清單 <ol>" onClick={() => insertSourceMarkup('<ol>\n  <li>__TEXT__</li>\n</ol>')}>
            <ListOrdered className={iconSize} />
          </ToolbarButton>
          <ToolbarButton title="引用 <blockquote>" onClick={() => insertSourceMarkup('<blockquote>__TEXT__</blockquote>')}>
            <Quote className={iconSize} />
          </ToolbarButton>
          <Divider />
          <ToolbarButton title="插入連結" onClick={() => openDialog('link')}>
            <Link className={iconSize} />
          </ToolbarButton>
          <ToolbarButton title="插入圖片" onClick={() => openDialog('image')}>
            <Image className={iconSize} />
          </ToolbarButton>
          <ToolbarButton title="水平線 <hr>" onClick={() => insertSourceMarkup('<hr />')}>
            <Minus className={iconSize} />
          </ToolbarButton>
        </div>
      )}

      {preview ? (
        <div
          className="prose prose-gray min-h-[200px] max-w-none bg-white p-4 text-sm"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) || '<p class="text-gray-400">尚無內容</p>' }}
        />
      ) : mode === 'source' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onSelect={handleSourceSelection}
          rows={rows}
          placeholder={placeholder}
          className={`w-full resize-y rounded-b-xl bg-white px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 ${accentClass}`}
        />
      ) : (
        <div ref={editorRootRef} className="min-h-[280px] bg-white" />
      )}

      {dialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {dialogAction === 'link' ? '插入連結' : '插入圖片'}
                </h3>
                <p className="text-sm text-gray-500">請輸入網址，完成後會直接插入內容。</p>
              </div>
              <button type="button" onClick={closeDialog} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">網址</label>
                <input
                  value={dialogUrl}
                  onChange={e => setDialogUrl(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="https://"
                />
              </div>
              {dialogAction === 'link' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">連結文字</label>
                  <input
                    value={dialogText}
                    onChange={e => setDialogText(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="未選取文字時使用"
                  />
                </div>
              )}
              {dialogAction === 'image' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">替代文字</label>
                  <input
                    value={dialogAlt}
                    onChange={e => setDialogAlt(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="圖片說明"
                  />
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeDialog} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50">
                取消
              </button>
              <button type="button" onClick={applyDialog} className="rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800">
                插入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HtmlEditor;

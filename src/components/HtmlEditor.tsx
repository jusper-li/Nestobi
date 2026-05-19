import React, { useRef, useCallback } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  Heading2, Heading3, List, ListOrdered,
  Quote, Link, Image, Minus, Code, Type,
  Eye, EyeOff,
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

type ToolbarAction =
  | { type: 'wrap'; open: string; close: string; placeholder?: string }
  | { type: 'block'; open: string; close: string; placeholder?: string }
  | { type: 'line'; template: string }
  | { type: 'link' }
  | { type: 'image' };

function insertContent(
  textarea: HTMLTextAreaElement,
  action: ToolbarAction,
  onChange: (val: string) => void,
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end);
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(end);

  let inserted = '';
  let selectStart = start;
  let selectEnd = start;

  if (action.type === 'wrap') {
    const inner = selected || action.placeholder || 'text';
    inserted = action.open + inner + action.close;
    selectStart = start + action.open.length;
    selectEnd = selectStart + inner.length;
  } else if (action.type === 'block') {
    const inner = selected || action.placeholder || 'text';
    const needsNewline = before.length > 0 && !before.endsWith('\n');
    inserted = (needsNewline ? '\n' : '') + action.open + inner + action.close + '\n';
    selectStart = start + (needsNewline ? 1 : 0) + action.open.length;
    selectEnd = selectStart + inner.length;
  } else if (action.type === 'line') {
    const needsNewline = before.length > 0 && !before.endsWith('\n');
    inserted = (needsNewline ? '\n' : '') + action.template + '\n';
    selectStart = start + inserted.length;
    selectEnd = selectStart;
  } else if (action.type === 'link') {
    const url = window.prompt('請輸入連結網址', 'https://');
    if (!url) return;
    const text = selected || '連結文字';
    inserted = `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    selectStart = start + inserted.length;
    selectEnd = selectStart;
  } else if (action.type === 'image') {
    const url = window.prompt('請輸入圖片網址', 'https://');
    if (!url) return;
    const alt = window.prompt('圖片說明（alt text）', '') || '';
    const needsNewline = before.length > 0 && !before.endsWith('\n');
    inserted = (needsNewline ? '\n' : '') + `<img src="${url}" alt="${alt}" style="max-width:100%;" />\n`;
    selectStart = start + inserted.length;
    selectEnd = selectStart;
  }

  const newVal = before + inserted + after;
  onChange(newVal);

  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(selectStart, selectEnd);
  }, 0);
}

interface ToolbarButtonProps {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

const Btn: React.FC<ToolbarButtonProps> = ({ onClick, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition flex items-center justify-center"
  >
    {children}
  </button>
);

const Divider = () => <div className="w-px h-5 bg-gray-300 mx-0.5" />;

const HtmlEditor: React.FC<HtmlEditorProps> = ({
  value,
  onChange,
  rows = 16,
  placeholder = '<p>在這裡輸入內容，支援 HTML 標記...</p>',
  preview = false,
  onTogglePreview,
  accentClass = 'focus:ring-amber-400',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const exec = useCallback((action: ToolbarAction) => {
    if (!textareaRef.current) return;
    insertContent(textareaRef.current, action, onChange);
  }, [onChange]);

  const iconSize = 'w-3.5 h-3.5';

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <Btn title="段落 <p>" onClick={() => exec({ type: 'block', open: '<p>', close: '</p>', placeholder: '段落文字' })}>
          <Type className={iconSize} />
        </Btn>
        <Btn title="標題 H2" onClick={() => exec({ type: 'block', open: '<h2>', close: '</h2>', placeholder: '標題' })}>
          <Heading2 className={iconSize} />
        </Btn>
        <Btn title="標題 H3" onClick={() => exec({ type: 'block', open: '<h3>', close: '</h3>', placeholder: '小標題' })}>
          <Heading3 className={iconSize} />
        </Btn>

        <Divider />

        <Btn title="粗體 <strong>" onClick={() => exec({ type: 'wrap', open: '<strong>', close: '</strong>', placeholder: '粗體文字' })}>
          <Bold className={iconSize} />
        </Btn>
        <Btn title="斜體 <em>" onClick={() => exec({ type: 'wrap', open: '<em>', close: '</em>', placeholder: '斜體文字' })}>
          <Italic className={iconSize} />
        </Btn>
        <Btn title="底線 <u>" onClick={() => exec({ type: 'wrap', open: '<u>', close: '</u>', placeholder: '底線文字' })}>
          <Underline className={iconSize} />
        </Btn>
        <Btn title="刪除線 <s>" onClick={() => exec({ type: 'wrap', open: '<s>', close: '</s>', placeholder: '刪除線文字' })}>
          <Strikethrough className={iconSize} />
        </Btn>
        <Btn title="行內程式碼 <code>" onClick={() => exec({ type: 'wrap', open: '<code>', close: '</code>', placeholder: 'code' })}>
          <Code className={iconSize} />
        </Btn>

        <Divider />

        <Btn title="無序列表 <ul>" onClick={() => exec({ type: 'block', open: '<ul>\n  <li>', close: '</li>\n</ul>', placeholder: '列表項目' })}>
          <List className={iconSize} />
        </Btn>
        <Btn title="有序列表 <ol>" onClick={() => exec({ type: 'block', open: '<ol>\n  <li>', close: '</li>\n</ol>', placeholder: '列表項目' })}>
          <ListOrdered className={iconSize} />
        </Btn>
        <Btn title="引言 <blockquote>" onClick={() => exec({ type: 'block', open: '<blockquote>', close: '</blockquote>', placeholder: '引言內容' })}>
          <Quote className={iconSize} />
        </Btn>

        <Divider />

        <Btn title="插入連結" onClick={() => exec({ type: 'link' })}>
          <Link className={iconSize} />
        </Btn>
        <Btn title="插入圖片" onClick={() => exec({ type: 'image' })}>
          <Image className={iconSize} />
        </Btn>
        <Btn title="水平線 <hr>" onClick={() => exec({ type: 'line', template: '<hr />' })}>
          <Minus className={iconSize} />
        </Btn>

        {onTogglePreview && (
          <>
            <Divider />
            <Btn title={preview ? '關閉預覽' : '預覽 HTML'} onClick={onTogglePreview}>
              {preview ? <EyeOff className={iconSize} /> : <Eye className={iconSize} />}
            </Btn>
          </>
        )}
      </div>

      {/* Editor / Preview */}
      {preview ? (
        <div
          className="min-h-[200px] p-4 bg-white prose prose-gray max-w-none text-sm"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) || '<p class="text-gray-400">暫無內容</p>' }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className={`w-full px-4 py-3 text-sm font-mono resize-y bg-white focus:outline-none focus:ring-2 ${accentClass} rounded-b-xl`}
        />
      )}
    </div>
  );
};

export default HtmlEditor;

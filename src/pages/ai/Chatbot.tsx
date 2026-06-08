import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bot, MessageCircle, Send, User } from 'lucide-react';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { callAI } from '../../lib/openai';
import { supabase } from '../../lib/supabase';

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  createdAt?: string;
}

type Locale = 'zh-TW' | 'en' | 'ja' | 'ko';
type ChatRow = { id: string; role: 'user' | 'assistant'; content: string; created_at: string; session_id: string };

const pick = (locale: Locale, zh: string, en: string, ja: string, ko: string) =>
  pickByLang(locale, zh, en, ja, ko);

function createSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (char) =>
    (Number(char) ^ (Math.random() * 16) >> (Number(char) / 4)).toString(16),
  );
}

function isUuid(value: string | null) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function formatMessageTime(value?: string) {
  return new Date(value || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const INTERNAL_PATH_PATTERN = /^\/(?:rooms|booking|shop|blog|hotels|stores|faq)(?:\/[A-Za-z0-9._~:/?#@!$&'()*+,;=%-]*)?$/;
const INTERNAL_PATH_SPLIT_PATTERN = /(\/(?:rooms|booking|shop|blog|hotels|stores|faq)(?:\/[A-Za-z0-9._~:/?#@!$&'()*+,;=%-]*)?)/g;
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\((\/(?:rooms|booking|shop|blog|hotels|stores|faq)(?:\/[A-Za-z0-9._~:/?#@!$&'()*+,;=%-]*)?)\)/g;

function linkClass(role: MessageItem['role']) {
  return role === 'user'
    ? 'font-semibold underline decoration-white/60 underline-offset-2'
    : 'font-semibold text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900';
}

function renderPlainLinks(text: string, role: MessageItem['role'], keyPrefix: string) {
  return text.split(INTERNAL_PATH_SPLIT_PATTERN).map((part, index) => {
    if (INTERNAL_PATH_PATTERN.test(part)) {
      return (
        <Link key={`${keyPrefix}-path-${index}`} to={part} className={linkClass(role)}>
          {part}
        </Link>
      );
    }
    return <span key={`${keyPrefix}-text-${index}`}>{part}</span>;
  });
}

function renderLinkedLine(line: string, role: MessageItem['role'], keyPrefix: string) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  MARKDOWN_LINK_PATTERN.lastIndex = 0;

  while ((match = MARKDOWN_LINK_PATTERN.exec(line)) !== null) {
    if (match.index > cursor) {
      nodes.push(...renderPlainLinks(line.slice(cursor, match.index), role, `${keyPrefix}-${nodes.length}`));
    }
    nodes.push(
      <Link key={`${keyPrefix}-md-${nodes.length}`} to={match[2]} className={linkClass(role)}>
        {match[1]}
      </Link>,
    );
    cursor = match.index + match[0].length;
  }

  if (cursor < line.length) {
    nodes.push(...renderPlainLinks(line.slice(cursor), role, `${keyPrefix}-${nodes.length}`));
  }

  return nodes.length ? nodes : line;
}

function renderMessageContent(content: string, role: MessageItem['role']) {
  const lines = content.split(/\n/);
  return lines.map((line, index) => (
    <span key={`line-${index}`}>
      {renderLinkedLine(line, role, `line-${index}`)}
      {index < lines.length - 1 && <br />}
    </span>
  ));
}

export default function Chatbot() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const locale = normalizeLang(lang) as Locale;
  const bottomRef = useRef<HTMLDivElement>(null);

  const storageKey = useMemo(
    () => (user ? `nestobi:ai-chat-session:${user.id}` : 'nestobi:ai-chat-session'),
    [user?.id],
  );

  const welcomeText = pick(
    locale,
    '你好，我是 Nestobi AI 客服。可以協助你查找住宿、商品、文章與常見問題，訂房或購物會引導你到正式頁面完成。',
    'Hi, I am Nestobi AI support. I can help find stays, products, articles, and FAQs, then guide you to the right booking or shopping page.',
    'こんにちは、Nestobi AIサポートです。宿泊、商品、記事、よくある質問を探し、予約や購入は正式ページへ案内します。',
    '안녕하세요, Nestobi AI 고객지원입니다. 숙소, 상품, 글, FAQ를 찾고 예약이나 구매는 공식 페이지로 안내해 드립니다.',
  );

  const createWelcomeMessage = (): MessageItem => ({
    id: 'welcome',
    role: 'assistant',
    content: welcomeText,
    time: formatMessageTime(),
  });

  const [messages, setMessages] = useState<MessageItem[]>([createWelcomeMessage()]);
  const [sessionId, setSessionId] = useState(createSessionId);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, historyLoading]);

  useEffect(() => {
    setMessages((prev) => {
      if (!prev.length) return [createWelcomeMessage()];
      const [first, ...rest] = prev;
      if (first.id !== 'welcome') return prev;
      return [{ ...first, content: welcomeText }, ...rest];
    });
  }, [welcomeText]);

  useEffect(() => {
    if (!user) {
      setHistoryLoading(false);
      return;
    }

    let cancelled = false;

    const loadHistory = async () => {
      setHistoryLoading(true);
      setHistoryError('');

      try {
        let activeSessionId = localStorage.getItem(storageKey);
        if (!isUuid(activeSessionId)) activeSessionId = null;

        if (!activeSessionId) {
          const { data: latest, error: latestError } = await supabase
            .from('tbl_mn5wn257')
            .select('session_id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (latestError) throw latestError;
          activeSessionId = latest?.session_id || createSessionId();
        }

        const ensuredSessionId = activeSessionId || createSessionId();
        localStorage.setItem(storageKey, ensuredSessionId);
        if (!cancelled) setSessionId(ensuredSessionId);

        const { data, error } = await supabase
          .from('tbl_mn5wn257')
          .select('id, role, content, created_at, session_id')
          .eq('user_id', user.id)
          .eq('session_id', ensuredSessionId)
          .order('created_at', { ascending: true })
          .limit(120);

        if (error) throw error;
        if (cancelled) return;

        const history = ((data || []) as ChatRow[])
          .filter((row) => row.role === 'user' || row.role === 'assistant')
          .map((row) => ({
            id: row.id,
            role: row.role,
            content: row.content,
            createdAt: row.created_at,
            time: formatMessageTime(row.created_at),
          }));

        setMessages(history.length ? history : [createWelcomeMessage()]);
      } catch (err) {
        if (!cancelled) {
          setHistoryError(err instanceof Error ? err.message : pick(locale, '歷史對話載入失敗。', 'Failed to load chat history.', '会話履歴の読み込みに失敗しました。', '대화 기록을 불러오지 못했습니다.'));
          setMessages((prev) => (prev.length ? prev : [createWelcomeMessage()]));
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [locale, storageKey, user?.id, welcomeText]);

  const saveMessage = async (message: MessageItem, activeSessionId = sessionId) => {
    if (!user || message.id === 'welcome') return;
    const { error } = await supabase.from('tbl_mn5wn257').insert({
      user_id: user.id,
      session_id: activeSessionId,
      role: message.role,
      content: message.content,
    });
    if (error) throw error;
  };

  const startNewChat = () => {
    const nextSessionId = createSessionId();
    localStorage.setItem(storageKey, nextSessionId);
    setSessionId(nextSessionId);
    setHistoryError('');
    setMessages([createWelcomeMessage()]);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || historyLoading) return;

    const activeSessionId = sessionId || createSessionId();
    const userMessage: MessageItem = {
      id: `${Date.now()}-u`,
      role: 'user',
      content: input.trim(),
      time: formatMessageTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setHistoryError('');

    try {
      await saveMessage(userMessage, activeSessionId);
    } catch {
      setHistoryError(pick(locale, '對話紀錄儲存失敗，請稍後再試。', 'Failed to save chat history. Please try again later.', '会話履歴の保存に失敗しました。後でもう一度お試しください。', '대화 기록 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.'));
    }

    try {
      const reply = await callAI<string>('chat', {
        messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
        language: locale,
      });
      const assistantMessage: MessageItem = {
        id: `${Date.now()}-a`,
        role: 'assistant',
        content: reply,
        time: formatMessageTime(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      try {
        await saveMessage(assistantMessage, activeSessionId);
      } catch {
        setHistoryError(pick(locale, 'AI 回覆已顯示，但歷史紀錄儲存失敗。', 'The AI reply is shown, but saving history failed.', 'AIの返信は表示されましたが、履歴保存に失敗しました。', 'AI 답변은 표시되었지만 기록 저장에 실패했습니다.'));
      }
    } catch {
      const fallbackMessage: MessageItem = {
        id: `${Date.now()}-f`,
        role: 'assistant',
        content: pick(locale, '系統忙碌中，請稍後再試。', 'System is busy now. Please try again soon.', 'システムが混み合っています。しばらくしてからお試しください。', '시스템이 혼잡합니다. 잠시 후 다시 시도해 주세요.'),
        time: formatMessageTime(),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
      try {
        await saveMessage(fallbackMessage, activeSessionId);
      } catch {
        setHistoryError(pick(locale, '對話紀錄儲存失敗，請稍後再試。', 'Failed to save chat history. Please try again later.', '会話履歴の保存に失敗しました。後でもう一度お試しください。', '대화 기록 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const pageTitle = pick(locale, 'AI 客服中心', 'AI Support Center', 'AIサポートセンター', 'AI 고객지원 센터');
  const pageDesc = pick(
    locale,
    '查找住宿、商品、文章與常見問題，並保留你的歷史對話。',
    'Find stays, products, articles, and FAQs, with your chat history saved.',
    '宿泊、商品、記事、FAQを探し、会話履歴も保存します。',
    '숙소, 상품, 글, FAQ를 찾고 대화 기록도 저장합니다.',
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-50">
      <SEOHead title={pageTitle} description={pageDesc} />
      <Navigation />

      <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden bg-white md:my-4 md:rounded-2xl md:border md:border-slate-100 md:shadow-sm">
        <div className="hidden">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 shadow-lg">
            <MessageCircle className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="mt-1 text-gray-500">{pageDesc}</p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
              <Bot className="h-4 w-4 text-slate-500" />
            </div>
            <p className="font-semibold text-gray-800">{pageTitle}</p>
            <button
              type="button"
              onClick={startNewChat}
              disabled={loading || historyLoading}
              className="ml-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {pick(locale, '新對話', 'New chat', '新しい会話', '새 대화')}
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 md:px-5">
            {historyLoading && (
              <div className="text-sm text-gray-400">
                {pick(locale, '載入歷史對話...', 'Loading chat history...', '会話履歴を読み込み中...', '대화 기록을 불러오는 중...')}
              </div>
            )}
            {historyError && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{historyError}</div>}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-sky-600' : 'bg-slate-100'}`}>
                  {msg.role === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-slate-500" />}
                </div>
                <div className={`flex max-w-[80%] flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'rounded-tr-none bg-sky-600 text-white' : 'rounded-tl-none bg-slate-100 text-gray-800'}`}>
                    {renderMessageContent(msg.content, msg.role)}
                  </div>
                  <span className="mt-1 text-xs text-gray-400">{msg.time}</span>
                </div>
              </div>
            ))}
            {loading && <div className="text-sm text-gray-400">{pick(locale, 'AI 輸入中...', 'AI is typing...', 'AI が入力中...', 'AI가 입력 중...')}</div>}
            <div ref={bottomRef} />
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-white p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:p-4">
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={pick(locale, '請輸入問題，例如：我想找雙人房或咖啡商品', 'Ask anything, e.g. I want a double room or coffee products', '質問を入力してください。例：二人部屋やコーヒー商品を探したい', '질문을 입력하세요. 예: 2인실이나 커피 상품을 찾고 싶어요')}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button type="submit" disabled={!input.trim() || loading || historyLoading} className="rounded-xl bg-sky-600 p-2.5 text-white hover:bg-sky-700 disabled:opacity-40">
                <Send className="h-5 w-5" />
              </button>
            </form>
            <p className="mt-2 text-center text-xs text-gray-400">
              {pick(locale, 'AI 會依公開資料回答，會員訂單、點數與個資仍需登入會員中心查看。', 'AI answers from public data. Orders, points, and profile details still require the member center.', 'AIは公開データに基づいて回答します。注文、ポイント、個人情報は会員センターで確認してください。', 'AI는 공개 자료를 기반으로 답변합니다. 주문, 포인트, 개인정보는 회원센터에서 확인해 주세요.')}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

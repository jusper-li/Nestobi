import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Hotel, MessageSquareText, Package, Send, Sparkles, User } from 'lucide-react';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getFeaturedFaqPrompts } from '../../lib/faqTranslations';
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
const HISTORY_PREVIEW_LIMIT = 12;
const HISTORY_FULL_LIMIT = 120;

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
  return new Intl.DateTimeFormat([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value || Date.now()));
}

function detectMessageLanguage(text: string): 'en' | 'zh-TW' | 'ja' | 'ko' | null {
  const sample = text.trim();
  if (!sample) return null;
  if (/\p{Script=Hangul}/u.test(sample)) return 'ko';
  if (/\p{Script=Hiragana}|\p{Script=Katakana}/u.test(sample)) return 'ja';
  if (/[\u4e00-\u9fff]/.test(sample)) return 'zh-TW';
  const latinWords = sample.match(/[A-Za-z]{2,}/g) || [];
  const latinChars = (sample.match(/[A-Za-z]/g) || []).length;
  if (latinWords.length >= 2 || latinChars >= 6) return 'en';
  return null;
}

function localeToResponseLanguage(locale: Locale): 'zh-TW' | 'en' | 'ja' | 'ko' {
  return locale;
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

function mergeMessages(existing: MessageItem[], incoming: MessageItem[]) {
  const merged = new Map<string, MessageItem>();
  [...existing, ...incoming].forEach(message => {
    merged.set(message.id, message);
  });
  return [...merged.values()].sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
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
    '你好，這裡是 Nestobi AI 客服。我可以幫你找住宿、商品、文章與 FAQ，並帶你前往對應頁面。',
    'Hi, I am Nestobi AI support. I can help find stays, products, articles, and FAQs, then guide you to the right booking or shopping page.',
    'こんにちは、Nestobi AI サポートです。宿泊、商品、記事、FAQ を探して、適切なページへご案内します。',
    '안녕하세요. Nestobi AI 고객지원입니다. 숙박, 상품, 글, FAQ를 찾아서 알맞은 페이지로 안내해 드립니다.',
  );

  const createWelcomeMessage = (): MessageItem => ({
    id: 'welcome',
    role: 'assistant',
    content: welcomeText,
    time: formatMessageTime(),
    createdAt: new Date().toISOString(),
  });

  const [messages, setMessages] = useState<MessageItem[]>([createWelcomeMessage()]);
  const [sessionId, setSessionId] = useState(createSessionId);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [quickGuideTab, setQuickGuideTab] = useState<'faq' | 'product' | 'room'>('faq');
  const [mobileQuickGuideExpanded, setMobileQuickGuideExpanded] = useState<'faq' | 'product' | 'room' | null>(null);
  const featuredFaqs = useMemo(() => getFeaturedFaqPrompts(locale, 4), [locale]);
  const quickGuide = useMemo(
    () => ({
      title: pick(locale, '快速導覽', 'Quick Guide', 'クイック案内', '빠른 안내'),
      subtitle: pick(locale, '', '', '', ''),
      faqTitle: pick(locale, '常見問題', 'FAQ', 'よくある質問', '자주 묻는 질문'),
      faqCta: pick(locale, '查看 FAQ', 'View FAQ', 'FAQ を見る', 'FAQ 보기'),
      productTitle: pick(locale, '商品', 'Products', '商品', '상품'),
      productCta: pick(locale, '查看商品', 'View products', '商品を見る', '상품 보기'),
      roomTitle: pick(locale, '住宿', 'Stays', '宿泊', '숙소'),
      roomCta: pick(locale, '查看住宿', 'View stays', '宿泊を見る', '숙소 보기'),
      faqActions: featuredFaqs,
      productPrompts: [
        pick(locale, '我想找咖啡豆', 'I want coffee beans', 'コーヒー豆を探したい', '커피 원두를 찾고 싶어요'),
        pick(locale, '我想看濾掛咖啡', 'Show me drip coffee', 'ドリップコーヒーを見たい', '드립커피를 보고 싶어요'),
        pick(locale, '我想看咖啡定期便', 'Show me subscriptions', '定期便を見たい', '구독 상품을 보고 싶어요'),
      ],
      roomPrompts: [
        pick(locale, '我想找雙人房', 'I want a double room', 'ツインルームを探したい', '더블룸을 찾고 싶어요'),
        pick(locale, '我想找近車站住宿', 'Stays near stations', '駅近の宿を探したい', '역 근처 숙소를 찾고 싶어요'),
        pick(locale, '我想找有浴缸的住宿', 'Stays with a bathtub', 'バスタブ付きの宿を探したい', '욕조가 있는 숙소를 찾고 싶어요'),
      ],
    }),
    [featuredFaqs, locale],
  );
  const quickGuideTabs = [
    { id: 'faq' as const, label: quickGuide.faqTitle, icon: MessageSquareText, color: 'sky' },
    { id: 'product' as const, label: quickGuide.productTitle, icon: Package, color: 'amber' },
    { id: 'room' as const, label: quickGuide.roomTitle, icon: Hotel, color: 'emerald' },
  ];
  const activeQuickGuideTab = quickGuideTabs.find((tab) => tab.id === quickGuideTab) ?? quickGuideTabs[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, historyLoading]);

  useEffect(() => {
    if (!user) return;
    void callAI('semantic-search', {
      query: 'FAQ 常見問題 住宿 商品 文章',
      scope: 'all',
      matchCount: 6,
    }).catch(() => {});
  }, [user]);

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

        const { data: previewData, error: previewError } = await supabase
          .from('tbl_mn5wn257')
          .select('id, role, content, created_at, session_id')
          .eq('user_id', user.id)
          .eq('session_id', ensuredSessionId)
          .order('created_at', { ascending: false })
          .limit(HISTORY_PREVIEW_LIMIT);

        if (previewError) throw previewError;
        if (cancelled) return;

        const previewHistory = ((previewData || []) as ChatRow[])
          .filter((row) => row.role === 'user' || row.role === 'assistant')
          .reverse()
          .map((row) => ({
            id: row.id,
            role: row.role,
            content: row.content,
            createdAt: row.created_at,
            time: formatMessageTime(row.created_at),
          }));

        setMessages(previewHistory.length ? previewHistory : [createWelcomeMessage()]);
        setHistoryLoading(false);

        void (async () => {
          try {
            const { data: fullData, error: fullError } = await supabase
              .from('tbl_mn5wn257')
              .select('id, role, content, created_at, session_id')
              .eq('user_id', user.id)
              .eq('session_id', ensuredSessionId)
              .order('created_at', { ascending: true })
              .limit(HISTORY_FULL_LIMIT);

            if (fullError || cancelled) return;

            const fullHistory = ((fullData || []) as ChatRow[])
              .filter((row) => row.role === 'user' || row.role === 'assistant')
              .map((row) => ({
                id: row.id,
                role: row.role,
                content: row.content,
                createdAt: row.created_at,
                time: formatMessageTime(row.created_at),
              }));

            setMessages(prev => mergeMessages(prev, fullHistory.length ? fullHistory : [createWelcomeMessage()]));
          } catch {
            // Keep the fast preview loaded even if the background fill fails.
          }
        })();
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
    const { error } = await supabase.from('tbl_mn5wn257').upsert(
      {
        id: message.id,
        user_id: user.id,
        session_id: activeSessionId,
        role: message.role,
        content: message.content,
      },
      { onConflict: 'id' },
    );
    if (error) throw error;
  };

  const translateAssistantReplyInBackground = async (messageId: string, reply: string, activeSessionId: string) => {
    const targetLanguage = localeToResponseLanguage(locale);
    const replyLanguage = detectMessageLanguage(reply);
    if (!replyLanguage || replyLanguage === targetLanguage) return reply;

    try {
      const translated = await callAI<string>('translate', {
        text: reply,
        sourceLang: replyLanguage,
        targetLang: targetLanguage,
        language: locale,
      });
      const normalized = translated.trim() || reply;
      if (normalized !== reply) {
        setMessages(prev => prev.map(msg => (msg.id === messageId ? { ...msg, content: normalized } : msg)));
        try {
          await saveMessage(
            {
              id: messageId,
              role: 'assistant',
              content: normalized,
              time: formatMessageTime(),
              createdAt: new Date().toISOString(),
            },
            activeSessionId,
          );
        } catch {
          // Background translation should never block the chat flow.
        }
      }
      return normalized;
    } catch {
      return reply;
    }
  };

  const startNewChat = () => {
    const nextSessionId = createSessionId();
    localStorage.setItem(storageKey, nextSessionId);
    setSessionId(nextSessionId);
    setHistoryError('');
    setMessages([createWelcomeMessage()]);
  };

  const submitMessage = async (text: string) => {
    if (!text.trim() || loading || historyLoading) return;

    const activeSessionId = sessionId || createSessionId();
    const userMessage: MessageItem = {
      id: createSessionId(),
      role: 'user',
      content: text.trim(),
      time: formatMessageTime(),
      createdAt: new Date().toISOString(),
    };
    const assistantMessageId = createSessionId();

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setHistoryError('');

    try {
      const saveUserPromise = saveMessage(userMessage, activeSessionId).catch(() => {
        setHistoryError(pick(locale, '聊天記錄寫入失敗，請稍後再試。', 'Failed to save chat history. Please try again later.', '会話履歴の保存に失敗しました。後でもう一度お試しください。', '채팅 기록 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.'));
      });
      const reply = await callAI<string>('chat', {
        messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
        language: locale,
        messageLanguage: detectMessageLanguage(userMessage.content) || locale,
        sessionId: activeSessionId,
        userMessageId: userMessage.id,
        assistantMessageId,
      });
      void saveUserPromise;
      const assistantMessage: MessageItem = {
        id: assistantMessageId,
        role: 'assistant',
        content: reply,
        time: formatMessageTime(),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      try {
        await saveMessage(assistantMessage, activeSessionId);
      } catch {
        setHistoryError(pick(locale, 'AI 回覆已顯示，但寫入歷史紀錄失敗。', 'The AI reply is shown, but saving history failed.', 'AI の回答は表示されましたが、履歴の保存に失敗しました。', 'AI 답변은 표시되었지만 기록 저장에 실패했습니다.'));
      }
      void translateAssistantReplyInBackground(assistantMessageId, reply, activeSessionId);
    } catch {
      const fallbackMessage: MessageItem = {
        id: createSessionId(),
        role: 'assistant',
        content: pick(locale, '系統忙碌中，請稍後再試。', 'System is busy now. Please try again soon.', 'システムが混み合っています。しばらくしてから再試行してください。', '시스템이 바쁩니다. 잠시 후 다시 시도해 주세요.'),
        time: formatMessageTime(),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
      try {
        await saveMessage(fallbackMessage, activeSessionId);
      } catch {
        setHistoryError(pick(locale, '聊天記錄寫入失敗，請稍後再試。', 'Failed to save chat history. Please try again later.', '会話履歴の保存に失敗しました。後でもう一度お試しください。', '채팅 기록 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const sendQuickPrompt = (question: string) => {
    void submitMessage(question);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    void submitMessage(input);
  };

  const pageTitle = pick(locale, 'AI 客服中心', 'AI Support Center', 'AI サポートセンター', 'AI 고객지원 센터');
  const quickFaqTitle = pick(locale, '快速常見問題', 'Quick FAQ', 'よくある質問', '자주 묻는 질문');
  const quickFaqHint = pick(locale, '點一下就能直接發問', 'Tap to ask instantly', 'タップですぐ質問できます', '눌러서 바로 질문하세요');
  const pageDesc = pick(
    locale,
    '可搜尋住宿、商品、文章與 FAQ，並保留你的歷史對話。',
    'Find stays, products, articles, and FAQs, with your chat history saved.',
    '宿泊、商品、記事、FAQ を探せて、会話履歴も保存されます。',
    '숙소, 상품, 글, FAQ를 찾고 대화 기록도 저장합니다.',
  );

  return (
    <div className="relative min-h-[100dvh] bg-slate-50 md:h-[100dvh]">
      <SEOHead title={pageTitle} description={pageDesc} />
      <Navigation />

      <main className="fixed inset-x-0 top-16 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] mx-auto flex min-h-0 w-full max-w-5xl flex-col overflow-hidden bg-white md:relative md:inset-auto md:my-4 md:rounded-2xl md:border md:border-slate-100 md:shadow-sm">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[calc(5.75rem+env(safe-area-inset-bottom)+0.75rem)] md:pb-0">
          <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-100 bg-white/95 px-5 py-3 backdrop-blur">
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

          <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#FAFAF7_0%,#F5F1E7_100%)] px-3 py-2.5 md:px-5 md:py-4">
            <div className="mb-1 inline-flex rounded-full border border-white/70 bg-white/80 px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] text-slate-500 shadow-sm md:px-3 md:text-xs">
              <Sparkles className="mr-1 h-3.5 w-3.5 text-amber-500" />
              {quickGuide.title}
            </div>
            <div className="mb-2 hidden text-sm text-slate-500 md:mb-4 md:block md:text-sm">{quickGuide.subtitle}</div>

            <div className="mb-1.5 flex gap-1 overflow-x-auto pb-1 md:hidden">
              {quickGuideTabs.map(tab => {
                const Icon = tab.icon;
                const active = quickGuideTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setQuickGuideTab(tab.id);
                      setMobileQuickGuideExpanded(prev => (prev === tab.id ? null : tab.id));
                    }}
                    className={`flex shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      active
                        ? tab.color === 'amber'
                          ? 'border-amber-300 bg-amber-50 text-amber-900'
                          : tab.color === 'emerald'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                            : 'border-sky-300 bg-sky-50 text-sky-900'
                        : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                    </button>
                  );
                })}
            </div>

            <div className={`md:hidden ${mobileQuickGuideExpanded ? 'block' : 'hidden'}`}>
              <div className="space-y-0">
                {mobileQuickGuideExpanded === 'faq' &&
                  quickGuide.faqActions.slice(0, 2).map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => sendQuickPrompt(item.question)}
                      className="flex w-full items-center justify-between gap-2 border-t border-slate-100 px-1 py-2 text-left text-[13px] leading-5 text-slate-800 transition hover:text-slate-950"
                    >
                      <span className="block">{item.question}</span>
                      <span className="text-slate-300">›</span>
                    </button>
                  ))}
                {mobileQuickGuideExpanded === 'product' &&
                  quickGuide.productPrompts.slice(0, 2).map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendQuickPrompt(prompt)}
                      className="flex w-full items-center justify-between gap-2 border-t border-slate-100 px-1 py-2 text-left text-[13px] leading-5 text-slate-800 transition hover:text-slate-950"
                    >
                      <span>{prompt}</span>
                      <span className="text-slate-300">›</span>
                    </button>
                  ))}
                {mobileQuickGuideExpanded === 'room' &&
                  quickGuide.roomPrompts.slice(0, 2).map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendQuickPrompt(prompt)}
                      className="flex w-full items-center justify-between gap-2 border-t border-slate-100 px-1 py-2 text-left text-[13px] leading-5 text-slate-800 transition hover:text-slate-950"
                    >
                      <span>{prompt}</span>
                      <span className="text-slate-300">›</span>
                    </button>
                  ))}
              </div>
            </div>

            <div className="hidden gap-3 md:grid md:grid-cols-3">
              <div className={`group relative overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(44,31,16,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(44,31,16,0.10)] ${quickGuideTab !== 'faq' ? 'hidden md:block' : ''}`}>
                <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-sky-50/80" />
                <div className="relative mb-3 flex items-start justify-between gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <MessageSquareText className="h-5 w-5" />
                  </div>
                  <Link to="/faq" className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-sky-300 hover:bg-sky-50">
                    {pick(locale, '看更多', 'More', 'もっと見る', '더 보기')}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="mb-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{quickGuide.faqTitle}</div>
                  <div className="text-lg font-bold text-slate-800">{quickGuide.faqCta}</div>
                </div>
                <div className="grid gap-2">
                  {quickGuide.faqActions.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => sendQuickPrompt(item.question)}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-sm text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                    >
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{item.category}</span>
                      <span className="mt-0.5 block leading-5">{item.question}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={`group relative overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(44,31,16,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(44,31,16,0.10)] ${quickGuideTab !== 'product' ? 'hidden md:block' : ''}`}>
                <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-amber-50/80" />
                <div className="relative mb-3 flex items-start justify-between gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <Package className="h-5 w-5" />
                  </div>
                  <Link to="/shop" className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-amber-300 hover:bg-amber-50">
                    {pick(locale, '商品頁', 'Shop', 'ショップ', '상품')}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="mb-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{quickGuide.productTitle}</div>
                  <div className="text-lg font-bold text-slate-800">{quickGuide.productCta}</div>
                </div>
                <div className="grid gap-2">
                  {quickGuide.productPrompts.map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendQuickPrompt(prompt)}
                      className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-left text-sm text-amber-900 transition hover:border-amber-300 hover:bg-amber-100"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`group relative overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(44,31,16,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(44,31,16,0.10)] ${quickGuideTab !== 'room' ? 'hidden md:block' : ''}`}>
                <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-emerald-50/80" />
                <div className="relative mb-3 flex items-start justify-between gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <Hotel className="h-5 w-5" />
                  </div>
                  <Link to="/rooms" className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50">
                    {pick(locale, '住宿頁', 'Stays', '宿泊', '숙소')}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="mb-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{quickGuide.roomTitle}</div>
                  <div className="text-lg font-bold text-slate-800">{quickGuide.roomCta}</div>
                </div>
                <div className="grid gap-2">
                  {quickGuide.roomPrompts.map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendQuickPrompt(prompt)}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-left text-sm text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-100"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(12rem+env(safe-area-inset-bottom))] md:px-5 md:pb-6">
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
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 px-3 md:bottom-4 md:px-6">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-100 bg-white p-3 shadow-xl md:p-4">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={pick(locale, '請輸入問題，例如：我想找雙人房或咖啡商品', 'Ask anything, e.g. I want a double room or coffee products', '質問を入力してください。例：ツインルームやコーヒー商品を探したい', '질문을 입력해 주세요. 예: 더블룸이나 커피 상품을 찾고 싶어요')}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-sky-500 md:text-sm"
            />
            <button type="submit" disabled={!input.trim() || loading || historyLoading} className="rounded-xl bg-sky-600 p-2.5 text-white hover:bg-sky-700 disabled:opacity-40">
              <Send className="h-5 w-5" />
            </button>
          </form>
          <p className="mt-2 text-center text-xs text-gray-400">
            {pick(locale, 'AI 回答來自公開資料。訂單、點數與會員資料仍需到會員中心查看。', 'AI answers from public data. Orders, points, and profile details still require the member center.', 'AI の回答は公開データに基づきます。注文、ポイント、会員情報は会員センターでご確認ください。', 'AI 답변은 공개 데이터 기반입니다. 주문, 포인트, 회원 정보는 회원센터에서 확인해 주세요.')}
          </p>
        </div>
      </div>
    </div>
  );
}

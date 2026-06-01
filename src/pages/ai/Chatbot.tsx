import { useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, User } from 'lucide-react';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { callAI } from '../../lib/openai';

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

type Locale = 'zh-TW' | 'en' | 'ja' | 'ko';

const pick = (locale: Locale, zh: string, en: string, ja: string, ko: string) =>
  pickByLang(locale, zh, en, ja, ko);

export default function Chatbot() {
  const { lang } = useLanguage();
  const locale = normalizeLang(lang) as Locale;
  const bottomRef = useRef<HTMLDivElement>(null);

  const welcomeText = pick(
    locale,
    '你好！我是 Nestobi AI 客服。你可以詢問訂房、購物、點數或帳號問題。',
    'Hi! I am Nestobi AI support. Ask me about bookings, shopping, points, or account issues.',
    'こんにちは！Nestobi AIサポートです。予約・買い物・ポイント・アカウントについて質問できます。',
    '안녕하세요! Nestobi AI 고객지원입니다. 예약, 쇼핑, 포인트, 계정 관련 질문을 도와드려요.',
  );

  const [messages, setMessages] = useState<MessageItem[]>([
    { id: 'welcome', role: 'assistant', content: welcomeText, time: new Date().toLocaleTimeString() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    setMessages((prev) => {
      if (!prev.length) return [{ id: 'welcome', role: 'assistant', content: welcomeText, time: new Date().toLocaleTimeString() }];
      const [first, ...rest] = prev;
      if (first.id !== 'welcome') return prev;
      return [{ ...first, content: welcomeText }, ...rest];
    });
  }, [welcomeText]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: MessageItem = {
      id: `${Date.now()}-u`,
      role: 'user',
      content: input,
      time: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const reply = await callAI<string>('chat', {
        messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
        language: locale,
      });
      setMessages((prev) => [...prev, { id: `${Date.now()}-a`, role: 'assistant', content: reply, time: new Date().toLocaleTimeString() }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-f`,
          role: 'assistant',
          content: pick(locale, '系統忙碌中，請稍後再試。', 'System is busy now. Please try again soon.', 'システムが混み合っています。しばらくしてからお試しください。', '시스템이 혼잡합니다. 잠시 후 다시 시도해 주세요.'),
          time: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const pageTitle = pick(locale, 'AI 客服中心', 'AI Support Center', 'AIサポートセンター', 'AI 고객지원 센터');
  const pageDesc = pick(
    locale,
    '快速取得訂房、訂單、購物與帳號問題的解答。',
    'Get quick answers for bookings, orders, shopping, and account issues.',
    '予約・注文・買い物・アカウントの疑問にすばやく回答します。',
    '예약, 주문, 쇼핑, 계정 관련 질문에 빠르게 답변합니다.',
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead title={pageTitle} description={pageDesc} />
      <Navigation />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 shadow-lg">
            <MessageCircle className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="mt-1 text-gray-500">{pageDesc}</p>
        </div>

        <div className="flex h-[68vh] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
              <Bot className="h-4 w-4 text-slate-500" />
            </div>
            <p className="font-semibold text-gray-800">{pageTitle}</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-sky-600' : 'bg-slate-100'}`}>
                  {msg.role === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-slate-500" />}
                </div>
                <div className={`flex max-w-[80%] flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'rounded-tr-none bg-sky-600 text-white' : 'rounded-tl-none bg-slate-100 text-gray-800'}`}>
                    {msg.content}
                  </div>
                  <span className="mt-1 text-xs text-gray-400">{msg.time}</span>
                </div>
              </div>
            ))}
            {loading && <div className="text-sm text-gray-400">{pick(locale, 'AI 輸入中...', 'AI is typing...', 'AI が入力中...', 'AI가 입력 중...')}</div>}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-100 p-4">
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={pick(locale, '輸入訊息，例如：我想取消訂房', 'Ask anything, e.g. I want to cancel a booking', '例：予約をキャンセルしたい', '예: 예약을 취소하고 싶어요')}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button type="submit" disabled={!input.trim() || loading} className="rounded-xl bg-sky-600 p-2.5 text-white hover:bg-sky-700 disabled:opacity-40">
                <Send className="h-5 w-5" />
              </button>
            </form>
            <p className="mt-2 text-center text-xs text-gray-400">
              {pick(locale, 'AI 會先處理常見問題，必要時再轉人工。', 'AI handles common questions first, then routes to human support when needed.', 'AIがまずよくある質問に回答し、必要時に有人対応へ切り替えます。', 'AI가 먼저 일반 문의를 처리하고 필요 시 상담원에게 연결합니다.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


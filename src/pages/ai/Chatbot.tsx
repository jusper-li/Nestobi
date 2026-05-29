import React, { useEffect, useRef, useState } from 'react';
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

const Chatbot: React.FC = () => {
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: pick(
        '您好！我是 Nestobi AI 客服。可以詢問訂房、購物、點數與帳號相關問題。',
        'Hi! I am Nestobi AI support. Ask me about bookings, shopping, points, or account issues.',
        'こんにちは！Nestobi AIサポートです。予約・買い物・ポイント・アカウントについてご案内します。',
        '안녕하세요! Nestobi AI 고객센터입니다. 예약, 쇼핑, 포인트, 계정 관련 문의를 도와드려요.'
      ),
      time: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMessage: MessageItem = { id: `${Date.now()}-u`, role: 'user', content: input, time: new Date().toLocaleTimeString() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    try {
      const reply = await callAI<string>('chat', {
        messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
        language: normalizedLang,
      });
      setMessages((prev) => [...prev, { id: `${Date.now()}-a`, role: 'assistant', content: reply, time: new Date().toLocaleTimeString() }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-f`,
          role: 'assistant',
          content: pick(
            '系統目前忙碌中，請稍後再試一次。',
            'System is busy now. Please try again soon.',
            'システムが混み合っています。少し後でもう一度お試しください。',
            '현재 시스템이 혼잡합니다. 잠시 후 다시 시도해 주세요.'
          ),
          time: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title={pick('AI 客服中心', 'AI Support Center', 'AIサポートセンター', 'AI 고객센터')}
        description={pick('快速處理訂房、訂單與帳號問題。', 'Get quick answers for bookings, orders, and account issues.', '予約・注文・アカウント関連の質問に素早く回答します。', '예약, 주문, 계정 관련 질문에 빠르게 답변합니다.')}
      />
      <Navigation />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 shadow-lg">
            <MessageCircle className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{pick('AI 客服中心', 'AI Support Center', 'AIサポートセンター', 'AI 고객센터')}</h1>
          <p className="mt-1 text-gray-500">{pick('快速處理訂房、訂單與帳號問題。', 'Get quick answers for bookings, orders, and account issues.', '予約・注文・アカウント関連の質問に素早く回答します。', '예약, 주문, 계정 관련 질문에 빠르게 답변합니다.')}</p>
        </div>

        <div className="flex h-[68vh] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
              <Bot className="h-4 w-4 text-slate-500" />
            </div>
            <p className="font-semibold text-gray-800">{pick('AI 客服中心', 'AI Support Center', 'AIサポートセンター', 'AI 고객센터')}</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-sky-600' : 'bg-slate-100'}`}>
                  {msg.role === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-slate-500" />}
                </div>
                <div className={`flex max-w-[80%] flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'rounded-tr-none bg-sky-600 text-white' : 'rounded-tl-none bg-slate-100 text-gray-800'}`}>{msg.content}</div>
                  <span className="mt-1 text-xs text-gray-400">{msg.time}</span>
                </div>
              </div>
            ))}
            {loading && <div className="text-sm text-gray-400">{pick('AI 回覆中...', 'AI is typing...', 'AIが入力中...', 'AI 응답 생성 중...')}</div>}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-100 p-4">
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={pick('請輸入問題，例如：我想取消訂房', 'Ask anything, e.g. I want to cancel a booking', '質問を入力してください（例：予約をキャンセルしたい）', '문의 내용을 입력하세요 (예: 예약 취소하고 싶어요)')}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button type="submit" disabled={!input.trim() || loading} className="rounded-xl bg-sky-600 p-2.5 text-white hover:bg-sky-700 disabled:opacity-40">
                <Send className="h-5 w-5" />
              </button>
            </form>
            <p className="mt-2 text-center text-xs text-gray-400">
              {pick('AI 先處理常見問題，必要時再協助轉接真人客服。', 'AI handles common questions first, then routes to human support when needed.', 'AIがまず一般的な質問に対応し、必要に応じて有人サポートへ案内します。', 'AI가 먼저 일반 문의를 처리하고, 필요 시 상담원 연결을 도와드립니다.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;


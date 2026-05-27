import React, { useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, User } from 'lucide-react';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { useLanguage } from '../../contexts/LanguageContext';
import { callAI } from '../../lib/openai';

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const Chatbot: React.FC = () => {
  const { t, lang } = useLanguage();
  const pick = (zh: string, en: string, ja: string, ko: string) => (lang === 'en' ? en : lang === 'ja' ? ja : lang === 'ko' ? ko : zh);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: pick(
        '您好！我是 Nestobi AI 客服小幫手，歡迎詢問訂房、購物與點數問題。',
        'Hi! I am Nestobi AI support. Ask me about bookings, shopping, and points.',
        'こんにちは！NestobiのAIサポートです。予約・買い物・ポイントについてご質問ください。',
        '안녕하세요! Nestobi AI 고객지원입니다. 예약/쇼핑/포인트를 문의해 주세요.'
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
      const reply = await callAI<string>('chat', { messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })), language: lang });
      setMessages((prev) => [...prev, { id: `${Date.now()}-a`, role: 'assistant', content: reply, time: new Date().toLocaleTimeString() }]);
    } catch {
      setMessages((prev) => [...prev, { id: `${Date.now()}-f`, role: 'assistant', content: pick('目前系統忙碌中，請稍後再試。', 'System is busy now. Please try again soon.', '現在システムが混み合っています。少し後でお試しください。', '현재 시스템이 혼잡합니다. 잠시 후 다시 시도해 주세요.'), time: new Date().toLocaleTimeString() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead title={t.ai.chat.title} description={t.ai.chat.subtitle} />
      <Navigation />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-sky-500 to-blue-700 rounded-2xl mb-3 shadow-lg">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t.ai.chat.title}</h1>
          <p className="text-gray-500 mt-1">{t.ai.chat.subtitle}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col" style={{ height: '68vh' }}>
          <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><Bot className="w-4 h-4 text-slate-500" /></div>
            <p className="font-semibold text-gray-800">AI Support</p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-sky-600' : 'bg-slate-100'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-slate-500" />}
                </div>
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${msg.role === 'user' ? 'bg-sky-600 text-white rounded-tr-none' : 'bg-slate-100 text-gray-800 rounded-tl-none'}`}>{msg.content}</div>
                  <span className="text-xs text-gray-400 mt-1">{msg.time}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-sm text-gray-400">{pick('AI 回覆中...', 'AI is typing...', 'AI が入力中...', 'AI가 답변 중...')}</div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-100 p-4">
            <form onSubmit={sendMessage} className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.ai.chat.placeholder} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              <button type="submit" disabled={!input.trim() || loading} className="bg-sky-600 hover:bg-sky-700 text-white p-2.5 rounded-xl disabled:opacity-40">
                <Send className="w-5 h-5" />
              </button>
            </form>
            <p className="text-xs text-gray-400 mt-2 text-center">{t.ai.chat.footer}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;

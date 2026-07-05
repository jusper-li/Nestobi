import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertCircle, Bot, MessageCircle, Minimize2, RotateCcw, Send, Sparkles, ThumbsDown, ThumbsUp, User, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

interface Message {
  id: string;
  message: string;
  sender_type: 'user' | 'bot' | 'admin';
  created_at: string;
  streaming?: boolean;
  failed?: boolean;
}

export default function FloatingAIChat() {
  return <FloatingAIChatContent />;
}

function FloatingAIChatContent() {
  const location = useLocation();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [ratedMessageIds, setRatedMessageIds] = useState<Record<string, 'up' | 'down'>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastUserMessageRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);
  const isHomepage = location.pathname === '/';
  const hasMobilePurchaseBar = location.pathname.startsWith('/product/');
  const floatingContextClass = [isHomepage ? 'floating-ai-chat-home' : '', hasMobilePurchaseBar ? 'floating-ai-chat-commerce' : '']
    .filter(Boolean)
    .join(' ');

  const quickPrompts = [
    t('floating_ai_chat.prompt.gift', '有推薦的送禮禮盒嗎？'),
    t('floating_ai_chat.prompt.shipping', '配送需要多久時間？'),
    t('floating_ai_chat.prompt.payment', '付款方式有哪些？'),
    t('floating_ai_chat.prompt.return', '退換貨規則是什麼？'),
  ];

  const fallbackReply = t(
    'floating_ai_chat.fallback_reply',
    '抱歉，我目前暫時無法完整回覆，先幫您整理重點，稍後再為您補上更完整的說明。'
  );

  useEffect(() => {
    const storedSessionId = localStorage.getItem('chat_session_id');
    if (storedSessionId) {
      setSessionId(storedSessionId);
      loadMessages(storedSessionId);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const loadMessages = async (sid: string) => {
    try {
      const { data } = await supabase.from('chat_messages').select('*').eq('session_id', sid).order('created_at', { ascending: true });
      setMessages(data || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setStatusMessage(t('floating_ai_chat.status.load_failed', '聊天記錄讀取失敗，請稍後再試。'));
    }
  };

  const createSession = async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.from('chat_sessions').insert([{ status: 'active' }]).select().single();
      if (error) throw error;

      const sid = data.id;
      setSessionId(sid);
      localStorage.setItem('chat_session_id', sid);

      const { data: msgData } = await supabase
        .from('chat_messages')
        .insert([
          {
            session_id: sid,
            message: t('floating_ai_chat.greeting', '您好，我是 AI 客服助理「小 M」。有需要我可以幫您查詢商品、配送、付款或退換貨資訊。'),
            sender_type: 'bot',
          },
        ])
        .select()
        .single();

      if (msgData) setMessages([msgData]);
      return sid;
    } catch (error) {
      console.error('Failed to create session:', error);
      setStatusMessage(t('floating_ai_chat.status.session_failed', '無法建立客服對話，請稍後再試。'));
      return null;
    }
  };

  const sendMessage = async (text?: string) => {
    const msgText = (text || inputMessage).trim();
    if (!msgText || isStreaming) return;

    if (msgText.length > 800) {
      setStatusMessage(t('floating_ai_chat.status.too_long', '訊息太長，建議分段傳送，回覆會更準確。'));
      return;
    }

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = await createSession();
      if (!currentSessionId) return;
    }

    setInputMessage('');
    setStatusMessage('');
    lastUserMessageRef.current = msgText;

    const { data: userMsgData, error: userErr } = await supabase
      .from('chat_messages')
      .insert([{ session_id: currentSessionId, message: msgText, sender_type: 'user' }])
      .select()
      .single();

    if (userErr || !userMsgData) {
      setStatusMessage(t('floating_ai_chat.status.send_failed', '訊息送出失敗，請稍後再試。'));
      return;
    }
    setMessages((prev) => [...prev, userMsgData]);

    const streamingId = `streaming-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: streamingId,
        message: '',
        sender_type: 'bot',
        created_at: new Date().toISOString(),
        streaming: true,
      },
    ]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort('timeout'), 28000);

    let fullReply = '';
    let streamStarted = false;

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: msgText, session_id: currentSessionId }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => ({}));
        fullReply = payload.reply || fallbackReply;
        setMessages((prev) => prev.map((m) => (m.id === streamingId ? { ...m, message: fullReply, failed: true } : m)));
        setStatusMessage(t('floating_ai_chat.status.ai_busy', 'AI 客服目前暫時忙碌，已改用備援回覆。'));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const { delta } = JSON.parse(data);
            if (delta) {
              streamStarted = true;
              fullReply += delta;
              setMessages((prev) => prev.map((m) => (m.id === streamingId ? { ...m, message: fullReply } : m)));
            }
          } catch {
            // ignore partial SSE chunks
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError' || !streamStarted) {
        fullReply = fallbackReply;
        setMessages((prev) => prev.map((m) => (m.id === streamingId ? { ...m, message: fullReply, failed: true } : m)));
        setStatusMessage(
          error.name === 'AbortError'
            ? t('floating_ai_chat.status.timeout', 'AI 回覆逾時，已切換到備援模式。')
            : t('floating_ai_chat.status.error', 'AI 服務發生錯誤，已切換到備援模式。')
        );
      }
    } finally {
      clearTimeout(timeoutId);
      abortRef.current = null;
      setIsStreaming(false);

      if (fullReply) {
        const { data: botMsgData } = await supabase
          .from('chat_messages')
          .insert([{ session_id: currentSessionId, message: fullReply, sender_type: 'bot' }])
          .select()
          .single();

        if (botMsgData) {
          setMessages((prev) => prev.map((m) => (m.id === streamingId ? { ...botMsgData, failed: m.failed } : m)));
        }
      }
    }
  };

  const handleOpen = async () => {
    setIsOpen(true);
    setIsMinimized(false);
    if (!sessionId) await createSession();
  };

  const submitFeedback = async (messageId: string, rating: 'up' | 'down') => {
    if (!sessionId || ratedMessageIds[messageId]) return;
    const { error } = await supabase.from('chat_feedback').insert({
      session_id: sessionId,
      message_id: messageId,
      rating: rating === 'up' ? 'positive' : 'negative',
    });
    if (!error) {
      setRatedMessageIds((prev) => ({ ...prev, [messageId]: rating }));
    }
  };

  const requestHumanSupport = async () => {
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = await createSession();
      if (!currentSessionId) return;
    }

    try {
      setStatusMessage('');
      const { error: statusError } = await supabase.from('chat_sessions').update({ status: 'needs_human' }).eq('id', currentSessionId);
      if (statusError) throw statusError;

      const note = t('floating_ai_chat.handoff_note', '請協助轉接真人客服');
      await supabase.from('chat_messages').insert([
        { session_id: currentSessionId, sender_type: 'user', message: note },
        {
          session_id: currentSessionId,
          sender_type: 'bot',
          message: t(
            'floating_ai_chat.handoff_reply',
            '我已幫您送出轉接請求，客服人員會盡快接手。若您方便，也可以先補充訂單編號或問題細節。'
          ),
        },
      ]);

      await loadMessages(currentSessionId);
      setStatusMessage(t('floating_ai_chat.status.handoff_sent', '已送出轉真人客服的請求。'));
    } catch (error) {
      console.error('Failed to request human support:', error);
      setStatusMessage(t('floating_ai_chat.status.handoff_failed', '轉接真人客服失敗，請稍後再試。'));
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className={`floating-ai-chat-button fixed bottom-6 right-6 z-50 rounded-full bg-stone-700 p-4 text-white shadow-xl transition-all duration-300 hover:scale-110 hover:bg-stone-600 group ${floatingContextClass}`}
        aria-label={t('floating_ai_chat.open', '開啟 AI 客服')}
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-amber-400" />
        <div className="pointer-events-none absolute bottom-full right-0 mb-3 rounded-xl bg-stone-800 px-3 py-2 text-xs whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          {t('floating_ai_chat.tooltip', '需要幫忙嗎？')}
        </div>
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div className={`floating-ai-chat-minimized fixed bottom-6 right-6 z-50 ${floatingContextClass}`}>
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 rounded-xl bg-stone-700 px-4 py-3 text-white shadow-lg transition-all hover:bg-stone-600"
        >
          <Bot className="h-5 w-5 text-amber-400" />
          <span className="text-sm font-medium">{t('floating_ai_chat.title', 'AI 客服')}</span>
          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">{messages.length}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`floating-ai-chat-window fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-1.5rem)] ${floatingContextClass}`}>
      <div className="flex h-[520px] flex-col overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-stone-700 to-stone-800 px-4 py-3.5 text-white">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500">
                <Bot className="h-4 w-4" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-stone-700 bg-green-400" />
            </div>
            <div>
              <div className="text-sm font-semibold">{t('floating_ai_chat.header_title', '小 M AI 客服')}</div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-white/60">
                <Sparkles className="h-3 w-3 text-amber-300" />
                {t('floating_ai_chat.header_subtitle', 'GPT-4o mini 智能客服')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
              title={t('floating_ai_chat.minimize', '最小化')}
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                abortRef.current?.abort();
              }}
              className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
              title={t('floating_ai_chat.close', '關閉')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-stone-50/50 p-4">
          {messages.length === 0 && (
            <div className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <Bot className="h-6 w-6 text-amber-600" />
              </div>
              <p className="text-sm text-stone-500">{t('floating_ai_chat.empty', '尚未開始對話，您可以直接輸入問題。')}</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[82%] gap-2 ${msg.sender_type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    msg.sender_type === 'user' ? 'bg-stone-600' : 'bg-amber-500'
                  }`}
                >
                  {msg.sender_type === 'user' ? <User className="h-3.5 w-3.5 text-white" /> : <Bot className="h-3.5 w-3.5 text-white" />}
                </div>
                <div>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.sender_type === 'user' ? 'rounded-tr-sm bg-stone-700 text-white' : 'rounded-tl-sm border border-stone-100 bg-white text-stone-800 shadow-sm'
                    }`}
                  >
                    {msg.message ||
                      (msg.streaming && (
                        <span className="flex items-center gap-1 py-0.5">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-300" style={{ animationDelay: '0ms' }} />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-300" style={{ animationDelay: '150ms' }} />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-300" style={{ animationDelay: '300ms' }} />
                        </span>
                      ))}
                    {msg.streaming && msg.message && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse align-middle bg-amber-400" />}
                  </div>
                  <div className={`mt-1 px-1 text-[10px] text-stone-400 ${msg.sender_type === 'user' ? 'text-right' : ''}`}>
                    {new Date(msg.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {msg.sender_type === 'bot' && !msg.streaming && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <button
                        onClick={() => submitFeedback(msg.id, 'up')}
                        className={`rounded p-1 ${ratedMessageIds[msg.id] === 'up' ? 'bg-green-100 text-green-700' : 'text-stone-400 hover:bg-green-50 hover:text-green-700'}`}
                        title={t('floating_ai_chat.feedback.helpful', '這則回覆有幫助')}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => submitFeedback(msg.id, 'down')}
                        className={`rounded p-1 ${ratedMessageIds[msg.id] === 'down' ? 'bg-rose-100 text-rose-700' : 'text-stone-400 hover:bg-rose-50 hover:text-rose-700'}`}
                        title={t('floating_ai_chat.feedback.unhelpful', '這則回覆不夠好')}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>
                      {msg.failed && (
                        <button
                          onClick={() => sendMessage(lastUserMessageRef.current)}
                          className="ml-1 inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-800"
                        >
                          <RotateCcw className="h-3 w-3" />
                          {t('floating_ai_chat.retry', '重試')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 2 && !isStreaming && (
          <div className="flex shrink-0 flex-wrap gap-1.5 bg-stone-50/50 px-3 pb-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 transition-all hover:border-stone-800 hover:bg-stone-800 hover:text-white"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <div className="flex shrink-0 flex-col border-t border-stone-100 bg-white p-3">
          {statusMessage && (
            <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
              <AlertCircle className="h-3.5 w-3.5" />
              {statusMessage}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={isStreaming ? t('floating_ai_chat.placeholder.waiting', '小 M 回覆中...') : t('floating_ai_chat.placeholder.input', '請輸入您的問題...')}
              disabled={isStreaming}
              className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-800 placeholder-stone-300 transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={isStreaming || !inputMessage.trim()}
              className="flex-shrink-0 rounded-xl bg-stone-700 p-2 text-white transition-colors hover:bg-stone-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex justify-end">
            <button
              onClick={requestHumanSupport}
              disabled={isStreaming}
              className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs text-stone-600 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('floating_ai_chat.handoff', '轉真人客服')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

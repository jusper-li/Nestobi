import { useEffect, useMemo, useState } from 'react';
import { Bot, Filter, RefreshCw, Send, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

interface ChatSession {
  id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  latest_message?: string;
}

interface ChatMessage {
  id: string;
  session_id: string;
  message: string;
  sender_type: string;
  created_at: string;
}

type SessionFilter = 'all' | 'needs_human' | 'active' | 'closed';

export default function AIChat() {
  const { t } = useLanguage();
  const [message, setMessage] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [filter, setFilter] = useState<SessionFilter>('needs_human');

  const statusMap = useMemo<Record<string, { label: string; className: string }>>(
    () => ({
      active: { label: t('ai_chat.status.active', '處理中'), className: 'bg-green-100 text-green-700' },
      needs_human: { label: t('ai_chat.status.needs_human', '需人工介入'), className: 'bg-amber-100 text-amber-700' },
      closed: { label: t('ai_chat.status.closed', '已結案'), className: 'bg-slate-100 text-slate-700' },
    }),
    [t]
  );

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) loadMessages(selectedSession);
  }, [selectedSession]);

  const filteredSessions = useMemo(() => {
    if (filter === 'all') return sessions;
    return sessions.filter((s) => s.status === filter);
  }, [sessions, filter]);

  const selectedSessionData = sessions.find((s) => s.id === selectedSession) || null;

  const loadSessions = async () => {
    try {
      const { data: sessionsData, error } = await supabase.from('chat_sessions').select('*').order('updated_at', { ascending: false }).limit(100);
      if (error) throw error;

      const sessionsWithMessages = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { data: latestMsg } = await supabase
            .from('chat_messages')
            .select('message')
            .eq('session_id', session.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...session,
            latest_message: latestMsg?.message,
          };
        })
      );

      setSessions(sessionsWithMessages);

      if (!selectedSession && sessionsWithMessages.length > 0) {
        const firstNeedsHuman = sessionsWithMessages.find((s) => s.status === 'needs_human');
        setSelectedSession(firstNeedsHuman?.id || sessionsWithMessages[0].id);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.from('chat_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedSession || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('chat_messages').insert([
        {
          session_id: selectedSession,
          message: message.trim(),
          sender_type: 'admin',
        },
      ]);
      if (error) throw error;

      await supabase.from('chat_sessions').update({ status: 'active' }).eq('id', selectedSession);

      setMessage('');
      await loadMessages(selectedSession);
      await loadSessions();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSessionStatus = async (status: SessionFilter | 'active') => {
    if (!selectedSession || statusUpdating) return;
    setStatusUpdating(true);
    try {
      const { error } = await supabase.from('chat_sessions').update({ status }).eq('id', selectedSession);
      if (error) throw error;
      await loadSessions();
    } catch (error) {
      console.error('Failed to update session status:', error);
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return <div className="p-6">{t('ai_chat.loading', '載入對話中...')}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('ai_chat.title', 'AI 客服對話')}</h1>
          <p className="mt-2 text-slate-600">{t('ai_chat.subtitle', '管理客服對話、查看歷史訊息與人工轉接狀態。')}</p>
        </div>
        <button onClick={loadSessions} className="flex items-center gap-2 rounded-lg px-4 py-2 text-slate-700 transition-colors hover:bg-slate-100">
          <RefreshCw className="h-4 w-4" />
          {t('common.refresh', '重新整理')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">
              {t('ai_chat.sessions', '對話列表')} ({filteredSessions.length})
            </h3>
            <div className="flex items-center gap-1 text-slate-500">
              <Filter className="h-4 w-4" />
              <span className="text-xs">{t('ai_chat.filter', '篩選')}</span>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setFilter('needs_human')}
              className={`rounded-md border px-2.5 py-1.5 text-xs ${filter === 'needs_human' ? 'border-amber-300 bg-amber-100 text-amber-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
            >
              {statusMap.needs_human.label}
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`rounded-md border px-2.5 py-1.5 text-xs ${filter === 'active' ? 'border-green-300 bg-green-100 text-green-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
            >
              {statusMap.active.label}
            </button>
            <button
              onClick={() => setFilter('closed')}
              className={`rounded-md border px-2.5 py-1.5 text-xs ${filter === 'closed' ? 'border-slate-300 bg-slate-200 text-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
            >
              {statusMap.closed.label}
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`rounded-md border px-2.5 py-1.5 text-xs ${filter === 'all' ? 'border-blue-300 bg-blue-100 text-blue-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
            >
              {t('ai_chat.filter_all', '全部')}
            </button>
          </div>

          <div className="max-h-[600px] space-y-3 overflow-y-auto pr-1">
            {filteredSessions.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">{t('ai_chat.empty_sessions', '目前沒有可顯示的對話。')}</p>
            ) : (
              filteredSessions.map((session, i) => (
                <div
                  key={session.id}
                  onClick={() => setSelectedSession(session.id)}
                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                    selectedSession === session.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm text-white">
                      {session.visitor_name?.charAt(0) || `V${i + 1}`}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-900">{session.visitor_name || t('ai_chat.visitor', '訪客')}</div>
                      <div className="text-xs text-slate-500">{new Date(session.created_at).toLocaleString('zh-TW')}</div>
                    </div>
                    <span className={`rounded px-2 py-1 text-xs ${(statusMap[session.status] || statusMap.closed).className}`}>
                      {(statusMap[session.status] || statusMap.closed).label}
                    </span>
                  </div>
                  {session.latest_message && <p className="truncate text-sm text-slate-600">{session.latest_message}</p>}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex h-[700px] flex-col rounded-xl border border-slate-200 bg-white lg:col-span-2">
          {selectedSession ? (
            <>
              <div className="border-b border-slate-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
                    {selectedSessionData?.visitor_name?.charAt(0) || 'V'}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{selectedSessionData?.visitor_name || t('ai_chat.visitor', '訪客')}</div>
                    <div className={`text-xs ${selectedSessionData?.status === 'needs_human' ? 'text-amber-600' : selectedSessionData?.status === 'active' ? 'text-green-600' : 'text-slate-500'}`}>
                      {(statusMap[selectedSessionData?.status || 'closed'] || statusMap.closed).label}
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => updateSessionStatus('active')}
                      disabled={statusUpdating}
                      className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                    >
                      {t('ai_chat.mark_active', '標記為處理中')}
                    </button>
                    <button
                      onClick={() => updateSessionStatus('closed')}
                      disabled={statusUpdating}
                      className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                    >
                      {t('ai_chat.mark_closed', '標記為結案')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-6">
                {messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">{t('ai_chat.empty_messages', '目前沒有訊息。')}</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex max-w-md gap-3 ${msg.sender_type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            msg.sender_type === 'user' ? 'bg-slate-900' : msg.sender_type === 'bot' ? 'bg-blue-500' : 'bg-green-500'
                          }`}
                        >
                          {msg.sender_type === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
                        </div>
                        <div>
                          <div className={`rounded-lg px-4 py-3 ${msg.sender_type === 'user' ? 'bg-slate-900 text-white' : msg.sender_type === 'bot' ? 'bg-slate-100 text-slate-900' : 'bg-green-100 text-slate-900'}`}>
                            {msg.message}
                          </div>
                          <div className="mt-1 px-1 text-xs text-slate-500">
                            {new Date(msg.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-200 p-6">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={t('ai_chat.reply_placeholder', '輸入回覆內容...')}
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-slate-900"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!message.trim() || saving}
                    className="rounded-lg bg-slate-900 p-3 text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500">{t('ai_chat.no_session', '請先選擇一個對話。')}</div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ChevronDown, ChevronUp, User, Bot, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';

interface Session {
  session_id: string;
  user_id: string;
  message_count: number;
  last_message: string;
  last_at: string;
  display_name?: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

const SuperAdminChatbot: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [loadingMessages, setLoadingMessages] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      const { data } = await supabase
        .from('tbl_mn5wn257')
        .select('session_id, user_id, content, created_at, role')
        .order('created_at', { ascending: false });

      if (!data) { setLoading(false); return; }

      const sessionMap: Record<string, Session> = {};
      data.forEach((msg: any) => {
        if (!sessionMap[msg.session_id]) {
          sessionMap[msg.session_id] = {
            session_id: msg.session_id,
            user_id: msg.user_id,
            message_count: 0,
            last_message: '',
            last_at: msg.created_at,
          };
        }
        sessionMap[msg.session_id].message_count++;
        if (new Date(msg.created_at) >= new Date(sessionMap[msg.session_id].last_at)) {
          sessionMap[msg.session_id].last_at = msg.created_at;
          sessionMap[msg.session_id].last_message = msg.content;
        }
      });

      const sessionList = Object.values(sessionMap).sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime());
      const userIds = Array.from(new Set(sessionList.map(s => s.user_id)));

      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('tbl_mn5wgzh0').select('user_id, display_name').in('user_id', userIds);
        const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.display_name]));
        sessionList.forEach(s => { s.display_name = profileMap[s.user_id]; });
      }

      setSessions(sessionList);
      setLoading(false);
    };
    fetchSessions();
  }, []);

  const handleExpand = async (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      return;
    }
    setExpandedSession(sessionId);
    if (!messages[sessionId]) {
      setLoadingMessages(sessionId);
      const { data } = await supabase
        .from('tbl_mn5wn257')
        .select('id, role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      setMessages(prev => ({ ...prev, [sessionId]: (data as any) || [] }));
      setLoadingMessages(null);
    }
  };

  const filtered = sessions.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.display_name || '').toLowerCase().includes(q)
      || s.session_id.toLowerCase().includes(q)
      || s.last_message.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-xl"><MessageSquare className="w-6 h-6 text-amber-700" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 客服紀錄</h1>
          <p className="text-sm text-gray-400">查看所有用戶對話紀錄</p>
        </div>
        <span className="ml-auto text-sm text-gray-400">{sessions.length} 個對話</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜尋用戶名稱或對話內容…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>暫無對話紀錄</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((session, i) => (
            <motion.div key={session.session_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => handleExpand(session.session_id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-amber-50/30 transition text-left"
              >
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900">{session.display_name || '訪客'}</p>
                    <span className="text-xs text-gray-400 font-mono">{session.user_id.slice(-8)}</span>
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                      {session.message_count} 則訊息
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-0.5">{session.last_message}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-gray-400">{formatDate(session.last_at)}</p>
                  <div className="flex justify-end mt-1">
                    {expandedSession === session.session_id
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
              </button>

              <AnimatePresence>
                {expandedSession === session.session_id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-gray-100"
                  >
                    <div className="p-4 bg-gray-50 max-h-80 overflow-y-auto space-y-3">
                      {loadingMessages === session.session_id ? (
                        <div className="flex justify-center py-6">
                          <div className="w-6 h-6 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : (messages[session.session_id] || []).map(msg => (
                        <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-amber-100' : 'bg-slate-200'}`}>
                            {msg.role === 'user' ? <User className="w-3.5 h-3.5 text-amber-600" /> : <Bot className="w-3.5 h-3.5 text-slate-600" />}
                          </div>
                          <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-amber-500 text-white rounded-tr-sm' : 'bg-white text-gray-800 shadow-sm rounded-tl-sm'}`}>
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-amber-200' : 'text-gray-400'}`}>
                              {new Date(msg.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuperAdminChatbot;

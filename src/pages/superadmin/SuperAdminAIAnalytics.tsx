import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Users, TrendingUp, BarChart2, MessageSquare, Map, Languages } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UsageRow { user_id: string; feature_type: string; usage_count: number; last_used_at: string; }
interface FeatureStat { feature: string; total: number; users: number; }
interface TopUser { user_id: string; total: number; display_name?: string; }

const FEATURE_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  itinerary: { label: 'AI 行程規劃', icon: <Map className="w-4 h-4" />, color: 'bg-blue-500', bg: 'bg-blue-50 text-blue-700' },
  translation: { label: 'AI 翻譯', icon: <Languages className="w-4 h-4" />, color: 'bg-teal-500', bg: 'bg-teal-50 text-teal-700' },
  chatbot: { label: 'AI 客服', icon: <MessageSquare className="w-4 h-4" />, color: 'bg-sky-500', bg: 'bg-sky-50 text-sky-700' },
};

const SuperAdminAIAnalytics: React.FC = () => {
  const [featureStats, setFeatureStats] = useState<FeatureStat[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsage, setTotalUsage] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('user_usage').select('*').order('last_used_at', { ascending: false });
      const rows: UsageRow[] = data || [];

      const featureMap: Record<string, { total: number; users: Set<string> }> = {};
      rows.forEach(r => {
        if (!featureMap[r.feature_type]) featureMap[r.feature_type] = { total: 0, users: new Set() };
        featureMap[r.feature_type].total += r.usage_count;
        featureMap[r.feature_type].users.add(r.user_id);
      });
      const stats = Object.entries(featureMap)
        .map(([feature, d]) => ({ feature, total: d.total, users: d.users.size }))
        .sort((a, b) => b.total - a.total);
      setFeatureStats(stats);

      const userMap: Record<string, number> = {};
      rows.forEach(r => { userMap[r.user_id] = (userMap[r.user_id] || 0) + r.usage_count; });
      const sorted = Object.entries(userMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([user_id, total]) => ({ user_id, total }));

      if (sorted.length > 0) {
        const { data: profiles } = await supabase.from('tbl_mn5wgzh0').select('user_id, display_name').in('user_id', sorted.map(u => u.user_id));
        const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.display_name]));
        setTopUsers(sorted.map(u => ({ ...u, display_name: profileMap[u.user_id] })));
      } else {
        setTopUsers([]);
      }

      setTotalUsage(rows.reduce((s, r) => s + r.usage_count, 0));
      setTotalUsers(new Set(rows.map(r => r.user_id)).size);
      setLoading(false);
    };
    fetchData();
  }, []);

  const maxTotal = featureStats.length > 0 ? Math.max(...featureStats.map(f => f.total)) : 1;

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-xl"><Brain className="w-6 h-6 text-amber-700" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 用量分析</h1>
          <p className="text-sm text-gray-400">全平台 AI 功能使用統計</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <TrendingUp className="w-5 h-5 text-amber-600" />, label: '總使用次數', value: totalUsage.toLocaleString(), color: 'bg-amber-50' },
          { icon: <Users className="w-5 h-5 text-teal-600" />, label: '活躍用戶', value: totalUsers.toLocaleString(), color: 'bg-teal-50' },
          { icon: <Brain className="w-5 h-5 text-blue-600" />, label: 'AI 功能數', value: featureStats.length, color: 'bg-blue-50' },
          { icon: <BarChart2 className="w-5 h-5 text-green-600" />, label: '平均次數/人', value: totalUsers > 0 ? (totalUsage / totalUsers).toFixed(1) : '0', color: 'bg-green-50' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl shadow-sm p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>{s.icon}</div>
            <p className="text-gray-500 text-sm">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {featureStats.map((stat, i) => {
          const meta = FEATURE_META[stat.feature];
          return (
            <motion.div key={stat.feature} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center gap-2 text-sm font-medium px-2.5 py-1 rounded-full ${meta?.bg || 'bg-gray-50 text-gray-600'}`}>
                  {meta?.icon}
                  {meta?.label || stat.feature}
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stat.total}</p>
              <p className="text-xs text-gray-400 mt-1">次使用 · {stat.users} 位用戶</p>
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(stat.total / maxTotal) * 100}%` }}
                  transition={{ delay: i * 0.1 + 0.3, duration: 0.6 }}
                  className={`h-full rounded-full ${meta?.color || 'bg-amber-500'}`}
                />
              </div>
            </motion.div>
          );
        })}
        {featureStats.length === 0 && (
          <div className="col-span-3 bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
            <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>暫無 AI 使用數據</p>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />AI 使用排行榜
          </h3>
          {topUsers.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">暫無數據</p>
          ) : (
            <div className="space-y-2">
              {topUsers.map((u, i) => (
                <div key={u.user_id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.display_name || '用戶'}</p>
                    <p className="text-xs text-gray-400 font-mono">{u.user_id.slice(-8)}</p>
                  </div>
                  <span className="font-bold text-gray-900 text-sm">{u.total} 次</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-600" />各功能用量比較
          </h3>
          {featureStats.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">暫無數據</p>
          ) : (
            <div className="space-y-4">
              {featureStats.map((stat, i) => {
                const meta = FEATURE_META[stat.feature];
                return (
                  <motion.div key={stat.feature} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700">{meta?.label || stat.feature}</span>
                      <span className="text-sm font-bold text-gray-900">{stat.total} 次</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(stat.total / maxTotal) * 100}%` }}
                        transition={{ delay: i * 0.1 + 0.2, duration: 0.6 }}
                        className={`h-full rounded-full ${meta?.color || 'bg-amber-500'}`}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminAIAnalytics;

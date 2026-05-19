import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Users, Cpu, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UsageRow { user_id: string; feature_type: string; usage_count: number; last_used_at: string; }
interface FeatureStat { feature: string; total: number; users: number; }
interface TopUser { user_id: string; total: number; display_name?: string; }

const FEATURE_LABELS: Record<string, string> = { itinerary: 'AI 行程規劃', translation: 'AI 翻譯', chatbot: 'AI 客服', };
const FEATURE_COLORS: Record<string, string> = { itinerary: 'bg-[#F0E4C8]0', translation: 'bg-teal-500', chatbot: 'bg-purple-500', };

const AIAnalytics: React.FC = () => {
  const [featureStats, setFeatureStats] = useState<FeatureStat[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsage, setTotalUsage] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('user_usage').select('*');
      const rows: UsageRow[] = data || [];

      // Aggregate by feature
      const featureMap: Record<string, { total: number; users: Set<string> }> = {};
      rows.forEach(r => {
        if (!featureMap[r.feature_type]) featureMap[r.feature_type] = { total: 0, users: new Set() };
        featureMap[r.feature_type].total += r.usage_count;
        featureMap[r.feature_type].users.add(r.user_id);
      });
      const stats = Object.entries(featureMap).map(([feature, d]) => ({ feature, total: d.total, users: d.users.size }));
      setFeatureStats(stats);

      // Top users
      const userMap: Record<string, number> = {};
      rows.forEach(r => { userMap[r.user_id] = (userMap[r.user_id] || 0) + r.usage_count; });
      const sorted = Object.entries(userMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([user_id, total]) => ({ user_id, total }));

      // Fetch display names
      if (sorted.length > 0) {
        const { data: profiles } = await supabase.from('tbl_mn5wgzh0').select('user_id, display_name').in('user_id', sorted.map(u => u.user_id));
        const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.display_name]));
        setTopUsers(sorted.map(u => ({ ...u, display_name: profileMap[u.user_id] || undefined })));
      } else {
        setTopUsers(sorted);
      }

      setTotalUsage(rows.reduce((s, r) => s + r.usage_count, 0));
      setTotalUsers(new Set(rows.map(r => r.user_id)).size);
      setLoading(false);
    };
    fetchData();
  }, []);

  const maxTotal = featureStats.length > 0 ? Math.max(...featureStats.map(f => f.total)) : 1;

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">AI 用量分析</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <TrendingUp className="w-5 h-5 text-[#2C1F10]" />, label: '總使用次數', value: totalUsage.toLocaleString(), color: 'bg-[#F0E4C8]' },
          { icon: <Users className="w-5 h-5 text-[#0D9488]" />, label: '使用用戶數', value: totalUsers.toLocaleString(), color: 'bg-teal-50' },
          { icon: <Cpu className="w-5 h-5 text-purple-600" />, label: 'AI 功能數', value: featureStats.length, color: 'bg-purple-50' },
          { icon: <BarChart2 className="w-5 h-5 text-orange-500" />, label: '平均使用/人', value: totalUsers > 0 ? (totalUsage / totalUsers).toFixed(1) : '0', color: 'bg-orange-50' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white rounded-2xl shadow-sm p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>{s.icon}</div>
            <p className="text-gray-500 text-sm">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-[#2C1F10]" />各功能使用統計</h3>
        {featureStats.length === 0 ? (
          <p className="text-gray-400 text-center py-8">暫無使用數據</p>
        ) : (
          <div className="space-y-4">
            {featureStats.map((stat, i) => (
              <motion.div key={stat.feature} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700">{FEATURE_LABELS[stat.feature] || stat.feature}</span>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{stat.users} 位用戶</span>
                    <span className="font-semibold text-gray-900">{stat.total} 次</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(stat.total / maxTotal) * 100}%` }} transition={{ delay: i * 0.1 + 0.2, duration: 0.6 }} className={`h-3 rounded-full ${FEATURE_COLORS[stat.feature] || 'bg-[#C09A6A]'}`} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-[#0D9488]" />AI 使用排行榜</h3>
        {topUsers.length === 0 ? (
          <p className="text-gray-400 text-center py-8">暫無數據</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">排名</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">用戶</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">總使用次數</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topUsers.map((u, i) => (
                  <tr key={u.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{u.display_name || '用戶'}</p>
                      <p className="text-xs text-gray-400 font-mono">{u.user_id.slice(-8)}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{u.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalytics;

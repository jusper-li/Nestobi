import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Brain, Languages, Map, MessageSquare, TrendingUp, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';

interface UsageRow {
  user_id: string;
  feature_type: string;
  usage_count: number;
  last_used_at: string;
}

interface FeatureStat {
  feature: string;
  total: number;
  users: number;
}

interface TopUser {
  user_id: string;
  total: number;
  display_name?: string;
}

const FEATURE_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  itinerary: { label: 'AI 行程規劃', icon: <Map className="h-4 w-4" />, color: 'bg-blue-500', bg: 'bg-blue-50 text-blue-700' },
  translation: { label: 'AI 翻譯', icon: <Languages className="h-4 w-4" />, color: 'bg-teal-500', bg: 'bg-teal-50 text-teal-700' },
  chatbot: { label: 'AI 客服', icon: <MessageSquare className="h-4 w-4" />, color: 'bg-sky-500', bg: 'bg-sky-50 text-sky-700' },
};

const SuperAdminAIAnalytics: React.FC = () => {
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);

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
      rows.forEach(row => {
        if (!featureMap[row.feature_type]) featureMap[row.feature_type] = { total: 0, users: new Set() };
        featureMap[row.feature_type].total += row.usage_count;
        featureMap[row.feature_type].users.add(row.user_id);
      });

      const stats = Object.entries(featureMap)
        .map(([feature, value]) => ({ feature, total: value.total, users: value.users.size }))
        .sort((a, b) => b.total - a.total);
      setFeatureStats(stats);

      const userMap: Record<string, number> = {};
      rows.forEach(row => {
        userMap[row.user_id] = (userMap[row.user_id] || 0) + row.usage_count;
      });
      const sorted = Object.entries(userMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([user_id, total]) => ({ user_id, total }));

      if (sorted.length > 0) {
        const { data: profiles } = await supabase
          .from('tbl_mn5wgzh0')
          .select('user_id, display_name')
          .in('user_id', sorted.map(item => item.user_id));
        const profileMap = Object.fromEntries((profiles || []).map((profile: any) => [profile.user_id, profile.display_name]));
        setTopUsers(sorted.map(item => ({ ...item, display_name: profileMap[item.user_id] })));
      } else {
        setTopUsers([]);
      }

      setTotalUsage(rows.reduce((sum, row) => sum + row.usage_count, 0));
      setTotalUsers(new Set(rows.map(row => row.user_id)).size);
      setLoading(false);
    };

    fetchData();
  }, []);

  const maxTotal = featureStats.length > 0 ? Math.max(...featureStats.map(feature => feature.total)) : 1;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-amber-100 p-2">
          <Brain className="h-6 w-6 text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pick('AI 分析', 'AI Analytics', 'AI Analytics', 'AI Analytics')}</h1>
          <p className="text-sm text-gray-400">{pick('檢視 AI 功能使用量與活躍使用者。', 'Review AI feature usage and top users.', 'Review AI feature usage and top users.', 'Review AI feature usage and top users.')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: <TrendingUp className="h-5 w-5 text-amber-600" />, label: pick('總使用量', 'Total usage', 'Total usage', 'Total usage'), value: totalUsage.toLocaleString(), color: 'bg-amber-50' },
          { icon: <Users className="h-5 w-5 text-teal-600" />, label: pick('活躍使用者', 'Active users', 'Active users', 'Active users'), value: totalUsers.toLocaleString(), color: 'bg-teal-50' },
          { icon: <Brain className="h-5 w-5 text-blue-600" />, label: pick('功能種類', 'Feature types', 'Feature types', 'Feature types'), value: featureStats.length, color: 'bg-blue-50' },
          { icon: <BarChart2 className="h-5 w-5 text-green-600" />, label: pick('每人平均', 'Per-user average', 'Per-user average', 'Per-user average'), value: totalUsers > 0 ? (totalUsage / totalUsers).toFixed(1) : '0', color: 'bg-green-50' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-2xl bg-white p-5 shadow-sm"
          >
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>{stat.icon}</div>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {featureStats.map((stat, index) => {
          const meta = FEATURE_META[stat.feature];
          return (
            <motion.div
              key={stat.feature}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className={`flex items-center gap-2 rounded-full px-2.5 py-1 text-sm font-medium ${meta?.bg || 'bg-gray-50 text-gray-600'}`}>
                  {meta?.icon}
                  {meta?.label || stat.feature}
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stat.total}</p>
              <p className="mt-1 text-xs text-gray-400">
                {pick('使用者數', 'Users', 'Users', 'Users')} <span className="font-semibold text-gray-700">{stat.users}</span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(stat.total / maxTotal) * 100}%` }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.6 }}
                  className={`h-full rounded-full ${meta?.color || 'bg-amber-500'}`}
                />
              </div>
            </motion.div>
          );
        })}
        {featureStats.length === 0 && (
          <div className="col-span-3 rounded-2xl bg-white p-12 text-center text-gray-400 shadow-sm">
            <Brain className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <p>{pick('目前沒有 AI 使用資料。', 'No AI usage data yet.', 'No AI usage data yet.', 'No AI usage data yet.')}</p>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <Users className="h-5 w-5 text-amber-600" />
            {pick('AI 使用者排行', 'Top AI Users', 'Top AI Users', 'Top AI Users')}
          </h3>
          {topUsers.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">{pick('目前沒有資料', 'No data', 'No data', 'No data')}</p>
          ) : (
            <div className="space-y-2">
              {topUsers.map((user, index) => (
                <div key={user.user_id} className="flex items-center gap-3 border-b border-gray-50 py-2 last:border-0">
                  <span
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      index === 0 ? 'bg-yellow-400 text-white' : index === 1 ? 'bg-gray-300 text-gray-700' : index === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{user.display_name || pick('未命名使用者', 'Unnamed user', 'Unnamed user', 'Unnamed user')}</p>
                    <p className="font-mono text-xs text-gray-400">{user.user_id.slice(-8)}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{user.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <TrendingUp className="h-5 w-5 text-amber-600" />
            {pick('功能使用排行', 'Feature usage ranking', 'Feature usage ranking', 'Feature usage ranking')}
          </h3>
          {featureStats.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">{pick('目前沒有資料', 'No data', 'No data', 'No data')}</p>
          ) : (
            <div className="space-y-4">
              {featureStats.map((stat, index) => {
                const meta = FEATURE_META[stat.feature];
                return (
                  <motion.div key={stat.feature} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08 }}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{meta?.label || stat.feature}</span>
                      <span className="text-sm font-bold text-gray-900">{stat.total}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(stat.total / maxTotal) * 100}%` }}
                        transition={{ delay: index * 0.1 + 0.2, duration: 0.6 }}
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

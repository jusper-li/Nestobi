import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, TrendingUp, TrendingDown, Gift, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface PointTx { id: string; amount: number; transaction_type: string; description: string; created_at: string; }

const REWARDS = [
  { points: 100, title: 'NT$10 折扣', description: '消費折抵 NT$10', icon: '🏷️' },
  { points: 300, title: 'NT$35 折扣', description: '消費折抵 NT$35', icon: '💰' },
  { points: 500, title: '免費房型升等', description: '訂房升等一個等級', icon: '⬆️' },
  { points: 1000, title: '免費早餐', description: '雙人免費早餐', icon: '☕' },
  { points: 2000, title: 'NT$250 折扣', description: '消費折抵 NT$250', icon: '🎁' },
  { points: 5000, title: '一晚免費住宿', description: '標準房型一晚住宿', icon: '🏨' },
];

const Points: React.FC = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<PointTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState('');

  const fetchPoints = async () => {
    if (!user) return;
    const { data } = await supabase.from('points').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    const txs = data || [];
    setTransactions(txs);
    setBalance(txs.reduce((s: number, t: any) => s + (t.amount || 0), 0));
    setLoading(false);
  };

  useEffect(() => { fetchPoints(); }, [user]);

  const handleRedeem = async (reward: typeof REWARDS[0], index: number) => {
    if (!user || balance < reward.points) return;
    setRedeeming(index);
    const { error } = await supabase.from('points').insert({
      user_id: user.id,
      amount: -reward.points,
      transaction_type: 'redeem',
      description: `兌換：${reward.title}`,
    });
    if (!error) {
      setRedeemSuccess(reward.title);
      setTimeout(() => setRedeemSuccess(''), 3000);
      await fetchPoints();
    }
    setRedeeming(null);
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {redeemSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            <span>已兌換：{redeemSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Star className="w-6 h-6" />
          <h2 className="text-xl font-bold">我的點數</h2>
        </div>
        <p className="text-5xl font-bold mb-1">{balance.toLocaleString()}</p>
        <p className="text-yellow-100 text-sm">點數不設期限，可隨時兌換</p>
      </motion.div>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Gift className="w-5 h-5 text-orange-500" />點數兌換</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REWARDS.map((r, i) => {
            const canRedeem = balance >= r.points;
            const isRedeeming = redeeming === i;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition ${canRedeem ? 'border-yellow-300 hover:border-yellow-400 hover:shadow-md cursor-pointer' : 'border-gray-100 opacity-60 cursor-not-allowed'}`}
                onClick={() => canRedeem && !isRedeeming && handleRedeem(r, i)}
              >
                <div className="text-3xl mb-2">{r.icon}</div>
                <h4 className="font-semibold text-gray-900">{r.title}</h4>
                <p className="text-gray-500 text-sm mt-0.5">{r.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-orange-500 font-bold text-sm">{r.points.toLocaleString()} 點</span>
                  {isRedeeming ? (
                    <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  ) : canRedeem ? (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">點擊兌換</span>
                  ) : (
                    <span className="text-xs text-gray-400">需 {(r.points - balance).toLocaleString()} 點</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">交易紀錄</h3>
        {transactions.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm"><Star className="w-10 h-10 mx-auto mb-2 opacity-20" /><p>暫無交易紀錄</p></div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
            {transactions.map((tx, i) => (
              <motion.div key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    {tx.amount > 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.description || '點數交易'}</p>
                    <p className="text-xs text-gray-400">{formatDate(tx.created_at)}</p>
                  </div>
                </div>
                <span className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Points;

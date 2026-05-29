import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, Gift, Star, TrendingDown, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { localeByLang, normalizeLang, pickByLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';

interface PointTx {
  id: string;
  amount: number;
  description: string;
  created_at: string;
}

const rewardIcon = ['☕', '🎁', '🥐'];

const Points = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const locale = localeByLang(normalizedLang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<PointTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState('');

  const rewards = [
    { points: 100, title: pick('NT$10 折價券', 'NT$10 Coupon', 'NT$10 クーポン', 'NT$10 쿠폰'), description: pick('可兌換 NT$10 折價券', 'Redeem NT$10 coupon', 'NT$10クーポンに交換', 'NT$10 쿠폰으로 교환') },
    { points: 300, title: pick('NT$35 折價券', 'NT$35 Coupon', 'NT$35 クーポン', 'NT$35 쿠폰'), description: pick('可兌換 NT$35 折價券', 'Redeem NT$35 coupon', 'NT$35クーポンに交換', 'NT$35 쿠폰으로 교환') },
    { points: 500, title: pick('免費早餐', 'Free Breakfast', '無料朝食', '무료 조식'), description: pick('訂房可加贈免費早餐', 'Free breakfast add-on for booking', '予約時に無料朝食を追加', '예약 시 무료 조식 추가') },
  ];

  const fetchPoints = async () => {
    if (!user) return;
    const { data } = await supabase.from('points').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    const txs = (data as PointTx[]) || [];
    setTransactions(txs);
    setBalance(txs.reduce((sum, tx) => sum + (tx.amount || 0), 0));
    setLoading(false);
  };

  useEffect(() => { fetchPoints(); }, [user]);

  const handleRedeem = async (reward: (typeof rewards)[0], index: number) => {
    if (!user || balance < reward.points) return;
    setRedeeming(index);
    const { error } = await supabase.from('points').insert({
      user_id: user.id,
      amount: -reward.points,
      transaction_type: 'redeem',
      description: `${pick('兌換', 'Redeemed', '交換', '교환')}: ${reward.title}`,
    });
    if (!error) {
      setRedeemSuccess(reward.title);
      setTimeout(() => setRedeemSuccess(''), 3000);
      await fetchPoints();
    }
    setRedeeming(null);
  };

  if (loading) return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2C1F10] border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {redeemSuccess && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-white shadow-lg">
            <CheckCircle className="h-5 w-5" />
            <span>{pick('兌換成功', 'Redeemed', '交換完了', '교환 완료')}: {redeemSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-400 p-6 text-white">
        <div className="mb-2 flex items-center gap-3"><Star className="h-6 w-6" /><h2 className="text-xl font-bold">{pick('我的點數', 'My Points', 'マイポイント', '내 포인트')}</h2></div>
        <p className="mb-1 text-5xl font-bold">{balance.toLocaleString()}</p>
        <p className="text-sm text-yellow-100">{pick('目前可用點數', 'Available points', '現在利用可能なポイント', '현재 사용 가능한 포인트')}</p>
      </motion.div>

      <div>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900"><Gift className="h-5 w-5 text-orange-500" />{pick('獎勵中心', 'Reward Center', '特典センター', '리워드 센터')}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.map((r, i) => {
            const canRedeem = balance >= r.points;
            const isRedeeming = redeeming === i;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`rounded-2xl border-2 bg-white p-4 shadow-sm transition ${canRedeem ? 'cursor-pointer border-yellow-300 hover:border-yellow-400 hover:shadow-md' : 'cursor-not-allowed border-gray-100 opacity-60'}`} onClick={() => canRedeem && !isRedeeming && handleRedeem(r, i)}>
                <div className="mb-2 text-3xl">{rewardIcon[i] || '🎁'}</div>
                <h4 className="font-semibold text-gray-900">{r.title}</h4>
                <p className="mt-0.5 text-sm text-gray-500">{r.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-orange-500">{r.points.toLocaleString()} {pick('點', 'pts', 'pt', '점')}</span>
                  {isRedeeming ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" /> : canRedeem ? <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">{pick('立即兌換', 'Redeem now', '今すぐ交換', '지금 교환')}</span> : <span className="text-xs text-gray-400">{pick('還差', 'Need', 'あと', '부족')} {(r.points - balance).toLocaleString()} {pick('點', 'pts', 'pt', '점')}</span>}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-bold text-gray-900">{pick('點數紀錄', 'Point History', 'ポイント履歴', '포인트 내역')}</h3>
        {transactions.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center text-gray-400 shadow-sm"><Star className="mx-auto mb-2 h-10 w-10 opacity-20" /><p>{pick('尚無點數紀錄', 'No point transactions yet', 'ポイント履歴はまだありません', '포인트 내역이 없습니다')}</p></div>
        ) : (
          <div className="divide-y divide-gray-50 overflow-hidden rounded-2xl bg-white shadow-sm">
            {transactions.map((tx, i) => (
              <motion.div key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="flex items-center justify-between px-5 py-3.5 transition hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${tx.amount > 0 ? 'bg-green-100' : 'bg-red-100'}`}>{tx.amount > 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-500" />}</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.description || pick('點數交易', 'Point transaction', 'ポイント取引', '포인트 거래')}</p>
                    <p className="text-xs text-gray-400">{formatDate(tx.created_at, locale)}</p>
                  </div>
                </div>
                <span className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Points;

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, Gift, Info, Share2, Sparkles, Star, Ticket, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';

interface PointTx {
  id: string;
  amount: number;
  description: string;
  created_at: string;
}

type UiLang = 'zh-TW' | 'en' | 'ja' | 'ko';

export default function Points() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang) as UiLang;
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);
  const dateLocale = pickByLang(locale, 'zh-TW', 'en-US', 'ja-JP', 'ko-KR');
  const t = {
    title: pick('\u6211\u7684\u9ede\u6578', 'My Points', 'My Points', 'My Points'),
    subtitle: pick('\u7ba1\u7406 Nest\u5e63\u3001\u7d05\u5229\u9ede\u6578\u3001\u63a8\u85a6\u734e\u52f5\u8207\u53ef\u514c\u63db\u512a\u60e0\u3002', 'Manage Nest Coins, reward points, referral rewards, and redeemable offers.', 'Manage Nest Coins, reward points, referral rewards, and redeemable offers.', 'Manage Nest Coins, reward points, referral rewards, and redeemable offers.'),
    balanceLabel: pick('\u53ef\u7528 Nest\u5e63', 'Available Nest Coins', 'Available Nest Coins', 'Available Nest Coins'),
    pointsLabel: pick('\u7d05\u5229\u9ede\u6578', 'Reward Points', 'Reward Points', 'Reward Points'),
    referralLabel: pick('\u63a8\u85a6\u734e\u52f5', 'Referral Rewards', 'Referral Rewards', 'Referral Rewards'),
    couponWallet: pick('\u6211\u7684\u512a\u60e0\u5238', 'My Coupons', 'My Coupons', 'My Coupons'),
    unused: pick('\u672a\u4f7f\u7528', 'Unused', 'Unused', 'Unused'),
    used: pick('\u5df2\u4f7f\u7528', 'Used', 'Used', 'Used'),
    expired: pick('\u5df2\u904e\u671f', 'Expired', 'Expired', 'Expired'),
    rewardCenter: pick('\u512a\u60e0\u5238\u8207\u514c\u63db', 'Coupons & Rewards', 'Coupons & Rewards', 'Coupons & Rewards'),
    history: pick('\u9ede\u6578\u7d00\u9304', 'Point History', 'Point History', 'Point History'),
    noHistory: pick('\u76ee\u524d\u6c92\u6709\u9ede\u6578\u7d00\u9304', 'No point transactions yet', 'No point transactions yet', 'No point transactions yet'),
    redeem: pick('\u7acb\u5373\u514c\u63db', 'Redeem Now', 'Redeem Now', 'Redeem Now'),
    need: pick('\u5c1a\u5dee', 'Need', 'Need', 'Need'),
    pts: pick('\u9ede', 'pts', 'pts', 'pts'),
    redeemed: pick('\u5df2\u514c\u63db', 'Redeemed', 'Redeemed', 'Redeemed'),
    transaction: pick('\u9ede\u6578\u7570\u52d5', 'Point transaction', 'Point transaction', 'Point transaction'),
    earningRules: pick('\u53d6\u5f97\u65b9\u5f0f', 'How to Earn', 'How to Earn', 'How to Earn'),
    bookingReward: pick('\u5b8c\u6210\u4f4f\u5bbf\u5f8c\u56de\u994b\u9ede\u6578', 'Earn points after completed stays', 'Earn points after completed stays', 'Earn points after completed stays'),
    orderReward: pick('\u5546\u54c1\u8a02\u55ae\u4ed8\u6b3e\u5f8c\u7d2f\u7a4d\u7d05\u5229', 'Earn rewards after paid product orders', 'Earn rewards after paid product orders', 'Earn rewards after paid product orders'),
    referralReward: pick('\u9080\u8acb\u597d\u53cb\u5b8c\u6210\u9996\u7b46\u6d88\u8cbb\u53ef\u5f97\u63a8\u85a6\u734e\u52f5', 'Invite friends and earn rewards after their first purchase', 'Invite friends and earn rewards after their first purchase', 'Invite friends and earn rewards after their first purchase'),
    coupon10: pick('NT$10 \u512a\u60e0\u5238', 'NT$10 Coupon', 'NT$10 Coupon', 'NT$10 Coupon'),
    coupon35: pick('NT$35 \u512a\u60e0\u5238', 'NT$35 Coupon', 'NT$35 Coupon', 'NT$35 Coupon'),
    breakfast: pick('\u514d\u8cbb\u65e9\u9910\u52a0\u8cfc', 'Free Breakfast Add-on', 'Free Breakfast Add-on', 'Free Breakfast Add-on'),
    coupon10Desc: pick('\u53ef\u65bc\u5546\u54c1\u8a02\u55ae\u6216\u8a02\u623f\u6d88\u8cbb\u6298\u62b5\u3002', 'Apply to product orders or bookings.', 'Apply to product orders or bookings.', 'Apply to product orders or bookings.'),
    coupon35Desc: pick('\u9ad8\u56de\u8cfc\u6703\u54e1\u5c08\u5c6c\u6298\u62b5\u5238\u3002', 'Exclusive credit for returning members.', 'Exclusive credit for returning members.', 'Exclusive credit for returning members.'),
    breakfastDesc: pick('\u4e0b\u6b21\u8a02\u623f\u53ef\u514c\u63db\u65e9\u9910\u670d\u52d9\u3002', 'Redeem breakfast service on your next booking.', 'Redeem breakfast service on your next booking.', 'Redeem breakfast service on your next booking.'),
    serviceNote: pick('\u514c\u63db\u7d00\u9304\u6703\u540c\u6b65\u9032\u5165\u6d88\u8cbb\u7d00\u9304\uff0c\u65b9\u4fbf\u5ba2\u670d\u67e5\u8a62\u3002', 'Redemptions are reflected in consumption records for support follow-up.', 'Redemptions are reflected in consumption records for support follow-up.', 'Redemptions are reflected in consumption records for support follow-up.'),
    loadError: pick('\u9ede\u6578\u8cc7\u6599\u66ab\u6642\u7121\u6cd5\u8b80\u53d6\uff0c\u5df2\u5148\u986f\u793a\u76ee\u524d\u53ef\u7528\u7684\u6703\u54e1\u529f\u80fd\u3002', 'Point data is temporarily unavailable, so available member features are shown first.', 'Point data is temporarily unavailable, so available member features are shown first.', 'Point data is temporarily unavailable, so available member features are shown first.'),
    refreshing: pick('\u6b63\u5728\u66f4\u65b0\u9ede\u6578\u8cc7\u6599...', 'Updating point data...', 'Updating point data...', 'Updating point data...'),
  };

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<PointTx[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState('');

  const rewards = useMemo(
    () => [
      { points: 100, title: t.coupon10, description: t.coupon10Desc, icon: <Ticket className="h-5 w-5" /> },
      { points: 300, title: t.coupon35, description: t.coupon35Desc, icon: <Gift className="h-5 w-5" /> },
      { points: 500, title: t.breakfast, description: t.breakfastDesc, icon: <Star className="h-5 w-5" /> },
    ],
    [t.coupon10, t.coupon10Desc, t.coupon35, t.coupon35Desc, t.breakfast, t.breakfastDesc],
  );

  const couponStats = [
    { label: t.unused, value: Math.max(0, Math.floor(balance / 100)), color: 'bg-green-50 text-green-700' },
    { label: t.used, value: transactions.filter(tx => tx.amount < 0).length, color: 'bg-gray-100 text-gray-700' },
    { label: t.expired, value: 0, color: 'bg-red-50 text-red-600' },
  ];

  const fetchPoints = async () => {
    if (!user) {
      setRefreshing(false);
      return;
    }

    try {
      setRefreshing(true);
      setLoadError(false);
      const { data, error } = await withTimeout(
        supabase.from('points').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        8000,
      );
      if (error) throw error;
      const txs = (data as PointTx[]) || [];
      setTransactions(txs);
      setBalance(txs.reduce((sum, tx) => sum + (tx.amount || 0), 0));
    } catch {
      setLoadError(true);
      setTransactions([]);
      setBalance(0);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchPoints();
  }, [user]);

  const handleRedeem = async (reward: (typeof rewards)[0], index: number) => {
    if (!user || balance < reward.points) return;
    setRedeeming(index);
    const { error } = await supabase.from('points').insert({
      user_id: user.id,
      amount: -reward.points,
      transaction_type: 'spent',
      description: `${t.redeemed}: ${reward.title}`,
    });

    if (!error) {
      setRedeemSuccess(reward.title);
      window.setTimeout(() => setRedeemSuccess(''), 3000);
      await fetchPoints();
    }
    setRedeeming(null);
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {redeemSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-white shadow-lg"
          >
            <CheckCircle className="h-5 w-5" />
            <span>{t.redeemed}: {redeemSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Star className="h-5 w-5 text-yellow-600" />
          {t.title}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{t.subtitle}</p>
      </div>

      {loadError && (
        <div className="flex items-start gap-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{t.loadError}</span>
        </div>
      )}

      {refreshing && !loadError && (
        <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white p-3 text-sm text-gray-500 shadow-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#C09A6A] border-t-transparent" />
          <span>{t.refreshing}</span>
        </div>
      )}

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-400 p-6 text-white">
        <div className="mb-2 flex items-center gap-3">
          <Wallet className="h-6 w-6" />
          <p className="text-sm font-medium text-yellow-100">{t.balanceLabel}</p>
        </div>
        <p className="mb-1 text-5xl font-bold">{balance.toLocaleString()}</p>
      </motion.section>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Star className="h-5 w-5" />} label={t.pointsLabel} value={balance} />
        <StatCard icon={<Ticket className="h-5 w-5" />} label={t.balanceLabel} value={Math.max(0, Math.floor(balance / 10))} />
        <StatCard icon={<Share2 className="h-5 w-5" />} label={t.referralLabel} value={0} />
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
          <Ticket className="h-5 w-5 text-orange-500" />
          {t.couponWallet}
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {couponStats.map(stat => (
            <div key={stat.label} className="rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-lg font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
          <Gift className="h-5 w-5 text-orange-500" />
          {t.rewardCenter}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.map((reward, index) => {
            const canRedeem = balance >= reward.points;
            const isRedeeming = redeeming === index;

            return (
              <motion.div
                key={reward.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-2xl border-2 bg-white p-4 shadow-sm transition ${
                  canRedeem ? 'cursor-pointer border-yellow-300 hover:border-yellow-400 hover:shadow-md' : 'cursor-not-allowed border-gray-100 opacity-60'
                }`}
                onClick={() => canRedeem && !isRedeeming && handleRedeem(reward, index)}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">{reward.icon}</div>
                <h4 className="font-semibold text-gray-900">{reward.title}</h4>
                <p className="mt-0.5 text-sm text-gray-500">{reward.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-orange-500">{reward.points.toLocaleString()} {t.pts}</span>
                  {isRedeeming ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                  ) : canRedeem ? (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">{t.redeem}</span>
                  ) : (
                    <span className="text-xs text-gray-400">{t.need} {(reward.points - balance).toLocaleString()} {t.pts}</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
          <Sparkles className="h-5 w-5 text-[#C09A6A]" />
          {t.earningRules}
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          {[t.bookingReward, t.orderReward, t.referralReward].map(rule => (
            <div key={rule} className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
              <Info className="mb-2 h-4 w-4 text-[#C09A6A]" />
              {rule}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-gray-500">{t.serviceNote}</p>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-bold text-gray-900">{t.history}</h3>
        {transactions.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center text-gray-400 shadow-sm">
            <Star className="mx-auto mb-2 h-10 w-10 opacity-20" />
            <p>{t.noHistory}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 overflow-hidden rounded-2xl bg-white shadow-sm">
            {transactions.map((tx, index) => (
              <motion.div key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.03 }} className="flex items-center justify-between px-5 py-3.5 transition hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${tx.amount > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    {tx.amount > 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.description || t.transaction}</p>
                    <p className="text-xs text-gray-400">{formatDate(tx.created_at, dateLocale)}</p>
                  </div>
                </div>
                <span className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.amount > 0 ? '+' : ''}
                  {tx.amount.toLocaleString()}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">{icon}</div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
    </div>
  );
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), timeoutMs);
    promise.then(
      value => {
        window.clearTimeout(timer);
        resolve(value);
      },
      error => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

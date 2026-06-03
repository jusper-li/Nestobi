import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BedDouble, Coins, ShoppingBag, Sparkles, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';

interface PointBalance {
  current_points: number;
  month_earned: number;
  month_used: number;
  expiring_points: number;
}

interface PointTx {
  id: string;
  amount: number;
  description: string | null;
  created_at: string;
}

type UiLang = 'zh-TW' | 'en' | 'ja' | 'ko';

const emptyBalance: PointBalance = {
  current_points: 0,
  month_earned: 0,
  month_used: 0,
  expiring_points: 0,
};

export default function Points() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang) as UiLang;
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);
  const dateLocale = pickByLang(locale, 'zh-TW', 'en-US', 'ja-JP', 'ko-KR');

  const text = {
    title: pick('我的點數', 'My Points', 'ポイント', '포인트'),
    subtitle: pick('點數可於訂房與購物時折抵使用。', 'Use points to offset bookings and shopping.', 'ポイントは予約や買い物の割引に利用できます。', '포인트는 예약과 쇼핑 결제에 사용할 수 있습니다.'),
    current: pick('目前點數', 'Current Points', '現在のポイント', '현재 포인트'),
    monthEarned: pick('本月獲得', 'Earned This Month', '今月獲得', '이번 달 적립'),
    monthUsed: pick('本月使用', 'Used This Month', '今月利用', '이번 달 사용'),
    expiring: pick('即將到期', 'Expiring Soon', 'まもなく期限切れ', '곧 만료'),
    detail: pick('點數明細', 'Point Details', 'ポイント明細', '포인트 내역'),
    noDetail: pick('目前沒有點數明細', 'No point details yet', 'ポイント明細はまだありません', '아직 포인트 내역이 없습니다'),
    bookingUse: pick('點數可以訂房抵用', 'Points can offset bookings', 'ポイントは宿泊予約に使えます', '포인트는 예약 결제에 사용할 수 있습니다'),
    shoppingUse: pick('購物可以抵用', 'Points can offset shopping', 'ポイントは買い物にも使えます', '포인트는 쇼핑 결제에도 사용할 수 있습니다'),
    np: pick('NP', 'NP', 'NP', 'NP'),
    loadError: pick('點數資料暫時無法讀取', 'Point data is temporarily unavailable', 'ポイントデータを一時的に読み込めません', '포인트 데이터를 일시적으로 불러올 수 없습니다'),
    pointTx: pick('點數異動', 'Point change', 'ポイント変動', '포인트 변동'),
  };

  const [balance, setBalance] = useState<PointBalance>(emptyBalance);
  const [transactions, setTransactions] = useState<PointTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const fetchPoints = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError(false);
      try {
        const [{ data: summary }, { data: rows }] = await Promise.all([
          supabase.from('member_point_balances').select('current_points,month_earned,month_used,expiring_points').eq('user_id', user.id).maybeSingle(),
          supabase.from('points').select('id,amount,description,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
        ]);

        const ledger = ((rows || []) as PointTx[]);
        setTransactions(ledger);
        if (summary) {
          setBalance(summary as PointBalance);
        } else {
          const current = ledger.reduce((sum, tx) => sum + tx.amount, 0);
          setBalance({ ...emptyBalance, current_points: current });
        }
      } catch {
        setLoadError(true);
        setBalance(emptyBalance);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchPoints();
  }, [user]);

  const cards = [
    { label: text.current, value: balance.current_points, icon: <Wallet className="h-5 w-5" />, tone: 'bg-amber-50 text-amber-700' },
    { label: text.monthEarned, value: balance.month_earned, icon: <TrendingUp className="h-5 w-5" />, tone: 'bg-emerald-50 text-emerald-700' },
    { label: text.monthUsed, value: balance.month_used, icon: <TrendingDown className="h-5 w-5" />, tone: 'bg-rose-50 text-rose-700' },
    { label: text.expiring, value: balance.expiring_points, icon: <Sparkles className="h-5 w-5" />, tone: 'bg-orange-50 text-orange-700' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Coins className="h-5 w-5 text-amber-600" />
          {text.title}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{text.subtitle}</p>
      </div>

      {loadError ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{text.loadError}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, index) => (
          <motion.article key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${card.tone}`}>{card.icon}</div>
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{loading ? '-' : `${card.value.toLocaleString()} ${text.np}`}</p>
          </motion.article>
        ))}
      </div>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-amber-900">
          <BedDouble className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{text.bookingUse}</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-900">
          <ShoppingBag className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{text.shoppingUse}</p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-gray-900">{text.detail}</h3>
        {transactions.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">{loading ? '-' : text.noDetail}</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((tx, index) => (
              <motion.div key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.03 }} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="text-sm text-gray-400">{formatDate(tx.created_at, dateLocale)}</p>
                  <p className="mt-1 font-semibold text-gray-900">{tx.description || text.pointTx}</p>
                </div>
                <p className={`whitespace-nowrap text-lg font-bold ${tx.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {tx.amount >= 0 ? '+' : ''}
                  {tx.amount.toLocaleString()} {text.np}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

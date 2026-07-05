import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';

type PaymentState = 'paid' | 'failed' | 'pending' | 'unknown';

export default function CheckoutResult() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id') || '';
  const [status, setStatus] = useState<PaymentState>('pending');
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const stateConfig: Record<PaymentState, { title: string; description: string; tone: string }> = useMemo(
    () => ({
      paid: {
        title: t('checkout.result.paid.title', '付款成功'),
        description: t('checkout.result.paid.description', '我們已收到您的付款，訂單會盡快安排出貨。'),
        tone: 'text-emerald-700',
      },
      failed: {
        title: t('checkout.result.failed.title', '付款失敗'),
        description: t('checkout.result.failed.description', '付款未完成，您可以返回購物車重新結帳。'),
        tone: 'text-rose-700',
      },
      pending: {
        title: t('checkout.result.pending.title', '付款處理中'),
        description: t('checkout.result.pending.description', '系統正在同步付款結果，請稍候自動更新。'),
        tone: 'text-amber-700',
      },
      unknown: {
        title: t('checkout.result.unknown.title', '查無付款資訊'),
        description: t('checkout.result.unknown.description', '尚未找到對應訂單，請稍後再試或聯絡客服。'),
        tone: 'text-slate-700',
      },
    }),
    [t]
  );

  useEffect(() => {
    if (!orderId) {
      setStatus('unknown');
      setLoading(false);
      return;
    }

    let mounted = true;
    let timer: number | null = null;

    const loadOrderStatus = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('order_number,payment_status')
        .eq('id', orderId)
        .maybeSingle();

      if (!mounted) return;

      if (error || !data) {
        setStatus('unknown');
        setLoading(false);
        return;
      }

      setOrderNumber(data.order_number || '');
      const paymentStatus = (data.payment_status || '').toLowerCase();
      if (paymentStatus === 'paid') {
        setStatus('paid');
      } else if (paymentStatus === 'failed') {
        setStatus('failed');
      } else {
        setStatus('pending');
      }
      setLoading(false);
    };

    void loadOrderStatus();
    timer = window.setInterval(() => {
      void loadOrderStatus();
    }, 4000);

    return () => {
      mounted = false;
      if (timer) window.clearInterval(timer);
    };
  }, [orderId]);

  const icon = useMemo(() => {
    if (loading || status === 'pending') return <Clock3 className="h-10 w-10 text-amber-600" />;
    if (status === 'paid') return <CheckCircle2 className="h-10 w-10 text-emerald-600" />;
    if (status === 'failed') return <XCircle className="h-10 w-10 text-rose-600" />;
    return <Clock3 className="h-10 w-10 text-slate-500" />;
  }, [loading, status]);

  const cfg = stateConfig[loading ? 'pending' : status];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 bg-stone-50 px-6 pb-16 pt-24">
        <div className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-stone-200 bg-stone-50">
            {icon}
          </div>
          <h1 className={`text-2xl font-semibold ${cfg.tone}`}>{cfg.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">{cfg.description}</p>
          {orderNumber && (
            <p className="mt-4 text-xs tracking-[0.12em] text-stone-500 uppercase">
              {t('checkout.result.orderNumber', '訂單編號')}
              ：<span className="font-mono normal-case tracking-normal text-stone-700">{orderNumber}</span>
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/shop"
              className="rounded-xl bg-stone-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-stone-800"
            >
              {t('checkout.result.continueShopping', '繼續購物')}
            </Link>
            <Link
              to="/cart"
              className="rounded-xl border border-stone-300 px-6 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
            >
              {t('checkout.result.backCart', '返回購物車')}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

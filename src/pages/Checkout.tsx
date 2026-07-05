import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, CreditCard, Gift, Lock, MapPin, Truck, User } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { trackBeginCheckout, trackPurchase } from '../lib/analytics';
import { supabase } from '../lib/supabase';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import ProductImage from '../components/ProductImage';
import ProductImagePlaceholder from '../components/ProductImagePlaceholder';

const formatCurrency = (amount: number) => `NT$ ${amount.toLocaleString()}`;

const submitNewebpayForm = (
  paymentUrl: string,
  merchantId: string,
  tradeInfo: string,
  tradeSha: string,
  version: string
) => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = paymentUrl;

  const fields: Record<string, string> = {
    MerchantID: merchantId,
    TradeInfo: tradeInfo,
    TradeSha: tradeSha,
    Version: version,
  };

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
};

export default function Checkout() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ orderNumber: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    paymentMethod: 'credit_card',
    notes: '',
  });

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items, navigate]);

  const paymentOptions = [
    { value: 'credit_card', label: t('checkout.payment.creditCard', '信用卡付款') },
    { value: 'bank_transfer', label: t('checkout.payment.transfer', '銀行轉帳') },
    { value: 'cash_on_delivery', label: t('checkout.payment.cod', '貨到付款') },
  ];

  const deliveryPromise = [
    { icon: Lock, label: t('checkout.promise.secure', '安全加密結帳') },
    { icon: Truck, label: t('checkout.promise.shipping', '全台免運配送') },
    { icon: Gift, label: t('checkout.promise.gift', '可備註禮盒需求') },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      trackBeginCheckout({
        value: total,
        items: items.map((item) => ({
          item_id: item.productId,
          item_name: item.name,
          price: item.salePrice || item.price,
          quantity: item.quantity,
        })),
      });

      const orderNumber = `ORD-${Date.now()}`;
      const orderId = crypto.randomUUID();

      const { error: orderError } = await supabase.from('orders').insert({
        id: orderId,
        order_number: orderNumber,
        status: 'pending',
        subtotal: total,
        tax: 0,
        shipping: 0,
        total,
        payment_status: 'pending',
        shipping_address: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
        },
        notes: formData.notes,
      });

      if (orderError) throw orderError;

      const orderItems = items.map((item) => ({
        order_id: orderId,
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        price: item.salePrice || item.price,
        total: (item.salePrice || item.price) * item.quantity,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      const { error: paymentError } = await supabase.from('payments').insert({
        order_id: orderId,
        amount: total,
        method: formData.paymentMethod,
        status: 'pending',
        metadata: {
          customer_name: formData.name,
          customer_email: formData.email,
        },
      });

      if (paymentError) throw paymentError;

      if (formData.paymentMethod === 'credit_card') {
        const { data: mpgData, error: mpgError } = await supabase.functions.invoke('newebpay-mpg-payment', {
          body: {
            orderId,
            payerEmail: formData.email,
            payerName: formData.name,
          },
        });

        if (mpgError) throw mpgError;
        if (!mpgData?.success) throw new Error(mpgData?.error || 'Failed to create NewebPay order');

        submitNewebpayForm(
          mpgData.paymentUrl,
          mpgData.merchantId,
          mpgData.tradeInfo,
          mpgData.tradeSha,
          mpgData.version || '1.6'
        );
        return;
      }

      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'order_confirmation',
          data: {
            orderNumber,
            customerName: formData.name,
            customerEmail: formData.email,
            items: orderItems,
            total,
            address: `${formData.address}, ${formData.city} ${formData.postalCode}`,
            paymentMethod: formData.paymentMethod,
          },
        }),
      }).catch(() => {});

      if (formData.paymentMethod !== 'credit_card') {
        trackPurchase({
          transaction_id: orderNumber,
          value: total,
          items: orderItems.map((item) => ({
            item_id: item.product_id,
            item_name: item.product_name,
            price: item.price,
            quantity: item.quantity,
          })),
        });
      }

      clearCart();
      setOrderSuccess({ orderNumber });
    } catch (error) {
      console.error('Checkout failed:', error);
      alert(t('checkout.error.failed', '結帳失敗，請稍後再試。'));
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm tracking-wide text-stone-800 placeholder-stone-300 transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100';
  const labelCls = 'mb-2 block text-xs tracking-[0.15em] text-stone-500 uppercase';

  if (orderSuccess) {
    return (
      <div className="min-h-screen flex flex-col" style={{ scrollSnapType: 'none' }}>
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center bg-stone-50 px-6 py-20">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-green-100 bg-green-50">
              <div className="h-10 w-10 rounded-full border-4 border-green-600/80" />
            </div>
            <p className="mb-3 text-xs tracking-[0.3em] text-amber-700 uppercase">
              {t('checkout.success.tag', 'Order Confirmed')}
            </p>
            <h1 className="mb-3 text-3xl font-light text-stone-800">
              {t('checkout.success.title', '訂單成立！')}
            </h1>
            <p className="mb-2 font-light text-stone-500">{t('checkout.success.subtitle', '感謝您的訂購')}</p>
            <p className="mb-8 text-sm font-light text-stone-400">
              {t('checkout.success.description', '訂單確認信已寄送至您的信箱，我們將盡快為您處理。')}
            </p>
            <div className="mb-8 inline-block w-full rounded-2xl border border-stone-100 bg-white px-6 py-5">
              <p className="mb-2 text-xs tracking-widest text-stone-400 uppercase">
                {t('checkout.success.orderNumberLabel', '訂單編號')}
              </p>
              <p className="text-lg font-medium tracking-wider text-amber-700">{orderSuccess.orderNumber}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate('/shop')}
                className="rounded-xl bg-stone-800 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700"
              >
                {t('checkout.success.continueShopping', '繼續購物')}
              </button>
              <button
                onClick={() => navigate('/')}
                className="rounded-xl border border-stone-200 bg-white px-6 py-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50"
              >
                {t('checkout.success.backHome', '回到首頁')}
              </button>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ scrollSnapType: 'none' }}>
      <SiteHeader />
      <main className="flex-1 bg-white pt-20 pb-20">
        <div className="border-b border-stone-100 bg-stone-50">
          <div className="container mx-auto px-6 py-10">
            <div className="mb-5 flex items-center gap-2 text-xs tracking-[0.15em] text-stone-400">
              <Link to="/" className="transition-colors hover:text-stone-600">
                {t('common.home', '首頁')}
              </Link>
              <ChevronRight className="h-3 w-3" />
              <Link to="/cart" className="transition-colors hover:text-stone-600">
                {t('cart.title', '購物車')}
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-stone-600">{t('checkout.title', '結帳')}</span>
            </div>
            <h1 className="text-4xl font-light tracking-[0.2em] text-stone-800 md:text-5xl">
              {t('checkout.title', '結帳')}
            </h1>
            <div className="mt-5 flex items-center gap-3">
              <div className="h-px w-10 bg-amber-400" />
              <p className="text-xs tracking-[0.25em] text-stone-400 uppercase">
                {t('checkout.subtitle', 'Secure Checkout')}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="container mx-auto px-6 py-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <User className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-medium tracking-[0.1em] text-stone-800">
                    {t('checkout.contact.title', '聯絡資訊')}
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>{t('checkout.contact.name', '姓名')} *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className={inputCls}
                      placeholder={t('checkout.contact.namePlaceholder', '請輸入姓名')}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('checkout.contact.email', '電子郵件')} *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className={inputCls}
                      placeholder={t('checkout.contact.emailPlaceholder', '請輸入電子郵件')}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>{t('checkout.contact.phone', '電話')} *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className={inputCls}
                      placeholder={t('checkout.contact.phonePlaceholder', '請輸入電話號碼')}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-medium tracking-[0.1em] text-stone-800">
                    {t('checkout.shipping.title', '配送地址')}
                  </h2>
                </div>
                <div className="grid gap-4">
                  <div>
                    <label className={labelCls}>{t('checkout.shipping.address', '地址')} *</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                      className={inputCls}
                      placeholder={t('checkout.shipping.addressPlaceholder', '請輸入地址')}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>{t('checkout.shipping.city', '城市')} *</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        required
                        className={inputCls}
                        placeholder={t('checkout.shipping.cityPlaceholder', '請輸入城市')}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>{t('checkout.shipping.postalCode', '郵遞區號')} *</label>
                      <input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleChange}
                        required
                        className={inputCls}
                        placeholder={t('checkout.shipping.postalPlaceholder', '請輸入郵遞區號')}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-medium tracking-[0.1em] text-stone-800">
                    {t('checkout.payment.title', '付款方式')}
                  </h2>
                </div>
                <div className="grid gap-3">
                  {paymentOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                        formData.paymentMethod === option.value
                          ? 'border-amber-300 bg-amber-50'
                          : 'border-stone-200 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={option.value}
                        checked={formData.paymentMethod === option.value}
                        onChange={handleChange}
                        className="h-4 w-4 accent-amber-500"
                      />
                      <span className="text-sm text-stone-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <Gift className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-medium tracking-[0.1em] text-stone-800">
                    {t('checkout.note.title', '訂單備註')}
                  </h2>
                </div>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  className={`${inputCls} resize-none`}
                  placeholder={t('checkout.note.placeholder', '如有特殊需求請在此說明')}
                />
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-xs font-medium tracking-[0.3em] text-stone-400 uppercase">
                  {t('checkout.summary.title', '訂單明細')}
                </h2>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3 border-b border-stone-100 pb-4 last:border-b-0 last:pb-0">
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100">
                        {item.image ? (
                          <ProductImage
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            sizes="64px"
                          />
                        ) : (
                          <ProductImagePlaceholder name={item.name} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-stone-800">{item.name}</p>
                            <p className="mt-1 text-xs text-stone-400">
                              {t('checkout.summary.quantity', '數量')} x {item.quantity}
                            </p>
                          </div>
                          <p className="text-sm font-medium text-stone-700">
                            {formatCurrency((item.salePrice || item.price) * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-3 border-t border-stone-100 pt-4 text-sm">
                  <div className="flex items-center justify-between text-stone-500">
                    <span>{t('checkout.summary.subtotal', '商品小計')}</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-500">
                    <span>{t('checkout.summary.shipping', '運費')}</span>
                    <span className="text-amber-600">{t('checkout.summary.free', '免運費')}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                    <span className="text-sm font-medium tracking-wide text-stone-800">
                      {t('checkout.summary.total', '總計')}
                    </span>
                    <span className="text-lg font-semibold text-stone-900">{formatCurrency(total)}</span>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
                <div className="space-y-3">
                  {deliveryPromise.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-3 text-sm text-stone-600">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-50 text-amber-500">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </section>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-6 py-4 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {t('checkout.submitting', '處理中...')}
                  </>
                ) : (
                  t('checkout.submit', '確認訂購')
                )}
              </button>

              <Link
                to="/cart"
                className="block text-center text-sm text-stone-500 transition-colors hover:text-stone-700"
              >
                {t('checkout.backCart', '返回購物車')}
              </Link>
            </aside>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}

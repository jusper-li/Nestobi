import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, CreditCard, Gift, Lock, MapPin, Receipt, Truck, User } from 'lucide-react';
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
    invoiceType: 'personal',
    buyerName: '',
    buyerIdentifier: '',
    carrierNumber: '',
    loveCode: '',
    notes: '',
  });

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items, navigate]);

  const paymentOptions = [
    { value: 'credit_card', label: t('checkout.payment.creditCard', '信用卡') },
    { value: 'bank_transfer', label: t('checkout.payment.transfer', '銀行轉帳') },
    { value: 'cash_on_delivery', label: t('checkout.payment.cod', '貨到付款') },
  ];

  const deliveryPromise = [
    { icon: Lock, label: t('checkout.promise.secure', '安全結帳') },
    { icon: Truck, label: t('checkout.promise.shipping', '快速出貨') },
    { icon: Gift, label: t('checkout.promise.gift', '贈禮包裝') },
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
      const buyerEmail = formData.email.trim();
      const buyerName = formData.buyerName.trim();
      const buyerIdentifier = formData.buyerIdentifier.trim();
      const carrierNumber = formData.carrierNumber.trim();
      const loveCode = formData.loveCode.trim();

      if (!buyerEmail) {
        throw new Error('buyer_email is required');
      }

      if (formData.invoiceType === 'company' && !buyerIdentifier) {
        throw new Error('公司統編為必填欄位');
      }

      if (formData.invoiceType === 'mobile_carrier' && !carrierNumber) {
        throw new Error('手機條碼載具為必填欄位');
      }

      if (formData.invoiceType === 'donation' && !loveCode) {
        throw new Error('愛心碼為必填欄位');
      }

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
          email: buyerEmail,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
          buyer_email: buyerEmail,
          buyer_name: buyerName,
          buyer_identifier: buyerIdentifier,
          carrier_number: carrierNumber,
          love_code: loveCode,
          invoice_type: formData.invoiceType,
          invoice: {
            invoice_type: formData.invoiceType,
            buyer_email: buyerEmail,
            buyer_name: buyerName,
            buyer_identifier: buyerIdentifier,
            carrier_number: carrierNumber,
            love_code: loveCode,
            tax_type: '1',
          },
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
          type: 'order-confirmation',
          to: formData.email,
          data: {
            orderNumber,
            merchantOrderNo: orderNumber,
            customerName: formData.name,
            customerEmail: formData.email,
            items: orderItems,
            total,
            totalAmount: total,
            address: `${formData.address}, ${formData.city} ${formData.postalCode}`,
            paymentMethod: formData.paymentMethod,
            siteUrl: window.location.origin,
            orderUrl: `${window.location.origin}/member/orders?merchantOrderNo=${encodeURIComponent(orderNumber)}`,
            recipientKind: 'order',
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
      alert(t('checkout.error.failed', '結帳失敗，請稍後再試'));
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
              {t('checkout.success.title', '訂單成立')}
            </h1>
            <p className="mb-2 font-light text-stone-500">{t('checkout.success.subtitle', '感謝您的訂購')}</p>
            <p className="mb-8 text-sm font-light text-stone-400">
              {t('checkout.success.description', '我們已收到您的訂單，後續會寄送確認信到您的信箱。')}
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
                    <label className={labelCls}>{t('checkout.contact.email', '?餃??萎辣')} *</label>
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
                    <label className={labelCls}>{t('checkout.contact.phone', '?餉店')} *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className={inputCls}
                      placeholder={t('checkout.contact.phonePlaceholder', '請輸入電話')}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-medium tracking-[0.1em] text-stone-800">
                    電子發票資訊
                  </h2>
                </div>
                <div className="grid gap-4">
                  <div>
                    <label className={labelCls}>發票類型 *</label>
                    <select
                      name="invoiceType"
                      value={formData.invoiceType}
                      onChange={handleChange}
                      className={inputCls}
                    >
                      <option value="personal">個人電子發票</option>
                      <option value="mobile_carrier">手機條碼載具</option>
                      <option value="company">公司戶統編</option>
                      <option value="donation">捐贈發票</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>買受人姓名</label>
                    <input
                      type="text"
                      name="buyerName"
                      value={formData.buyerName}
                      onChange={handleChange}
                      className={inputCls}
                      placeholder="可留空，若需抬頭可填入姓名"
                    />
                  </div>
                  {formData.invoiceType === 'company' && (
                    <div>
                      <label className={labelCls}>公司統編 *</label>
                      <input
                        type="text"
                        name="buyerIdentifier"
                        value={formData.buyerIdentifier}
                        onChange={handleChange}
                        className={inputCls}
                        placeholder="請輸入 8 碼統一編號"
                      />
                    </div>
                  )}
                  {formData.invoiceType === 'mobile_carrier' && (
                    <div>
                      <label className={labelCls}>手機條碼載具 *</label>
                      <input
                        type="text"
                        name="carrierNumber"
                        value={formData.carrierNumber}
                        onChange={handleChange}
                        className={inputCls}
                        placeholder="例如：/ABCD1234"
                      />
                    </div>
                  )}
                  {formData.invoiceType === 'donation' && (
                    <div>
                      <label className={labelCls}>愛心碼 *</label>
                      <input
                        type="text"
                        name="loveCode"
                        value={formData.loveCode}
                        onChange={handleChange}
                        className={inputCls}
                        placeholder="請輸入愛心碼"
                      />
                    </div>
                  )}
                  <p className="text-xs leading-6 text-stone-500">
                    發票通知會寄到您填寫的電子郵件，請確認資料正確。
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <Gift className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-medium tracking-[0.1em] text-stone-800">
                    訂單備註
                  </h2>
                </div>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  className={`${inputCls} resize-none`}
                  placeholder="例如：請協助備註收件時段或特殊需求"
                />
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-xs font-medium tracking-[0.3em] text-stone-400 uppercase">
                  {t('checkout.summary.title', '訂單摘要')}
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
                    <span>{t('checkout.summary.subtotal', '小計')}</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-500">
                    <span>{t('checkout.summary.shipping', '運費')}</span>
                    <span className="text-amber-600">{t('checkout.summary.free', '免運')}</span>
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
                    {t('checkout.submitting', '提交中...')}
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

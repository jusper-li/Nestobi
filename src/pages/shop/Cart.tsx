import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import Navigation from '../../components/Navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { createShopCheckout, submitNewebPayMpgForm } from '../../lib/shopCheckout';
import { formatCurrency } from '../../lib/utils';

interface CartProduct {
  id: string;
  name: string;
  vendor_id: string | null;
  price: number;
  image_url: string | null;
  stock_quantity: number;
}

interface CartItemWithProduct {
  id: string;
  product_id: string;
  quantity: number;
  products: CartProduct | null;
}

function hasProduct(item: CartItemWithProduct): item is CartItemWithProduct & { products: CartProduct } {
  return item.products !== null;
}

export default function Cart() {
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const { user } = useAuth();
  const { items, removeItem, updateQuantity, clearCart } = useCart();
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [success, setSuccess] = useState(false);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [pointsToUse, setPointsToUse] = useState(0);
  const navigate = useNavigate();

  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);

  const t = {
    loginTitle: pick('Please log in', 'Please log in', 'Please log in', 'Please log in'),
    loginDesc: pick('Log in to view your cart and complete checkout.', 'Log in to view your cart and complete checkout.', 'Log in to view your cart and complete checkout.', 'Log in to view your cart and complete checkout.'),
    loginNow: pick('Log in now', 'Log in now', 'Log in now', 'Log in now'),
    successTitle: pick('Order completed', 'Order Completed', 'Order Completed', 'Order Completed'),
    successDesc: pick('Your order has been placed. You can view details in My Orders.', 'Your order has been placed. You can view details in My Orders.', 'Your order has been placed. You can view details in My Orders.', 'Your order has been placed. You can view details in My Orders.'),
    viewOrders: pick('View My Orders', 'View My Orders', 'View My Orders', 'View My Orders'),
    checkout: pick('Checkout', 'Checkout', 'Checkout', 'Checkout'),
    continueShopping: pick('Continue Shopping', 'Continue Shopping', 'Continue Shopping', 'Continue Shopping'),
    emptyCart: pick('Your cart is empty', 'Your cart is empty', 'Your cart is empty', 'Your cart is empty'),
    removeUnavailable: pick('Remove unavailable items', 'Remove unavailable items', 'Remove unavailable items', 'Remove unavailable items'),
    backToShop: pick('Back to Shop', 'Back to Shop', 'Back to Shop', 'Back to Shop'),
    orderSummary: pick('Order Summary', 'Order Summary', 'Order Summary', 'Order Summary'),
    subtotal: pick('Subtotal', 'Subtotal', 'Subtotal', 'Subtotal'),
    loginBeforeCheckout: pick('Please log in before checkout.', 'Please log in before checkout.', 'Please log in before checkout.', 'Please log in before checkout.'),
    placeOrder: pick('Place Order', 'Place Order', 'Place Order', 'Place Order'),
    checkoutFailed: pick('Checkout failed. Please try again later.', 'Checkout failed. Please try again later.', 'Checkout failed. Please try again later.', 'Checkout failed. Please try again later.'),
    unavailableCount: (count: number) => pick(`${count} unavailable item(s) found.`, `${count} unavailable item(s) found.`, `${count} unavailable item(s) found.`, `${count} unavailable item(s) found.`),
    pointsDesc: (points: number) => pick(`Estimated points: ${points}`, `Estimated points: ${points}`, `Estimated points: ${points}`, `Estimated points: ${points}`),
    pointsOrderDesc: pick('Shop purchase points reward', 'Shop purchase points reward', 'Shop purchase points reward', 'Shop purchase points reward'),
  };

  useEffect(() => {
    const fetchCartItems = async () => {
      if (!user) {
        setCartItems(items as unknown as CartItemWithProduct[]);
        setLoading(false);
        return;
      }
      const { data } = await supabase.from('tbl_mn5uxems').select('*, products(*)').eq('user_id', user.id);
      setCartItems((data as CartItemWithProduct[]) || []);
      setLoading(false);
    };
    fetchCartItems();
  }, [user, items]);

  useEffect(() => {
    const fetchPointBalance = async () => {
      if (!user) {
        setAvailablePoints(0);
        return;
      }
      const { data } = await supabase.from('member_point_balances').select('current_points').eq('user_id', user.id).maybeSingle();
      setAvailablePoints(Number(data?.current_points || 0));
    };
    void fetchPointBalance();
  }, [user]);

  const validCartItems = cartItems.filter(hasProduct);
  const unavailableCartItems = cartItems.filter((item) => !item.products);
  const subtotal = validCartItems.reduce((sum, item) => sum + item.products.price * item.quantity, 0);
  const maxPointUse = Math.max(0, Math.min(availablePoints, subtotal));
  const pointDiscount = Math.max(0, Math.min(pointsToUse, maxPointUse));
  const payableSubtotal = Math.max(0, subtotal - pointDiscount);
  const paymentMethod = pointDiscount >= subtotal && subtotal > 0 ? 'points' : pointDiscount > 0 ? 'points_credit_card' : 'credit_card';
  const pointsEarned = Math.floor(payableSubtotal / 100) * 5;

  const handleRemoveUnavailableItems = async () => {
    if (checkoutLoading) return;
    await Promise.all(unavailableCartItems.map((item) => removeItem(item.id)));
    setCartItems((prev) => prev.filter(hasProduct));
  };

  const handleCheckout = async () => {
    if (checkoutLoading) return;
    if (validCartItems.length === 0) return;
    if (!user) {
      navigate(`/auth/login?redirect=${encodeURIComponent('/cart')}`);
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError('');

    try {
      const checkout = await createShopCheckout(pointDiscount);
      await clearCart();

      if (checkout.mode === 'newebpay') {
        if (!checkout.paymentUrl || !checkout.merchantId || !checkout.tradeInfo || !checkout.tradeSha || !checkout.version) {
          throw new Error('NewebPay payment payload is incomplete.');
        }
        submitNewebPayMpgForm(
          checkout.paymentUrl,
          checkout.merchantId,
          checkout.tradeInfo,
          checkout.tradeSha,
          checkout.version,
        );
        return;
      }

      if (checkout.mode === 'points') {
        setSuccess(true);
        return;
      }

      throw new Error('Unsupported checkout mode.');
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : t.checkoutFailed);
      setTimeout(() => setCheckoutError(''), 4000);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (!user && !loading && cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="mx-auto max-w-md px-4 py-32 text-center">
          <ShoppingBag className="mx-auto mb-4 h-14 w-14 text-gray-300" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">{t.loginTitle}</h1>
          <p className="mb-6 text-sm leading-6 text-gray-500">{t.loginDesc}</p>
          <button type="button" onClick={() => navigate('/auth/login')} className="rounded-xl bg-[#C09A6A] px-6 py-3 font-bold text-white transition hover:bg-[#8B6840]">
            {t.loginNow}
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">{t.successTitle}</h1>
            <p className="mb-6 text-sm leading-6 text-gray-500">{t.successDesc}</p>
            <button type="button" onClick={() => navigate('/member/orders')} className="rounded-xl bg-[#C09A6A] px-8 py-3 font-bold text-white transition hover:bg-[#8B6840]">
              {t.viewOrders}
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="section-label">{t.checkout}</p>
            <h1 className="section-title flex items-center gap-2 text-3xl">
              <ShoppingBag className="h-7 w-7 text-[#C09A6A]" />
              {t.checkout}
            </h1>
            <span className="gold-bar" />
          </div>
          <button type="button" onClick={() => navigate('/shop')} className="self-start rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 sm:self-auto">
            {t.continueShopping}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#C09A6A] border-t-transparent" />
          </div>
        ) : validCartItems.length === 0 ? (
          <div className="rounded-2xl bg-white px-4 py-24 text-center text-gray-400 shadow-sm">
            <ShoppingBag className="mx-auto mb-4 h-16 w-16 opacity-20" />
            <p className="text-lg font-semibold text-gray-500">{t.emptyCart}</p>
            {unavailableCartItems.length > 0 && (
              <div className="mx-auto mt-4 max-w-md rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                {t.unavailableCount(unavailableCartItems.length)}
                <button type="button" onClick={handleRemoveUnavailableItems} className="ml-2 font-bold underline">
                  {t.removeUnavailable}
                </button>
              </div>
            )}
            <button type="button" onClick={() => navigate('/shop')} className="mt-4 font-bold text-[#C09A6A] hover:underline">
              {t.backToShop}
            </button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-3">
              {unavailableCartItems.length > 0 && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold">{t.unavailableCount(unavailableCartItems.length)}</p>
                    <button type="button" onClick={handleRemoveUnavailableItems} className="mt-1 font-bold underline">
                      {t.removeUnavailable}
                    </button>
                  </div>
                </div>
              )}
              {validCartItems.map((item) => (
                <motion.div key={item.id} layout className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm">
                  <img src={item.products.image_url || 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=240'} alt={item.products.name} className="h-24 w-24 flex-shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-bold text-gray-900">{item.products.name}</h2>
                    <p className="mt-1 font-bold text-[#C09A6A]">{formatCurrency(item.products.price)}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <div className="flex items-center overflow-hidden rounded-lg border border-gray-200">
                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={checkoutLoading} className="p-2 text-gray-500 transition hover:bg-gray-50 disabled:opacity-50">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-bold">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.id, Math.min(item.products.stock_quantity, item.quantity + 1))} disabled={checkoutLoading} className="p-2 text-gray-500 transition hover:bg-gray-50 disabled:opacity-50">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-gray-600">{formatCurrency(item.products.price * item.quantity)}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeItem(item.id)} disabled={checkoutLoading} className="self-start p-1 text-red-400 transition hover:text-red-600 disabled:opacity-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </div>

            <aside className="h-fit rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
                <ShieldCheck className="h-5 w-5 text-[#C09A6A]" />
                {t.orderSummary}
              </div>
              <div className="mb-4 space-y-2">
                {validCartItems.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3 text-sm text-gray-600">
                    <span className="truncate">{item.products.name} x {item.quantity}</span>
                    <span className="font-semibold">{formatCurrency(item.products.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mb-4 border-t border-gray-100 pt-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{t.subtotal}</span>
                  <span className="text-[#C09A6A]">{formatCurrency(subtotal)}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
                  <button type="button" onClick={() => setPointsToUse(0)} className={`rounded-lg border px-3 py-2 transition ${pointDiscount === 0 ? 'border-[#C09A6A] bg-[#FEF9EC] text-[#8B6840]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {pick('Credit card', 'Credit card', 'Credit card', 'Credit card')}
                  </button>
                  <button type="button" disabled={maxPointUse <= 0} onClick={() => setPointsToUse(maxPointUse)} className={`rounded-lg border px-3 py-2 transition disabled:opacity-50 ${pointDiscount > 0 ? 'border-[#C09A6A] bg-[#FEF9EC] text-[#8B6840]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {maxPointUse >= subtotal ? pick('Points payment', 'Points payment', 'Points payment', 'Points payment') : pick('Points discount', 'Points discount', 'Points discount', 'Points discount')}
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center justify-between gap-3 text-sm text-gray-700">
                    <span>{pick('Use points', 'Use points', 'Use points', 'Use points')}</span>
                    <span>{pick('Available', 'Available', 'Available', 'Available')} {availablePoints.toLocaleString()} NP</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={maxPointUse}
                    value={pointsToUse}
                    onChange={event => setPointsToUse(Math.max(0, Math.min(Number(event.target.value || 0), maxPointUse)))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C09A6A]"
                  />
                  {pointDiscount > 0 ? (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>{pick('Point discount', 'Point discount', 'Point discount', 'Point discount')}</span>
                      <span>-{formatCurrency(pointDiscount)}</span>
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 text-lg font-bold">
                  <span>{pick('Total', 'Total', 'Total', 'Total')}</span>
                  <span className="text-[#C09A6A]">{formatCurrency(payableSubtotal)}</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-[#8B6840]">{t.pointsDesc(pointsEarned)}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {pick('Payment method', 'Payment method', 'Payment method', 'Payment method')}: {paymentMethod === 'points' ? pick('Points payment', 'Points payment', 'Points payment', 'Points payment') : paymentMethod === 'points_credit_card' ? pick('Points discount + credit card', 'Points discount + credit card', 'Points discount + credit card', 'Points discount + credit card') : pick('Credit card', 'Credit card', 'Credit card', 'Credit card')}
                </p>
              </div>
              {checkoutError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">{checkoutError}</p>}
              {!user && <p className="mb-3 rounded-lg bg-[#FEF9EC] px-3 py-2 text-center text-sm font-semibold text-[#8B6840]">{t.loginBeforeCheckout}</p>}
              <button type="button" onClick={handleCheckout} disabled={checkoutLoading || validCartItems.length === 0} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C09A6A] py-3 font-bold text-white transition hover:bg-[#8B6840] disabled:opacity-60">
                {checkoutLoading && <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {t.placeOrder}
              </button>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}


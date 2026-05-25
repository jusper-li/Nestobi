import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import Navigation from '../../components/Navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';

const SEND_EMAIL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

interface CartProduct {
  id: string;
  name: string;
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
  const isEn = lang === 'en';
  const { user } = useAuth();
  const { items, removeItem, updateQuantity, clearCart } = useCart();
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const t = {
    loginRequiredTitle: isEn ? 'Please log in' : '請先登入',
    loginRequiredDesc: isEn ? 'Log in to view your cart and complete checkout.' : '登入後即可查看購物車並完成結帳。',
    loginNow: isEn ? 'Log in now' : '立即登入',
    successTitle: isEn ? 'Order Completed' : '結帳完成',
    successDesc: isEn
      ? 'Your order has been placed. You can view details in My Orders.'
      : '您的訂單已成立，可前往我的訂單查看詳情。',
    viewOrders: isEn ? 'View My Orders' : '查看我的訂單',
    checkout: isEn ? 'Checkout' : '結帳',
    continueShopping: isEn ? 'Continue Shopping' : '繼續購物',
    emptyCart: isEn ? 'Your cart is empty' : '購物車目前是空的',
    unavailableHint: isEn ? 'Some unavailable items remain in your cart.' : '有部分商品已下架或無法購買。',
    removeUnavailable: isEn ? 'Remove unavailable items' : '移除無效商品',
    backToShop: isEn ? 'Back to Shop' : '返回商店',
    orderSummary: isEn ? 'Order Summary' : '訂單摘要',
    subtotal: isEn ? 'Subtotal' : '小計',
    pointsEarned: isEn ? `Earn ${pointsEarnedLabel(0, true)}` : `本次可得 ${pointsEarnedLabel(0, false)}`,
    loginBeforeCheckout: isEn ? 'Please log in before checkout.' : '請先登入再進行結帳。',
    placeOrder: isEn ? 'Place Order' : '送出訂單',
    checkoutFailed: isEn ? 'Checkout failed. Please try again later.' : '結帳失敗，請稍後再試。',
    unavailableCount: (count: number) =>
      isEn ? `${count} unavailable item(s) found.` : `目前有 ${count} 項商品已無法購買。`,
    pointsDesc: (points: number) => (isEn ? `Estimated points: ${points}` : `預估回饋點數：${points} 點`),
    pointsOrderDesc: isEn ? 'Shop purchase points reward' : '購物消費回饋點數',
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

  const validCartItems = cartItems.filter(hasProduct);
  const unavailableCartItems = cartItems.filter(item => !item.products);
  const subtotal = validCartItems.reduce((sum, item) => sum + item.products.price * item.quantity, 0);
  const pointsEarned = Math.floor(subtotal / 100) * 5;

  const handleRemoveUnavailableItems = async () => {
    await Promise.all(unavailableCartItems.map(item => removeItem(item.id)));
    setCartItems(prev => prev.filter(hasProduct));
  };

  const handleCheckout = async () => {
    if (validCartItems.length === 0) return;
    if (!user) {
      navigate(`/auth/login?redirect=${encodeURIComponent('/cart')}`);
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError('');

    try {
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: subtotal,
          status: 'pending',
          payment_method: 'credit_card',
          payment_status: 'paid',
          currency: 'TWD',
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      await supabase.from('purchase_records').insert(
        validCartItems.map(item => ({
          order_id: order.id,
          user_id: user.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.products.price,
          total_price: item.products.price * item.quantity,
          payment_method: 'credit_card',
          status: 'completed',
        })),
      );

      if (pointsEarned > 0) {
        await supabase.from('points').insert({
          user_id: user.id,
          amount: pointsEarned,
          transaction_type: 'earn',
          reference_id: order.id,
          description: t.pointsOrderDesc,
        });
      }

      await clearCart();

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const { data: profile } = await supabase
          .from('tbl_mn5wgzh0')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();
        fetch(SEND_EMAIL_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            type: 'order-confirmation',
            to: session.user.email,
            data: {
              displayName: profile?.display_name || '',
              items: validCartItems.map(item => ({
                name: item.products.name,
                quantity: item.quantity,
                price: item.products.price,
              })),
              totalAmount: subtotal,
              pointsEarned,
            },
          }),
        });
      }

      setSuccess(true);
    } catch {
      setCheckoutError(t.checkoutFailed);
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
          <h1 className="mb-2 text-2xl font-bold text-gray-900">{t.loginRequiredTitle}</h1>
          <p className="mb-6 text-sm leading-6 text-gray-500">{t.loginRequiredDesc}</p>
          <button
            type="button"
            onClick={() => navigate('/auth/login')}
            className="rounded-xl bg-[#C09A6A] px-6 py-3 font-bold text-white transition hover:bg-[#8B6840]"
          >
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
            <button
              type="button"
              onClick={() => navigate('/member/orders')}
              className="rounded-xl bg-[#C09A6A] px-8 py-3 font-bold text-white transition hover:bg-[#8B6840]"
            >
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
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="self-start rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 sm:self-auto"
          >
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
                <button
                  type="button"
                  onClick={handleRemoveUnavailableItems}
                  className="ml-2 font-bold underline"
                >
                  {t.removeUnavailable}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="mt-4 font-bold text-[#C09A6A] hover:underline"
            >
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
              {validCartItems.map(item => (
                <motion.div key={item.id} layout className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm">
                  <img
                    src={
                      item.products.image_url ||
                      'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=240'
                    }
                    alt={item.products.name}
                    className="h-24 w-24 flex-shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-bold text-gray-900">{item.products.name}</h2>
                    <p className="mt-1 font-bold text-[#C09A6A]">{formatCurrency(item.products.price)}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <div className="flex items-center overflow-hidden rounded-lg border border-gray-200">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-2 text-gray-500 transition hover:bg-gray-50"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.id, Math.min(item.products.stock_quantity, item.quantity + 1))
                          }
                          className="p-2 text-gray-500 transition hover:bg-gray-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-gray-600">
                        {formatCurrency(item.products.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="self-start p-1 text-red-400 transition hover:text-red-600"
                  >
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
                {validCartItems.map(item => (
                  <div key={item.id} className="flex justify-between gap-3 text-sm text-gray-600">
                    <span className="truncate">
                      {item.products.name} x {item.quantity}
                    </span>
                    <span className="font-semibold">{formatCurrency(item.products.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mb-4 border-t border-gray-100 pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>{t.subtotal}</span>
                  <span className="text-[#C09A6A]">{formatCurrency(subtotal)}</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-[#8B6840]">{t.pointsDesc(pointsEarned)}</p>
              </div>
              {checkoutError && (
                <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">
                  {checkoutError}
                </p>
              )}
              {!user && (
                <p className="mb-3 rounded-lg bg-[#FEF9EC] px-3 py-2 text-center text-sm font-semibold text-[#8B6840]">
                  {t.loginBeforeCheckout}
                </p>
              )}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkoutLoading || validCartItems.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C09A6A] py-3 font-bold text-white transition hover:bg-[#8B6840] disabled:opacity-60"
              >
                {checkoutLoading && (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {t.placeOrder}
              </button>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function pointsEarnedLabel(points: number, isEn: boolean) {
  return isEn ? `${points} points` : `${points} 點`;
}

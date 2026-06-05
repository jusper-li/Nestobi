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
import { formatCurrency } from '../../lib/utils';

const SEND_EMAIL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

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
    loginTitle: pick('請先登入', 'Please log in', 'ログインしてください', '로그인이 필요합니다'),
    loginDesc: pick('登入後即可查看購物車並完成結帳。', 'Log in to view your cart and complete checkout.', 'ログイン後にカート内容を確認して決済できます。', '로그인 후 장바구니 확인 및 결제가 가능합니다.'),
    loginNow: pick('立即登入', 'Log in now', '今すぐログイン', '지금 로그인'),
    successTitle: pick('訂單完成', 'Order Completed', '注文が完了しました', '주문이 완료되었습니다'),
    successDesc: pick('你的訂單已送出，可至「我的訂單」查看詳情。', 'Your order has been placed. You can view details in My Orders.', '注文は完了しました。「注文履歴」から詳細を確認できます。', '주문이 접수되었습니다. 마이 주문에서 상세를 확인할 수 있습니다.'),
    viewOrders: pick('查看我的訂單', 'View My Orders', '注文履歴を見る', '내 주문 보기'),
    checkout: pick('結帳', 'Checkout', 'チェックアウト', '결제'),
    continueShopping: pick('繼續購物', 'Continue Shopping', '買い物を続ける', '쇼핑 계속하기'),
    emptyCart: pick('購物車目前是空的', 'Your cart is empty', 'カートは空です', '장바구니가 비어 있습니다'),
    removeUnavailable: pick('移除無法購買商品', 'Remove unavailable items', '購入不可商品を削除', '구매 불가 상품 제거'),
    backToShop: pick('返回商店', 'Back to Shop', 'ショップへ戻る', '샵으로 돌아가기'),
    orderSummary: pick('訂單摘要', 'Order Summary', '注文概要', '주문 요약'),
    subtotal: pick('小計', 'Subtotal', '小計', '소계'),
    loginBeforeCheckout: pick('請先登入再進行結帳。', 'Please log in before checkout.', 'チェックアウト前にログインしてください。', '결제 전에 로그인해주세요.'),
    placeOrder: pick('送出訂單', 'Place Order', '注文する', '주문하기'),
    checkoutFailed: pick('結帳失敗，請稍後再試。', 'Checkout failed. Please try again later.', 'チェックアウトに失敗しました。しばらくしてから再試行してください。', '결제에 실패했습니다. 잠시 후 다시 시도해주세요.'),
    unavailableCount: (count: number) => pick(`偵測到 ${count} 件商品無法購買。`, `${count} unavailable item(s) found.`, `購入不可の商品が ${count} 件あります。`, `구매 불가 상품 ${count}개가 있습니다.`),
    pointsDesc: (points: number) => pick(`預估可得點數：${points}`, `Estimated points: ${points}`, `獲得予定ポイント：${points}`, `예상 적립 포인트: ${points}`),
    pointsOrderDesc: pick('商品購買點數回饋', 'Shop purchase points reward', '商品購入ポイント還元', '상품 구매 포인트 적립'),
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
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: payableSubtotal,
          subtotal_amount: subtotal,
          points_discount: pointDiscount,
          status: 'pending',
          payment_method: paymentMethod,
          payment_status: 'paid',
          currency: 'TWD',
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      await supabase.from('purchase_records').insert(
        validCartItems.map((item) => ({
          order_id: order.id,
          user_id: user.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.products.price,
          total_price: item.products.price * item.quantity,
          payment_method: paymentMethod,
          status: 'pending',
        }))
      );

      if (pointsEarned > 0) {
        await supabase.from('points').insert({
          user_id: user.id,
          amount: pointsEarned,
          transaction_type: 'earn',
          reference_id: order.id,
          source_type: 'order',
          source_id: order.id,
          vendor_id: validCartItems[0]?.products.vendor_id || null,
          description: t.pointsOrderDesc,
        });
      }

      if (pointDiscount > 0) {
        await supabase.from('points').insert({
          user_id: user.id,
          amount: -pointDiscount,
          transaction_type: 'spent',
          reference_id: order.id,
          source_type: 'order',
          source_id: order.id,
          vendor_id: validCartItems[0]?.products.vendor_id || null,
          description: pick('使用點數折抵', 'Points redemption', 'ポイント利用', '포인트 사용'),
        });
      }

      await clearCart();

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const { data: profile } = await supabase.from('tbl_mn5wgzh0').select('display_name').eq('user_id', user.id).maybeSingle();
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
              items: validCartItems.map((item) => ({
                name: item.products.name,
                quantity: item.quantity,
                price: item.products.price,
              })),
              totalAmount: payableSubtotal,
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
                    {pick('信用卡', 'Credit card', 'クレジットカード', '신용카드')}
                  </button>
                  <button type="button" disabled={maxPointUse <= 0} onClick={() => setPointsToUse(maxPointUse)} className={`rounded-lg border px-3 py-2 transition disabled:opacity-50 ${pointDiscount > 0 ? 'border-[#C09A6A] bg-[#FEF9EC] text-[#8B6840]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {maxPointUse >= subtotal ? pick('點數支付', 'Points payment', 'ポイント支払い', '포인트 결제') : pick('點數折抵', 'Points discount', 'ポイント割引', '포인트 할인')}
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center justify-between gap-3 text-sm text-gray-700">
                    <span>{pick('使用點數折抵', 'Use points', 'ポイント利用', '포인트 사용')}</span>
                    <span>{pick('可用', 'Available', '利用可能', '사용 가능')} {availablePoints.toLocaleString()} NP</span>
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
                      <span>{pick('點數折抵', 'Point discount', 'ポイント割引', '포인트 할인')}</span>
                      <span>-{formatCurrency(pointDiscount)}</span>
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 text-lg font-bold">
                  <span>{pick('應付金額', 'Total', '合計', '총액')}</span>
                  <span className="text-[#C09A6A]">{formatCurrency(payableSubtotal)}</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-[#8B6840]">{t.pointsDesc(pointsEarned)}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {pick('付款方式', 'Payment method', '支払い方法', '결제 수단')}: {paymentMethod === 'points' ? pick('點數支付', 'Points payment', 'ポイント支払い', '포인트 결제') : paymentMethod === 'points_credit_card' ? pick('點數折抵 + 信用卡', 'Points discount + credit card', 'ポイント割引 + クレジットカード', '포인트 할인 + 신용카드') : pick('信用卡', 'Credit card', 'クレジットカード', '신용카드')}
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

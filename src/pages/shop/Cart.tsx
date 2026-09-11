import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Mail, Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import Footer from '../../components/Footer';
import Navigation from '../../components/Navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { trackBeginCheckout, trackPurchase } from '../../lib/analytics';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { createGuestShopCheckout, createShopCheckout, submitNewebPayMpgForm, type NewebPayPaymentMethod } from '../../lib/shopCheckout';
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

type PaymentChoice = 'POINTS' | NewebPayPaymentMethod;

export default function Cart() {
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const { user, profile } = useAuth();
  const { items, removeItem, updateQuantity, clearCart } = useCart();
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [success, setSuccess] = useState(false);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [customerEmail, setCustomerEmail] = useState('');
  const [pointUsage, setPointUsage] = useState(0);
  const [pointSessionId, setPointSessionId] = useState('');
  const [pointOtpRequestId, setPointOtpRequestId] = useState('');
  const [pointOtp, setPointOtp] = useState('');
  const [pointModalOpen, setPointModalOpen] = useState(false);
  const [pointLoading, setPointLoading] = useState(false);
  const [pointMessage, setPointMessage] = useState('');
  const [memberToken, setMemberToken] = useState('');
  const [guestCheckoutToken, setGuestCheckoutToken] = useState('');
  const [guestPaymentHandled, setGuestPaymentHandled] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('CREDIT');
  const [shippingName, setShippingName] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [invoiceType, setInvoiceType] = useState<'personal' | 'company' | 'mobile_carrier' | 'donation'>('personal');
  const [buyerIdentifier, setBuyerIdentifier] = useState('');
  const [carrierNumber, setCarrierNumber] = useState('');
  const [loveCode, setLoveCode] = useState('');
  const [shippingMethod, setShippingMethod] = useState<'home' | 'cvs'>('home');
  const [storeId, setStoreId] = useState('');
  const [storeName, setStoreName] = useState('');
  const navigate = useNavigate();

  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);

  const t = {
    loginTitle: pick('購物車是空的', 'Your cart is empty', 'カートは空です', '장바구니가 비어 있습니다'),
    loginDesc: pick('登入可以自動帶入會員資料，也可以直接以訪客身份結帳。', 'Log in to prefill your details, or continue as a guest.', 'ログインして情報を自動入力するか、ゲストとして購入できます。', '로그인하거나 게스트로 계속할 수 있습니다.'),
    loginNow: pick('立即登入', 'Log in now', '今すぐログイン', '지금 로그인'),
    successTitle: pick('訂單已完成', 'Order completed', '注文が完了しました', '주문이 완료되었습니다'),
    successDesc: pick('你的訂單已送出，可前往我的訂單查看明細。', 'Your order has been placed. You can view details in My Orders.', 'ご注文は送信されました。マイ注文で詳細を確認できます。', '주문이 완료되었습니다. 내 주문에서 상세를 확인할 수 있습니다.'),
    viewOrders: pick('查看我的訂單', 'View My Orders', 'マイ注文を見る', '내 주문 보기'),
    checkout: pick('購物車結帳', 'Checkout', 'チェックアウト', '결제'),
    emptyCart: pick('你的購物車是空的', 'Your cart is empty', 'カートは空です', '장바구니가 비어 있습니다'),
    removeUnavailable: pick('移除不可購買項目', 'Remove unavailable items', '購入不可の商品を削除', '구매 불가 항목 삭제'),
    backToShop: pick('回到商店', 'Back to Shop', 'ショップへ戻る', '상점으로 돌아가기'),
    orderSummary: pick('訂單摘要', 'Order Summary', '注文概要', '주문 요약'),
    subtotal: pick('小計', 'Subtotal', '小計', '소계'),
    loginBeforeCheckout: pick('已有會員帳號？登入後可自動帶入資料；也可以直接以訪客身份結帳。', 'Have an account? Log in to prefill your details, or continue as a guest.', '会員の方はログインすると情報を自動入力できます。ゲスト購入も可能です。', '회원은 로그인하면 정보를 자동 입력할 수 있습니다. 게스트 구매도 가능합니다.'),
    placeOrder: pick('送出訂單', 'Place Order', '注文を送信', '주문하기'),
    checkoutFailed: pick('結帳失敗，請稍後再試。', 'Checkout failed. Please try again later.', 'チェックアウトに失敗しました。後でもう一度お試しください。', '결제에 실패했습니다. 잠시 후 다시 시도해 주세요.'),
    unavailableCount: (count: number) => pick(`有 ${count} 個項目無法購買。`, `${count} unavailable item(s) found.`, `${count} 件の商品が購入できません。`, `구매할 수 없는 항목이 ${count}개 있습니다.`),
    pointsDesc: (points: number) => pick(`預估可得點數：${points}`, `Estimated points: ${points}`, `獲得見込みポイント：${points}`, `예상 적립 포인트: ${points}`),
    pointsOrderDesc: pick('購物金點數回饋', 'Shop purchase points reward', 'ショッピングポイント還元', '쇼핑 포인트 적립'),
    newebpayMethods: pick('藍新付款（信用卡 / WebATM / ATM轉帳 / 超商代碼）', 'NewebPay checkout (Credit Card / WebATM / ATM / CVS code)', '藍新決済（クレジットカード / WebATM / ATM振込 / コンビニ番号）', '나이스페이 결제 (신용카드 / WebATM / ATM 입금 / 편의점 코드)'),
    card: pick('信用卡', 'Credit card', 'クレジットカード', '신용카드'),
    webatm: pick('WebATM', 'WebATM', 'WebATM', 'WebATM'),
    atm: pick('ATM 轉帳', 'ATM transfer', 'ATM振込', 'ATM 이체'),
    cvs: pick('超商代碼', 'CVS code', 'コンビニ代碼', '편의점 코드'),
    pointsPayment: pick('點數全額支付', 'Pay with points', 'ポイント全額支払い', '포인트 전액 결제'),
    choosePayment: pick('擇一付款方式', 'Choose one payment method', '支払い方法を1つ選択', '결제 수단을 하나 선택'),
    shippingInfo: pick('收件資訊', 'Shipping information', '配送先情報', '배송 정보'),
    shippingName: pick('姓名', 'Name', '氏名', '이름'),
    shippingPhone: pick('電話', 'Phone', '電話番号', '전화'),
    shippingAddress: pick('地址', 'Address', '住所', '주소'),
    shippingHint: pick('請填寫姓名、電話與地址，系統會自動保存，下次購買可直接帶入。', 'Fill in your name, phone, and address. We will save them for next time.', '氏名・電話・住所を入力すると、次回の購入時に自動入力されます。', '이름, 전화번호, 주소를 입력하면 다음 구매 때 자동으로 불러옵니다.'),
    shippingRequired: pick('請先填寫姓名、電話與地址，才能成立訂單。', 'Please complete your name, phone, and address before placing the order.', '注文する前に氏名・電話・住所を入力してください。', '주문하려면 이름, 전화번호, 주소를 먼저 입력해 주세요.'),
    memberEmail: pick('會員 Email', 'Member email', '会員 Email', '회원 이메일'),
    pointsBenefit: pick('點數折抵', 'Points discount', 'ポイント割引', '포인트 할인'),
    pointsLookup: pick('輸入手機或 Email 後可查詢', 'Enter phone or email to check points', '電話番号またはメールでポイントを確認', '전화번호 또는 이메일로 포인트 확인'),
    pointsUse: (points: number) => pick(`可用 ${points.toLocaleString()} 點`, `${points.toLocaleString()} points available`, `${points.toLocaleString()}ポイント利用可能`, `${points.toLocaleString()} 포인트 사용 가능`),
    pointsConfirm: pick('確認使用點數', 'Confirm points', 'ポイントを確認', '포인트 사용 확인'),
    pointsOtp: pick('輸入 Email 驗證碼', 'Enter email verification code', 'メール認証コードを入力', '이메일 인증 코드 입력'),
    pointsSend: pick('發送驗證碼', 'Send verification code', '認証コードを送信', '인증 코드 보내기'),
    pointsVerify: pick('驗證並使用點數', 'Verify and use points', '認証してポイントを使用', '인증하고 포인트 사용'),
    pointsWaiting: pick('已找到會員，點數可用於本次訂單。', 'Member found. Points are available for this order.', '会員が見つかりました。ポイントを利用できます。', '회원을 찾았습니다. 포인트를 사용할 수 있습니다.'),
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
    if (profile) {
      setShippingName(profile.display_name || '');
      setShippingPhone(profile.phone || '');
      setShippingAddress(profile.shipping_address || '');
    }
  }, [profile]);

  useEffect(() => {
    setCustomerEmail(user?.email || '');
  }, [user]);

  useEffect(() => {
    const token = sessionStorage.getItem('nestobi_guest_checkout_token') || crypto.randomUUID();
    sessionStorage.setItem('nestobi_guest_checkout_token', token);
    setGuestCheckoutToken(token);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!guestPaymentHandled && !user && params.get('guestOrder') && params.get('paymentStatus') === 'paid') {
      setGuestPaymentHandled(true);
      void clearCart().then(() => setSuccess(true));
    }
  }, [user, clearCart, guestPaymentHandled]);

  const lookupPoints = async () => {
    if (!shippingPhone.trim() && !customerEmail.trim()) return;
    setPointLoading(true);
    setPointMessage(pick('查詢中，請稍候…', 'Loading points…', 'ポイントを確認中…', '포인트 조회 중…'));
    const functionName = user ? 'lookup-member-points' : 'guest-lookup-member-points';
    const { data, error } = await supabase.functions.invoke(functionName, { body: { phone: shippingPhone.trim(), email: customerEmail.trim().toLowerCase() } });
    setPointLoading(false);
    if (error || !data?.matched) {
      setAvailablePoints(0);
      setPointUsage(0);
      setPointMessage(t.pointsLookup);
      return;
    }
    setAvailablePoints(Number(data.availablePoints || 0));
    setMemberToken(String(data.memberToken || ''));
    setPointMessage(t.pointsWaiting);
  };

  const startPointRedemption = async () => {
    if (pointUsage <= 0 || pointUsage > Math.min(availablePoints, Math.floor(subtotal))) return;
    setPointLoading(true);
    setPointMessage('');
    const functionName = user ? 'create-points-redemption-session' : 'guest-create-points-redemption-session';
    const { data, error } = await supabase.functions.invoke(functionName, { body: { requestedPoints: pointUsage, channel: 'email', memberToken, guestCheckoutToken } });
    if (error || !data?.sessionId) {
      setPointLoading(false);
      setPointMessage('目前無法建立點數驗證，請稍後再試。');
      return;
    }
    setPointSessionId(data.sessionId);
    const otpFunctionName = user ? 'request-points-otp' : 'guest-request-points-otp';
    const otpResult = await supabase.functions.invoke(otpFunctionName, { body: { sessionId: data.sessionId, channel: 'email', memberToken, guestCheckoutToken } });
    setPointLoading(false);
    if (otpResult.error || !otpResult.data?.otpRequestId) {
      setPointMessage(otpResult.data?.error || '驗證碼發送失敗，請稍後再試。');
      return;
    }
    setPointOtpRequestId(otpResult.data.otpRequestId);
    setPointMessage(`驗證碼已寄送至 ${otpResult.data.maskedIdentifier || customerEmail}`);
  };

  const verifyPointRedemption = async () => {
    if (!pointOtpRequestId || pointOtp.trim().length !== 6) return;
    setPointLoading(true);
    const functionName = user ? 'verify-points-otp' : 'guest-verify-points-otp';
    const { data, error } = await supabase.functions.invoke(functionName, { body: { otpRequestId: pointOtpRequestId, otp: pointOtp.trim(), memberToken } });
    setPointLoading(false);
    if (error || !data?.success) {
      setPointMessage(data?.error || '驗證碼錯誤，請重新輸入。');
      return;
    }
    setPointUsage(Number(data.requestedPoints || pointUsage));
    const usedPoints = Number(data.requestedPoints || pointUsage);
    const discountAmount = Number(data.discountAmount || pointUsage);
    setPointMessage(`已使用 ${usedPoints.toLocaleString()} 點，折抵 NT$${discountAmount.toLocaleString()}。剩餘可用 ${Math.max(0, availablePoints - usedPoints).toLocaleString()} 點`);
    setPointModalOpen(false);
  };

  const validCartItems = cartItems.filter(hasProduct);
  const unavailableCartItems = cartItems.filter((item) => !item.products);
  const subtotal = validCartItems.reduce((sum, item) => sum + item.products.price * item.quantity, 0);
  const pointDiscount = Math.min(pointUsage, availablePoints, Math.floor(subtotal));
  const payableSubtotal = Math.max(0, subtotal - pointDiscount);
  const pointsEarned = Math.floor(payableSubtotal / 100) * 5;
  const invoiceReady = invoiceType === 'company' ? /^\d{8}$/.test(buyerIdentifier.trim()) : invoiceType === 'mobile_carrier' ? /^\/[A-Z0-9.+-]{7}$/.test(carrierNumber.trim()) : invoiceType === 'donation' ? /^\d{3,7}$/.test(loveCode.trim()) : true;
  const shippingReady = shippingName.trim().length > 0 && shippingPhone.trim().length > 0 && shippingAddress.trim().length > 0 && customerEmail.trim().length > 0 && invoiceReady && (shippingMethod !== 'cvs' || storeId.trim().length > 0);

  const handleRemoveUnavailableItems = async () => {
    if (checkoutLoading) return;
    await Promise.all(unavailableCartItems.map((item) => removeItem(item.id)));
    setCartItems((prev) => prev.filter(hasProduct));
  };

  const handleCheckout = async () => {
    if (checkoutLoading) return;
    if (validCartItems.length === 0) return;
    if (!shippingReady) {
      setCheckoutError(t.shippingRequired);
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError('');

    try {
      trackBeginCheckout({
        value: subtotal,
        items: validCartItems.map(item => ({
          item_id: item.product_id,
          item_name: item.products.name,
          price: item.products.price,
          quantity: item.quantity,
        })),
      });

      if (pointDiscount > 0 && !pointSessionId) {
        setCheckoutError('請先完成點數驗證。');
        setCheckoutLoading(false);
        return;
      }
      const checkoutInfo = { name: shippingName.trim(), phone: shippingPhone.trim(), address: shippingAddress.trim(), email: customerEmail.trim(), invoiceType, buyerIdentifier: buyerIdentifier.trim(), carrierType: invoiceType === 'mobile_carrier' ? 'mobile' as const : undefined, carrierNumber: carrierNumber.trim(), loveCode: loveCode.trim(), shippingMethod, logisticsType: shippingMethod === 'cvs' ? 'C2C' as const : undefined, shipType: shippingMethod === 'cvs' ? '1' as const : undefined, storeId: storeId.trim(), storeName: storeName.trim() };
      const checkout = user
        ? await createShopCheckout(pointDiscount, paymentChoice === 'POINTS' ? 'CREDIT' : paymentChoice, checkoutInfo)
        : await createGuestShopCheckout(pointDiscount, paymentChoice === 'POINTS' ? 'CREDIT' : paymentChoice, checkoutInfo, guestCheckoutToken, validCartItems.map(item => ({ productId: item.product_id, quantity: item.quantity })), pointDiscount > 0 ? pointSessionId : undefined);

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
        await clearCart();
        trackPurchase({
          transaction_id: checkout.orderId,
          value: payableSubtotal,
          items: validCartItems.map(item => ({
            item_id: item.product_id,
            item_name: item.products.name,
            price: item.products.price,
            quantity: item.quantity,
          })),
        });
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
      <div className="commerce-page">
        <Navigation />
        <div className="commerce-container max-w-xl py-20 text-center">
          <div className="commerce-card p-8 sm:p-12">
          <ShoppingBag className="mx-auto mb-4 h-14 w-14 text-gray-300" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">{t.loginTitle}</h1>
          <p className="mb-6 text-sm leading-6 text-gray-500">{t.loginDesc}</p>
          <button type="button" onClick={() => navigate('/auth/login')} className="commerce-primary-button">
            {t.loginNow}
          </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (success) {
    return (
      <div className="commerce-page">
        <Navigation />
        <div className="commerce-container max-w-xl py-20 text-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="commerce-card p-8 sm:p-12">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">{t.successTitle}</h1>
            <p className="mb-6 text-sm leading-6 text-gray-500">{t.successDesc}</p>
            <button type="button" onClick={() => navigate(user ? '/member/orders' : '/')} className="commerce-primary-button">
              {t.viewOrders}
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="commerce-page">
      <Navigation />
      <main className="commerce-container">
        <div className="commerce-card mb-8 overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(192,154,106,0.16),transparent_42%)] p-6 sm:p-8">
          <div>
            <p className="commerce-kicker">SECURE CHECKOUT</p>
            <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold text-[#2C1F10] sm:text-4xl">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0E4C8] text-[#8B6840]"><ShoppingBag className="h-6 w-6" /></span>
              {t.checkout}
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#C09A6A] border-t-transparent" />
          </div>
        ) : validCartItems.length === 0 ? (
          <div className="commerce-card px-4 py-24 text-center text-gray-400">
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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
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
                <motion.div key={item.id} layout className="commerce-card flex gap-4 p-4 sm:p-5">
                  <img src={item.products.image_url || 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=240'} alt={item.products.name} className="h-24 w-24 flex-shrink-0 rounded-2xl object-cover sm:h-28 sm:w-28" />
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

            <aside className="commerce-card h-fit p-5 lg:sticky lg:top-24 lg:p-6">
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
                <div className="mb-4 rounded-2xl border border-[#F0E4C8] bg-[#FEF9EC] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-bold text-gray-900">{t.shippingInfo}</div>
                    <span className="text-[11px] font-semibold text-[#8B6840]">{t.shippingHint}</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">{t.shippingName}</label>
                      <input
                        type="text"
                        value={shippingName}
                        onChange={e => setShippingName(e.target.value)}
                        placeholder={t.shippingName}
                        className="commerce-field"
                        disabled={checkoutLoading}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">{t.shippingPhone}</label>
                      <input
                        type="tel"
                        value={shippingPhone}
                        onChange={e => setShippingPhone(e.target.value)}
                        placeholder="09XX-XXX-XXX"
                        className="commerce-field"
                        disabled={checkoutLoading}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">Email</label>
                      <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="name@example.com" className="commerce-field" disabled={checkoutLoading} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">{t.shippingAddress}</label>
                      <textarea
                        value={shippingAddress}
                        onChange={e => setShippingAddress(e.target.value)}
                        placeholder={t.shippingAddress}
                        rows={3}
                        className="commerce-field resize-none"
                        disabled={checkoutLoading}
                      />
                    </div>
                    <div className="border-t border-[#E8D2A9] pt-3">
                      <label className="mb-1 block text-xs font-semibold text-gray-600">發票類型</label>
                      <select value={invoiceType} onChange={e => setInvoiceType(e.target.value as typeof invoiceType)} className="commerce-field" disabled={checkoutLoading}>
                        <option value="personal">個人電子發票</option><option value="company">公司發票（統一編號）</option><option value="mobile_carrier">手機載具</option><option value="donation">捐贈發票</option>
                      </select>
                      {invoiceType === 'company' && <input inputMode="numeric" maxLength={8} value={buyerIdentifier} onChange={e => setBuyerIdentifier(e.target.value.replace(/\D/g, ''))} placeholder="統一編號 8 碼" className="commerce-field mt-2" disabled={checkoutLoading} />}
                      {invoiceType === 'mobile_carrier' && <input value={carrierNumber} onChange={e => setCarrierNumber(e.target.value.toUpperCase())} placeholder="載具 /XXXXXXXX" className="commerce-field mt-2" disabled={checkoutLoading} />}
                      {invoiceType === 'donation' && <input inputMode="numeric" value={loveCode} onChange={e => setLoveCode(e.target.value.replace(/\D/g, ''))} placeholder="捐贈碼" className="commerce-field mt-2" disabled={checkoutLoading} />}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">配送方式</label>
                      <select value={shippingMethod} onChange={e => setShippingMethod(e.target.value as typeof shippingMethod)} className="commerce-field" disabled={checkoutLoading}>
                        <option value="home">宅配</option><option value="cvs">超商取貨</option>
                      </select>
                      {shippingMethod === 'cvs' && <><input value={storeId} onChange={e => setStoreId(e.target.value.trim())} placeholder="超商門市代號" className="commerce-field mt-2" disabled={checkoutLoading} /><input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="門市名稱（選填）" className="commerce-field mt-2" disabled={checkoutLoading} /></>}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{t.subtotal}</span>
                  <span className="text-[#C09A6A]">{formatCurrency(subtotal)}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
                  {([
                    { value: 'CREDIT' as const, label: t.card },
                    { value: 'WEBATM' as const, label: t.webatm },
                    { value: 'ATM' as const, label: t.atm },
                    { value: 'CVS' as const, label: t.cvs },
                    ...(pointDiscount >= subtotal && subtotal > 0 ? [{ value: 'POINTS' as const, label: t.pointsPayment }] : []),
                  ]).map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPaymentChoice(option.value)}
                      className={`rounded-xl border px-3 py-2.5 transition ${paymentChoice === option.value ? 'border-[#2C1F10] bg-[#2C1F10] text-white shadow-sm' : 'border-stone-200 text-stone-600 hover:border-[#C09A6A] hover:bg-[#FEF9EC]'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm text-gray-700">
                  <span>{t.choosePayment}</span>
                  <span>{pick('可用', 'Available', '利用可能', '사용 가능')} {availablePoints.toLocaleString()} NP</span>
                </div>
                <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="font-semibold text-stone-800">{t.pointsBenefit}</span>
                    <button type="button" onClick={lookupPoints} disabled={pointLoading} className="text-xs font-bold text-[#8B6840] underline disabled:opacity-50">{pointLoading ? pick('載入中…', 'Loading…', '読み込み中…', '로드 중…') : pick('查詢點數', 'Check points', 'ポイント確認', '포인트 확인')}</button>
                  </div>
                  <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} onBlur={() => void lookupPoints()} placeholder={t.memberEmail} className="commerce-field mb-2" disabled={checkoutLoading} />
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-stone-500">{availablePoints > 0 ? t.pointsUse(availablePoints) : t.pointsLookup}</span>
                    <button type="button" onClick={() => { setPointUsage(Math.min(availablePoints, Math.floor(subtotal))); setPointModalOpen(true); }} disabled={availablePoints <= 0 || subtotal <= 0} className="rounded-lg bg-[#2C1F10] px-3 py-2 text-xs font-bold text-white disabled:opacity-40">{pointDiscount > 0 ? `${pointDiscount} 點` : t.pointsBenefit}</button>
                  </div>
                  {pointUsage > 0 && pointSessionId && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold leading-6 text-emerald-800">
                      <div>本次折抵：{pointUsage.toLocaleString()} 點（NT${pointDiscount.toLocaleString()}）</div>
                      <div>剩餘可用餘額：{Math.max(0, availablePoints - pointUsage).toLocaleString()} 點</div>
                    </div>
                  )}
                  {pointMessage && <p className="mt-2 text-xs font-semibold text-[#8B6840]">{pointMessage}</p>}
                </div>
                <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 text-lg font-bold">
                  <span>{pick('Total', 'Total', 'Total', 'Total')}</span>
                  <span className="text-[#C09A6A]">{formatCurrency(payableSubtotal)}</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-[#8B6840]">{t.pointsDesc(pointsEarned)}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {pick('付款方式', 'Payment method', '支払い方法', '결제 수단')}: {paymentChoice === 'POINTS' ? t.pointsPayment : t.newebpayMethods}
                </p>
              </div>
              {checkoutError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">{checkoutError}</p>}
              {!user && <p className="mb-3 rounded-lg bg-[#FEF9EC] px-3 py-2 text-center text-sm font-semibold text-[#8B6840]">{t.loginBeforeCheckout} <button type="button" onClick={() => navigate('/auth/login?redirect=%2Fcart')} className="underline">登入快速帶入資料</button></p>}
              <button type="button" onClick={handleCheckout} disabled={checkoutLoading || validCartItems.length === 0 || !shippingReady} className="commerce-primary-button w-full">
                {checkoutLoading && <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {t.placeOrder}
              </button>
            </aside>
          </div>
        )}
      </main>
      <Footer />
      {pointModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-[#F7F5F1] shadow-2xl">
            <div className="flex items-center justify-between bg-[#2C1F10] px-6 py-5 text-white">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><Mail className="h-5 w-5" /></span><div><p className="text-xs tracking-[0.16em] text-[#E8D2A9]">NESTOBI MEMBER</p><h2 className="mt-1 text-lg font-bold">{t.pointsBenefit}</h2></div></div>
              <button type="button" onClick={() => setPointModalOpen(false)} className="text-2xl text-white/60 transition hover:text-white">×</button>
            </div>
            <div className="bg-white px-6 py-5">
              <div className="border-b border-dashed border-stone-200 pb-4 text-sm text-stone-500"><div className="flex justify-between gap-4"><span>寄件人</span><strong className="text-stone-700">Nestobi 會員服務</strong></div><div className="mt-2 flex justify-between gap-4"><span>收件人</span><strong className="max-w-[220px] truncate text-stone-700">{customerEmail || '會員 Email'}</strong></div><div className="mt-2 flex justify-between gap-4"><span>主旨</span><strong className="text-stone-700">點數折抵驗證碼</strong></div></div>
              {!pointOtpRequestId ? <><p className="mt-5 text-sm leading-6 text-stone-600">請選擇本次要折抵的點數，我們會將 6 位數驗證碼寄到會員信箱。</p><div className="mt-4 grid grid-cols-4 gap-2">{[100, 300, 500, Math.min(availablePoints, Math.floor(subtotal))].filter((value, index, values) => value > 0 && values.indexOf(value) === index).map(value => <button key={value} type="button" onClick={() => setPointUsage(value)} className={`rounded-xl border px-2 py-3 text-sm font-bold ${pointUsage === value ? 'border-[#2C1F10] bg-[#2C1F10] text-white' : 'border-stone-200'}`}>{value === Math.min(availablePoints, Math.floor(subtotal)) ? pick('全部', 'All', 'すべて', '전체') : value}</button>)}</div><input type="number" min="1" max={Math.min(availablePoints, Math.floor(subtotal))} value={pointUsage || ''} onChange={e => setPointUsage(Math.min(Math.max(0, Number(e.target.value)), Math.min(availablePoints, Math.floor(subtotal))))} className="commerce-field mt-3" /><p className="my-4 text-center text-lg font-bold text-[#8B6840]">折抵 NT${pointUsage.toLocaleString()}</p><button type="button" onClick={() => void startPointRedemption()} disabled={pointLoading || pointUsage <= 0} className="commerce-primary-button w-full">{pointLoading ? '載入中…' : t.pointsSend}</button></> : <><div className="mt-5 rounded-2xl bg-[#FEF9EC] p-4 text-center"><p className="text-sm font-semibold text-stone-600">驗證碼已寄出</p><p className="mt-1 text-xs text-stone-500">請查看信件並輸入驗證碼</p></div><label className="mb-2 mt-5 block text-sm font-semibold text-stone-700">{t.pointsOtp}</label><input inputMode="numeric" maxLength={6} value={pointOtp} onChange={e => setPointOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="commerce-field mb-3 text-center text-xl tracking-[0.5em]" /><button type="button" onClick={() => void verifyPointRedemption()} disabled={pointLoading || pointOtp.length !== 6} className="commerce-primary-button w-full">{pointLoading ? '載入中…' : t.pointsVerify}</button></>}
              <p className="mt-4 text-center text-xs text-stone-400">驗證碼 5 分鐘內有效，請勿提供給他人。</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

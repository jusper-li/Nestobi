import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookMarked,
  Calendar,
  Check,
  ChevronDown,
  Coffee,
  Globe,
  History,
  Home,
  Hotel,
  Languages,
  LayoutDashboard,
  LogOut,
  Map,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Star,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../lib/i18n';

type UiLang = 'zh-TW' | 'en' | 'ja' | 'ko';

export default function Navigation() {
  const { user, profile, role, signOut } = useAuth();
  const { totalItems } = useCart();
  const { lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const locale = normalizeLang(lang) as UiLang;
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);

  const labels = useMemo(() => ({
    home: pick('首頁', 'Home', 'ホーム', '홈'),
    cart: pick('購物車', 'Cart', 'カート', '장바구니'),
    stores: pick('門市', 'Stores', '店舗', '매장'),
    rooms: pick('nestobi', 'nestobi', 'nestobi', 'nestobi'),
    shop: pick('根本在旅行', 'Genbon Travel Shop', '根本在旅行', '근본재여행'),
    blog: pick('咖啡旅行家', 'Coffee Traveler', 'コーヒートラベラー', '커피 트래블러'),
    aiItinerary: pick('AI 行程規劃', 'AI Planner', 'AI 旅程プランナー', 'AI 일정 플래너'),
    aiTranslator: pick('AI 翻譯', 'AI Translate', 'AI 翻訳', 'AI 번역'),
    aiChat: pick('AI 客服', 'AI Support', 'AI サポート', 'AI 고객지원'),
    aiCoffeeQuiz: pick('AI 咖啡測驗', 'AI Coffee Quiz', 'AIコーヒー診断', 'AI 커피 퀴즈'),
    travelPassport: pick('旅行護照', 'Travel Passport', '旅のパスポート', '여행 패스포트'),
    login: pick('登入', 'Login', 'ログイン', '로그인'),
    register: pick('註冊', 'Sign up', '登録', '가입'),
    member: pick('會員', 'Member', '会員', '회원'),
    memberCenter: pick('會員中心', 'Member Center', '会員センター', '회원 센터'),
    myBookings: pick('nestobi 訂房', 'nestobi Bookings', 'nestobi 予約', 'nestobi 예약'),
    myOrders: pick('根本在旅行訂單', 'Shop Orders', '根本在旅行の注文', '근본재여행 주문'),
    myPurchases: pick('消費紀錄', 'Consumption Records', '利用履歴', '소비 내역'),
    myPoints: pick('我的點數', 'My Points', 'ポイント', '내 포인트'),
    profile: pick('個人資料', 'Profile', 'プロフィール', '프로필'),
    preferences: pick('偏好設定', 'Preferences', '設定', '환경설정'),
    adminPanel: pick('後台管理', 'Admin', '管理画面', '관리자'),
    superAdmin: pick('超級管理員', 'Super Admin', 'スーパー管理者', '슈퍼 관리자'),
    logout: pick('登出', 'Logout', 'ログアウト', '로그아웃'),
    closeMenu: pick('關閉選單', 'Close menu', 'メニューを閉じる', '메뉴 닫기'),
    language: pick('語言', 'Language', '言語', '언어'),
  }), [locale]);

  const languageOptions = useMemo(
    () => [
      { code: 'zh-TW' as const, label: pick('繁體中文', 'Traditional Chinese', '繁体字中国語', '번체 중국어'), short: 'TW' },
      { code: 'en' as const, label: pick('英文', 'English', '英語', '영어'), short: 'EN' },
      { code: 'ja' as const, label: pick('日文', 'Japanese', '日本語', '일본어'), short: 'JP' },
      { code: 'ko' as const, label: pick('韓文', 'Korean', '韓国語', '한국어'), short: 'KR' },
    ],
    [locale],
  );

  const currentLangOption = languageOptions.find(option => option.code === locale) || languageOptions[0];
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);
  const brand = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/shop') || path.startsWith('/stores') || path.startsWith('/genbon-travel')) {
      return {
        to: '/shop',
        alt: pick('根本在旅行', 'Genbon Travel', '根本在旅行', '근본재여행'),
        image: '/genbon-travel-logo.png',
        className: 'h-8 w-auto md:h-10',
      };
    }
    if (path.startsWith('/blog') || path.startsWith('/coffee-traveler')) {
      return {
        to: '/blog',
        alt: pick('咖啡旅行家', 'Coffee Traveler', 'Coffee Traveler', 'Coffee Traveler'),
        image: '',
        className: '',
      };
    }
    return {
      to: '/rooms',
      alt: pick('nestobi', 'nestobi', 'nestobi', 'nestobi'),
      image: '/20260407_nestobi_logo.svg',
      className: 'h-10 w-auto md:h-12',
    };
  }, [location.pathname, locale]);

  const navLinks = [
    { to: '/rooms', label: labels.rooms, icon: Hotel },
    { to: '/shop', label: labels.shop, icon: Package },
    { to: '/blog', label: labels.blog, icon: Coffee },
    { to: '/stores', label: labels.stores, icon: MapPin },
    { to: '/ai/itinerary', label: labels.aiItinerary, icon: Map, requiresAuth: true },
    { to: '/ai/translator', label: labels.aiTranslator, icon: Languages, requiresAuth: true },
    { to: '/ai/chat', label: labels.aiChat, icon: MessageCircle, requiresAuth: true },
    { to: '/ai/coffee-quiz', label: labels.aiCoffeeQuiz, icon: Coffee, requiresAuth: true },
    { to: '/ai/passport', label: labels.travelPassport, icon: BookMarked, requiresAuth: true },
  ];

  const memberLinks = [
    { to: '/member', label: labels.memberCenter, icon: LayoutDashboard },
    { to: '/member/bookings', label: labels.myBookings, icon: Calendar },
    { to: '/member/orders', label: labels.myOrders, icon: History },
    { to: '/member/purchases', label: labels.myPurchases, icon: Receipt },
    { to: '/member/points', label: labels.myPoints, icon: Star },
    { to: '/ai/passport', label: labels.travelPassport, icon: BookMarked },
    { to: '/member/profile', label: labels.profile, icon: User },
    { to: '/member/preferences', label: labels.preferences, icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[#2C1F10]/10 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link to={brand.to} className="flex min-w-0 items-center gap-3">
            {brand.image ? (
              <img src={brand.image} alt={brand.alt} className={brand.className} />
            ) : (
              <span className="font-serif text-lg font-bold tracking-wide text-[#2C1F10] md:text-xl">{brand.alt}</span>
            )}
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ to, label, icon: Icon, requiresAuth }) => {
              if (requiresAuth && !user) return null;
              return (
                <Link
                  key={to}
                  to={to}
                  aria-label={label}
                  title={label}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition ${
                    isActive(to) ? 'bg-[#F0E4C8] text-[#2C1F10]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={18} />
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setLangMenuOpen(open => !open);
                  setUserMenuOpen(false);
                }}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
              >
                <Globe size={16} />
                <span className="hidden sm:block">{currentLangOption.short}</span>
                <ChevronDown size={13} />
              </button>
              <AnimatePresence>
                {langMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl"
                  >
                    <p className="border-b border-gray-100 px-4 py-2 text-xs font-semibold text-gray-400">{labels.language}</p>
                    {languageOptions.map(option => (
                      <button
                        key={option.code}
                        type="button"
                        onClick={() => {
                          setLang(option.code);
                          setLangMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                      >
                        <span>{option.short} {option.label}</span>
                        {currentLangOption.code === option.code && <Check size={14} className="text-[#C09A6A]" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link to="/cart" className="relative rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-[#2C1F10]" aria-label={labels.cart}>
              <ShoppingCart size={21} />
              {totalItems > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">{totalItems > 9 ? '9+' : totalItems}</span>}
            </Link>

            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(open => !open);
                    setLangMenuOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 transition hover:bg-gray-100"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C09A6A] text-sm font-bold text-white">
                    {profile?.display_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                  <span className="hidden max-w-28 truncate sm:block">{profile?.display_name || user.email?.split('@')[0]}</span>
                  <ChevronDown size={14} />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl"
                    >
                      <div className="border-b border-gray-100 px-4 py-3">
                        <p className="truncate text-sm font-bold text-gray-900">{profile?.display_name || labels.member}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">{user.email}</p>
                      </div>
                      {memberLinks.map(({ to, label, icon: Icon }) => (
                        <Link key={to} to={to} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50">
                          <Icon size={15} className="text-gray-400" />
                          <span>{label}</span>
                        </Link>
                      ))}
                      {(role === 'admin' || role === 'superadmin') && (
                        <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 border-t border-gray-100 px-4 py-2 text-sm font-semibold text-[#2C1F10] transition hover:bg-[#F0E4C8]">
                          <LayoutDashboard size={15} />
                          <span>{labels.adminPanel}</span>
                        </Link>
                      )}
                      {role === 'superadmin' && (
                        <Link to="/superadmin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-[#2C1F10] transition hover:bg-[#F0E4C8]">
                          <Globe size={15} />
                          <span>{labels.superAdmin}</span>
                        </Link>
                      )}
                      <button type="button" onClick={handleSignOut} className="flex w-full items-center gap-2.5 border-t border-gray-100 px-4 py-2 text-left text-sm text-danger transition hover:bg-red-50">
                        <LogOut size={15} />
                        <span>{labels.logout}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link to="/auth/login" className="px-3 py-2 text-sm font-semibold text-gray-700 transition hover:text-[#2C1F10]">
                  {labels.login}
                </Link>
                <Link to="/auth/register" className="rounded-lg bg-[#C09A6A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8B6840]">
                  {labels.register}
                </Link>
              </div>
            )}

            <button type="button" onClick={() => setMenuOpen(open => !open)} className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-gray-200 bg-white">
            <div className="mx-auto max-w-7xl space-y-1 px-4 py-3 sm:px-6 lg:px-8">
              <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
                <Home size={16} />
                <span>{labels.home}</span>
              </Link>
              <Link to="/cart" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
                <ShoppingCart size={16} />
                <span>{labels.cart}</span>
                {totalItems > 0 && <span className="ml-auto rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-white">{totalItems > 9 ? '9+' : totalItems}</span>}
              </Link>
              {navLinks.map(({ to, label, icon: Icon, requiresAuth }) => {
                if (requiresAuth && !user) return null;
                return (
                  <Link key={to} to={to} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
                    <Icon size={16} />
                    <span>{label}</span>
                  </Link>
                );
              })}
              {!user && (
                <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                  <Link to="/auth/login" onClick={() => setMenuOpen(false)} className="rounded-lg border border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-700">
                    {labels.login}
                  </Link>
                  <Link to="/auth/register" onClick={() => setMenuOpen(false)} className="rounded-lg bg-[#C09A6A] px-3 py-2 text-center text-sm font-semibold text-white">
                    {labels.register}
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(userMenuOpen || langMenuOpen) && (
        <button
          type="button"
          aria-label={labels.closeMenu}
          className="fixed inset-0 z-40 cursor-default"
          onClick={() => {
            setUserMenuOpen(false);
            setLangMenuOpen(false);
          }}
        />
      )}
    </nav>
  );
}

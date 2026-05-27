import { useState } from 'react';
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
import { LANG_OPTIONS, type Lang } from '../i18n/translations';

const NAV_I18N = {
  'zh-TW': {
    home: '首頁',
    cart: '購物車',
    stores: '門市據點',
    rooms: '住宿',
    shop: '選物商店',
    blog: '咖啡旅誌',
    aiItinerary: 'AI 行程規劃',
    aiTranslator: 'AI 即時翻譯',
    aiChat: 'AI 客服',
    travelPassport: '旅人護照',
    login: '登入',
    register: '註冊',
    member: '會員',
    memberCenter: '會員中心',
    myBookings: '我的訂房',
    myOrders: '我的訂單',
    myPurchases: '購買紀錄',
    myPoints: '我的點數',
    profile: '個人資料',
    settings: '偏好設定',
    adminPanel: '管理後台',
    superAdmin: '超級管理',
    logout: '登出',
    closeMenu: '關閉選單',
  },
  en: {
    home: 'Home',
    cart: 'Cart',
    stores: 'Store Locations',
    rooms: 'Stays',
    shop: 'Shop',
    blog: 'Coffee Journal',
    aiItinerary: 'AI Planner',
    aiTranslator: 'AI Translate',
    aiChat: 'AI Support',
    travelPassport: 'Travel Passport',
    login: 'Login',
    register: 'Sign up',
    member: 'Member',
    memberCenter: 'Member Center',
    myBookings: 'My Bookings',
    myOrders: 'My Orders',
    myPurchases: 'Purchase History',
    myPoints: 'My Points',
    profile: 'Profile',
    settings: 'Preferences',
    adminPanel: 'Admin',
    superAdmin: 'Super Admin',
    logout: 'Logout',
    closeMenu: 'Close menu',
  },
  ja: {
    home: 'ホーム',
    cart: 'カート',
    stores: '店舗案内',
    rooms: '宿泊',
    shop: 'ショップ',
    blog: 'コーヒージャーナル',
    aiItinerary: 'AI 旅程プランナー',
    aiTranslator: 'AI 翻訳',
    aiChat: 'AI サポート',
    travelPassport: 'トラベルパスポート',
    login: 'ログイン',
    register: '新規登録',
    member: '会員',
    memberCenter: '会員センター',
    myBookings: '予約一覧',
    myOrders: '注文一覧',
    myPurchases: '購入履歴',
    myPoints: 'ポイント',
    profile: 'プロフィール',
    settings: '設定',
    adminPanel: '管理画面',
    superAdmin: 'スーパー管理',
    logout: 'ログアウト',
    closeMenu: 'メニューを閉じる',
  },
  ko: {
    home: '홈',
    cart: '장바구니',
    stores: '매장 안내',
    rooms: '숙소',
    shop: '샵',
    blog: '커피 저널',
    aiItinerary: 'AI 일정 플래너',
    aiTranslator: 'AI 번역',
    aiChat: 'AI 지원',
    travelPassport: '트래블 패스포트',
    login: '로그인',
    register: '회원가입',
    member: '회원',
    memberCenter: '회원센터',
    myBookings: '예약 내역',
    myOrders: '주문 내역',
    myPurchases: '구매 내역',
    myPoints: '포인트',
    profile: '프로필',
    settings: '설정',
    adminPanel: '관리자',
    superAdmin: '슈퍼 관리자',
    logout: '로그아웃',
    closeMenu: '메뉴 닫기',
  },
} as const;

export default function Navigation() {
  const { user, profile, role, signOut } = useAuth();
  const { totalItems } = useCart();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const labels = NAV_I18N[lang];
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
    navigate('/');
  };

  const navLinks = [
    { to: '/rooms', label: labels.rooms, icon: Hotel },
    { to: '/shop', label: labels.shop, icon: Package },
    { to: '/blog', label: labels.blog, icon: Coffee },
    { to: '/stores', label: labels.stores, icon: MapPin },
    { to: '/ai/itinerary', label: labels.aiItinerary, icon: Map, requiresAuth: true },
    { to: '/ai/translator', label: labels.aiTranslator, icon: Languages, requiresAuth: true },
    { to: '/ai/chat', label: labels.aiChat, icon: MessageCircle, requiresAuth: true },
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
    { to: '/member/preferences', label: labels.settings, icon: Settings },
  ];

  const currentLangOption = LANG_OPTIONS.find(option => option.code === lang);

  return (
    <nav className="sticky top-0 z-50 border-b border-[#2C1F10]/10 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3">
            <img src="/20260407_nestobi_logo.svg" alt="Nestobi" className="h-10 w-auto md:h-12" />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ to, label, icon: Icon, requiresAuth }) => {
              if (requiresAuth && !user) return null;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive(to) ? 'bg-[#F0E4C8] text-[#2C1F10]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={15} />
                  <span>{label}</span>
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
                <span className="hidden sm:block">{currentLangOption?.flag}</span>
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
                    <p className="border-b border-gray-100 px-4 py-2 text-xs font-semibold text-gray-400">{t.common.language}</p>
                    {LANG_OPTIONS.map(option => (
                      <button
                        key={option.code}
                        type="button"
                        onClick={() => {
                          setLang(option.code as Lang);
                          setLangMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                      >
                        <span>{option.flag} {option.label}</span>
                        {lang === option.code && <Check size={14} className="text-[#C09A6A]" />}
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

            <button type="button" onClick={() => setMenuOpen(open => !open)} className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 md:hidden">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-gray-200 bg-white md:hidden">
            <div className="space-y-1 px-4 py-3">
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


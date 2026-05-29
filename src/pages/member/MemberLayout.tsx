import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BedDouble, Home, LogOut, Menu, Receipt, Settings, ShoppingBag, Star, User, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang } from '../../lib/i18n';
import Navigation from '../../components/Navigation';

type UiLang = 'zh-TW' | 'en' | 'ja' | 'ko';

const copy: Record<
  UiLang,
  {
    center: string;
    profile: string;
    bookings: string;
    orders: string;
    purchases: string;
    points: string;
    preferences: string;
    signOut: string;
    member: string;
  }
> = {
  'zh-TW': {
    center: '會員中心',
    profile: '個人資料',
    bookings: '我的訂房',
    orders: '我的訂單',
    purchases: '購買紀錄',
    points: '我的點數',
    preferences: '偏好設定',
    signOut: '登出',
    member: '會員',
  },
  en: {
    center: 'Member Center',
    profile: 'Profile',
    bookings: 'My Bookings',
    orders: 'My Orders',
    purchases: 'Purchase History',
    points: 'My Points',
    preferences: 'Preferences',
    signOut: 'Logout',
    member: 'Member',
  },
  ja: {
    center: '会員センター',
    profile: 'プロフィール',
    bookings: '予約',
    orders: '注文',
    purchases: '購入履歴',
    points: 'ポイント',
    preferences: '設定',
    signOut: 'ログアウト',
    member: '会員',
  },
  ko: {
    center: '회원 센터',
    profile: '프로필',
    bookings: '내 예약',
    orders: '내 주문',
    purchases: '구매 내역',
    points: '포인트',
    preferences: '환경 설정',
    signOut: '로그아웃',
    member: '회원',
  },
};

export default function MemberLayout() {
  const { user, profile, signOut } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang) as UiLang;
  const t = copy[locale];
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const navLinks = [
    { to: '/member', icon: <Home className="h-5 w-5" />, label: t.center, end: true },
    { to: '/member/profile', icon: <User className="h-5 w-5" />, label: t.profile },
    { to: '/member/bookings', icon: <BedDouble className="h-5 w-5" />, label: t.bookings },
    { to: '/member/orders', icon: <ShoppingBag className="h-5 w-5" />, label: t.orders },
    { to: '/member/purchases', icon: <Receipt className="h-5 w-5" />, label: t.purchases },
    { to: '/member/points', icon: <Star className="h-5 w-5" />, label: t.points },
    { to: '/member/preferences', icon: <Settings className="h-5 w-5" />, label: t.preferences },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const Sidebar = () => (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-100 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C09A6A] text-lg font-bold text-white">
            {profile?.display_name?.[0] || user?.email?.[0] || 'U'}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{profile?.display_name || t.member}</p>
            <p className="truncate text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-[#C09A6A] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-gray-100 p-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" />
          {t.signOut}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6 md:flex-row md:gap-6">
        <div className="mb-1 flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm md:hidden">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-gray-700 hover:bg-gray-100"
            aria-label="Toggle member menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <h1 className="text-base font-semibold text-gray-900">{t.center}</h1>
          <div className="w-8" />
        </div>
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 z-50 h-full w-72 bg-white shadow-xl">
              <Sidebar />
            </div>
          </div>
        )}
        <aside className="sticky top-24 hidden h-fit w-64 flex-shrink-0 rounded-2xl border border-gray-100 bg-white shadow-sm md:block">
          <Sidebar />
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


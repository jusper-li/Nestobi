import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BedDouble, Home, LogOut, Menu, Receipt, Settings, ShoppingBag, Star, User, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import Navigation from '../../components/Navigation';

export default function MemberLayout() {
  const { user, profile, signOut } = useAuth();
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const t = {
    center: isEn ? 'Member Center' : '會員中心',
    profile: isEn ? 'Profile' : '個人資料',
    bookings: isEn ? 'My Bookings' : '我的訂房',
    orders: isEn ? 'My Orders' : '我的訂單',
    purchases: isEn ? 'Purchase History' : '購買紀錄',
    points: isEn ? 'My Points' : '我的點數',
    preferences: isEn ? 'Preferences' : '偏好設定',
    signOut: isEn ? 'Logout' : '登出',
    member: isEn ? 'Member' : '會員',
  };

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
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <div className="mb-4 flex items-center gap-3 md:hidden">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <h1 className="font-semibold text-gray-900">{t.center}</h1>
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

import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BedDouble, Package, ShoppingBag, User, LogOut, Menu, Store, ClipboardList, Users, Home, Hotel, FileText, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';

const VendorLayout: React.FC = () => {
  const { user, signOut } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const t = {
    section: pick('廠商管理', 'Vendor Portal', 'ベンダーポータル', '업체 포털'),
    mobileTitle: pick('廠商管理', 'Vendor Admin', 'ベンダー管理', '업체 관리'),
    home: pick('回首頁', 'Home', 'ホーム', '홈'),
    signOut: pick('登出', 'Logout', 'ログアウト', '로그아웃'),
  };
  const navLinks = [
    { to: '/vendor/engagement', icon: <MessageSquare className="w-5 h-5" />, label: pick('連動管理', 'Engagement', '連携管理', '연동 관리') },
    { to: '/vendor', icon: <LayoutDashboard className="w-5 h-5" />, label: pick('總覽', 'Dashboard', 'ダッシュボード', '대시보드'), end: true },
    { to: '/vendor/hotels', icon: <Hotel className="w-5 h-5" />, label: pick('nestopi 民宿', 'nestopi Hotels', 'nestopi 民宿', 'nestopi 숙소') },
    { to: '/vendor/rooms', icon: <BedDouble className="w-5 h-5" />, label: pick('nestopi 房型', 'nestopi Rooms', 'nestopi 部屋', 'nestopi 객실') },
    { to: '/vendor/housekeeping', icon: <ClipboardList className="w-5 h-5" />, label: pick('nestopi 房務', 'nestopi Housekeeping', 'nestopi 清掃管理', 'nestopi 객실 관리') },
    { to: '/vendor/staff', icon: <Users className="w-5 h-5" />, label: pick('團隊成員', 'Staff', 'スタッフ', '직원') },
    { to: '/vendor/products', icon: <Package className="w-5 h-5" />, label: pick('根本在旅行商品', 'Genbon Products', '根本在旅行の商品', '근본재여행 상품') },
    { to: '/vendor/orders', icon: <ShoppingBag className="w-5 h-5" />, label: pick('商品訂單與訂房', 'Orders & Bookings', '注文と予約', '주문 및 예약') },
    { to: '/vendor/blog', icon: <FileText className="w-5 h-5" />, label: pick('咖啡旅行家文章', 'Coffee Traveler Articles', 'コーヒートラベラー記事', '커피 트래블러 글') },
    { to: '/vendor/profile', icon: <User className="w-5 h-5" />, label: pick('廠商資料', 'Vendor Profile', 'ベンダー情報', '업체 정보') },
  ];

  const handleSignOut = async () => { await signOut(); navigate('/auth/login'); };

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-emerald-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-400 rounded-xl flex items-center justify-center">
            <Store className="w-6 h-6 text-emerald-900" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">{t.section}</p>
            <span className="text-xs bg-emerald-400 text-emerald-900 px-1.5 py-0.5 rounded font-bold">VENDOR</span>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navLinks.map(link => (
          <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${isActive ? 'bg-emerald-500 text-white' : 'text-emerald-200 hover:text-white hover:bg-emerald-700'}`}>
            {link.icon}{link.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-emerald-800 space-y-1">
        <p className="text-emerald-300 text-xs px-3 mb-2 truncate">{user?.email}</p>
        <NavLink to="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-emerald-200 hover:text-white hover:bg-emerald-700 w-full transition">
          <Home className="w-5 h-5" />{t.home}
        </NavLink>
        <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-emerald-800 w-full transition">
          <LogOut className="w-5 h-5" />{t.signOut}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="hidden md:block w-64 bg-emerald-900 h-screen sticky top-0 flex-shrink-0">
        <Sidebar />
      </aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-emerald-900 z-50"><Sidebar /></div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-emerald-900 px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-emerald-800 rounded-lg">
            <Menu className="w-5 h-5 text-white" />
          </button>
          <span className="font-semibold text-white">{t.mobileTitle}</span>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default VendorLayout;

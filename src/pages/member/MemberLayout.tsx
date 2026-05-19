import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, User, BedDouble, ShoppingBag, Receipt, Star, Settings, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Navigation from '../../components/Navigation';

const navLinks = [
  { to: '/member', icon: <Home className="w-5 h-5" />, label: '會員中心', end: true },
  { to: '/member/profile', icon: <User className="w-5 h-5" />, label: '個人資料' },
  { to: '/member/bookings', icon: <BedDouble className="w-5 h-5" />, label: '我的訂房' },
  { to: '/member/orders', icon: <ShoppingBag className="w-5 h-5" />, label: '我的訂單' },
  { to: '/member/purchases', icon: <Receipt className="w-5 h-5" />, label: '購買紀錄' },
  { to: '/member/points', icon: <Star className="w-5 h-5" />, label: '我的點數' },
  { to: '/member/preferences', icon: <Settings className="w-5 h-5" />, label: '設定' },
];

const MemberLayout: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => { await signOut(); navigate('/auth/login'); };

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#C09A6A] rounded-full flex items-center justify-center text-white font-bold text-lg">
            {profile?.display_name?.[0] || user?.email?.[0] || 'U'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{profile?.display_name || '會員'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navLinks.map(link => (
          <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${isActive ? 'bg-[#C09A6A] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
            {link.icon}{link.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 w-full transition">
          <LogOut className="w-5 h-5" />登出
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 mb-4 md:hidden">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="font-semibold text-gray-900">會員中心</h1>
        </div>
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl z-50"><Sidebar /></div>
          </div>
        )}
        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden md:block w-64 bg-white rounded-2xl shadow-sm border border-gray-100 h-fit sticky top-24 flex-shrink-0">
            <Sidebar />
          </aside>
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default MemberLayout;

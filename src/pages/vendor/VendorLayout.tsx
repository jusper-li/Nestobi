import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BedDouble, Package, ShoppingBag, User, LogOut, Menu, Store, ClipboardList, Users, Home, Hotel, FileText, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navLinks = [
  { to: '/vendor/engagement', icon: <MessageSquare className="w-5 h-5" />, label: '互動管理' },
  { to: '/vendor', icon: <LayoutDashboard className="w-5 h-5" />, label: '儀表板', end: true },
  { to: '/vendor/hotels', icon: <Hotel className="w-5 h-5" />, label: '飯店管理' },
  { to: '/vendor/rooms', icon: <BedDouble className="w-5 h-5" />, label: '房間管理' },
  { to: '/vendor/housekeeping', icon: <ClipboardList className="w-5 h-5" />, label: '房務管理' },
  { to: '/vendor/staff', icon: <Users className="w-5 h-5" />, label: '管理人員' },
  { to: '/vendor/products', icon: <Package className="w-5 h-5" />, label: '商品管理' },
  { to: '/vendor/orders', icon: <ShoppingBag className="w-5 h-5" />, label: '訂單與訂房' },
  { to: '/vendor/blog', icon: <FileText className="w-5 h-5" />, label: '文章管理' },
  { to: '/vendor/profile', icon: <User className="w-5 h-5" />, label: '廠商資料' },
];

const VendorLayout: React.FC = () => {
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => { await signOut(); navigate('/auth/login'); };

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-emerald-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-400 rounded-xl flex items-center justify-center">
            <Store className="w-6 h-6 text-emerald-900" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">廠商專區</p>
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
          <Home className="w-5 h-5" />回首頁
        </NavLink>
        <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-emerald-800 w-full transition">
          <LogOut className="w-5 h-5" />登出
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
          <span className="font-semibold text-white">廠商後台</span>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default VendorLayout;

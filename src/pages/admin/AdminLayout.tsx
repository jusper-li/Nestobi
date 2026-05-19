import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, BedDouble, Package, Building, Users, BarChart2, LogOut, Menu, Plane, FileText, Coffee } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavLinkDef {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
  permission?: string;
}

const ALL_NAV_LINKS: NavLinkDef[] = [
  { to: '/admin', icon: <LayoutDashboard className="w-5 h-5" />, label: '儀表板', end: true },
  { to: '/admin/orders', icon: <ShoppingBag className="w-5 h-5" />, label: '訂單管理', permission: 'manage_orders' },
  { to: '/admin/rooms', icon: <BedDouble className="w-5 h-5" />, label: '房間管理', permission: 'manage_rooms' },
  { to: '/admin/products', icon: <Package className="w-5 h-5" />, label: '商品管理', permission: 'manage_products' },
  { to: '/admin/vendors', icon: <Building className="w-5 h-5" />, label: '廠商管理', permission: 'manage_vendors' },
  { to: '/admin/users', icon: <Users className="w-5 h-5" />, label: '用戶管理', permission: 'manage_users' },
  { to: '/admin/blog', icon: <Coffee className="w-5 h-5" />, label: '咖啡旅行家', permission: 'manage_blog' },
  { to: '/admin/ai-analytics', icon: <BarChart2 className="w-5 h-5" />, label: 'AI 用量', permission: 'view_ai' },
  { to: '/admin/static-pages', icon: <FileText className="w-5 h-5" />, label: '靜態頁面', permission: 'manage_static_pages' },
];

const AdminLayout: React.FC = () => {
  const { user, role, signOut, hasPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const visibleLinks = ALL_NAV_LINKS.filter(link =>
    !link.permission || hasPermission(link.permission)
  );

  const handleSignOut = async () => { await signOut(); navigate('/auth/login'); };

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#C09A6A] rounded-xl flex items-center justify-center"><Plane className="w-5 h-5 text-white" /></div>
          <div>
            <p className="font-bold text-white text-sm">旅遊平台</p>
            <span className="text-xs bg-[#C09A6A] text-white px-1.5 py-0.5 rounded font-medium">{role === 'superadmin' ? 'SUPER ADMIN' : 'ADMIN'}</span>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleLinks.map(link => (
          <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${isActive ? 'bg-[#C09A6A] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
            {link.icon}{link.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-800">
        <p className="text-gray-500 text-xs px-3 mb-2 truncate">{user?.email}</p>
        <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-gray-700 w-full transition">
          <LogOut className="w-5 h-5" />登出
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="hidden md:block w-60 bg-gray-900 h-screen sticky top-0 flex-shrink-0">
        <Sidebar />
      </aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-60 bg-gray-900 z-50"><Sidebar /></div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg"><Menu className="w-5 h-5" /></button>
          <span className="font-semibold text-gray-900">管理後台</span>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

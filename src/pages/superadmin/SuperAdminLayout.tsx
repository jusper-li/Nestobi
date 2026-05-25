import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart2,
  BedDouble,
  Brain,
  Coffee,
  Crown,
  FileText,
  FolderOpen,
  HelpCircle,
  Languages,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Package,
  Settings,
  Shield,
  ShoppingBag,
  Store,
  Tags,
  Terminal,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navLinks = [
  { to: '/superadmin', icon: <LayoutDashboard className="h-5 w-5" />, label: '總覽', end: true },
  { to: '/superadmin/products', icon: <ShoppingBag className="h-5 w-5" />, label: '商品管理' },
  { to: '/superadmin/product-categories', icon: <Tags className="h-5 w-5" />, label: '商品分類管理' },
  { to: '/superadmin/orders', icon: <Package className="h-5 w-5" />, label: '訂單管理' },
  { to: '/superadmin/vendors', icon: <Store className="h-5 w-5" />, label: '廠商管理' },
  { to: '/superadmin/rooms', icon: <BedDouble className="h-5 w-5" />, label: '房間管理' },
  { to: '/superadmin/room-translations', icon: <Languages className="h-5 w-5" />, label: '住宿翻譯管理' },
  { to: '/superadmin/store-locations', icon: <MapPin className="h-5 w-5" />, label: '門市據點' },
  { to: '/superadmin/blog', icon: <Coffee className="h-5 w-5" />, label: '咖啡旅誌' },
  { to: '/superadmin/coffee-quiz', icon: <Coffee className="h-5 w-5" />, label: '咖啡測驗管理' },
  { to: '/superadmin/blog-categories', icon: <FolderOpen className="h-5 w-5" />, label: '文章分類管理' },
  { to: '/superadmin/users', icon: <Users className="h-5 w-5" />, label: '會員管理' },
  { to: '/superadmin/revenue', icon: <BarChart2 className="h-5 w-5" />, label: '營收分析' },
  { to: '/superadmin/ai-analytics', icon: <Brain className="h-5 w-5" />, label: 'AI 使用分析' },
  { to: '/superadmin/chatbot', icon: <MessageSquare className="h-5 w-5" />, label: 'AI 客服設定' },
  { to: '/superadmin/static-pages', icon: <FileText className="h-5 w-5" />, label: '靜態頁管理' },
  { to: '/superadmin/permissions', icon: <Shield className="h-5 w-5" />, label: '權限管理' },
  { to: '/superadmin/faq', icon: <HelpCircle className="h-5 w-5" />, label: 'FAQ 管理' },
  { to: '/superadmin/site-settings', icon: <Settings className="h-5 w-5" />, label: '網站設定' },
  { to: '/superadmin/listing-command', icon: <Terminal className="h-5 w-5" />, label: 'AI 指令上架' },
];

const SuperAdminLayout: React.FC = () => {
  const { signOut, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const doSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const Sidebar = () => (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400">
            <Crown className="h-6 w-6 text-slate-900" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">超級管理後台</p>
            <span className="rounded bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-slate-900">SUPERADMIN</span>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-amber-500 text-slate-900' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-800 p-3">
        <p className="mb-2 truncate px-3 text-xs text-slate-400">{user?.email}</p>
        <button
          type="button"
          onClick={doSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 transition hover:bg-slate-700"
        >
          <LogOut className="h-5 w-5" />
          <span>登出</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 bg-slate-900 md:block">
        <Sidebar />
      </aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 z-50 h-full w-64 bg-slate-900">
            <Sidebar />
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 bg-slate-900 px-4 py-3 md:hidden">
          <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 hover:bg-slate-800">
            <Menu className="h-5 w-5 text-white" />
          </button>
          <span className="font-semibold text-white">超級管理後台</span>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;

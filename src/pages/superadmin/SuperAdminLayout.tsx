import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  BarChart2,
  BadgeCheck,
  BedDouble,
  Brain,
  ChevronDown,
  Coffee,
  Coins,
  Crown,
  FileText,
  FolderOpen,
  History,
  HelpCircle,
  Image,
  Languages,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Package,
  Settings,
  Server,
  Shield,
  ShoppingBag,
  Store,
  Tags,
  Terminal,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { APP_BUILD_LABEL, APP_COMMIT_LONG } from '../../lib/appVersion';
import { recordVersionBaseline } from '../../lib/auditLog';

type NavItem = {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
};

type NavSection = {
  id: string;
  title: string;
  items: NavItem[];
};

const SuperAdminLayout: React.FC = () => {
  const { signOut, user, role, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSectionIds, setOpenSectionIds] = useState<string[]>(['overview']);
  const navigate = useNavigate();
  const location = useLocation();

  const navSections: NavSection[] = useMemo(
    () => [
      {
        id: 'overview',
        title: '總覽與營運',
        items: [
          { to: '/superadmin', icon: <LayoutDashboard className="h-5 w-5" />, label: '總覽', end: true },
          { to: '/superadmin/engagement', icon: <MessageSquare className="h-5 w-5" />, label: '互動總覽' },
          { to: '/superadmin/revenue', icon: <BarChart2 className="h-5 w-5" />, label: '營收報表' },
        ],
      },
      {
        id: 'commerce',
        title: '商品與訂單',
        items: [
          { to: '/superadmin/products', icon: <ShoppingBag className="h-5 w-5" />, label: '商品管理' },
          { to: '/superadmin/product-categories', icon: <Tags className="h-5 w-5" />, label: '商品分類' },
          { to: '/superadmin/orders', icon: <Package className="h-5 w-5" />, label: '商店訂單' },
          { to: '/superadmin/vendors', icon: <Store className="h-5 w-5" />, label: '供應商管理' },
        ],
      },
      {
        id: 'stays',
        title: '住宿與門市',
        items: [
          { to: '/superadmin/rooms', icon: <BedDouble className="h-5 w-5" />, label: '住宿管理' },
          { to: '/superadmin/room-translations', icon: <Languages className="h-5 w-5" />, label: '住宿翻譯' },
          { to: '/superadmin/store-locations', icon: <MapPin className="h-5 w-5" />, label: '門市地點' },
        ],
      },
      {
        id: 'content',
        title: '內容與 AI',
        items: [
          { to: '/superadmin/blog', icon: <Coffee className="h-5 w-5" />, label: '部落格' },
          { to: '/superadmin/blog-categories', icon: <FolderOpen className="h-5 w-5" />, label: '文章分類' },
          { to: '/superadmin/coffee-quiz', icon: <Coffee className="h-5 w-5" />, label: '咖啡 AI 測驗' },
          { to: '/superadmin/ai-analytics', icon: <Brain className="h-5 w-5" />, label: 'AI 分析' },
          { to: '/superadmin/chatbot', icon: <MessageSquare className="h-5 w-5" />, label: 'AI 客服' },
          { to: '/superadmin/listing-command', icon: <Terminal className="h-5 w-5" />, label: 'AI 上架指令' },
        ],
      },
      {
        id: 'members',
        title: '會員與點數',
        items: [
          { to: '/superadmin/users', icon: <Users className="h-5 w-5" />, label: '會員管理' },
          { to: '/superadmin/point-rewards', icon: <Award className="h-5 w-5" />, label: '點數獎勵' },
          { to: '/superadmin/points-ledger', icon: <Coins className="h-5 w-5" />, label: '點數帳本' },
          { to: '/superadmin/permissions', icon: <Shield className="h-5 w-5" />, label: '權限管理' },
        ],
      },
      {
        id: 'system',
        title: '網站與系統',
        items: [
          { to: '/superadmin/static-pages', icon: <FileText className="h-5 w-5" />, label: '靜態頁面' },
          { to: '/superadmin/faq', icon: <HelpCircle className="h-5 w-5" />, label: '常見問題' },
          { to: '/superadmin/site-settings', icon: <Settings className="h-5 w-5" />, label: '網站設定' },
          { to: '/superadmin/theme-banners', icon: <Image className="h-5 w-5" />, label: '橫幅管理' },
          { to: '/superadmin/activity-logs', icon: <History className="h-5 w-5" />, label: '活動紀錄' },
          { to: '/superadmin/platform-info', icon: <Server className="h-5 w-5" />, label: '平台資訊' },
          { to: '/superadmin/version-logs', icon: <BadgeCheck className="h-5 w-5" />, label: '版本與稽核' },
        ],
      },
    ],
    [],
  );

  const navLinks = useMemo(() => navSections.flatMap(section => section.items), [navSections]);
  const currentPage = useMemo(() => navLinks.find(link => link.to === location.pathname) || null, [location.pathname, navLinks]);
  const activeSectionId = useMemo(() => {
    const section = navSections.find(group => group.items.some(link =>
      link.to === location.pathname || (!link.end && location.pathname.startsWith(`${link.to}/`))
    ));
    return section?.id || 'overview';
  }, [location.pathname, navSections]);

  const toggleSection = (sectionId: string) => {
    setOpenSectionIds(prev =>
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );
  };

  const doSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  useEffect(() => {
    const baselineKey = `superadmin-baseline:${APP_BUILD_LABEL}`;
    if (
      typeof window !== 'undefined'
      && !loading
      && user
      && (role === 'admin' || role === 'superadmin')
      && !window.localStorage.getItem(baselineKey)
    ) {
      window.localStorage.setItem(baselineKey, '1');
      void recordVersionBaseline(
        APP_BUILD_LABEL,
        {
          source: 'superadmin-layout',
          pathname: location.pathname,
          commit: APP_COMMIT_LONG,
        },
        {
          route: location.pathname,
          summary: 'superadmin baseline recorded',
        },
      );
    }
  }, [loading, location.pathname, role, user]);

  useEffect(() => {
    setOpenSectionIds(prev => (prev.includes(activeSectionId) ? prev : [...prev, activeSectionId]));
  }, [activeSectionId]);

  const Sidebar = () => (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400">
            <Crown className="h-6 w-6 text-slate-900" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">超級管理員</p>
            <span className="rounded bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-slate-900">SUPERADMIN</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-3">
        {navSections.map(section => {
          const sectionOpen = openSectionIds.includes(section.id);
          const sectionActive = section.id === activeSectionId;
          return (
            <div key={section.id} className="rounded-2xl border border-slate-800/70 bg-slate-900/40">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-xs font-bold tracking-wide transition ${
                  sectionActive ? 'text-amber-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{section.title}</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{section.items.length}</span>
                  <ChevronDown className={`h-4 w-4 transition ${sectionOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {sectionOpen && (
                <div className="space-y-0.5 px-1.5 pb-2">
                  {section.items.map(link => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                          isActive || (!link.end && location.pathname.startsWith(`${link.to}/`))
                            ? 'bg-amber-500 text-slate-900'
                            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`
                      }
                    >
                      {link.icon}
                      <span>{link.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
          <span className="font-semibold text-white">{currentPage?.label || '超級管理員'}</span>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;

import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  BarChart2,
  BadgeCheck,
  BedDouble,
  Brain,
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
  Shield,
  ShoppingBag,
  Store,
  Tags,
  Terminal,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { APP_BUILD_LABEL, APP_COMMIT_LONG } from '../../lib/appVersion';
import { recordVersionBaseline } from '../../lib/auditLog';
import { normalizeLang, pickByLang } from '../../lib/i18n';

type NavItem = {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
};

const SuperAdminLayout: React.FC = () => {
  const { signOut, user } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks: NavItem[] = useMemo(
    () => [
      { to: '/superadmin/engagement', icon: <MessageSquare className="h-5 w-5" />, label: pick('互動管理', 'Engagement', 'インタラクション', '상호작용') },
      { to: '/superadmin', icon: <LayoutDashboard className="h-5 w-5" />, label: pick('總覽', 'Overview', '概要', '개요'), end: true },
      { to: '/superadmin/products', icon: <ShoppingBag className="h-5 w-5" />, label: pick('商品管理', 'Genbon Products', '商品管理', '상품 관리') },
      { to: '/superadmin/product-categories', icon: <Tags className="h-5 w-5" />, label: pick('商品分類', 'Product Categories', '商品分類', '상품 분류') },
      { to: '/superadmin/orders', icon: <Package className="h-5 w-5" />, label: pick('訂單管理', 'Genbon Orders', '注文管理', '주문 관리') },
      { to: '/superadmin/vendors', icon: <Store className="h-5 w-5" />, label: pick('供應商', 'Vendors', '供給者', '공급사') },
      { to: '/superadmin/rooms', icon: <BedDouble className="h-5 w-5" />, label: pick('住宿管理', 'nestobi Stays', '宿泊管理', '숙박 관리') },
      { to: '/superadmin/room-translations', icon: <Languages className="h-5 w-5" />, label: pick('住宿翻譯', 'nestobi Translations', '宿泊翻訳', '숙박 번역') },
      { to: '/superadmin/store-locations', icon: <MapPin className="h-5 w-5" />, label: pick('門市管理', 'Genbon Stores', '店舗管理', '매장 관리') },
      { to: '/superadmin/blog', icon: <Coffee className="h-5 w-5" />, label: pick('咖啡旅人文章', 'Coffee Traveler Articles', 'カフェ旅記事', '커피 여행 아티클') },
      { to: '/superadmin/coffee-quiz', icon: <Coffee className="h-5 w-5" />, label: pick('AI 咖啡配對', 'Coffee Finder', 'AI コーヒー診断', 'AI 커피 찾기') },
      { to: '/superadmin/blog-categories', icon: <FolderOpen className="h-5 w-5" />, label: pick('文章分類', 'Article Categories', '記事カテゴリ', '아티클 분류') },
      { to: '/superadmin/users', icon: <Users className="h-5 w-5" />, label: pick('會員管理', 'Members', '会員管理', '회원 관리') },
      { to: '/superadmin/revenue', icon: <BarChart2 className="h-5 w-5" />, label: pick('營收', 'Revenue', '売上', '매출') },
      { to: '/superadmin/point-rewards', icon: <Award className="h-5 w-5" />, label: pick('點數回饋', 'Point Rewards', 'ポイント還元', '포인트 리워드') },
      { to: '/superadmin/points-ledger', icon: <Coins className="h-5 w-5" />, label: pick('點數明細', 'Points Ledger', 'ポイント履歴', '포인트 내역') },
      { to: '/superadmin/activity-logs', icon: <History className="h-5 w-5" />, label: pick('管理員活動紀錄', 'Admin Activity Logs', '管理者操作記録', '관리자 활동 로그') },
      { to: '/superadmin/version-logs', icon: <BadgeCheck className="h-5 w-5" />, label: pick('版本與稽核', 'Version & Audit', 'バージョンと監査', '버전 및 감사') },
      { to: '/superadmin/ai-analytics', icon: <Brain className="h-5 w-5" />, label: pick('AI 分析', 'AI Analytics', 'AI 分析', 'AI 분석') },
      { to: '/superadmin/chatbot', icon: <MessageSquare className="h-5 w-5" />, label: pick('AI 客服', 'AI Support', 'AI サポート', 'AI 지원') },
      { to: '/superadmin/static-pages', icon: <FileText className="h-5 w-5" />, label: pick('靜態頁面', 'Static Pages', '静的ページ', '정적 페이지') },
      { to: '/superadmin/permissions', icon: <Shield className="h-5 w-5" />, label: pick('權限管理', 'Permissions', '権限管理', '권한 관리') },
      { to: '/superadmin/faq', icon: <HelpCircle className="h-5 w-5" />, label: pick('FAQ', 'FAQ', 'FAQ', 'FAQ') },
      { to: '/superadmin/site-settings', icon: <Settings className="h-5 w-5" />, label: pick('網站設定', 'Site Settings', 'サイト設定', '사이트 설정') },
      { to: '/superadmin/theme-banners', icon: <Image className="h-5 w-5" />, label: pick('橫幅管理', 'Banners', 'バナー管理', '배너 관리') },
      { to: '/superadmin/listing-command', icon: <Terminal className="h-5 w-5" />, label: pick('AI 上架指令', 'AI Listing Command', 'AI 出品コマンド', 'AI 등록 명령') },
    ],
    [pick],
  );

  const currentPage = useMemo(() => navLinks.find(link => link.to === location.pathname) || null, [location.pathname, navLinks]);

  const doSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  useEffect(() => {
    const baselineKey = `superadmin-baseline:${APP_BUILD_LABEL}`;
    if (typeof window !== 'undefined' && !window.sessionStorage.getItem(baselineKey)) {
      window.sessionStorage.setItem(baselineKey, '1');
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
  }, [location.pathname]);

  const Sidebar = () => (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400">
            <Crown className="h-6 w-6 text-slate-900" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{pick('超級管理員', 'Super Admin', 'スーパー管理者', '슈퍼 관리자')}</p>
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
          <span>{pick('登出', 'Logout', 'ログアウト', '로그아웃')}</span>
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
          <span className="font-semibold text-white">{currentPage?.label || pick('超級管理員', 'Super Admin', 'スーパー管理者', '슈퍼 관리자')}</span>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;

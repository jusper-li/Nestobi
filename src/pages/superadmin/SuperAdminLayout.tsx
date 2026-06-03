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
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';

const SuperAdminLayout: React.FC = () => {
  const { signOut, user } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const t = {
    title: pick('超級管理後台', 'Super Admin', 'スーパー管理', '슈퍼 관리자'),
    signOut: pick('登出', 'Logout', 'ログアウト', '로그아웃'),
  };
  const navLinks = [
    { to: '/superadmin/engagement', icon: <MessageSquare className="h-5 w-5" />, label: pick('連動管理', 'Engagement', '連動管理', '연동 관리') },
    { to: '/superadmin', icon: <LayoutDashboard className="h-5 w-5" />, label: pick('總覽', 'Overview', '概要', '개요'), end: true },
    { to: '/superadmin/products', icon: <ShoppingBag className="h-5 w-5" />, label: pick('商品管理', 'Products', '商品管理', '상품 관리') },
    { to: '/superadmin/product-categories', icon: <Tags className="h-5 w-5" />, label: pick('商品分類管理', 'Product Categories', '商品カテゴリ管理', '상품 분류 관리') },
    { to: '/superadmin/orders', icon: <Package className="h-5 w-5" />, label: pick('訂單管理', 'Orders', '注文管理', '주문 관리') },
    { to: '/superadmin/vendors', icon: <Store className="h-5 w-5" />, label: pick('廠商管理', 'Vendors', '事業者管理', '업체 관리') },
    { to: '/superadmin/rooms', icon: <BedDouble className="h-5 w-5" />, label: pick('房間管理', 'Rooms', '部屋管理', '객실 관리') },
    { to: '/superadmin/room-translations', icon: <Languages className="h-5 w-5" />, label: pick('住宿翻譯管理', 'Stay Translations', '宿泊翻訳管理', '숙소 번역 관리') },
    { to: '/superadmin/store-locations', icon: <MapPin className="h-5 w-5" />, label: pick('門市據點', 'Store Locations', '店舗拠点', '매장 위치') },
    { to: '/superadmin/blog', icon: <Coffee className="h-5 w-5" />, label: pick('咖啡旅誌', 'Coffee Journal', 'コーヒー旅誌', '커피 여행기') },
    { to: '/superadmin/coffee-quiz', icon: <Coffee className="h-5 w-5" />, label: pick('咖啡測驗管理', 'Coffee Quiz', 'コーヒー診断管理', '커피 테스트 관리') },
    { to: '/superadmin/blog-categories', icon: <FolderOpen className="h-5 w-5" />, label: pick('文章分類管理', 'Article Categories', '記事カテゴリ管理', '글 분류 관리') },
    { to: '/superadmin/users', icon: <Users className="h-5 w-5" />, label: pick('會員管理', 'Members', '会員管理', '회원 관리') },
    { to: '/superadmin/revenue', icon: <BarChart2 className="h-5 w-5" />, label: pick('營收分析', 'Revenue', '売上分析', '매출 분석') },
    { to: '/superadmin/ai-analytics', icon: <Brain className="h-5 w-5" />, label: pick('AI 使用分析', 'AI Analytics', 'AI 利用分析', 'AI 사용 분석') },
    { to: '/superadmin/chatbot', icon: <MessageSquare className="h-5 w-5" />, label: pick('AI 客服設定', 'AI Support', 'AI サポート設定', 'AI 고객지원 설정') },
    { to: '/superadmin/static-pages', icon: <FileText className="h-5 w-5" />, label: pick('靜態頁管理', 'Static Pages', '静的ページ管理', '정적 페이지 관리') },
    { to: '/superadmin/permissions', icon: <Shield className="h-5 w-5" />, label: pick('權限管理', 'Permissions', '権限管理', '권한 관리') },
    { to: '/superadmin/faq', icon: <HelpCircle className="h-5 w-5" />, label: pick('FAQ 管理', 'FAQ', 'FAQ 管理', 'FAQ 관리') },
    { to: '/superadmin/site-settings', icon: <Settings className="h-5 w-5" />, label: pick('網站設定', 'Site Settings', 'サイト設定', '사이트 설정') },
    { to: '/superadmin/listing-command', icon: <Terminal className="h-5 w-5" />, label: pick('AI 指令上架', 'AI Listing Command', 'AI 出品コマンド', 'AI 등록 명령') },
  ];

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
            <p className="text-sm font-bold text-white">{t.title}</p>
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
          <span>{t.signOut}</span>
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
          <span className="font-semibold text-white">{t.title}</span>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;

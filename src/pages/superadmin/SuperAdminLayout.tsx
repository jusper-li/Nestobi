import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import LanguageSwitcher from '../../components/ui/LanguageSwitcher';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';

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
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const pick = useCallback(
    (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko),
    [locale],
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSectionIds, setOpenSectionIds] = useState<string[]>(['overview']);
  const navigate = useNavigate();
  const location = useLocation();

  const navSections: NavSection[] = useMemo(
    () => [
      {
        id: 'overview',
        title: pick('總覽與營運', 'Overview & operations', '概要と運営', '개요 및 운영'),
        items: [
          { to: '/superadmin', icon: <LayoutDashboard className="h-5 w-5" />, label: pick('總覽', 'Dashboard', 'ダッシュボード', '대시보드'), end: true },
          { to: '/superadmin/engagement', icon: <MessageSquare className="h-5 w-5" />, label: pick('互動總覽', 'Engagement', 'エンゲージメント', '참여 현황') },
          { to: '/superadmin/revenue', icon: <BarChart2 className="h-5 w-5" />, label: pick('營收報表', 'Revenue', '売上レポート', '매출 보고서') },
        ],
      },
      {
        id: 'commerce',
        title: pick('商品與訂單', 'Products & orders', '商品と注文', '상품 및 주문'),
        items: [
          { to: '/superadmin/products', icon: <ShoppingBag className="h-5 w-5" />, label: pick('商品管理', 'Products', '商品管理', '상품 관리') },
          { to: '/superadmin/product-categories', icon: <Tags className="h-5 w-5" />, label: pick('商品分類', 'Categories', '商品カテゴリ', '상품 분류') },
          { to: '/superadmin/orders', icon: <Package className="h-5 w-5" />, label: pick('商店訂單', 'Store orders', 'ショップ注文', '상점 주문') },
          { to: '/superadmin/vendors', icon: <Store className="h-5 w-5" />, label: pick('供應商管理', 'Vendors', '仕入先管理', '공급업체 관리') },
        ],
      },
      {
        id: 'stays',
        title: pick('住宿與門市', 'Stays & stores', '宿泊と店舗', '숙박 및 매장'),
        items: [
          { to: '/superadmin/rooms', icon: <BedDouble className="h-5 w-5" />, label: pick('住宿管理', 'Stays', '宿泊管理', '숙박 관리') },
          { to: '/superadmin/room-translations', icon: <Languages className="h-5 w-5" />, label: pick('住宿翻譯', 'Stay translations', '宿泊翻訳', '숙박 번역') },
          { to: '/superadmin/store-locations', icon: <MapPin className="h-5 w-5" />, label: pick('門市地點', 'Store locations', '店舗所在地', '매장 위치') },
        ],
      },
      {
        id: 'content',
        title: pick('內容與 AI', 'Content & AI', 'コンテンツと AI', '콘텐츠 및 AI'),
        items: [
          { to: '/superadmin/blog', icon: <Coffee className="h-5 w-5" />, label: pick('部落格', 'Blog', 'ブログ', '블로그') },
          { to: '/superadmin/blog-categories', icon: <FolderOpen className="h-5 w-5" />, label: pick('文章分類', 'Article categories', '記事カテゴリ', '게시글 분류') },
          { to: '/superadmin/coffee-quiz', icon: <Coffee className="h-5 w-5" />, label: pick('咖啡 AI 測驗', 'Coffee AI quiz', 'コーヒー AI 診断', '커피 AI 테스트') },
          { to: '/superadmin/ai-analytics', icon: <Brain className="h-5 w-5" />, label: pick('AI 分析', 'AI analytics', 'AI 分析', 'AI 분석') },
          { to: '/superadmin/chatbot', icon: <MessageSquare className="h-5 w-5" />, label: pick('AI 客服', 'AI support', 'AI サポート', 'AI 고객지원') },
          { to: '/superadmin/listing-command', icon: <Terminal className="h-5 w-5" />, label: pick('AI 上架指令', 'AI listing command', 'AI 出品指示', 'AI 등록 명령') },
        ],
      },
      {
        id: 'members',
        title: pick('會員與點數', 'Members & points', '会員とポイント', '회원 및 포인트'),
        items: [
          { to: '/superadmin/users', icon: <Users className="h-5 w-5" />, label: pick('會員管理', 'Members', '会員管理', '회원 관리') },
          { to: '/superadmin/point-rewards', icon: <Award className="h-5 w-5" />, label: pick('點數獎勵', 'Point rewards', 'ポイント特典', '포인트 보상') },
          { to: '/superadmin/points-ledger', icon: <Coins className="h-5 w-5" />, label: pick('點數帳本', 'Points ledger', 'ポイント台帳', '포인트 원장') },
          { to: '/superadmin/permissions', icon: <Shield className="h-5 w-5" />, label: pick('權限管理', 'Permissions', '権限管理', '권한 관리') },
        ],
      },
      {
        id: 'system',
        title: pick('網站與系統', 'Website & system', 'サイトとシステム', '사이트 및 시스템'),
        items: [
          { to: '/superadmin/static-pages', icon: <FileText className="h-5 w-5" />, label: pick('靜態頁面', 'Static pages', '固定ページ', '정적 페이지') },
          { to: '/superadmin/faq', icon: <HelpCircle className="h-5 w-5" />, label: pick('常見問題', 'FAQ', 'よくある質問', '자주 묻는 질문') },
          { to: '/superadmin/site-settings', icon: <Settings className="h-5 w-5" />, label: pick('網站設定', 'Site settings', 'サイト設定', '사이트 설정') },
          { to: '/superadmin/theme-banners', icon: <Image className="h-5 w-5" />, label: pick('橫幅管理', 'Banners', 'バナー管理', '배너 관리') },
          { to: '/superadmin/activity-logs', icon: <History className="h-5 w-5" />, label: pick('活動紀錄', 'Activity logs', '操作履歴', '활동 기록') },
          { to: '/superadmin/platform-info', icon: <Server className="h-5 w-5" />, label: pick('平台資訊', 'Platform info', 'プラットフォーム情報', '플랫폼 정보') },
          { to: '/superadmin/version-logs', icon: <BadgeCheck className="h-5 w-5" />, label: pick('版本與稽核', 'Versions & audit', 'バージョンと監査', '버전 및 감사') },
        ],
      },
    ],
    [pick],
  );

  const navLinks = useMemo(() => navSections.flatMap(section => section.items), [navSections]);
  const currentPage = useMemo(
    () => navLinks.find(link => link.to === location.pathname) || null,
    [location.pathname, navLinks],
  );
  const activeSectionId = useMemo(() => {
    const section = navSections.find(group => group.items.some(link =>
      link.to === location.pathname || (!link.end && location.pathname.startsWith(`${link.to}/`))
    ));
    return section?.id || 'overview';
  }, [location.pathname, navSections]);

  const toggleSection = (sectionId: string) => {
    setOpenSectionIds(prev => (prev.includes(sectionId) ? [] : [sectionId]));
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
        { source: 'superadmin-layout', pathname: location.pathname, commit: APP_COMMIT_LONG },
        { route: location.pathname, summary: 'superadmin baseline recorded' },
      );
    }
  }, [loading, location.pathname, role, user]);

  useEffect(() => {
    setOpenSectionIds([activeSectionId]);
  }, [activeSectionId]);

  const Sidebar = () => (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400">
            <Crown className="h-6 w-6 text-slate-900" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{pick('超級管理員', 'Super Admin', 'スーパー管理者', '최고 관리자')}</p>
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
                className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-xs font-bold tracking-wide transition ${sectionActive ? 'text-amber-300' : 'text-slate-400 hover:text-white'}`}
                aria-expanded={sectionOpen}
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
        <div className="mb-2 px-3">
          <LanguageSwitcher inverted className="w-full justify-between" />
        </div>
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
          <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 hover:bg-slate-800" aria-label={pick('開啟選單', 'Open menu', 'メニューを開く', '메뉴 열기')}>
            <Menu className="h-5 w-5 text-white" />
          </button>
          <span className="min-w-0 flex-1 truncate font-semibold text-white">
            {currentPage?.label || pick('超級管理員', 'Super Admin', 'スーパー管理者', '최고 관리자')}
          </span>
          <LanguageSwitcher compact inverted />
        </header>
        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;

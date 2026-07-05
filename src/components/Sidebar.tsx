import {
  BarChart3,
  BookOpen,
  Brain,
  ChevronRight,
  CreditCard,
  ExternalLink,
  FileText,
  HelpCircle,
  Home,
  Languages,
  LayoutDashboard,
  Layers,
  Package,
  Search,
  Shield,
  ShoppingCart,
  Share2,
  Sparkles,
  Store,
  Users,
  MessageSquare,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  badge?: string | number;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export default function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  const { t } = useLanguage();
  const [needsHumanCount] = useState(0);

  const menuGroups: MenuGroup[] = [
    {
      title: t('admin.sidebar.group.overview', '總覽'),
      items: [{ id: 'dashboard', label: t('admin.sidebar.dashboard', '儀錶板'), icon: LayoutDashboard }],
    },
    {
      title: t('admin.sidebar.group.ai', 'AI 智能系統'),
      items: [
        { id: 'ai-chat', label: t('admin.sidebar.aiChat', 'AI 客服聊天'), icon: MessageSquare, badge: 'AI' },
        { id: 'knowledge-base', label: t('admin.sidebar.knowledgeBase', '知識庫管理'), icon: BookOpen },
        { id: 'ai-training', label: t('admin.sidebar.aiTraining', 'AI 學習分析'), icon: Brain },
        { id: 'ai-analytics', label: t('admin.sidebar.aiAnalytics', 'AI 用量分析'), icon: BarChart3 },
      ],
    },
    {
      title: t('admin.sidebar.group.business', '商務管理'),
      items: [
        { id: 'products', label: t('admin.sidebar.products', '商品管理'), icon: Package },
        { id: 'orders', label: t('admin.sidebar.orders', '訂單管理'), icon: ShoppingCart },
        { id: 'payments', label: t('admin.sidebar.payments', '金流管理'), icon: CreditCard },
        { id: 'stores', label: t('admin.sidebar.stores', '門市管理'), icon: Store },
        { id: 'members', label: t('admin.sidebar.members', '會員管理'), icon: Users },
      ],
    },
    {
      title: t('admin.sidebar.group.content', '內容管理'),
      items: [
        { id: 'homepage', label: t('admin.sidebar.homepage', '首頁管理'), icon: Home },
        { id: 'articles', label: t('admin.sidebar.articles', '文章管理'), icon: FileText },
        { id: 'faq', label: t('admin.sidebar.faq', 'Q&A 管理'), icon: HelpCircle },
        { id: 'static-pages', label: t('admin.sidebar.staticPages', '靜態頁面'), icon: Layers },
      ],
    },
    {
      title: t('admin.sidebar.group.settings', '系統設定'),
      items: [
        { id: 'social', label: t('admin.sidebar.social', '社群連結'), icon: Share2 },
        { id: 'languages', label: t('admin.sidebar.languages', '語系管理'), icon: Languages },
        { id: 'seo', label: t('admin.sidebar.seo', 'SEO 管理'), icon: Search },
        { id: 'permissions', label: t('admin.sidebar.permissions', '權限管理'), icon: Shield },
      ],
    },
  ];

  const hydratedMenuGroups = useMemo(
    () =>
      menuGroups.map((group) => ({
        ...group,
        items: group.items.map((item) =>
          item.id === 'ai-chat'
            ? {
                ...item,
                badge: needsHumanCount > 0 ? needsHumanCount : item.badge,
              }
            : item
        ),
      })),
    [menuGroups, needsHumanCount]
  );

  return (
    <div className="flex min-h-screen w-72 flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white shadow-2xl">
      <div className="border-b border-slate-800/50 p-6">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="whitespace-nowrap bg-gradient-to-r from-white to-slate-300 bg-clip-text text-xl font-bold text-transparent">
              {t('admin.sidebar.brand', '後台管理')}
            </h1>
            <p className="whitespace-nowrap text-xs tracking-wide text-slate-500">Super Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {hydratedMenuGroups.map((group, index) => (
            <div key={index}>
              <div className="mb-2 px-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{group.title}</h3>
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onModuleChange(item.id)}
                      className={`group relative flex w-full items-center justify-between rounded-xl px-4 py-2.5 transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25'
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex-shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-sm ${
                              item.id === 'ai-chat' && needsHumanCount > 0
                                ? 'bg-gradient-to-r from-rose-500 to-red-500'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 flex-shrink-0 transition-all duration-200 ${
                          isActive ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-slate-800/50 bg-slate-900/50 p-4">
        <a
          href="/"
          className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-400 transition-all duration-200 hover:bg-slate-800/50 hover:text-white"
        >
          <ExternalLink className="h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
          <span className="text-sm font-medium">{t('admin.sidebar.backHome', '返回前台')}</span>
        </a>
      </div>
    </div>
  );
}

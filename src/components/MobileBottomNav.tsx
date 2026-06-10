import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  MessageCircle,
  User,
  Coffee,
  Map,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../lib/i18n';
import { fetchSiteContentBlocks, getBlockText, indexBlocks, type SiteContentBlock } from '../lib/siteContent';

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  activePaths?: string[];
};

function isActivePath(pathname: string, item: NavItem) {
  const paths = item.activePaths || [item.to];
  return paths.some(path => pathname === path || pathname.startsWith(`${path}/`));
}

function MobileTab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-label={item.label}
      className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition ${
        active ? 'bg-[#F0E4C8] text-[#2C1F10]' : 'text-gray-600 hover:bg-[#F7F1E8] hover:text-[#2C1F10]'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{item.label}</span>
    </Link>
  );
}

export default function MobileBottomNav() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const location = useLocation();
  const locale = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);
  const pathname = location.pathname;
  const [navigationBlocks, setNavigationBlocks] = useState<SiteContentBlock[]>([]);
  const isBackendRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/superadmin') ||
    pathname.startsWith('/vendor') ||
    pathname.startsWith('/member/store-admin') ||
    pathname.startsWith('/store-admin');

  useEffect(() => {
    let cancelled = false;
    fetchSiteContentBlocks('navigation')
      .then(blocks => {
        if (!cancelled) setNavigationBlocks(blocks);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const navigationMap = useMemo(() => indexBlocks(navigationBlocks), [navigationBlocks]);

  const items = useMemo<NavItem[]>(
    () => [
      { to: '/', label: getBlockText(navigationMap['navigation-mobile-home'], locale, 'title') || pick('首頁', 'Home', 'ホーム', '홈'), icon: Home, activePaths: ['/'] },
      { to: '/ai/chat', label: getBlockText(navigationMap['navigation-mobile-ai-chat'], locale, 'title') || pick('AI客服', 'AI Support', 'AIサポート', 'AI 고객지원'), icon: MessageCircle, activePaths: ['/ai/chat'] },
      { to: '/ai/itinerary', label: getBlockText(navigationMap['navigation-mobile-ai-itinerary'], locale, 'title') || pick('AI導遊', 'AI Guide', 'AIガイド', 'AI 가이드'), icon: Map, activePaths: ['/ai/itinerary'] },
      { to: '/ai/coffee-quiz', label: getBlockText(navigationMap['navigation-mobile-ai-coffee-quiz'], locale, 'title') || pick('AI尋豆師', 'AI Coffee Finder', 'AIコーヒー豆診断', 'AI 커피 바리스타'), icon: Coffee, activePaths: ['/ai/coffee-quiz'] },
      { to: user ? '/member' : '/auth/login', label: getBlockText(navigationMap['navigation-mobile-member'], locale, 'title') || pick('我的', 'My', 'マイ', '내 정보'), icon: User, activePaths: ['/member'] },
    ],
    [navigationMap, locale, pick, user],
  );

  if (isBackendRoute) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#2C1F10]/10 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-8px_24px_rgba(44,31,16,0.08)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {items.map(item => (
          <MobileTab key={item.to} item={item} active={isActivePath(location.pathname, item)} />
        ))}
      </div>
    </nav>
  );
}

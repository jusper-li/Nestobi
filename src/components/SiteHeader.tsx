import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingCart, Globe, ChevronRight, CircleUser as UserCircle, Facebook, Instagram, Twitter, Youtube, MessageCircle, ExternalLink } from 'lucide-react';
import { isMissingSupabaseTableError, isSupabaseContentEnabled, isSupabaseNetworkError, supabase } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useMemberAuth } from '../contexts/MemberAuthContext';
import { DEFAULT_FOOTER_SETTINGS, DEFAULT_HEADER_SETTINGS } from '../data/homepageContent';
import { normalizeLang } from '../lib/language';

interface NavItem {
  label: string;
  href: string;
}

interface HeaderSettings {
  logo_text: string;
  logo_image: string;
  navigation: NavItem[];
  show_cart: boolean;
  show_language_selector: boolean;
}

interface FooterLink {
  label: string;
  href: string;
}

interface LinkGroup {
  title: string;
  links: FooterLink[];
}

interface FooterSettings {
  link_groups: LinkGroup[];
  contact_email?: string;
  contact_phone?: string;
}

interface Social {
  id: string;
  platform: string;
  username: string;
  url: string;
  is_active: boolean;
}

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  x: Twitter,
  youtube: Youtube,
  line: MessageCircle,
  Facebook,
  Instagram,
  Twitter,
  YouTube: Youtube,
  Youtube,
};

const normalizeMenuHref = (href: string) => {
  const value = href.trim();
  if (!value || value === '/') return value || '';
  if (value.startsWith('#')) return value.toLowerCase();
  return value.replace(/\/+$/, '').toLowerCase();
};

const dedupeMenuLinks = <T extends { label: string; href: string }>(
  links: T[] = [],
  seen = new Set<string>(),
) => {
  const result: T[] = [];

  links.forEach((link) => {
    const label = link.label?.trim();
    const href = link.href?.trim();
    const key = normalizeMenuHref(href);
    if (!label || !href || !key || seen.has(key)) return;
    seen.add(key);
    result.push({ ...link, label, href });
  });

  return result;
};

const hasRenderableName = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.length <= 3 && /[?�]/.test(trimmed)) return false;
  if (/[�]/.test(trimmed)) return false;
  const meaningfulChars = trimmed.match(/[\p{Letter}\p{Number}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu);
  return (meaningfulChars?.length || 0) >= 1;
};

const getDisplayNameFallback = (email?: string | null) => {
  const localPart = (email || '').split('@')[0].trim();
  return localPart || '會員';
};

export default function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [settings, setSettings] = useState<HeaderSettings>(DEFAULT_HEADER_SETTINGS);
  const [footerSettings, setFooterSettings] = useState<FooterSettings>({
    link_groups: DEFAULT_FOOTER_SETTINGS.link_groups,
  });
  const [socials, setSocials] = useState<Social[]>([]);
  const { itemCount } = useCart();
  const { currentLanguage, languages, setLanguage, t } = useLanguage();
  const { user, profile } = useMemberAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const memberInitial = profile?.display_name
    ? profile.display_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || null;
  const rawDisplayName = profile?.display_name?.trim() || '';
  const displayName = hasRenderableName(rawDisplayName)
    ? rawDisplayName
    : getDisplayNameFallback(user?.email);
  const normalizedLanguage = normalizeLang(currentLanguage);
  const isHomepage = location.pathname === '/';
  const isSolidHeader = scrolled || isMenuOpen || !isHomepage;
  const primaryNavigation = useMemo(
    () => dedupeMenuLinks(settings.navigation),
    [settings.navigation],
  );
  const translatedPrimaryNavigation = useMemo(
    () => primaryNavigation.map((item) => ({
      ...item,
      label: t(`header.nav.${normalizeMenuHref(item.href)}`, item.label),
    })),
    [primaryNavigation, t],
  );
  const mobileMenu = useMemo(() => {
    const seen = new Set(primaryNavigation.map((item) => normalizeMenuHref(item.href)));
    let footerGroups = (footerSettings.link_groups || [])
      .map((group, index) => ({
        title: t(`header.footer_group.${index}`, group.title?.trim() || '分類'),
        links: dedupeMenuLinks(
          (group.links || []).map((link) => ({
            ...link,
            label: t(`header.footer_link.${normalizeMenuHref(link.href)}`, link.label),
          })),
          seen,
        ),
      }))
      .filter((group) => group.links.length > 0);
    const shoppingLinks = dedupeMenuLinks(
      [
        { label: t('header.shop', '禮盒商城'), href: '/shop' },
        ...(settings.show_cart ? [{ label: t('header.cart', `購物車${itemCount > 0 ? ` (${itemCount})` : ''}`), href: '/cart' }] : []),
      ],
      seen,
    );

    if (
      shoppingLinks.length === 1 &&
      normalizeMenuHref(shoppingLinks[0].href) === '/cart' &&
      footerGroups.length > 0
    ) {
      const serviceIndex = footerGroups.findIndex((group) => group.title.includes('服務'));
      const targetIndex = serviceIndex >= 0 ? serviceIndex : footerGroups.length - 1;
      footerGroups = footerGroups.map((group, index) => (
        index === targetIndex
          ? { ...group, links: [...group.links, ...shoppingLinks] }
          : group
      ));
      shoppingLinks.length = 0;
    }

    const legalLinks = dedupeMenuLinks(
      [
        { label: t('header.privacy', '隱私權政策'), href: '/privacy' },
        { label: t('header.terms', '服務條款'), href: '/terms' },
      ],
      seen,
    );

    return { footerGroups, shoppingLinks, legalLinks };
  }, [footerSettings.link_groups, itemCount, primaryNavigation, settings.show_cart, t]);

  const isActiveMenuItem = (href: string) => {
    const target = normalizeMenuHref(href);
    const current = normalizeMenuHref(location.pathname);
    return target === '/' ? location.pathname === '/' : target === current;
  };

  useEffect(() => {
    loadSettings();
    loadFooterSettings();
    loadSocials();
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  useEffect(() => {
    const getScrollTarget = () => document.querySelector('.homepage-main') as HTMLElement | null;
    const onScroll = () => {
      const homepageScroller = getScrollTarget();
      setScrolled((homepageScroller?.scrollTop || window.scrollY) > 60);
    };

    const homepageScroller = getScrollTarget();
    window.addEventListener('scroll', onScroll, { passive: true });
    homepageScroller?.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      homepageScroller?.removeEventListener('scroll', onScroll);
    };
  }, []);

  const loadSettings = async () => {
    if (!isSupabaseContentEnabled) return;

    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'header')
        .maybeSingle();
      if (error) throw error;
      if (data) {
        const nextSettings = data.setting_value as HeaderSettings;
        setSettings({
          ...nextSettings,
          navigation: nextSettings.navigation?.length ? nextSettings.navigation : DEFAULT_HEADER_SETTINGS.navigation,
        });
      }
    } catch (error) {
      if (isMissingSupabaseTableError(error) || isSupabaseNetworkError(error)) return;
      console.error('Failed to load header settings:', error);
    }
  };

  const loadFooterSettings = async () => {
    if (!isSupabaseContentEnabled) return;

    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'footer')
        .maybeSingle();
      if (error) throw error;
      if (data) {
        const nextSettings = data.setting_value as FooterSettings;
        setFooterSettings({
          ...nextSettings,
          link_groups: nextSettings.link_groups?.length ? nextSettings.link_groups : DEFAULT_FOOTER_SETTINGS.link_groups,
        });
      }
    } catch (error) {
      if (isMissingSupabaseTableError(error) || isSupabaseNetworkError(error)) return;
      console.error('Failed to load footer settings:', error);
    }
  };

  const loadSocials = async () => {
    if (!isSupabaseContentEnabled) return;

    try {
      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('is_active', true)
        .order('platform');
      if (error) throw error;
      setSocials(data || []);
    } catch (error) {
      if (isMissingSupabaseTableError(error) || isSupabaseNetworkError(error)) return;
      console.error('Failed to load social accounts:', error);
    }
  };

  const handleNavigation = (href: string) => {
    setIsMenuOpen(false);
    setShowLanguageMenu(false);
    if (href.startsWith('#')) {
      if (window.location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          const element = document.querySelector(href);
          if (element) element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const element = document.querySelector(href);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(href);
    }
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md transition-all duration-500 ${isSolidHeader ? 'bg-[#fbf6ee]/96 shadow-[0_1px_30px_rgba(61,43,31,0.08)] border-b border-[#eadfd1]/90' : 'bg-transparent'}`}>
        <nav className="container mx-auto px-5 py-2 md:py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="group relative block flex-shrink-0" aria-label="? Sonpin 擐?">
              {settings.logo_image ? (
                <img
                  src={settings.logo_image}
                  alt={settings.logo_text}
                  className="h-11 md:h-16 transition-all duration-300 group-hover:scale-105"
                  style={{ filter: isSolidHeader ? 'none' : 'brightness(0) invert(1)' }}
                />
              ) : (
                <span className="flex flex-col">
                  <span className={`text-xl md:text-3xl font-semibold tracking-wider transition-all duration-300 ${isSolidHeader ? 'text-[#2b221d] group-hover:text-[#6d4f3d]' : 'text-white group-hover:text-white/90'}`}>
                    {settings.logo_text.split(' ')[0] || 'y & m'}
                  </span>
                  <span className={`text-[9px] md:text-xs tracking-[0.3em] uppercase transition-colors duration-300 ${isSolidHeader ? 'text-[#a97a4f] group-hover:text-[#8e6448]' : 'text-white/70 group-hover:text-white/60'}`}>
                    {settings.logo_text.split(' ').slice(1).join(' ') || 'Coffee'}
                  </span>
                </span>
              )}
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              {translatedPrimaryNavigation.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleNavigation(item.href)}
                  className={`relative text-xs font-medium tracking-[0.12em] uppercase transition-all duration-300 group py-2 ${isSolidHeader ? 'text-[#6d4f3d] hover:text-[#2b221d]' : 'text-white/80 hover:text-white'}`}
                >
                  <span className="relative z-10">{item.label}</span>
                  <span className={`absolute -bottom-0.5 left-0 w-0 h-px transition-all duration-400 group-hover:w-full ${isSolidHeader ? 'bg-[#a97a4f]' : 'bg-[#fffaf2]/60'}`}></span>
                </button>
              ))}

              <Link
                to={user ? '/member/profile' : '/member'}
                className={`relative p-2.5 transition-all duration-300 group ${isSolidHeader ? 'text-[#9f8a7b] hover:text-[#2b221d]' : 'text-white/70 hover:text-white'}`}
                title={user ? '?銝剖?' : '?餃 / ??'}
              >
                {memberInitial ? (
                  <span className="w-5 h-5 flex items-center justify-center bg-[#2b221d] text-[#fffaf2] text-xs font-medium">
                    {memberInitial}
                  </span>
                ) : (
                  <UserCircle className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                )}
              </Link>

              {settings.show_cart && (
                <Link
                  to="/cart"
                  className={`relative p-2.5 transition-all duration-300 group ${isSolidHeader ? 'text-[#9f8a7b] hover:text-[#2b221d]' : 'text-white/70 hover:text-white'}`}
                >
                  <ShoppingCart className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-[#2b221d] text-[#fffaf2] text-[10px] w-4 h-4 flex items-center justify-center font-medium shadow-sm">
                      {itemCount}
                    </span>
                  )}
                </Link>
              )}

              {settings.show_language_selector && (
                <div className="relative">
                  <button
                    onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium tracking-[0.1em] uppercase transition-all duration-300 group ${isSolidHeader ? 'text-[#9f8a7b] hover:text-[#2b221d]' : 'mix-blend-difference border border-white/35 bg-transparent text-white hover:border-white/55 hover:text-white'}`}
                  >
                    <Globe className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" />
                    <span>{normalizedLanguage === 'zh-TW' ? 'ZH' : normalizedLanguage.toUpperCase()}</span>
                  </button>

                  {showLanguageMenu && (
                    <div className={`ym-language-menu absolute top-full right-0 mt-3 backdrop-blur-xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)] min-w-[140px] border ${isSolidHeader ? 'bg-[#fffaf2] border-[#eadfd1]' : 'bg-[#fffaf2]/10 border-[#eadfd1]'}`}>
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => { setLanguage(lang.code); setShowLanguageMenu(false); }}
                          className={`block w-full text-left px-4 py-3 text-xs tracking-[0.1em] uppercase transition-all duration-200 ${
                            isSolidHeader
                            ? normalizeLang(lang.code) === normalizedLanguage
                                ? 'bg-[#fffaf2] text-[#2b221d] font-medium'
                                : 'text-[#9f8a7b] hover:bg-[#fffaf2] hover:text-[#2b221d]'
                              : normalizeLang(lang.code) === normalizedLanguage
                                ? 'bg-gradient-to-r from-[#cfa87a]/30 to-[#fffaf2]/20 text-white font-medium'
                                : 'text-white/70 hover:bg-[#fffaf2]/10 hover:text-white'
                          }`}
                        >
                          {lang.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="md:hidden flex items-center gap-1">
              <Link
                to={user ? '/member/profile' : '/member'}
                className={`relative p-2 transition-all duration-200 ${isSolidHeader ? 'text-[#9f8a7b] hover:text-[#2b221d]' : 'text-white/70 hover:text-white'}`}
                aria-label={user ? t('header.member_center', '會員中心') : t('header.login_join', '登入 / 加入會員')}
              >
                {memberInitial ? (
                  <span className="w-6 h-6 flex items-center justify-center bg-[#2b221d] text-[#fffaf2] text-xs font-medium">
                    {memberInitial}
                  </span>
                ) : (
                  <UserCircle className="w-5 h-5" />
                )}
              </Link>

              {settings.show_cart && (
                <Link
                  to="/cart"
                  className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200 ${isSolidHeader ? 'border-transparent text-[#9f8a7b] hover:text-[#2b221d] hover:bg-[#f4ecdf]' : 'border-white/15 bg-white/5 text-white/90 hover:bg-white/10 hover:text-white'}`}
                aria-label={t('header.view_cart', '查看購物車')}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-[#2b221d] text-[#fffaf2] text-[10px] w-4 h-4 flex items-center justify-center font-medium">
                      {itemCount}
                    </span>
                  )}
                </Link>
              )}

              {settings.show_language_selector && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                    className={`relative inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-2 transition-all duration-200 ${isSolidHeader ? 'border-white/30 bg-transparent text-[#2b221d] backdrop-blur-[1px] hover:border-[#cfa87a] hover:text-[#6d4f3d]' : 'mix-blend-difference border-white/35 bg-transparent text-white hover:border-white/55 hover:text-white'}`}
                    aria-label="切換語系"
                    aria-expanded={showLanguageMenu}
                  >
                    <Globe className="w-4 h-4" />
                    <span className="ml-1 text-[10px] font-medium tracking-[0.12em]">
                      {normalizedLanguage === 'zh-TW' ? 'ZH' : normalizedLanguage.toUpperCase()}
                    </span>
                  </button>

                  {showLanguageMenu && (
                    <div className="ym-language-menu absolute right-0 top-full z-[70] mt-2 min-w-[140px] overflow-hidden border border-[#eadfd1] bg-[#fffaf2] shadow-[0_8px_24px_rgba(43,34,29,0.12)]">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => { setLanguage(lang.code); setShowLanguageMenu(false); }}
                          className={`block w-full px-4 py-3 text-left text-xs tracking-[0.1em] uppercase transition-colors ${
                            normalizeLang(lang.code) === normalizedLanguage
                              ? 'bg-[#f4ecdf] text-[#2b221d] font-medium'
                              : 'text-[#9f8a7b] hover:bg-[#fffaf2] hover:text-[#2b221d]'
                          }`}
                        >
                          {lang.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                className={`p-2 transition-all duration-200 ${isSolidHeader ? 'text-[#9f8a7b] hover:text-[#2b221d]' : 'text-white/70 hover:text-white'}`}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? '???詨' : '???詨'}
                aria-expanded={isMenuOpen}
              >
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <span className={`absolute transition-all duration-300 ${isMenuOpen ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'}`}>
                    <X size={19} />
                  </span>
                  <span className={`absolute transition-all duration-300 ${isMenuOpen ? 'opacity-0 -rotate-90' : 'opacity-100 rotate-0'}`}>
                    <Menu size={19} />
                  </span>
                </div>
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-[54] bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${
          isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Mobile full-width slide menu ??from left, white bg */}
      <div className={`md:hidden fixed top-0 left-0 bottom-0 z-[55] w-full bg-[#fffaf2] shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        isMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#eadfd1]">
            <Link to="/" onClick={() => setIsMenuOpen(false)}>
              <img src="/LOGO-1.png" alt="logo" className="h-12" />
            </Link>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 text-[#9f8a7b] hover:text-[#6d4f3d] hover:bg-[#f4ecdf] rounded-full transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>

          {/* Member section */}
          <div className="px-6 pt-5 pb-2">
            {user ? (
              <Link
                to="/member/profile"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 bg-[#fffaf2] border border-[#eadfd1] hover:bg-[#f4ecdf] hover:border-[#eadfd1] transition-all group"
              >
                <div className="w-9 h-9 bg-[#2b221d] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-medium">{memberInitial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2b221d] truncate">{displayName}</p>
                  <p className="text-xs text-[#9f8a7b] truncate">{user.email}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#eadfd1] group-hover:text-[#cfa87a] transition-colors" />
              </Link>
            ) : (
              <Link
                to="/member"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 bg-[#fffaf2] border border-[#eadfd1] hover:bg-[#f4ecdf] transition-all group"
              >
                <UserCircle className="w-5 h-5 text-[#9f8a7b]" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#2b221d]">{t('header.login_join', '登入 / 加入會員')}</p>
                  <p className="text-xs text-[#9f8a7b]">{t('header.login_join_sub', '享受專屬優惠與服務')}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#eadfd1] group-hover:text-[#9f8a7b] transition-colors" />
              </Link>
            )}
          </div>

          {/* Scrollable nav area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
            <div className="mb-4">
                  <p className="text-[10px] tracking-[0.35em] text-[#9f8a7b] uppercase mb-2 px-1">{t('header.primary_menu', '主選單')}</p>
              <nav className="space-y-0.5">
                {translatedPrimaryNavigation.map((item, index) => {
                  const isActive = isActiveMenuItem(item.href);
                  return (
                  <button
                    key={`${item.href}-${index}`}
                    onClick={() => handleNavigation(item.href)}
                    className={`w-full flex items-center justify-between px-3 py-3 text-sm hover:text-[#2b221d] hover:bg-[#fffaf2] active:bg-[#f4ecdf] transition-all duration-200 group text-left tracking-wide ${
                      isActive ? 'text-[#2b221d] bg-[#fffaf2] font-medium' : 'text-[#6d4f3d]'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-[#eadfd1] group-hover:text-[#9f8a7b] group-hover:translate-x-0.5 transition-all" />
                  </button>
                  );
                })}
              </nav>
            </div>

            {/* Footer link groups */}
            {mobileMenu.footerGroups.map((group, index) => (
              <div key={index} className="mb-4">
              <p className="text-[10px] tracking-[0.35em] text-[#9f8a7b] uppercase mb-2 px-1">{group.title}</p>
                <nav className="space-y-0.5">
                  {group.links.map((link, linkIndex) => {
                    const isActive = isActiveMenuItem(link.href);
                    return (
                    <button
                      key={linkIndex}
                      onClick={() => handleNavigation(link.href)}
                      className={`w-full flex items-center justify-between px-3 py-3 text-sm hover:text-[#2b221d] hover:bg-[#fffaf2] active:bg-[#f4ecdf] transition-all duration-200 group text-left tracking-wide ${
                        isActive ? 'text-[#2b221d] bg-[#fffaf2] font-medium' : 'text-[#6d4f3d]'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span>{link.label}</span>
                      <ChevronRight className="w-4 h-4 text-[#eadfd1] group-hover:text-[#9f8a7b] group-hover:translate-x-0.5 transition-all" />
                    </button>
                    );
                  })}
                </nav>
              </div>
            ))}

            {/* Shop pages */}
            {mobileMenu.shoppingLinks.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] tracking-[0.35em] text-[#9f8a7b] uppercase mb-2 px-1">{t('header.shop_menu', '商城')}</p>
              <nav className="space-y-0.5">
                {mobileMenu.shoppingLinks.map((link, index) => {
                  const isActive = isActiveMenuItem(link.href);
                  return (
                    <button
                      key={`${link.href}-${index}`}
                      onClick={() => handleNavigation(link.href)}
                      className={`w-full flex items-center justify-between px-3 py-3 text-sm hover:text-[#2b221d] hover:bg-[#fffaf2] active:bg-[#f4ecdf] transition-all duration-200 group text-left tracking-wide ${
                        isActive ? 'text-[#2b221d] bg-[#fffaf2] font-medium' : 'text-[#6d4f3d]'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span>{link.label}</span>
                      <ChevronRight className="w-4 h-4 text-[#eadfd1] group-hover:text-[#9f8a7b] group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })}
              </nav>
            </div>
            )}

            {/* Legal */}
            {mobileMenu.legalLinks.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] tracking-[0.35em] text-[#9f8a7b] uppercase mb-2 px-1">{t('header.policy_menu', '政策與條款')}</p>
              <nav className="space-y-0.5">
                {mobileMenu.legalLinks.map((link, index) => {
                  const isActive = isActiveMenuItem(link.href);
                  return (
                    <button
                      key={`${link.href}-${index}`}
                      onClick={() => handleNavigation(link.href)}
                      className={`w-full flex items-center justify-between px-3 py-3 text-sm hover:text-[#6d4f3d] hover:bg-[#fffaf2] active:bg-[#f4ecdf] transition-all duration-200 group text-left ${
                        isActive ? 'text-[#6d4f3d] bg-[#fffaf2] font-medium' : 'text-[#9f8a7b]'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span>{link.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#eadfd1] group-hover:text-[#9f8a7b] group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })}
              </nav>
            </div>
            )}
          </div>

          {/* Bottom: Social + Language + Copyright */}
          <div className="px-6 pt-4 pb-6 border-t border-[#eadfd1] space-y-4">

            {/* Social links */}
            {socials.length > 0 && (
              <div>
                <p className="text-[10px] tracking-[0.35em] text-[#9f8a7b] uppercase mb-3">{t('header.follow_us', '追蹤我們')}</p>
                <div className="flex items-center gap-3">
                  {socials.map((social) => {
                    const Icon = PLATFORM_ICONS[social.platform] || ExternalLink;
                    return (
                      <a
                        key={social.id}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-9 h-9 bg-transparent text-[#9f8a7b] hover:text-[#2b221d] border border-[#eadfd1] hover:border-[#cfa87a] transition-all duration-200 active:scale-95"
                        title={social.platform}
                      >
                        <Icon className="w-[18px] h-[18px]" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Language selector */}
            {settings.show_language_selector && languages.length > 0 && (
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-[#9f8a7b]" />
                <div className="flex gap-1.5">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code); setIsMenuOpen(false); }}
                      className={`px-3 py-1 text-xs font-medium tracking-[0.1em] transition-all duration-200 border ${
                        normalizeLang(lang.code) === normalizedLanguage
                          ? 'bg-[#2b221d] text-[#fffaf2] border-[#2b221d]'
                          : 'bg-transparent text-[#9f8a7b] hover:text-[#2b221d] border-[#eadfd1] hover:border-[#cfa87a]'
                      }`}
                    >
                      {lang.code.split('-')[0].toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-[#eadfd1] tracking-widest">穢 Sonpin</p>
          </div>
        </div>
      </div>
    </>
  );
}



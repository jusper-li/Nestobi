import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookMarked,
  Calendar,
  Check,
  ChevronDown,
  Coffee,
  Globe,
  History,
  Home,
  Hotel,
  Languages,
  LayoutDashboard,
  LogOut,
  Map,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Star,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LANG_OPTIONS, type Lang } from '../i18n/translations';

export default function Navigation() {
  const { user, profile, role, signOut } = useAuth();
  const { totalItems } = useCart();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
    navigate('/');
  };

  const navLinks = [
    { to: '/rooms', label: t.nav.rooms, icon: Hotel },
    { to: '/shop', label: t.nav.shop, icon: Package },
    { to: '/blog', label: t.nav.blog, icon: Coffee },
    { to: '/stores', label: '門市據點', icon: MapPin },
    { to: '/ai/itinerary', label: t.nav.aiItinerary, icon: Map, requiresAuth: true },
    { to: '/ai/translator', label: t.nav.aiTranslator, icon: Languages, requiresAuth: true },
    { to: '/ai/chat', label: t.nav.aiChat, icon: MessageCircle, requiresAuth: true },
    { to: '/ai/passport', label: t.nav.travelPassport, icon: BookMarked, requiresAuth: true },
  ];

  const memberLinks = [
    { to: '/member', label: t.nav.memberCenter, icon: LayoutDashboard },
    { to: '/member/bookings', label: t.nav.myBookings, icon: Calendar },
    { to: '/member/orders', label: t.nav.myOrders, icon: History },
    { to: '/member/purchases', label: t.nav.myPurchases, icon: Receipt },
    { to: '/member/points', label: t.nav.myPoints, icon: Star },
    { to: '/ai/passport', label: t.nav.travelPassport, icon: BookMarked },
    { to: '/member/profile', label: t.nav.profile, icon: User },
    { to: '/member/preferences', label: t.nav.settings, icon: Settings },
  ];

  const currentLangOption = LANG_OPTIONS.find(option => option.code === lang);

  return (
    <nav className="sticky top-0 z-50 border-b border-[#2C1F10]/10 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3">
            <img src="/20260407_nestobi_logo.svg" alt="Nestobi 根本在旅行" className="h-10 w-auto md:h-12" />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ to, label, icon: Icon, requiresAuth }) => {
              if (requiresAuth && !user) return null;

              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive(to)
                      ? 'bg-[#F0E4C8] text-[#2C1F10]'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setLangMenuOpen(open => !open);
                  setUserMenuOpen(false);
                }}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
              >
                <Globe size={16} />
                <span className="hidden sm:block">{currentLangOption?.flag}</span>
                <ChevronDown size={13} />
              </button>
              <AnimatePresence>
                {langMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl"
                  >
                    <p className="border-b border-gray-100 px-4 py-2 text-xs font-semibold text-gray-400">{t.common.language}</p>
                    {LANG_OPTIONS.map(option => (
                      <button
                        key={option.code}
                        type="button"
                        onClick={() => {
                          setLang(option.code as Lang);
                          setLangMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                      >
                        <span>{option.flag} {option.label}</span>
                        {lang === option.code && <Check size={14} className="text-[#C09A6A]" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link to="/cart" className="relative rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-[#2C1F10]" aria-label="購物車">
              <ShoppingCart size={21} />
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(open => !open);
                    setLangMenuOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 transition hover:bg-gray-100"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C09A6A] text-sm font-bold text-white">
                    {profile?.display_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                  <span className="hidden max-w-28 truncate sm:block">{profile?.display_name || user.email?.split('@')[0]}</span>
                  <ChevronDown size={14} />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl"
                    >
                      <div className="border-b border-gray-100 px-4 py-3">
                        <p className="truncate text-sm font-bold text-gray-900">{profile?.display_name || '會員'}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">{user.email}</p>
                      </div>
                      {memberLinks.map(({ to, label, icon: Icon }) => (
                        <Link
                          key={to}
                          to={to}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
                        >
                          <Icon size={15} className="text-gray-400" />
                          <span>{label}</span>
                        </Link>
                      ))}
                      {(role === 'admin' || role === 'superadmin') && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 border-t border-gray-100 px-4 py-2 text-sm font-semibold text-[#2C1F10] transition hover:bg-[#F0E4C8]"
                        >
                          <LayoutDashboard size={15} />
                          <span>{t.nav.adminPanel}</span>
                        </Link>
                      )}
                      {role === 'superadmin' && (
                        <Link
                          to="/superadmin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-[#2C1F10] transition hover:bg-[#F0E4C8]"
                        >
                          <Globe size={15} />
                          <span>{t.nav.superAdmin}</span>
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2.5 border-t border-gray-100 px-4 py-2 text-left text-sm text-danger transition hover:bg-red-50"
                      >
                        <LogOut size={15} />
                        <span>{t.nav.logout}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link to="/auth/login" className="px-3 py-2 text-sm font-semibold text-gray-700 transition hover:text-[#2C1F10]">
                  {t.nav.login}
                </Link>
                <Link to="/auth/register" className="rounded-lg bg-[#C09A6A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8B6840]">
                  {t.nav.register}
                </Link>
              </div>
            )}

            <button type="button" onClick={() => setMenuOpen(open => !open)} className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 md:hidden">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-200 bg-white md:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
                <Home size={16} />
                <span>首頁</span>
              </Link>
              <Link to="/cart" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
                <ShoppingCart size={16} />
                <span>購物車</span>
                {totalItems > 0 && (
                  <span className="ml-auto rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-white">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </Link>
              {navLinks.map(({ to, label, icon: Icon, requiresAuth }) => {
                if (requiresAuth && !user) return null;

                return (
                  <Link key={to} to={to} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
                    <Icon size={16} />
                    <span>{label}</span>
                  </Link>
                );
              })}
              {!user && (
                <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                  <Link to="/auth/login" onClick={() => setMenuOpen(false)} className="rounded-lg border border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-700">
                    {t.nav.login}
                  </Link>
                  <Link to="/auth/register" onClick={() => setMenuOpen(false)} className="rounded-lg bg-[#C09A6A] px-3 py-2 text-center text-sm font-semibold text-white">
                    {t.nav.register}
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(userMenuOpen || langMenuOpen) && (
        <button
          type="button"
          aria-label="關閉選單"
          className="fixed inset-0 z-40 cursor-default"
          onClick={() => {
            setUserMenuOpen(false);
            setLangMenuOpen(false);
          }}
        />
      )}
    </nav>
  );
}

import { useMemo, type ComponentType } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BookMarked,
  Home,
  Hotel,
  LayoutDashboard,
  Package,
  Search,
  ShoppingBag,
  Star,
  Store,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../lib/i18n';

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

  const items = useMemo<NavItem[]>(() => {
    const pathname = location.pathname;

    if (pathname.startsWith('/superadmin')) {
      return [
        { to: '/superadmin', label: pick('Overview', 'Overview', 'Overview', 'Overview'), icon: LayoutDashboard, activePaths: ['/superadmin'] },
        { to: '/superadmin/orders', label: pick('Orders', 'Orders', 'Orders', 'Orders'), icon: ShoppingBag },
        { to: '/superadmin/vendors', label: pick('Vendors', 'Vendors', 'Vendors', 'Vendors'), icon: Store },
        { to: '/superadmin/rooms', label: pick('Rooms', 'Rooms', 'Rooms', 'Rooms'), icon: Hotel },
        { to: '/superadmin/users', label: pick('Members', 'Members', 'Members', 'Members'), icon: Users },
      ];
    }

    if (pathname.startsWith('/admin')) {
      return [
        { to: '/admin', label: pick('Dashboard', 'Dashboard', 'Dashboard', 'Dashboard'), icon: LayoutDashboard, activePaths: ['/admin'] },
        { to: '/admin/orders', label: pick('Orders', 'Orders', 'Orders', 'Orders'), icon: ShoppingBag },
        { to: '/admin/rooms', label: pick('Rooms', 'Rooms', 'Rooms', 'Rooms'), icon: Hotel },
        { to: '/admin/products', label: pick('Products', 'Products', 'Products', 'Products'), icon: Package },
        { to: '/admin/users', label: pick('Members', 'Members', 'Members', 'Members'), icon: Users },
      ];
    }

    if (pathname.startsWith('/vendor')) {
      return [
        { to: '/vendor', label: pick('Dashboard', 'Dashboard', 'Dashboard', 'Dashboard'), icon: LayoutDashboard, activePaths: ['/vendor'] },
        { to: '/vendor/hotels', label: pick('Hotels', 'Hotels', 'Hotels', 'Hotels'), icon: Store },
        { to: '/vendor/rooms', label: pick('Rooms', 'Rooms', 'Rooms', 'Rooms'), icon: Hotel },
        { to: '/vendor/orders', label: pick('Orders', 'Orders', 'Orders', 'Orders'), icon: ShoppingBag },
        { to: '/vendor/profile', label: pick('Profile', 'Profile', 'Profile', 'Profile'), icon: User },
      ];
    }

    if (pathname.startsWith('/member')) {
      return [
        { to: '/member', label: pick('Member', 'Member', 'Member', 'Member'), icon: User, activePaths: ['/member'] },
        { to: '/member/bookings', label: pick('Bookings', 'Bookings', 'Bookings', 'Bookings'), icon: Hotel },
        { to: '/member/orders', label: pick('Orders', 'Orders', 'Orders', 'Orders'), icon: ShoppingBag },
        { to: '/member/points', label: pick('Points', 'Points', 'Points', 'Points'), icon: Star },
        { to: '/member/profile', label: pick('Profile', 'Profile', 'Profile', 'Profile'), icon: BookMarked },
      ];
    }

    return [
      { to: '/', label: pick('Home', 'Home', 'Home', 'Home'), icon: Home, activePaths: ['/'] },
      { to: '/rooms', label: pick('Search', 'Search', 'Search', 'Search'), icon: Search },
      { to: '/member?tool=favorites', label: pick('Saved', 'Saved', 'Saved', 'Saved'), icon: Star, activePaths: ['/member'] },
      { to: '/member/orders', label: pick('Orders', 'Orders', 'Orders', 'Orders'), icon: ShoppingBag },
      { to: user ? '/member' : '/auth/login', label: pick('Me', 'Me', 'Me', 'Me'), icon: User, activePaths: ['/member'] },
    ];
  }, [location.pathname, locale, pick, user]);

  if (location.pathname === '/') {
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

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';
import { ShieldOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../lib/i18n';

function LoadingScreen() {
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const text = pickByLang(normalizedLang, '載入中...', 'Loading...', '読み込み中...', '불러오는 중...');
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-travel-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">{text}</p>
      </div>
    </div>
  );
}

function canAccessVendor(role: string) {
  return role === 'vendor' || role === 'admin' || role === 'superadmin';
}

function canAccessAdmin(role: string) {
  return role === 'admin' || role === 'superadmin';
}

function canAccessSuperAdmin(role: string) {
  return role === 'superadmin';
}

function roleCanAccessRedirect(role: string, redirect: string) {
  if (redirect.startsWith('/superadmin')) return canAccessSuperAdmin(role);
  if (redirect.startsWith('/admin')) return canAccessAdmin(role);
  if (redirect.startsWith('/vendor')) return canAccessVendor(role);
  return true;
}

export function UserRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to={`/auth/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user || !canAccessAdmin(role))
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}

export function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user || !canAccessSuperAdmin(role))
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}

export function VendorRoute({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user || !canAccessVendor(role))
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}

export function StoreManagerRoute({ children }: { children: ReactNode }) {
  const { user, role, storeAssignments, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user || (!canAccessAdmin(role) && !storeAssignments.length))
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}

export function PermissionRoute({ children, permission }: { children: ReactNode; permission: string }) {
  const { role, hasPermission, loading } = useAuth();
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const title = pickByLang(normalizedLang, '沒有存取權限', 'Access Denied', 'アクセス権限がありません', '접근 권한이 없습니다');
  const desc = pickByLang(
    normalizedLang,
    '你的帳號沒有此功能權限，請聯繫超級管理員。',
    'Your account is not authorized for this feature. Please contact the super admin.',
    'この機能を利用する権限がありません。スーパー管理者に連絡してください。',
    '이 기능에 대한 권한이 없습니다. 최고 관리자에게 문의해 주세요.',
  );
  if (loading) return <LoadingScreen />;
  if (role === 'superadmin') return <>{children}</>;
  if (!hasPermission(permission)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ShieldOff className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-500 text-sm max-w-xs">{desc}</p>
      </div>
    );
  }
  return <>{children}</>;
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirect = params.get('redirect');

  if (loading) return <LoadingScreen />;
  if (user) {
    if (location.pathname === '/auth/login') return <>{children}</>;
    if (redirect && roleCanAccessRedirect(role, redirect))
      return <Navigate to={redirect} replace />;
    if (!redirect || !roleCanAccessRedirect(role, redirect)) {
      if (redirect) return <>{children}</>;
      if (role === 'superadmin') return <Navigate to="/superadmin" replace />;
      if (role === 'admin') return <Navigate to="/admin" replace />;
      if (role === 'vendor') return <Navigate to="/vendor" replace />;
      return <Navigate to="/member" replace />;
    }
  }
  return <>{children}</>;
}

export default UserRoute;


import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';
import { ShieldOff } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-travel-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">載入中...</p>
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

export function PermissionRoute({ children, permission }: { children: ReactNode; permission: string }) {
  const { role, hasPermission, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (role === 'superadmin') return <>{children}</>;
  if (!hasPermission(permission)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ShieldOff className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">無存取權限</h2>
        <p className="text-gray-500 text-sm max-w-xs">您的帳號尚未被授權存取此功能，請聯絡超級管理員。</p>
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

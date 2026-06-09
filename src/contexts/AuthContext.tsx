import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { GENERIC_AUTH_ERROR_MESSAGE } from '../lib/security';
import type { MemberProfile, UserAuth } from '../types';
import type { StoreLocationManager } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: MemberProfile | null;
  userAuth: UserAuth | null;
  storeAssignments: StoreLocationManager[];
  role: 'user' | 'admin' | 'superadmin' | 'vendor';
  permissions: Record<string, boolean>;
  loading: boolean;
  hasPermission: (key: string) => boolean;
  hasStorePermission: (storeId: string, permission?: 'any' | 'info' | 'products' | 'inventory' | 'points') => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<MemberProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getSecureLoginUrl() {
  return '/.netlify/functions/secure-login';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [userAuth, setUserAuth] = useState<UserAuth | null>(null);
  const [storeAssignments, setStoreAssignments] = useState<StoreLocationManager[]>([]);
  const [role, setRole] = useState<'user' | 'admin' | 'superadmin' | 'vendor'>('user');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const clearAuthenticatedState = useCallback(() => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setUserAuth(null);
    setStoreAssignments([]);
    setRole('user');
    setPermissions({});
    setLoading(false);
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      const [profileRes, authRes, assignmentRes] = await Promise.all([
        withTimeout(supabase.from('tbl_mn5wgzh0').select('*').eq('user_id', userId).maybeSingle(), 8000),
        withTimeout(supabase.from('tbl_user_auth').select('*').eq('user_id', userId).maybeSingle(), 8000),
        withTimeout(
          supabase
            .from('store_location_managers')
            .select('id,store_location_id,user_id,role,can_manage_store_info,can_manage_products,can_manage_inventory,can_manage_points,is_active,created_at,updated_at')
            .eq('user_id', userId)
            .eq('is_active', true),
          8000,
        ),
      ]);
      if (profileRes.data) setProfile(profileRes.data as MemberProfile);
      if (authRes.data) {
        setUserAuth(authRes.data as UserAuth);
        const userRole = authRes.data.role as 'user' | 'admin' | 'superadmin' | 'vendor';
        setRole(userRole);

        if (userRole === 'admin') {
          const { data: perms } = await supabase
            .from('user_permissions')
            .select('permission, granted')
            .eq('user_id', userId);
          const permMap: Record<string, boolean> = {};
          (perms || []).forEach((p: any) => { permMap[p.permission] = p.granted; });
          setPermissions(permMap);
        } else {
          setPermissions({});
        }
      }
      if (assignmentRes.error) {
        const assignmentError = assignmentRes.error as { message?: string; code?: string; details?: string } | null;
        const missingTable = assignmentError && (
          assignmentError.code === '42P01'
          || /store_location_managers/i.test(assignmentError.message || '')
          || /store_location_managers/i.test(assignmentError.details || '')
        );
        if (missingTable) {
          setStoreAssignments([]);
        } else {
          throw assignmentRes.error;
        }
      } else {
        setStoreAssignments((assignmentRes.data || []) as StoreLocationManager[]);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setStoreAssignments([]);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') setLoading(true);
          await fetchUserData(session.user.id);
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') setLoading(false);
        })();
      } else {
        clearAuthenticatedState();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasPermission = useCallback((key: string): boolean => {
    if (role === 'superadmin') return true;
    return permissions[key] === true;
  }, [role, permissions]);

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const res = await fetch(getSecureLoginUrl(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(json.error || GENERIC_AUTH_ERROR_MESSAGE);
      if (!json.session?.access_token || !json.session?.refresh_token) throw new Error(GENERIC_AUTH_ERROR_MESSAGE);

      const { error } = await supabase.auth.setSession({
        access_token: json.session.access_token,
        refresh_token: json.session.refresh_token,
      });
      if (error) throw new Error(GENERIC_AUTH_ERROR_MESSAGE);
      return;
    } catch {
      throw new Error(GENERIC_AUTH_ERROR_MESSAGE);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
      await Promise.allSettled([
        supabase.from('tbl_mn5wgzh0').upsert({ user_id: data.user.id, display_name: displayName }),
        supabase.from('tbl_user_auth').upsert({ user_id: data.user.id, role: 'user' }),
      ]);
    }
  };

  const signOut = async () => {
    try {
      const authClient = supabase.auth as any;

      if (typeof authClient._removeSession === 'function') {
        await authClient._removeSession();
      } else if (typeof window !== 'undefined') {
        window.localStorage.removeItem('supabase.auth.token');
        window.localStorage.removeItem('supabase.auth.token-code-verifier');
        window.localStorage.removeItem('supabase.auth.token-user');
      }
    } catch (err) {
      console.warn('Local sign out fallback failed:', err);
    } finally {
      clearAuthenticatedState();
    }
  };

  const resetPassword = async (email: string) => {
    const siteUrl = window.location.origin;
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ type: 'reset-password', to: email, data: { siteUrl } }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send reset email');
    }
  };

  const updateProfile = async (data: Partial<MemberProfile>) => {
    if (!user) throw new Error('Not signed in');
    const { error } = await supabase
      .from('tbl_mn5wgzh0')
      .upsert({ ...data, user_id: user.id, updated_at: new Date().toISOString() });
    if (error) throw error;
    await fetchUserData(user.id);
  };

  const refreshProfile = async () => {
    if (!user) return;
    await fetchUserData(user.id);
  };

  const refreshPermissions = async () => {
    if (!user || role !== 'admin') return;
    const { data: perms } = await supabase
      .from('user_permissions')
      .select('permission, granted')
      .eq('user_id', user.id);
    const permMap: Record<string, boolean> = {};
    (perms || []).forEach((p: any) => { permMap[p.permission] = p.granted; });
    setPermissions(permMap);
  };

  const hasStorePermission = useCallback((
    storeId: string,
    permission: 'any' | 'info' | 'products' | 'inventory' | 'points' = 'any',
  ): boolean => {
    if (role === 'superadmin' || role === 'admin') return true;
    return storeAssignments.some(assignment => (
      assignment.store_location_id === storeId
      && assignment.is_active
      && (
        permission === 'any'
        || (permission === 'info' && assignment.can_manage_store_info)
        || (permission === 'products' && assignment.can_manage_products)
        || (permission === 'inventory' && assignment.can_manage_inventory)
        || (permission === 'points' && assignment.can_manage_points)
      )
    ));
  }, [role, storeAssignments]);

  return (
    <AuthContext.Provider value={{
      user, session, profile, userAuth, storeAssignments, role, permissions, loading,
      hasPermission, hasStorePermission, signIn, signUp, signOut, resetPassword, updateProfile, refreshProfile, refreshPermissions
    }}>
      {children}
    </AuthContext.Provider>
  );
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), timeoutMs);
    promise.then(
      value => {
        window.clearTimeout(timer);
        resolve(value);
      },
      error => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

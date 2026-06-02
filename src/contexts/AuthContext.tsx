import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { GENERIC_AUTH_ERROR_MESSAGE } from '../lib/security';
import type { MemberProfile, UserAuth } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: MemberProfile | null;
  userAuth: UserAuth | null;
  role: 'user' | 'admin' | 'superadmin' | 'vendor';
  permissions: Record<string, boolean>;
  loading: boolean;
  hasPermission: (key: string) => boolean;
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
  const [role, setRole] = useState<'user' | 'admin' | 'superadmin' | 'vendor'>('user');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      const [profileRes, authRes] = await Promise.all([
        withTimeout(supabase.from('tbl_mn5wgzh0').select('*').eq('user_id', userId).maybeSingle(), 8000),
        withTimeout(supabase.from('tbl_user_auth').select('*').eq('user_id', userId).maybeSingle(), 8000),
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
    } catch (err) {
      console.error('Error fetching user data:', err);
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
        setProfile(null);
        setUserAuth(null);
        setRole('user');
        setPermissions({});
        setLoading(false);
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
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // ignore — local session will be cleared by the removal attempt above
    }
    setProfile(null);
    setUserAuth(null);
    setRole('user');
    setPermissions({});
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

  return (
    <AuthContext.Provider value={{
      user, session, profile, userAuth, role, permissions, loading,
      hasPermission, signIn, signUp, signOut, resetPassword, updateProfile, refreshProfile, refreshPermissions
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

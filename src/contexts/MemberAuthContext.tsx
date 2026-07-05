import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface MemberProfile {
  id: string;
  display_name: string;
  phone: string;
  avatar_url: string;
  is_active: boolean;
  total_spent: number;
  order_count: number;
  created_at: string;
  updated_at: string;
}

interface MemberAuthContextType {
  user: User | null;
  profile: MemberProfile | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ user: User | null; session: Session | null }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<MemberProfile, 'display_name' | 'phone' | 'avatar_url'>>) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const MemberAuthContext = createContext<MemberAuthContextType | undefined>(undefined);

export function MemberAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          await loadProfile(session.user.id);
        })();
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const normalizeEmail = (value: string) => value.trim().toLowerCase();

  const loadProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('member_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      setProfile(data);
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (updates: Partial<Pick<MemberProfile, 'display_name' | 'phone' | 'avatar_url'>>) => {
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('member_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) throw error;
    await loadProfile(user.id);
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <MemberAuthContext.Provider value={{
      user, profile, session, isLoading,
      signUp, signIn, signOut, updateProfile, updatePassword, refreshProfile,
    }}>
      {children}
    </MemberAuthContext.Provider>
  );
}

export function useMemberAuth() {
  const context = useContext(MemberAuthContext);
  if (context === undefined) {
    throw new Error('useMemberAuth must be used within a MemberAuthProvider');
  }
  return context;
}

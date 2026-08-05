import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';

const RETURN_PATH_KEY = 'nestobi_oauth_return_path';

type Role = 'user' | 'vendor' | 'admin' | 'superadmin';

function roleHome(role: Role) {
  if (role === 'superadmin') return '/superadmin';
  if (role === 'admin') return '/admin';
  if (role === 'vendor') return '/vendor';
  return '/member';
}

function safeReturnPath(path: string | null, role: Role) {
  if (!path?.startsWith('/') || path.startsWith('//')) return roleHome(role);
  if (path.startsWith('/superadmin')) return role === 'superadmin' ? path : roleHome(role);
  if (path.startsWith('/admin')) return role === 'admin' || role === 'superadmin' ? path : roleHome(role);
  if (path.startsWith('/vendor')) return role === 'vendor' || role === 'admin' || role === 'superadmin' ? path : roleHome(role);
  return path;
}

async function waitForOAuthSession(): Promise<Session> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session) return data.session;

  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    const timeout = window.setTimeout(() => {
      unsubscribe();
      reject(new Error('OAuth session timeout'));
    }, 8000);

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) return;
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(session);
    });

    unsubscribe = () => authListener.subscription.unsubscribe();
  });
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const finishLogin = async () => {
      try {
        const session = await waitForOAuthSession();
        const { data: authData, error: roleError } = await supabase
          .from('tbl_user_auth')
          .select('role, is_active')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (roleError) throw roleError;
        if (authData?.is_active === false) {
          await supabase.auth.signOut();
          throw new Error('Account disabled');
        }

        const role = (authData?.role || 'user') as Role;
        const returnPath = safeReturnPath(sessionStorage.getItem(RETURN_PATH_KEY), role);
        sessionStorage.removeItem(RETURN_PATH_KEY);

        if (!cancelled) navigate(returnPath, { replace: true });
      } catch (callbackError) {
        console.error('Google OAuth callback failed:', callbackError);
        sessionStorage.removeItem(RETURN_PATH_KEY);
        if (!cancelled) {
          setError(pick(
            'Google 登入失敗，請返回後再試一次。',
            'Google sign-in failed. Please return and try again.',
            'Google ログインに失敗しました。戻ってもう一度お試しください。',
            'Google 로그인에 실패했습니다. 돌아가서 다시 시도해 주세요.',
          ));
          window.setTimeout(() => navigate('/auth/login', { replace: true }), 2200);
        }
      }
    };

    void finishLogin();
    return () => { cancelled = true; };
  }, [navigate, normalizedLang]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F0E4C8] via-white to-[#F0E4C8] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${error ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
          {error ? <AlertCircle className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
        </div>
        <h1 className="text-xl font-bold text-gray-900">
          {error || pick(
            '正在完成 Google 登入',
            'Finishing Google sign-in',
            'Google ログインを完了しています',
            'Google 로그인을 완료하는 중입니다',
          )}
        </h1>
        {!error && (
          <div className="mt-5 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-amber-700" />
          </div>
        )}
      </div>
    </div>
  );
}

import { LogOut, Shield, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Header() {
  const { t } = useLanguage();
  const { admin, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 shadow-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-xl font-bold text-transparent">
                {t('admin.header.title', '後台管理')}
              </h2>
              <p className="text-xs text-slate-500">{t('admin.header.subtitle', 'Supabase Auth 驗證信登入')}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-2.5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 shadow-md">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">{admin?.name}</div>
              <div className="text-xs text-slate-500">{admin?.email}</div>
            </div>
          </div>

          <button
            onClick={() => void logout()}
            className="group flex items-center gap-2 rounded-xl border border-transparent px-4 py-2.5 text-slate-600 transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            <span className="text-sm font-medium">{t('admin.header.logout', '登出')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

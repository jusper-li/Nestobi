import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Coffee,
  CreditCard as Edit2,
  Lock,
  LogOut,
  Mail,
  Phone,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import { useMemberAuth } from '../contexts/MemberAuthContext';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import { useLanguage } from '../contexts/LanguageContext';

type EditSection = 'profile' | 'password' | null;

export default function MemberProfile() {
  const { t } = useLanguage();
  const { user, profile, isLoading, signOut, updateProfile, updatePassword, refreshProfile } = useMemberAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState<EditSection>(null);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/member');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  useEffect(() => {
    if (user) refreshProfile();
  }, [user, refreshProfile]);

  const cancelEdit = () => {
    setEditing(null);
    setError('');
    if (profile) {
      setDisplayName(profile.display_name || '');
      setPhone(profile.phone || '');
    }
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSaveProfile = async () => {
    setError('');
    if (!displayName.trim()) {
      setError(t('member.profile.error.nameRequired', '請輸入會員名稱。'));
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({ display_name: displayName.trim(), phone: phone.trim() });
      setEditing(null);
      setSuccessMsg(t('member.profile.success.profileSaved', '會員資料已更新。'));
      window.setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError(t('member.profile.error.profileSaveFailed', '會員資料更新失敗，請稍後再試。'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePassword = async () => {
    setError('');
    if (newPassword.length < 6) {
      setError(t('member.profile.error.passwordTooShort', '密碼至少需要 6 個字元。'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('member.profile.error.passwordMismatch', '兩次輸入的密碼不一致。'));
      return;
    }

    setIsSaving(true);
    try {
      await updatePassword(newPassword);
      setEditing(null);
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg(t('member.profile.success.passwordSaved', '密碼已更新。'));
      window.setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError(t('member.profile.error.passwordSaveFailed', '密碼更新失敗，請稍後再試。'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const initials = profile?.display_name
    ? profile.display_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || '?';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fbf6ee] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-700" />
      </div>
    );
  }

  const displayedName = profile?.display_name || t('member.profile.placeholder.name', '尚未填寫');
  const displayedPhone = profile?.phone || t('member.profile.placeholder.phone', '尚未填寫');

  return (
    <div className="min-h-screen bg-[#fbf6ee]">
      <SiteHeader />

      <main className="pb-20 pt-20">
        <div className="container mx-auto max-w-2xl px-5">
          <div className="mb-8 flex items-center gap-3 pt-8">
            <Link to="/" className="flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700">
              <ArrowLeft className="h-4 w-4" />
              {t('common.backHome', '返回首頁')}
            </Link>
          </div>

          <div className="mb-5 overflow-hidden rounded-2xl border border-[#eadfd1] bg-[#fffaf2] shadow-[0_18px_50px_rgba(61,43,31,0.08)]">
            <div className="flex items-center gap-5 bg-[linear-gradient(135deg,#c7a08d_0%,#a97a4f_100%)] px-6 py-8">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-[#2b221d] shadow-lg">
                <span className="text-2xl font-semibold text-[#fffaf2]">{initials}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-semibold text-white">
                  {profile?.display_name || t('member.profile.titleFallback', '會員')}
                </h1>
                <p className="truncate text-sm text-stone-400">{user?.email}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span className="text-xs tracking-wide text-stone-400">Sonpin {t('member.profile.badge', '會員')}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white/80 transition-all hover:bg-white/20 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                {t('member.profile.logout', '登出')}
              </button>
            </div>

            <div className="grid grid-cols-2 divide-x divide-stone-100 border-t border-stone-100">
              <div className="p-5 text-center">
                <div className="mb-1 flex items-center justify-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-amber-500" />
                  <span className="text-xl font-semibold text-stone-800">{profile?.order_count ?? 0}</span>
                </div>
                <p className="text-xs text-stone-500">{t('member.profile.stats.orders', '累計訂單')}</p>
              </div>
              <div className="p-5 text-center">
                <div className="mb-1 flex items-center justify-center gap-2">
                  <Coffee className="h-4 w-4 text-amber-500" />
                  <span className="text-xl font-semibold text-stone-800">
                    NT$ {(profile?.total_spent ?? 0).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-stone-500">{t('member.profile.stats.spent', '累計消費')}</p>
              </div>
            </div>
          </div>

          {successMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <Check className="h-4 w-4 flex-shrink-0" />
              {successMsg}
            </div>
          )}

          <div className="mb-5 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-50 px-6 py-4">
              <h2 className="text-sm font-semibold tracking-wide text-stone-700">
                {t('member.profile.section.profile', '會員資料')}
              </h2>
              {editing !== 'profile' ? (
                <button
                  onClick={() => {
                    setEditing('profile');
                    setError('');
                  }}
                  className="flex items-center gap-1.5 text-xs text-stone-500 transition-colors hover:text-amber-700"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  {t('member.profile.edit', '編輯')}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex items-center gap-1 rounded-lg bg-stone-700 px-3 py-1.5 text-xs text-white transition-all hover:bg-stone-600 disabled:opacity-60"
                  >
                    {isSaving ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Check className="h-3 w-3" />}
                    {t('common.save', '儲存')}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1 rounded-lg bg-stone-100 px-3 py-1.5 text-xs text-stone-600 transition-all hover:bg-stone-200"
                  >
                    <X className="h-3 w-3" />
                    {t('common.cancel', '取消')}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-5 px-6 py-5">
              {error && editing === 'profile' && <p className="text-xs text-red-500">{error}</p>}

              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                  <User className="h-3.5 w-3.5" />
                  {t('member.profile.name', '會員名稱')}
                </label>
                {editing === 'profile' ? (
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-800 transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  />
                ) : (
                  <p className="text-sm text-stone-800">{displayedName}</p>
                )}
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                  <Mail className="h-3.5 w-3.5" />
                  {t('member.profile.email', '電子郵件')}
                </label>
                <p className="text-sm text-stone-600">{user?.email}</p>
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                  <Phone className="h-3.5 w-3.5" />
                  {t('member.profile.phone', '手機號碼')}
                </label>
                {editing === 'profile' ? (
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09xxxxxxxx"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-800 transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  />
                ) : (
                  <p className="text-sm text-stone-800">{displayedPhone}</p>
                )}
              </div>
            </div>
          </div>

          <div className="mb-5 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-50 px-6 py-4">
              <h2 className="text-sm font-semibold tracking-wide text-stone-700">
                {t('member.profile.section.password', '密碼管理')}
              </h2>
              {editing !== 'password' ? (
                <button
                  onClick={() => {
                    setEditing('password');
                    setError('');
                  }}
                  className="flex items-center gap-1.5 text-xs text-stone-500 transition-colors hover:text-amber-700"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  {t('member.profile.password.edit', '修改密碼')}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSavePassword}
                    disabled={isSaving}
                    className="flex items-center gap-1 rounded-lg bg-stone-700 px-3 py-1.5 text-xs text-white transition-all hover:bg-stone-600 disabled:opacity-60"
                  >
                    {isSaving ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Check className="h-3 w-3" />}
                    {t('common.save', '儲存')}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1 rounded-lg bg-stone-100 px-3 py-1.5 text-xs text-stone-600 transition-all hover:bg-stone-200"
                  >
                    <X className="h-3 w-3" />
                    {t('common.cancel', '取消')}
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 py-5">
              {editing === 'password' ? (
                <div className="space-y-4">
                  {error && editing === 'password' && <p className="text-xs text-red-500">{error}</p>}
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-stone-500">
                      {t('member.profile.password.new', '新密碼')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t('member.profile.password.placeholder', '至少 6 個字元')}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-sm text-stone-800 transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-stone-500">
                      {t('member.profile.password.confirm', '確認新密碼')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t('member.profile.password.confirmPlaceholder', '再次輸入新密碼')}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-sm text-stone-800 transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-stone-500">
                  <Lock className="h-4 w-4 text-stone-300" />
                  <span className="text-sm">{t('member.profile.password.hidden', '密碼已遮蔽')}</span>
                  <span className="text-xs text-stone-400">
                    {t('member.profile.password.note', '若要更改請點擊右上角修改密碼')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
            <Link
              to="/shop"
              className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-stone-50 group"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-stone-700">
                  {t('member.profile.shopLink', '前往禮盒商城')}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-300 transition-colors group-hover:text-amber-400" />
            </Link>
            <div className="border-t border-stone-50">
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-red-50 group"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="h-4 w-4 text-stone-400 transition-colors group-hover:text-red-400" />
                  <span className="text-sm font-medium text-stone-600 transition-colors group-hover:text-red-500">
                    {t('member.profile.logout', '登出')}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-stone-300 transition-colors group-hover:text-red-300" />
              </button>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

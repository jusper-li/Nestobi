import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BadgeCheck, Bot, Database, ExternalLink, Globe2, KeyRound, Mail, RefreshCcw, Server, ShieldCheck } from 'lucide-react';
import { APP_BUILD_LABEL, APP_COMMIT_LONG, APP_COMMIT_SHA } from '../../lib/appVersion';
import { PLATFORM_OPENAI_MODELS, PLATFORM_OPERATION_NOTES, PLATFORM_SERVICES } from '../../lib/platformInfo';
import { supabase } from '../../lib/supabase';
import { formatDateTime } from '../../lib/utils';

type SiteSettingsSummary = {
  contact_email?: string | null;
  order_notification_emails?: string | null;
  support_notification_emails?: string | null;
  refund_notification_emails?: string | null;
  updated_at?: string | null;
};

const serviceIcons: Record<string, React.ReactNode> = {
  'AI API': <Bot className="h-5 w-5" />,
  '金流 API': <KeyRound className="h-5 w-5" />,
  '電子發票 API': <BadgeCheck className="h-5 w-5" />,
  '物流 API': <Server className="h-5 w-5" />,
  '信件 API': <Mail className="h-5 w-5" />,
  '資料庫 / 身分驗證': <Database className="h-5 w-5" />,
  '主機 / 部署': <Globe2 className="h-5 w-5" />,
};

const shortCommit = (value: string) => (value && value !== 'dev' ? value.slice(0, 12) : value || 'dev');

const maskUrl = (value?: string) => {
  if (!value) return '未設定';
  try {
    const url = new URL(value);
    return `${url.origin}`;
  } catch {
    return value;
  }
};

const splitEmails = (value?: string | null) =>
  String(value || '')
    .split(',')
    .map(email => email.trim())
    .filter(Boolean);

const InfoCard: React.FC<{ title: string; value: string; hint: string; icon: React.ReactNode }> = ({ title, value, hint, icon }) => (
  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">{icon}</div>
    </div>
    <p className="text-sm font-medium text-slate-500">{title}</p>
    <p className="mt-2 break-words text-xl font-bold text-slate-900">{value}</p>
    <p className="mt-2 text-xs leading-5 text-slate-400">{hint}</p>
  </div>
);

const SuperAdminPlatformInfo: React.FC = () => {
  const [siteSettings, setSiteSettings] = useState<SiteSettingsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || `${window.location.origin}/supabase`;
  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://nestobi.com';

  const fetchInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const settingsResult = await supabase
        .from('site_settings')
        .select('contact_email,order_notification_emails,support_notification_emails,refund_notification_emails,updated_at')
        .limit(1)
        .maybeSingle();
      if (!settingsResult.error) {
        setSiteSettings(settingsResult.data as SiteSettingsSummary | null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '平台資訊讀取失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchInfo();
  }, []);

  const notificationEmails = useMemo(() => {
    const values = [
      ...splitEmails(siteSettings?.order_notification_emails),
      ...splitEmails(siteSettings?.support_notification_emails),
      ...splitEmails(siteSettings?.refund_notification_emails),
    ];
    return Array.from(new Set(values));
  }, [siteSettings]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="mb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-100 p-2">
            <ShieldCheck className="h-6 w-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">本站設定與系統說明</h1>
            <p className="mt-1 max-w-3xl text-sm text-gray-500">
              快速確認目前平台使用的 AI、金流、發票、信件、資料庫與主機資訊。此頁只顯示安全摘要。
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchInfo}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          disabled={loading}
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          重新整理
        </button>
      </div>

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        <InfoCard title="目前版本" value={APP_BUILD_LABEL} hint="由 Git commit 自動帶入 build label" icon={<BadgeCheck className="h-5 w-5" />} />
        <InfoCard title="目前 Commit" value={shortCommit(APP_COMMIT_LONG || APP_COMMIT_SHA)} hint="可用於追查 Netlify 部署與 Git 版本" icon={<Activity className="h-5 w-5" />} />
        <InfoCard title="正式站 / 本機來源" value={currentHost} hint="目前瀏覽器載入的站台來源" icon={<Globe2 className="h-5 w-5" />} />
        <InfoCard title="Supabase API" value={maskUrl(supabaseUrl)} hint="只顯示 API origin，不顯示 anon 或 service key" icon={<Database className="h-5 w-5" />} />
      </div>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900">OpenAI 使用版本</h2>
              <p className="mt-1 text-sm text-slate-500">以下為程式預設模型；正式值可由 Supabase Edge Function Secrets 的環境變數覆蓋。</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Edge Function 呼叫</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">用途</th>
                  <th className="px-4 py-3">預設模型</th>
                  <th className="px-4 py-3">覆蓋環境變數</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PLATFORM_OPENAI_MODELS.map(model => (
                  <tr key={model.label}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{model.label}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{model.value}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{model.env}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">資訊分工</h2>
              <p className="text-sm text-slate-500">避免與活動紀錄、版本與稽核重複</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: '操作軌跡', href: '/superadmin/activity-logs', text: '查看管理員新增、修改、刪除等操作紀錄。' },
              { label: '版本稽核', href: '/superadmin/version-logs', text: '查看 build、commit、系統檢查與基線紀錄。' },
              { label: '營運摘要', href: '/superadmin', text: '查看會員、訂房、訂單與營收數字。' },
            ].map(link => (
              <a key={link.href} href={link.href} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-emerald-50">
                <span>
                  <span className="block text-sm font-bold text-slate-900">{link.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{link.text}</span>
                </span>
                <ExternalLink className="h-4 w-4 text-slate-400" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-black text-slate-900">目前使用的 API / 服務</h2>
          <p className="mt-1 text-sm text-slate-500">管理員可用這裡快速理解平台依賴哪些服務與後端入口。</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {PLATFORM_SERVICES.map(service => (
            <article key={service.group} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm">
                  {serviceIcons[service.group] || <Server className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700">{service.group}</p>
                  <h3 className="text-lg font-black text-slate-900">{service.provider}</h3>
                </div>
              </div>
              <div className="space-y-3 text-sm leading-6">
                <p><span className="font-bold text-slate-700">用途：</span><span className="text-slate-600">{service.usage}</span></p>
                <p><span className="font-bold text-slate-700">入口：</span><span className="font-mono text-xs text-slate-600">{service.entry}</span></p>
                <p className="rounded-2xl bg-white px-3 py-2 text-xs leading-5 text-slate-500">{service.security}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">管理通知信箱</h2>
          <p className="mt-1 text-sm text-slate-500">來源：網站設定。這裡只顯示收件信箱，不包含信件 API 金鑰。</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(notificationEmails.length ? notificationEmails : ['尚未設定']).map(email => (
              <span key={email} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">{email}</span>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400">網站設定更新時間：{siteSettings?.updated_at ? formatDateTime(siteSettings.updated_at) : '-'}</p>
        </div>

        <div className="rounded-[2rem] border border-amber-100 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">安全與維運提醒</h2>
          <ul className="mt-4 space-y-3">
            {PLATFORM_OPERATION_NOTES.map(note => (
              <li key={note} className="flex gap-3 text-sm leading-6 text-slate-700">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};

export default SuperAdminPlatformInfo;

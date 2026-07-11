import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  Save,
  Eye,
  Image,
  Phone,
  Share2,
  Mail,
  BarChart3,
  Search,
  Bot,
  FileText,
  Check,
  Upload,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSiteSettings, type SiteSettings } from '../../contexts/SiteSettingsContext';

const UPLOAD_FIELDS = new Set(['site_icon_url', 'og_image_url']);
const PUBLIC_SITE_HOST = 'nestobi.netlify.app';
const GA_STATUS_STORAGE_KEY = 'nestobi:ga-status:v1';
const GA_STATUS_UPDATED_EVENT = 'nestobi-ga-status-updated';

interface GoogleTagStatus {
  measurementId: string;
  scriptLoaded: boolean;
  consentGranted: boolean;
  lastPageViewPath: string;
  lastPageViewTitle: string;
  lastPageViewAt: string;
  lastSyncAt: string;
}

function readGoogleTagStatus(): GoogleTagStatus | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(GA_STATUS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GoogleTagStatus>;
    if (!parsed.measurementId) return null;
    return {
      measurementId: parsed.measurementId,
      scriptLoaded: Boolean(parsed.scriptLoaded),
      consentGranted: Boolean(parsed.consentGranted),
      lastPageViewPath: typeof parsed.lastPageViewPath === 'string' ? parsed.lastPageViewPath : '',
      lastPageViewTitle: typeof parsed.lastPageViewTitle === 'string' ? parsed.lastPageViewTitle : '',
      lastPageViewAt: typeof parsed.lastPageViewAt === 'string' ? parsed.lastPageViewAt : '',
      lastSyncAt: typeof parsed.lastSyncAt === 'string' ? parsed.lastSyncAt : '',
    };
  } catch {
    return null;
  }
}

type FieldType = 'text' | 'textarea' | 'color';

interface SettingField {
  key: keyof SiteSettings;
  label: string;
  placeholder: string;
  type: FieldType;
}

interface FieldGroup {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: SettingField[];
}

const FIELD_GROUPS: FieldGroup[] = [
  {
    title: 'Branding',
    icon: Globe,
    fields: [
      { key: 'site_name', label: 'Site name', placeholder: 'Nestobi', type: 'text' },
      { key: 'site_slogan', label: 'Site slogan', placeholder: 'Your friendly travel companion', type: 'text' },
      { key: 'site_description', label: 'Site description', placeholder: 'Short description used for SEO', type: 'textarea' },
    ],
  },
  {
    title: 'Assets',
    icon: Image,
    fields: [
      { key: 'site_icon_url', label: 'Favicon URL', placeholder: '/20260407_nestobi_logo.svg', type: 'text' },
      { key: 'og_image_url', label: 'OG image URL', placeholder: 'https://nestobi.netlify.app/og-nestobi-logo.png', type: 'text' },
    ],
  },
  {
    title: 'SEO',
    icon: Search,
    fields: [
      { key: 'meta_keywords', label: 'Meta keywords', placeholder: 'Nestobi, travel, AI, coffee', type: 'textarea' },
      { key: 'theme_color', label: 'Theme color', placeholder: '#C09A6A', type: 'color' },
    ],
  },
  {
    title: 'AI summary',
    icon: Bot,
    fields: [
      { key: 'ai_site_summary', label: 'AI site summary', placeholder: 'Short summary for AI assistants', type: 'textarea' },
    ],
  },
  {
    title: 'Google Analytics',
    icon: BarChart3,
    fields: [
      { key: 'ga_measurement_id', label: 'Measurement ID', placeholder: 'G-9JDDRD8P1X', type: 'text' },
    ],
  },
  {
    title: 'Contact',
    icon: Phone,
    fields: [
      { key: 'contact_phone', label: 'Phone', placeholder: '02-27565663', type: 'text' },
      { key: 'contact_email', label: 'Email', placeholder: 'service@dlalshop.com', type: 'text' },
      { key: 'company_no', label: 'Company no.', placeholder: '83122492', type: 'text' },
      { key: 'company_name', label: 'Company name', placeholder: 'Company legal name', type: 'text' },
      { key: 'headquarters_address', label: 'Headquarters address', placeholder: 'Address', type: 'text' },
    ],
  },
  {
    title: 'Notification emails',
    icon: Mail,
    fields: [
      { key: 'support_notification_emails', label: 'Support', placeholder: 'service@dlalshop.com, support@nestobi.com', type: 'textarea' },
      { key: 'booking_notification_emails', label: 'Booking', placeholder: 'booking@nestobi.com', type: 'textarea' },
      { key: 'order_notification_emails', label: 'Orders', placeholder: 'orders@nestobi.com, finance@nestobi.com', type: 'textarea' },
      { key: 'system_notification_emails', label: 'System', placeholder: 'ops@nestobi.com', type: 'textarea' },
      { key: 'payment_failed_notification_emails', label: 'Payment failed', placeholder: 'finance@nestobi.com', type: 'textarea' },
      { key: 'refund_notification_emails', label: 'Refund', placeholder: 'finance@nestobi.com, service@nestobi.com', type: 'textarea' },
      { key: 'member_notification_emails', label: 'Member', placeholder: 'crm@nestobi.com', type: 'textarea' },
      { key: 'alert_notification_emails', label: 'Alerts', placeholder: 'ops@nestobi.com, dev@nestobi.com', type: 'textarea' },
    ],
  },
  {
    title: 'Social links',
    icon: Share2,
    fields: [
      { key: 'social_facebook', label: 'Facebook', placeholder: 'https://www.facebook.com/...', type: 'text' },
      { key: 'social_instagram', label: 'Instagram', placeholder: 'https://www.instagram.com/...', type: 'text' },
      { key: 'social_line', label: 'LINE', placeholder: 'https://line.me/R/ti/p/@992kypjr', type: 'text' },
      { key: 'social_youtube', label: 'YouTube', placeholder: 'https://www.youtube.com/@dlal_travel', type: 'text' },
      { key: 'social_x', label: 'X', placeholder: 'https://x.com/DLALTaiwan', type: 'text' },
      { key: 'social_twitter', label: 'Twitter / X', placeholder: '@nestobi', type: 'text' },
      { key: 'social_tiktok', label: 'TikTok', placeholder: 'https://www.tiktok.com/@dlal.tw', type: 'text' },
    ],
  },
];

const SuperAdminSiteSettings: React.FC = () => {
  const { settings, refresh } = useSiteSettings();
  const [form, setForm] = useState<SiteSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [gaStatus, setGaStatus] = useState<GoogleTagStatus | null>(null);

  useEffect(() => {
    if (settings.id) setForm(settings);
  }, [settings]);

  useEffect(() => {
    const syncGaStatus = () => setGaStatus(readGoogleTagStatus());
    syncGaStatus();
    window.addEventListener(GA_STATUS_UPDATED_EVENT, syncGaStatus);
    window.addEventListener('storage', syncGaStatus);
    return () => {
      window.removeEventListener(GA_STATUS_UPDATED_EVENT, syncGaStatus);
      window.removeEventListener('storage', syncGaStatus);
    };
  }, []);

  const handleChange = (key: keyof SiteSettings, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const handleUpload = async (key: keyof SiteSettings, file: File) => {
    setUploading(key);
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${String(key)}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('site-assets').upload(fileName, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from('site-assets').getPublicUrl(fileName);
      handleChange(key, data.publicUrl);
    }
    setUploading(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const { id, ...rest } = form;
    await supabase.from('site_settings').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id);
    await refresh();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const previewTitle = `${form.site_name} · ${form.site_slogan}`;
  const previewDesc = form.site_description.slice(0, 160);
  const formValues = form as unknown as Record<string, string>;

  const previewSummary = useMemo(() => form.ai_site_summary || form.site_description || '(Empty)', [form.ai_site_summary, form.site_description]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
          <p className="mt-0.5 text-sm text-gray-500">Manage brand, SEO, contact, notifications, and AI metadata.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition ${showPreview ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-gray-200 bg-white text-gray-600 hover:border-sky-200'}`}
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Hide preview' : 'Show preview'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
          >
            {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? 'Saved' : 'Save changes'}
          </button>
        </div>
      </div>

      {showPreview && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-700">Search preview</p>
          </div>
          <div className="space-y-4 rounded-xl bg-slate-50 p-5">
            <div>
              <p className="mb-1 text-xs text-gray-500">Google result</p>
              <div className="mb-1 flex items-center gap-2">
                {form.site_icon_url && <img src={form.site_icon_url} alt="" className="h-5 w-5 rounded" onError={e => (e.currentTarget.style.display = 'none')} />}
                <span className="text-sm text-gray-600">{PUBLIC_SITE_HOST}</span>
              </div>
              <p className="cursor-default text-lg font-medium leading-snug text-blue-700 hover:underline">{previewTitle || 'Untitled'}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-gray-600">{previewDesc || 'No description'}</p>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <p className="mb-2 text-xs text-gray-500">OG preview</p>
              <div className="max-w-sm overflow-hidden rounded-lg border border-gray-200">
                {form.og_image_url && (
                  <div className="flex h-36 items-center justify-center bg-gray-100">
                    <img src={form.og_image_url} alt="" className="h-full w-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
                <div className="bg-gray-50 p-3">
                  <p className="text-xs uppercase text-gray-400">{PUBLIC_SITE_HOST}</p>
                  <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-gray-900">{form.site_name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{previewDesc}</p>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <p className="mb-2 flex items-center gap-1 text-xs text-gray-500">
                <Bot className="h-3.5 w-3.5" />
                AI summary
              </p>
              <div className="rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">{previewSummary}</div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="space-y-6">
        {FIELD_GROUPS.map(group => {
          const Icon = group.icon;
          return (
            <motion.div key={group.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Icon className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">{group.title}</h2>
              </div>
              <div className="space-y-4 p-6">
                {group.fields.map(field => (
                  <div key={String(field.key)}>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={formValues[field.key] || ''}
                        onChange={e => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                      />
                    ) : field.type === 'color' ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={formValues[field.key] || '#C09A6A'}
                          onChange={e => handleChange(field.key, e.target.value)}
                          className="h-10 w-10 cursor-pointer rounded-lg border border-gray-200 p-0.5"
                        />
                        <input
                          type="text"
                          value={formValues[field.key] || ''}
                          onChange={e => handleChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                        />
                        <div className="h-8 w-8 rounded-lg border border-gray-200" style={{ backgroundColor: formValues[field.key] || '#C09A6A' }} />
                      </div>
                    ) : UPLOAD_FIELDS.has(field.key) ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formValues[field.key] || ''}
                            onChange={e => handleChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                          />
                          <label className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 transition hover:bg-amber-100">
                            {uploading === field.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            Upload
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleUpload(field.key, file);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                        {formValues[field.key] && (
                          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                            <img
                              src={formValues[field.key]}
                              alt="preview"
                              className={field.key === 'site_icon_url' ? 'h-10 w-10 object-contain' : 'h-20 rounded-lg object-cover'}
                              onError={e => (e.currentTarget.style.display = 'none')}
                            />
                            <span className="flex-1 truncate text-xs text-gray-400">{formValues[field.key]}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={formValues[field.key] || ''}
                        onChange={e => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                      />
                    )}
                    {field.key === 'ga_measurement_id' && (
                      <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                        This Measurement ID is used for Google Tag and page_view tracking.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Google Tag status</h2>
            <p className="mt-0.5 text-xs text-gray-500">This panel shows whether gtag is loaded and whether page_view events are being sent.</p>
          </div>
          <button type="button" onClick={() => setGaStatus(readGoogleTagStatus())} className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                {gaStatus?.scriptLoaded ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                Script loaded
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900">{gaStatus?.scriptLoaded ? 'gtag.js loaded' : 'Not loaded yet'}</p>
              <p className="mt-1 break-all text-xs text-slate-500">{gaStatus?.measurementId || form.ga_measurement_id || 'G-9JDDRD8P1X'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                {gaStatus?.consentGranted ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                Consent
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900">{gaStatus?.consentGranted ? 'analytics_storage granted' : 'analytics_storage not granted'}</p>
              <p className="mt-1 text-xs text-slate-500">This depends on cookie consent and your tracking configuration.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                {gaStatus?.lastPageViewAt ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                page_view
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900">{gaStatus?.lastPageViewAt ? 'Latest page view sent' : 'No page_view yet'}</p>
              <p className="mt-1 text-xs text-slate-500">{gaStatus?.lastPageViewAt || 'No page_view has been recorded yet'}</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">Last page_view path</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{gaStatus?.lastPageViewPath || 'No path recorded'}</p>
              <p className="mt-1 text-xs text-slate-500">{gaStatus?.lastPageViewTitle || 'No title recorded'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">Last sync time</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{gaStatus?.lastSyncAt ? new Date(gaStatus.lastSyncAt).toLocaleString('zh-TW') : 'No sync yet'}</p>
              <p className="mt-1 text-xs text-slate-500">Updated whenever the GA status storage entry changes.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 p-4 text-sm leading-relaxed text-sky-900">
            Make sure your public site uses the correct measurement ID, and that consent logic allows analytics_storage before you expect page_view events to appear.
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-700">
            <FileText className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-semibold text-gray-900">SEO checklist</h2>
        </div>
        <div className="p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { ok: !!form.site_name, label: 'Site name set' },
              { ok: !!form.site_description, label: 'Description set' },
              { ok: !!form.site_icon_url, label: 'Favicon set' },
              { ok: !!form.og_image_url, label: 'OG image set' },
              { ok: !!form.meta_keywords, label: 'Keywords set' },
              { ok: !!form.ga_measurement_id, label: 'GA measurement ID set' },
            ].map(item => (
              <div key={item.label} className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${item.ok ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                {item.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SuperAdminSiteSettings;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Globe, Save, Eye, Image, Phone, Share2,
  Search, Bot, FileText, Check, Upload, Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSiteSettings, type SiteSettings } from '../../contexts/SiteSettingsContext';

const UPLOAD_FIELDS = new Set(['site_icon_url', 'og_image_url']);
const PUBLIC_SITE_HOST = 'nestobi.netlify.app';

const FIELD_GROUPS = [
  {
    title: '基本資訊',
    icon: Globe,
    fields: [
      { key: 'site_name', label: '網站名稱', placeholder: 'Nestobi 旅遊平台', type: 'text' },
      { key: 'site_slogan', label: '網站標語', placeholder: '智慧旅遊新體驗', type: 'text' },
      { key: 'site_description', label: '網站說明（Meta Description）', placeholder: '結合 AI 智慧科技...', type: 'textarea' },
    ],
  },
  {
    title: '圖示與圖片',
    icon: Image,
    fields: [
      { key: 'site_icon_url', label: '網站圖示 URL（Favicon）', placeholder: '/20260407_nestobi_logo.svg', type: 'text' },
      { key: 'og_image_url', label: 'OG 預覽圖片 URL', placeholder: 'https://nestobi.netlify.app/og-nestobi-logo.png', type: 'text' },
    ],
  },
  {
    title: 'SEO 設定',
    icon: Search,
    fields: [
      { key: 'meta_keywords', label: 'Meta Keywords（以逗號分隔）', placeholder: '旅遊平台, 訂房, AI旅遊...', type: 'textarea' },
      { key: 'theme_color', label: '主題色彩（瀏覽器列顏色）', placeholder: '#C09A6A', type: 'color' },
    ],
  },
  {
    title: 'AI 搜尋最佳化',
    icon: Bot,
    fields: [
      { key: 'ai_site_summary', label: 'AI 友善搜尋摘要（供 AI 爬蟲理解網站用途）', placeholder: '描述您的網站功能、目標受眾、核心服務...', type: 'textarea' },
    ],
  },
  {
    title: '聯絡資訊',
    icon: Phone,
    fields: [
            { key: 'contact_phone', label: '客服電話', placeholder: '02-27565663', type: 'text' },
      { key: 'contact_email', label: '客服信箱', placeholder: 'service@dlalshop.com', type: 'text' },
      { key: 'company_no', label: '統一編號', placeholder: '83122492', type: 'text' },
      { key: 'company_name', label: '營業人名稱', placeholder: '若水金禾餐飲股份有限公司', type: 'text' },
      { key: 'headquarters_address', label: '總部地址', placeholder: '台北市信義區忠孝東路四段553巷22弄4-1號', type: 'text' },
    ],
  },
  {
    title: '社群連結',
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

  const handleUpload = async (key: string, file: File) => {
    setUploading(key);
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${key}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('site-assets')
      .upload(fileName, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage
        .from('site-assets')
        .getPublicUrl(fileName);
      handleChange(key, urlData.publicUrl);
    }
    setUploading(null);
  };

  useEffect(() => {
    if (settings.id) setForm(settings);
  }, [settings]);

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { id, ...rest } = form;
    await supabase
      .from('site_settings')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id);
    await refresh();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const previewTitle = `${form.site_name} — ${form.site_slogan}`;
  const previewDesc = form.site_description.slice(0, 160);
  const formValues = form as unknown as Record<string, string>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">網站設定</h1>
          <p className="text-gray-500 text-sm mt-0.5">管理網站名稱、說明、圖示與 SEO / AI 搜尋設定</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition ${showPreview ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-white border-gray-200 text-gray-600 hover:border-sky-200'}`}
          >
            <Eye className="w-4 h-4" />{showPreview ? '隱藏預覽' : '搜尋預覽'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60 transition shadow-sm"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? '已儲存' : '儲存設定'}
          </button>
        </div>
      </div>

      {/* Google search preview */}
      {showPreview && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-700">搜尋引擎預覽</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-5 space-y-4">
            {/* Google style */}
            <div>
              <p className="text-xs text-gray-500 mb-1">Google 搜尋結果</p>
              <div className="flex items-center gap-2 mb-1">
                {form.site_icon_url && (
                  <img src={form.site_icon_url} alt="" className="w-5 h-5 rounded" onError={e => (e.currentTarget.style.display = 'none')} />
                )}
                <span className="text-sm text-gray-600">{PUBLIC_SITE_HOST}</span>
              </div>
              <p className="text-blue-700 text-lg leading-snug font-medium hover:underline cursor-default">{previewTitle || 'Untitled'}</p>
              <p className="text-sm text-gray-600 leading-relaxed mt-0.5">{previewDesc || 'No description'}</p>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 mb-2">OG 社群分享卡片預覽</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden max-w-sm">
                {form.og_image_url && (
                  <div className="h-36 bg-gray-100 flex items-center justify-center">
                    <img src={form.og_image_url} alt="" className="h-full w-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
                <div className="p-3 bg-gray-50">
                  <p className="text-xs text-gray-400 uppercase">{PUBLIC_SITE_HOST}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5 line-clamp-1">{form.site_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{previewDesc}</p>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><Bot className="w-3.5 h-3.5" />AI 搜尋理解</p>
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800 leading-relaxed">
                {form.ai_site_summary || form.site_description || '(Empty)'}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="space-y-6">
        {FIELD_GROUPS.map(group => {
          const Icon = group.icon;
          return (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            >
              <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <h2 className="font-semibold text-gray-900 text-sm">{group.title}</h2>
              </div>
              <div className="p-6 space-y-4">
                {group.fields.map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={formValues[field.key] || ''}
                        onChange={e => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 resize-none"
                      />
                    ) : field.type === 'color' ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={formValues[field.key] || '#C09A6A'}
                          onChange={e => handleChange(field.key, e.target.value)}
                          className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={formValues[field.key] || ''}
                          onChange={e => handleChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 font-mono"
                        />
                        <div className="w-8 h-8 rounded-lg border border-gray-200" style={{ backgroundColor: formValues[field.key] || '#C09A6A' }} />
                      </div>
                    ) : UPLOAD_FIELDS.has(field.key) ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formValues[field.key] || ''}
                            onChange={e => handleChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
                          />
                          <label className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm font-medium cursor-pointer hover:bg-amber-100 transition flex-shrink-0">
                            {uploading === field.key ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                            上傳圖片
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) handleUpload(field.key, f);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                        {formValues[field.key] && (
                          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <img
                              src={formValues[field.key]}
                              alt="preview"
                              className={field.key === 'site_icon_url' ? 'w-10 h-10 object-contain' : 'h-20 rounded-lg object-cover'}
                              onError={e => (e.currentTarget.style.display = 'none')}
                            />
                            <span className="text-xs text-gray-400 truncate flex-1">{formValues[field.key]}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={formValues[field.key] || ''}
                        onChange={e => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
                      />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* SEO Checklist */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-6 overflow-hidden"
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <h2 className="font-semibold text-gray-900 text-sm">SEO 檢查清單</h2>
        </div>
        <div className="p-6">
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { ok: !!form.site_name, label: '網站名稱已設定' },
              { ok: form.site_description.length >= 50, label: 'Meta Description 至少 50 字元' },
              { ok: form.site_description.length <= 160, label: 'Meta Description 不超過 160 字元' },
              { ok: !!form.site_icon_url, label: '網站圖示 (Favicon) 已設定' },
              { ok: !!form.og_image_url, label: 'OG 社群分享圖片已設定' },
              { ok: form.meta_keywords.split(',').filter(Boolean).length >= 3, label: '至少 3 個 Meta Keywords' },
                            { ok: !!form.contact_phone || !!form.contact_email, label: '至少一種聯絡方式' },
              { ok: !!form.company_no, label: '統一編號已填寫' },
              { ok: !!form.company_name, label: '營業人名稱已填寫' },
              { ok: !!form.headquarters_address, label: '總部地址已填寫' },
              { ok: !!form.ai_site_summary, label: 'AI 搜尋摘要已填寫' },
                            { ok: !!form.social_facebook || !!form.social_instagram || !!form.social_line || !!form.social_youtube || !!form.social_x || !!form.social_tiktok, label: '至少一種社群連結' },
              { ok: /^#[0-9A-Fa-f]{6}$/.test(form.theme_color), label: '有效的主題色彩 (hex)' },
            ].map(({ ok, label }) => (
              <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {ok ? <Check className="w-4 h-4 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-red-300 flex-shrink-0" />}
                <span className="font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="h-8" />
    </div>
  );
};

export default SuperAdminSiteSettings;

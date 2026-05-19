import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface SiteSettings {
  id: string;
  site_name: string;
  site_slogan: string;
  site_description: string;
  site_icon_url: string;
  og_image_url: string;
  meta_keywords: string;
  contact_phone: string;
  contact_email: string;
  social_facebook: string;
  social_instagram: string;
  social_twitter: string;
  theme_color: string;
  ai_site_summary: string;
}

const DEFAULTS: SiteSettings = {
  id: '',
  site_name: 'Nestobi 旅遊平台',
  site_slogan: '智慧旅遊新體驗',
  site_description: '結合 AI 智慧科技，提供一站式旅遊服務。訂房、購物、AI 行程規劃、即時翻譯，讓每次旅程都無憂無慮。',
  site_icon_url: '/20260407_nestobi_logo.svg',
  og_image_url: 'https://nestobi.netlify.app/og-nestobi-logo.png',
  meta_keywords: '旅遊平台, 訂房, AI旅遊, 行程規劃, 台灣旅遊, 住宿訂房, 旅遊購物, 旅遊翻譯, Nestobi',
  contact_phone: '0800-123-456',
  contact_email: '',
  social_facebook: 'https://www.facebook.com/nestobi',
  social_instagram: 'https://www.instagram.com/nestobi',
  social_twitter: '',
  theme_color: '#C09A6A',
  ai_site_summary: '',
};

interface SiteSettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: DEFAULTS,
  loading: true,
  refresh: async () => {},
});

export const useSiteSettings = () => useContext(SiteSettingsContext);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    if (data) setSettings(data as unknown as SiteSettings);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (loading) return;
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon) icon.href = settings.site_icon_url;
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', settings.theme_color);
  }, [settings, loading]);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

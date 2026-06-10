import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
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
  company_no: string;
  company_name: string;
  headquarters_address: string;
  social_facebook: string;
  social_instagram: string;
  social_line: string;
  social_youtube: string;
  social_x: string;
  social_twitter: string;
  social_tiktok: string;
  theme_color: string;
  ai_site_summary: string;
}

const DEFAULTS: SiteSettings = {
  id: '',
  site_name: 'Nestobi 根本在旅行',
  site_slogan: '把旅行靈感整理好，讓旅程更容易開始。',
  site_description:
    'Nestobi 統整住宿、商品、文章、門市與 AI 旅遊工具，幫你把出發前的小事整理好。',
  site_icon_url: '/20260407_nestobi_logo.svg',
  og_image_url: 'https://nestobi.netlify.app/og-nestobi-logo.png',
  meta_keywords:
    'Nestobi, 根本在旅行, 住宿, 商品, 文章, 門市, AI客服, AI導遊, AI尋豆師, 旅遊平台',
  contact_phone: '02-27565663',
  contact_email: 'service@dlalshop.com',
  company_no: '83122492',
  company_name: '若水金禾餐飲股份有限公司',
  headquarters_address: '台北市信義區忠孝東路四段553巷22弄4-1號',
  social_facebook: 'https://www.facebook.com/DLALinTaiwan',
  social_instagram: 'https://www.instagram.com/drink_like_a_local/',
  social_line: 'https://line.me/R/ti/p/@992kypjr',
  social_youtube: 'https://www.youtube.com/@dlal_travel',
  social_x: 'https://x.com/DLALTaiwan',
  social_twitter: 'https://x.com/DLALTaiwan',
  social_tiktok: 'https://www.tiktok.com/@dlal.tw',
  theme_color: '#C09A6A',
  ai_site_summary:
    'Nestobi 是旅遊與咖啡生活平台，提供住宿、商品、文章、門市資訊與 AI 旅遊助手服務。',
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
    const { data } = await supabase.from('site_settings').select('*').eq('is_active', true).maybeSingle();
    if (data) setSettings({ ...DEFAULTS, ...(data as Partial<SiteSettings>) });
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (loading) return;
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon) icon.href = settings.site_icon_url;
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', settings.theme_color);
  }, [settings, loading]);

  return <SiteSettingsContext.Provider value={{ settings, loading, refresh }}>{children}</SiteSettingsContext.Provider>;
}

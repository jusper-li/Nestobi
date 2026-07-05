import { useEffect, useMemo, useState } from 'react';
import { Database, Info, LayoutGrid as Layout, Menu as MenuIcon, Package } from 'lucide-react';
import { isSupabaseContentEnabled, supabase } from '../../lib/supabase';
import { DEFAULT_FOOTER_SETTINGS, DEFAULT_HEADER_SETTINGS, toHomepageManagementSections } from '../../data/homepageContent';
import {
  createDefaultHomepageHeroBlocks,
  HOMEPAGE_HERO_BLOCKS_SETTING_KEY,
  HomepageHeroBlock,
  mergeHomepageHeroProducts,
  normalizeHomepageHeroBlocks,
} from '../../data/homepageHeroBlocks';
import { useLanguage } from '../../contexts/LanguageContext';

type HomepageSection = {
  id: string;
  section_type: string;
  title: string;
  content: any;
  sort_order: number;
  is_active: boolean;
};

type SettingsRow = {
  setting_key: string;
  setting_value: any;
};

export default function HomepageManagement() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'heroBlocks' | 'sections' | 'header' | 'footer'>('heroBlocks');
  const [loading, setLoading] = useState(true);
  const [isLocalContent, setIsLocalContent] = useState(false);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [heroBlocks, setHeroBlocks] = useState<HomepageHeroBlock[]>([]);
  const [headerSettings, setHeaderSettings] = useState<any>(DEFAULT_HEADER_SETTINGS);
  const [footerSettings, setFooterSettings] = useState<any>(DEFAULT_FOOTER_SETTINGS);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    if (!isSupabaseContentEnabled) {
      loadLocalContent();
      setLoading(false);
      return;
    }

    try {
      const [sectionsRes, settingsRes] = await Promise.all([
        supabase.from('homepage_sections').select('*').order('sort_order', { ascending: true }),
        supabase
          .from('site_settings')
          .select('*')
          .in('setting_key', ['header', 'footer', HOMEPAGE_HERO_BLOCKS_SETTING_KEY]),
      ]);

      if (sectionsRes.error || settingsRes.error) {
        loadLocalContent();
        return;
      }

      const sectionRows = (sectionsRes.data || []) as HomepageSection[];
      const settingRows = (settingsRes.data || []) as SettingsRow[];
      const headerRow = settingRows.find((row) => row.setting_key === 'header');
      const footerRow = settingRows.find((row) => row.setting_key === 'footer');
      const heroBlocksRow = settingRows.find((row) => row.setting_key === HOMEPAGE_HERO_BLOCKS_SETTING_KEY);

      setSections(sectionRows);
      setHeaderSettings(headerRow?.setting_value || DEFAULT_HEADER_SETTINGS);
      setFooterSettings(footerRow?.setting_value || DEFAULT_FOOTER_SETTINGS);
      setHeroBlocks(normalizeHomepageHeroBlocks(heroBlocksRow?.setting_value));
      setIsLocalContent(false);
    } catch (error) {
      console.error('Failed to load homepage management data:', error);
      loadLocalContent();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalContent = () => {
    const products = mergeHomepageHeroProducts();
    setSections(toHomepageManagementSections());
    setHeaderSettings(DEFAULT_HEADER_SETTINGS);
    setFooterSettings(DEFAULT_FOOTER_SETTINGS);
    setHeroBlocks(createDefaultHomepageHeroBlocks(products));
    setIsLocalContent(true);
  };

  const localNotice = useMemo(
    () =>
      t(
        'homepage_management.local_notice',
        '目前後台顯示的是本地首頁內容示意。若要同步正式資料，請確認 Supabase 的 homepage_sections 與 site_settings 已啟用並可讀取。'
      ),
    [t]
  );

  if (loading) {
    return <div className="p-6">{t('common.loading', '載入中...')}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">{t('homepage_management.title', '首頁管理')}</h1>
        <p className="text-slate-600">{t('homepage_management.subtitle', '管理首頁、頁首與頁尾內容')}</p>
      </div>

      <div className="mb-6 border-b border-slate-200">
        <div className="flex gap-6">
          <TabButton active={activeTab === 'sections'} icon={Layout} label={t('homepage_management.tab_sections', '首頁區塊')} onClick={() => setActiveTab('sections')} />
          <TabButton active={activeTab === 'heroBlocks'} icon={Package} label={t('homepage_management.tab_hero_products', '首頁大圖商品')} onClick={() => setActiveTab('heroBlocks')} />
          <TabButton active={activeTab === 'header'} icon={MenuIcon} label={t('homepage_management.tab_header', '頁首設定')} onClick={() => setActiveTab('header')} />
          <TabButton active={activeTab === 'footer'} icon={Info} label={t('homepage_management.tab_footer', '頁尾設定')} onClick={() => setActiveTab('footer')} />
        </div>
      </div>

      {isLocalContent && (
        <div className="mb-6 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Database className="mt-0.5 h-5 w-5 flex-none" />
          <div>
            <div className="font-semibold">{t('homepage_management.local_title', '目前後台顯示的是本地首頁內容示意')}</div>
            <p className="mt-1 text-amber-800">{localNotice}</p>
          </div>
        </div>
      )}

      {activeTab === 'heroBlocks' && (
        <div className="space-y-4">
          {heroBlocks.length === 0 ? (
            <EmptyState text={t('homepage_management.empty_hero_blocks', '目前沒有可顯示的大圖商品區塊。')} />
          ) : (
            heroBlocks.map((block, index) => (
              <div key={block.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-500">
                      {t('homepage_management.block', '區塊')} {index + 1}
                    </div>
                    <div className="mt-1 font-semibold text-slate-900">{block.title || t('homepage_management.unnamed', '未命名區塊')}</div>
                    <div className="mt-1 text-sm text-slate-600">{block.href || t('homepage_management.no_link', '尚未設定連結')}</div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      block.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {block.is_active !== false ? t('common.active', '顯示中') : t('common.hidden', '已隱藏')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'sections' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.length === 0 ? (
            <EmptyState text={t('homepage_management.empty_sections', '目前沒有首頁區塊資料。')} />
          ) : (
            sections.map((section) => (
              <div key={section.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">{section.section_type}</div>
                <div className="mt-1 font-semibold text-slate-900">{section.title}</div>
                <div className="mt-2 text-sm text-slate-600">{section.is_active ? t('common.active', '顯示中') : t('common.hidden', '已隱藏')}</div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'header' && <SettingsPreview title={t('homepage_management.tab_header', '頁首設定')} data={headerSettings} />}

      {activeTab === 'footer' && <SettingsPreview title={t('homepage_management.tab_footer', '頁尾設定')} data={footerSettings} />}
    </div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-2 pb-3 transition-colors ${
        active ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function SettingsPreview({ title, data }: { title: string; data: any }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-bold text-slate-900">{title}</h2>
      <pre className="overflow-auto rounded-lg bg-slate-50 p-4 text-xs text-slate-700">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-sm text-slate-500">
      {text}
    </div>
  );
}

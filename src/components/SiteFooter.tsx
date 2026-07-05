import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Facebook, Instagram, Youtube, Mail, Settings } from 'lucide-react';
import { isMissingSupabaseTableError, isSupabaseContentEnabled, isSupabaseNetworkError, supabase } from '../lib/supabase';
import { DEFAULT_FOOTER_SETTINGS } from '../data/homepageContent';
import { openCookieConsentSettings } from '../lib/cookieConsent';
import { useLanguage } from '../contexts/LanguageContext';

interface FooterLink {
  label: string;
  href: string;
}

interface LinkGroup {
  title: string;
  links: FooterLink[];
}

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  youtube?: string;
}

interface FooterSettings {
  about_text: string;
  contact_email: string;
  contact_phone: string;
  social_links: SocialLinks;
  copyright_text: string;
  link_groups: LinkGroup[];
}

const DEFAULT_FOOTER_LINK_LABELS: Record<string, string> = {
  '/about': '關於我們',
  '/story': '品牌故事',
  '/blog': '專欄文章',
  '/contact': '聯絡我們',
  '/shop': '禮盒商城',
  '/faq': '常見問題',
  '/shipping': '配送說明',
  '/privacy': '隱私權政策',
  '/terms': '服務條款',
  '/backoffice': '後台管理',
};

const isGarbledText = (value?: string) => !value || /[\uFFFD?]/.test(value);

const sanitizeFooterSettings = (nextSettings: FooterSettings): FooterSettings => {
  const fallbackGroups = DEFAULT_FOOTER_SETTINGS.link_groups;

  return {
    ...nextSettings,
    about_text: isGarbledText(nextSettings.about_text)
      ? DEFAULT_FOOTER_SETTINGS.about_text
      : nextSettings.about_text,
    copyright_text: isGarbledText(nextSettings.copyright_text)
      ? DEFAULT_FOOTER_SETTINGS.copyright_text
      : nextSettings.copyright_text,
    link_groups: fallbackGroups.map((fallbackGroup, groupIndex) => {
      const nextGroup = nextSettings.link_groups?.[groupIndex];
      const groupTitle = isGarbledText(nextGroup?.title) ? fallbackGroup.title : nextGroup!.title;
      const sourceLinks = nextGroup?.links?.length ? nextGroup.links : fallbackGroup.links;

      return {
        title: groupTitle,
        links: sourceLinks.map((link, linkIndex) => {
          const fallbackLink = fallbackGroup.links[linkIndex];
          const normalizedLabel = DEFAULT_FOOTER_LINK_LABELS[link.href] || fallbackLink?.label || link.label;
          return {
            href: link.href,
            label: isGarbledText(link.label) ? normalizedLabel : link.label,
          };
        }),
      };
    }),
  };
};

export default function SiteFooter() {
  const [settings, setSettings] = useState<FooterSettings>(DEFAULT_FOOTER_SETTINGS);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!isSupabaseContentEnabled) return;

    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'footer')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const nextSettings = data.setting_value as FooterSettings;
        setSettings(sanitizeFooterSettings({
          ...DEFAULT_FOOTER_SETTINGS,
          ...nextSettings,
          link_groups: nextSettings.link_groups?.length ? nextSettings.link_groups : DEFAULT_FOOTER_SETTINGS.link_groups,
        }));
      }
    } catch (error) {
      if (isMissingSupabaseTableError(error) || isSupabaseNetworkError(error)) return;
      console.error('Failed to load footer settings:', error);
    }
  };

  const handleNavigation = (href: string) => {
    if (href.startsWith('#')) {
      if (window.location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          const element = document.querySelector(href);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      } else {
        const element = document.querySelector(href);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      navigate(href);
    }
  };

  return (
    <footer className="bg-[#f7f0e6] text-stone-700 w-full">
      <div className="h-px bg-gradient-to-r from-transparent via-[#cfa87a]/50 to-transparent" />

      <div className="w-full max-w-7xl mx-auto px-6 pt-20 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-14">
          <div className="lg:col-span-1">
            <Link to="/" className="inline-block mb-7 group">
              <img
                src="/LOGO-1.png"
                alt="You And Me Coffee"
                className="h-28 transition-all duration-500 group-hover:opacity-70"
              />
            </Link>
            <p className="text-sm text-stone-500 font-light leading-loose max-w-xs mb-8 tracking-wide">
              {t('footer.about', settings.about_text)}
            </p>
            <div className="flex items-center gap-4">
              {settings.social_links.instagram && (
                <a
                  href={settings.social_links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 flex items-center justify-center border border-[#dac7b4] text-stone-400 hover:border-[#a97a4f] hover:text-[#8e6448] transition-all duration-300 hover:-translate-y-0.5"
                  aria-label="Instagram"
                >
                  <Instagram size={16} />
                </a>
              )}
              {settings.social_links.facebook && (
                <a
                  href={settings.social_links.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 flex items-center justify-center border border-[#dac7b4] text-stone-400 hover:border-[#a97a4f] hover:text-[#8e6448] transition-all duration-300 hover:-translate-y-0.5"
                  aria-label="Facebook"
                >
                  <Facebook size={16} />
                </a>
              )}
              {settings.social_links.youtube && (
                <a
                  href={settings.social_links.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 flex items-center justify-center border border-[#dac7b4] text-stone-400 hover:border-[#a97a4f] hover:text-[#8e6448] transition-all duration-300 hover:-translate-y-0.5"
                  aria-label="YouTube"
                >
                  <Youtube size={16} />
                </a>
              )}
              {settings.contact_email && (
                <a
                  href={`mailto:${settings.contact_email}`}
                  className="w-9 h-9 flex items-center justify-center border border-[#dac7b4] text-stone-400 hover:border-[#a97a4f] hover:text-[#8e6448] transition-all duration-300 hover:-translate-y-0.5"
                  aria-label="Email"
                >
                  <Mail size={16} />
                </a>
              )}
            </div>
          </div>

          {settings.link_groups.map((group, index) => (
            <div key={index}>
              <h3 className="text-[10px] font-medium tracking-[0.3em] uppercase text-[#a97a4f]/90 mb-6">
                {t(`footer.group_title.${index}`, group.title)}
              </h3>
              <ul className="flex flex-col gap-3.5">
                {group.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <button
                      onClick={() => handleNavigation(link.href)}
                      className="text-sm text-stone-500 hover:text-stone-800 transition-all duration-300 font-light inline-block hover:translate-x-1 tracking-wide"
                    >
                      {t(`footer.link.${link.href}`, link.label)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-[#eadfd1] mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-stone-400 font-light tracking-[0.1em]">
            {t('footer.copyright', settings.copyright_text)}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Link
              to="/privacy"
              className="text-xs text-stone-400 hover:text-stone-700 transition-colors duration-300 font-light tracking-wide"
            >
              {t('footer.privacy', '隱私權政策')}
            </Link>
            <Link
              to="/terms"
              className="text-xs text-stone-400 hover:text-stone-700 transition-colors duration-300 font-light tracking-wide"
            >
              {t('footer.terms', '服務條款')}
            </Link>
            <button
              type="button"
              onClick={openCookieConsentSettings}
              className="text-xs text-stone-400 hover:text-stone-700 transition-colors duration-300 font-light tracking-wide"
            >
              {t('footer.cookie', 'Cookie 設定')}
            </button>
            <Link
              to="/backoffice"
              className="flex items-center justify-center text-stone-300 hover:text-stone-600 transition-all duration-300 group"
              title={t('footer.backoffice', '後台管理')}
            >
              <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}


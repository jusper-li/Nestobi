import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../lib/i18n';
import { fetchThemeBanners, getFallbackThemeBanners, type ThemeBanner, type ThemeKey } from '../lib/themeBanners';

interface ThemeHeroCarouselProps {
  themeKey: ThemeKey;
  kicker?: string;
  title: string;
  description: string;
  accentClassName?: string;
  children?: ReactNode;
}

function pickBannerText(locale: string, banner: ThemeBanner, field: 'title' | 'subtitle' | 'link_label') {
  return pickByLang(
    locale,
    banner[`${field}_zh`],
    banner[`${field}_en`],
    banner[`${field}_ja`],
    banner[`${field}_ko`],
  );
}

function isInternalLink(url: string) {
  return url.startsWith('/');
}

export default function ThemeHeroCarousel({
  themeKey,
  kicker,
  title,
  description,
  accentClassName = 'text-[#8B6840]',
  children,
}: ThemeHeroCarouselProps) {
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const [banners, setBanners] = useState<ThemeBanner[]>(() => getFallbackThemeBanners(themeKey));
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setBanners(getFallbackThemeBanners(themeKey));
    setActiveIndex(0);
    fetchThemeBanners(themeKey)
      .then(rows => {
        if (!cancelled && rows.length) {
          setBanners(rows);
          setActiveIndex(0);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [themeKey]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex(current => (current + 1) % banners.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  const activeBanner = banners[activeIndex] || getFallbackThemeBanners(themeKey)[0];
  const bannerText = useMemo(
    () => ({
      title: pickBannerText(locale, activeBanner, 'title'),
      subtitle: pickBannerText(locale, activeBanner, 'subtitle'),
      linkLabel: pickBannerText(locale, activeBanner, 'link_label'),
    }),
    [activeBanner, locale],
  );

  const link = activeBanner.link_url.trim();
  const linkClassName =
    'inline-flex items-center gap-2 rounded-full bg-[#2C1F10] px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#8B6840]';
  const linkContent = (
    <>
      {bannerText.linkLabel}
      <ArrowRight className="h-4 w-4" />
    </>
  );

  return (
    <section className="relative isolate overflow-hidden bg-[#FFF8EA] text-[#2C1F10]">
      <div className="absolute inset-0">
        {banners.map((banner, index) => (
          <img
            key={banner.id}
            src={banner.image_url}
            alt={pickBannerText(locale, banner, 'title')}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              index === activeIndex ? 'opacity-80' : 'opacity-0'
            }`}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#FFF8EA]/96 via-[#FFF8EA]/76 to-[#FFF8EA]/22" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#FFF8EA] to-transparent" />

      <div className="relative mx-auto grid min-h-[560px] max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.72fr] lg:items-end lg:px-8">
        <div className="max-w-3xl self-center py-6">
          {kicker && <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${accentClassName}`}>{kicker}</p>}
          <h1 className={`${kicker ? 'mt-4' : ''} font-serif text-5xl font-bold leading-tight sm:text-6xl`}>{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[#2C1F10]/72">{description}</p>

          <div className="mt-8 rounded-3xl border border-white/70 bg-white/78 p-5 shadow-xl backdrop-blur-md sm:p-6">
            <p className="text-2xl font-bold leading-snug sm:text-3xl">{bannerText.title}</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#2C1F10]/68">{bannerText.subtitle}</p>
            {link && (
              <div className="mt-5">
                {isInternalLink(link) ? (
                  <Link to={link} className={linkClassName}>
                    {linkContent}
                  </Link>
                ) : (
                  <a href={link} target="_blank" rel="noreferrer" className={linkClassName}>
                    {linkContent}
                  </a>
                )}
              </div>
            )}
          </div>

          {banners.length > 1 && (
            <div className="mt-5 flex gap-2">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`h-2.5 rounded-full transition-all ${index === activeIndex ? 'w-8 bg-[#2C1F10]' : 'w-2.5 bg-[#2C1F10]/24 hover:bg-[#2C1F10]/45'}`}
                  aria-label={`Banner ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {children && <div className="self-end pb-4 lg:pb-8">{children}</div>}
      </div>
    </section>
  );
}

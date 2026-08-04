import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass } from 'lucide-react';
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

const themeMeta: Record<ThemeKey, { label: string; glow: string }> = {
  home: { label: 'TRAVEL · SHOP · DISCOVER', glow: 'from-amber-300/35' },
  nestopia: { label: 'NESTOBI STAYS', glow: 'from-emerald-300/35' },
  genbon_travel: { label: 'GENBON TRAVEL SHOP', glow: 'from-amber-300/35' },
  coffee_traveler: { label: 'COFFEE TRAVELER', glow: 'from-orange-300/35' },
};

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
    }, 6200);
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
  const meta = themeMeta[themeKey];
  const link = activeBanner.link_url.trim();
  const linkClassName = 'inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-white px-5 py-2.5 text-sm font-bold text-stone-950 shadow-xl transition hover:-translate-y-0.5 hover:bg-amber-50';
  const linkContent = <>{bannerText.linkLabel}<ArrowRight className="h-4 w-4" /></>;

  return (
    <section className="relative isolate overflow-hidden bg-stone-950 text-white">
      <div className="absolute inset-0">
        {banners.map((banner, index) => (
          <img
            key={banner.id}
            src={banner.image_url}
            alt={pickBannerText(locale, banner, 'title')}
            className={`absolute inset-0 h-full w-full object-cover transition duration-1000 ${
              index === activeIndex ? 'scale-100 opacity-75' : 'scale-[1.03] opacity-0'
            }`}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-950/70 to-stone-950/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-transparent to-stone-950/20" />
      <div className={`absolute -left-20 top-0 h-80 w-80 rounded-full bg-gradient-to-br ${meta.glow} to-transparent blur-3xl`} />

      <div className="relative mx-auto grid min-h-[560px] max-w-[1440px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.72fr)] lg:items-end lg:px-10 lg:py-16 xl:px-14">
        <div className="max-w-3xl self-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold tracking-[0.18em] text-white/85 backdrop-blur">
            <Compass className="h-3.5 w-3.5 text-amber-300" />
            {kicker || meta.label}
          </div>
          <h1 className="mt-5 max-w-3xl font-serif text-4xl font-semibold leading-[1.06] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl xl:text-7xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/72 sm:text-base sm:leading-8">{description}</p>

          <div className="mt-9 max-w-2xl border-l-2 border-amber-300/80 pl-5">
            <p className="whitespace-pre-line text-xl font-bold leading-snug text-white sm:text-2xl">{bannerText.title}</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">{bannerText.subtitle}</p>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            {link ? (
              isInternalLink(link) ? <Link to={link} className={linkClassName}>{linkContent}</Link> : <a href={link} target="_blank" rel="noreferrer" className={linkClassName}>{linkContent}</a>
            ) : null}
            {banners.length > 1 ? (
              <div className="flex items-center gap-2" aria-label="Banner navigation">
                {banners.map((banner, index) => (
                  <button
                    key={banner.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`h-1.5 rounded-full transition-all ${index === activeIndex ? 'w-9 bg-amber-300' : 'w-3 bg-white/35 hover:bg-white/60'}`}
                    aria-label={`Banner ${index + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {children ? (
          <div className="self-end rounded-[2rem] border border-white/20 bg-white/12 p-2 shadow-2xl backdrop-blur-xl [&>div]:!border-white/60 [&>div]:!bg-white/95">
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}

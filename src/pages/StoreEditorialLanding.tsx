import { useEffect, useState } from 'react';
import { Clock, MapPin, Phone, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Navigation from '../components/Navigation';
import SEOHead from '../components/SEOHead';
import { STORE_FALLBACK_IMAGE, useFallbackImage } from '../lib/images';
import type { StoreLocation } from '../lib/storeLocations';
import { fetchThemeBanners, getFallbackThemeBanners, type ThemeBanner } from '../lib/themeBanners';

interface Props {
  locations: StoreLocation[];
  filtered: StoreLocation[];
  loading: boolean;
  search: string;
  notice: string;
  translationNotice: string;
  labels: Record<string, string>;
  onSearchChange: (value: string) => void;
}

export default function StoreEditorialLanding({ locations, filtered, loading, search, notice, translationNotice, labels, onSearchChange }: Props) {
  const [themeBanners, setThemeBanners] = useState<ThemeBanner[]>(() => getFallbackThemeBanners('genbon_travel'));
  const [themeBannerIndex, setThemeBannerIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchThemeBanners('genbon_travel').then(banners => {
      if (!cancelled && banners.length > 0) {
        setThemeBanners(banners);
        setThemeBannerIndex(0);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (themeBanners.length <= 1) return;
    const timer = window.setInterval(() => setThemeBannerIndex(index => (index + 1) % themeBanners.length), 6500);
    return () => window.clearInterval(timer);
  }, [themeBanners.length]);

  const activeThemeBanner = themeBanners[themeBannerIndex] || themeBanners[0];
  const heroImage = activeThemeBanner?.image_url || locations[0]?.image_url || STORE_FALLBACK_IMAGE;

  return (
    <div className="min-h-screen bg-[#F7F5F1] text-[#24231F]">
      <SEOHead title={labels.seoTitle} description={labels.seoDesc} keywords={labels.seoKeywords} ogType="website" pageType="list" />
      <Navigation />
      <main>
        <section className="relative min-h-[min(620px,72svh)] overflow-hidden bg-[#33291F] text-white">
          <img src={heroImage} alt="Store" className="absolute inset-0 h-full w-full object-cover opacity-60" onError={event => useFallbackImage(event, STORE_FALLBACK_IMAGE)} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#17130F]/80 via-[#17130F]/45 to-transparent" />
          <div className="relative mx-auto flex min-h-[min(620px,72svh)] max-w-[1440px] items-center px-6 py-24 sm:px-10 lg:px-16">
            <div className="max-w-xl">
              <p className="text-xs tracking-[0.34em] text-white">STORES</p>
              <h1 className="mt-5 font-serif text-5xl font-normal leading-[1.04] tracking-[0.04em] text-white sm:text-7xl">FIND A LOCAL PLACE</h1>
              <p className="mt-7 max-w-md text-sm leading-8 text-white/85">{labels.intro}</p>
              <a href="#our-stores" className="mt-8 inline-flex items-center gap-2 text-xs tracking-[0.18em] text-white underline underline-offset-8">EXPLORE STORES <MapPin size={15} /></a>
              {themeBanners.length > 1 && <div className="mt-7 flex gap-2">{themeBanners.map((banner, index) => <button key={banner.id} type="button" onClick={() => setThemeBannerIndex(index)} aria-label={`Store banner ${index + 1}`} className={`h-px transition-all ${index === themeBannerIndex ? 'w-8 bg-white' : 'w-3 bg-white/50'}`} />)}</div>}
            </div>
          </div>
        </section>

        <section id="our-stores" className="mx-auto max-w-[1440px] px-6 py-16 sm:px-10 sm:py-24 lg:px-16">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div><p className="text-xs tracking-[0.28em] text-[#69665F]">OUR STORES</p><h2 className="mt-3 font-serif text-3xl font-normal">{labels.title}</h2></div>
            <p className="text-sm text-[#69665F]">{locations.length} {labels.storeCount}</p>
          </div>
          <div className="mt-8 flex items-center border-b border-[#BFB7AC] py-2"><Search size={16} className="mr-3 text-[#69665F]" /><input value={search} onChange={event => onSearchChange(event.target.value)} placeholder={labels.searchPlaceholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9A938A]" /></div>
          {notice && <p className="mt-6 text-sm text-[#8B6840]">{notice}</p>}
          {translationNotice && <p className="mt-4 text-xs text-[#69665F]">{translationNotice}</p>}
          {loading ? <div className="py-20 text-center text-sm text-[#69665F]">Loading...</div> : filtered.length === 0 ? <div className="py-20 text-center text-sm text-[#69665F]">{labels.noResult}<br />{labels.noResultHint}</div> : <div className="mt-10 grid gap-x-6 gap-y-14 md:grid-cols-2">{filtered.map((location, index) => <article key={`${location.id || location.slug}-${index}`} className="group"><div className="relative aspect-[4/3] overflow-hidden bg-[#EAE6E0]"><img src={location.image_url || STORE_FALLBACK_IMAGE} alt={location.name} loading="lazy" decoding="async" onError={event => useFallbackImage(event, STORE_FALLBACK_IMAGE)} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /></div><div className="mt-5 flex items-start justify-between gap-4"><div><p className="text-xs tracking-[0.16em] text-[#69665F]">{location.city} / {location.district}</p><h3 className="mt-2 font-serif text-2xl font-normal">{location.name}</h3></div><MapPin size={19} className="mt-1 text-[#8B6840]" /></div><div className="mt-4 space-y-2 text-sm leading-6 text-[#69665F]"><p className="flex gap-2"><MapPin size={16} className="mt-1 flex-shrink-0" /><span>{location.address}</span></p><p className="flex gap-2"><Phone size={16} className="mt-1 flex-shrink-0" /><a href={`tel:${location.phone}`} className="hover:text-[#24231F]">{location.phone}</a></p><p className="flex gap-2"><Clock size={16} className="mt-1 flex-shrink-0" /><span>{location.hours?.primary || ''}{location.hours?.secondary ? <><br />{location.hours.secondary}</> : null}{location.hours?.note ? <><br />{location.hours.note}</> : null}</span></p></div><a href={location.map_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-xs tracking-[0.14em] underline underline-offset-8">{labels.mapNav} <MapPin size={14} /></a></article>)}</div>}
        </section>
        <section className="bg-[#EAE6E0] px-6 py-16 text-center sm:px-10 sm:py-24"><p className="text-xs tracking-[0.3em] text-[#69665F]">COME SAY HELLO</p><h2 className="mt-4 font-serif text-4xl font-normal">{labels.intro}</h2><Link to="/shop" className="mt-7 inline-flex items-center text-xs tracking-[0.16em] underline underline-offset-8">EXPLORE COFFEE</Link></section>
      </main>
      <Footer />
    </div>
  );
}

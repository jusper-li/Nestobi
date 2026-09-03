import { useEffect, useState } from 'react';
import { ArrowRight, Calendar, Coffee, Heart, MapPin, Search, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchThemeBanners } from '../../lib/themeBanners';

interface Room {
  id: string; name: string; description: string | null; room_type: string; capacity: number;
  min_capacity?: number | null; price_per_night: number; weekend_price?: number | null;
  image_url: string | null; images?: string[] | null; location: string | null;
  amenities: string[] | null; hotels?: { id: string; name: string; city?: string | null } | { id: string; name: string; city?: string | null }[] | null;
}

interface Props {
  rooms: Room[]; filtered: Room[]; loading: boolean; search: string; setSearch: (value: string) => void;
  checkInDate: string; setCheckInDate: (value: string) => void; checkOutDate: string; setCheckOutDate: (value: string) => void;
  guestCount: number; setGuestCount: (value: number) => void; handleAISearch: () => void;
  roomType: string; setRoomType: (value: string) => void; roomTypes: string[]; typeLabels: Record<string, string>;
  maxPrice: number; setMaxPrice: (value: number) => void; sortMode: 'recommended' | 'price-asc' | 'price-desc' | 'capacity'; setSortMode: (value: 'recommended' | 'price-asc' | 'price-desc' | 'capacity') => void;
  labels: { heroDesc: string; searchPlaceholder: string; featuredCount: string; guests: string; details: string; empty: string; recommended: string; priceAsc: string; priceDesc: string; capacity: string; locationUnavailable: string; noDescription: string; weekend: string };
  searchLabels: { checkIn: string; checkOut: string; guestCount: string; smartSearch: string; availabilitySummary: string };
  aiLoading: boolean; availabilityLoading: boolean; aiError: string; availabilityError: string; aiSummary: string; translationNotice: string;
  fallbackImage: string; onImageError: (event: { currentTarget: HTMLImageElement }, fallback: string) => void;
}

function hotelOf(room: Room) { return Array.isArray(room.hotels) ? room.hotels[0] : room.hotels; }
function coverOf(room: Room, fallback: string) { return room.images?.[0] || room.image_url || fallback; }

export default function RoomEditorialLanding(props: Props) {
  const { rooms, filtered, loading, search, setSearch, checkInDate, setCheckInDate, checkOutDate, setCheckOutDate, guestCount, setGuestCount, handleAISearch, roomType, setRoomType, roomTypes, typeLabels, maxPrice, setMaxPrice, sortMode, setSortMode, labels, searchLabels, aiLoading, availabilityLoading, aiError, availabilityError, aiSummary, translationNotice, fallbackImage, onImageError } = props;
  const [themeHeroImages, setThemeHeroImages] = useState<string[]>([]);
  const [themeHeroIndex, setThemeHeroIndex] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetchThemeBanners('nestopia').then(banners => {
      if (!cancelled) {
        const images = banners.map(banner => banner.image_url).filter(Boolean);
        setThemeHeroImages(images);
        setThemeHeroIndex(0);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (themeHeroImages.length <= 1) return;
    const timer = window.setInterval(() => {
      setThemeHeroIndex(current => (current + 1) % themeHeroImages.length);
    }, 6200);
    return () => window.clearInterval(timer);
  }, [themeHeroImages.length]);
  const heroImage = themeHeroImages[themeHeroIndex] || coverOf(filtered[0] || rooms[0] || ({ image_url: null } as Room), fallbackImage);
  const featured = filtered.slice(0, 6);

  return (
    <div className="bg-[#F4F1EC] text-[#24231F]">
      <section className="relative min-h-[min(720px,76svh)] overflow-hidden bg-[#282824] text-white">
        {themeHeroImages.map((image, index) => <img key={`${image}-${index}`} src={image} alt="" onError={event => onImageError(event, fallbackImage)} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${index === themeHeroIndex ? 'opacity-100' : 'opacity-0'}`} />)}
        {!themeHeroImages.length && <img src={heroImage} alt="" onError={event => onImageError(event, fallbackImage)} className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-r from-[#141412]/75 via-[#141412]/40 to-transparent" />
        <div className="relative mx-auto flex min-h-[min(720px,76svh)] max-w-[1440px] items-end px-6 pb-12 pt-32 sm:px-10 sm:pb-16 lg:px-16">
          <div className="max-w-md text-white"><p className="text-sm tracking-[0.3em] text-white">STAY</p><h1 className="mt-3 font-serif text-5xl font-normal leading-[1.05] tracking-[0.05em] text-white sm:text-6xl">LIKE A LOCAL</h1><p className="mt-7 max-w-xs text-sm leading-8 text-white/85">{props.labels.heroDesc}</p><a href="#our-stays" className="mt-8 inline-flex items-center gap-2 text-xs tracking-[0.18em] text-white underline underline-offset-8">FIND A STAY <ArrowRight size={15} /></a>{themeHeroImages.length > 1 && <span className="mt-6 flex gap-2">{themeHeroImages.map((image, index) => <button key={`${image}-dot`} type="button" onClick={() => setThemeHeroIndex(index)} aria-label={`Stay banner ${index + 1}`} className={`h-px transition-all ${index === themeHeroIndex ? 'w-8 bg-white' : 'w-3 bg-white/50'}`} />)}</span>}</div>
          <div className="absolute bottom-8 right-6 hidden max-w-sm text-right lg:block"><p className="text-xs tracking-[0.2em] text-white/75">{filtered.length} {labels.featuredCount}</p></div>
        </div>
      </section>

      <section id="our-stays" className="mx-auto max-w-[1440px] px-6 py-16 sm:px-10 sm:py-24 lg:px-16">
        <div className="flex items-end justify-between gap-5"><div><p className="text-xs tracking-[0.28em] text-[#69665F]">OUR STAYS</p><h2 className="mt-3 font-serif text-3xl font-normal sm:text-4xl">{labels.featuredCount}</h2></div><span className="hidden text-xs tracking-[0.15em] text-[#69665F] sm:block">{filtered.length} {labels.featuredCount}</span></div>
        <div className="mt-8 border-y border-[#D8D3CA] py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3 border-b border-[#D8D3CA] pb-3 lg:border-0 lg:pb-0"><Search size={17} className="text-[#69665F]" /><input value={search} onChange={event => { setSearch(event.target.value); }} onKeyDown={event => event.key === 'Enter' && handleAISearch()} placeholder={labels.searchPlaceholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#8C887F]" /><button type="button" onClick={handleAISearch} disabled={aiLoading || availabilityLoading} className="text-xs tracking-[0.12em] text-[#69665F] hover:text-[#24231F]">{searchLabels.smartSearch}</button></div>
            <div className="grid grid-cols-3 gap-2 lg:w-[34rem]"><label className="flex items-center gap-2 border-b border-[#D8D3CA] py-2 text-xs text-[#69665F]"><Calendar size={14} /><input type="date" value={checkInDate} onChange={event => setCheckInDate(event.target.value)} aria-label={searchLabels.checkIn} className="min-w-0 bg-transparent outline-none" /></label><label className="flex items-center gap-2 border-b border-[#D8D3CA] py-2 text-xs text-[#69665F]"><Calendar size={14} /><input type="date" value={checkOutDate} min={checkInDate || undefined} onChange={event => setCheckOutDate(event.target.value)} aria-label={searchLabels.checkOut} className="min-w-0 bg-transparent outline-none" /></label><label className="flex items-center gap-2 border-b border-[#D8D3CA] py-2 text-xs text-[#69665F]"><Users size={14} /><input type="number" min={1} max={30} value={guestCount} onChange={event => setGuestCount(Math.max(1, Number(event.target.value || 1)))} aria-label={searchLabels.guestCount} className="min-w-0 bg-transparent outline-none" /></label></div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2"><span className="mr-2 text-xs text-[#69665F]">{labels.featuredCount}</span>{roomTypes.map(type => <button key={type} type="button" onClick={() => setRoomType(type)} className={`px-2 text-xs tracking-wide transition ${roomType === type ? 'font-semibold text-[#24231F] underline underline-offset-4' : 'text-[#8C887F] hover:text-[#24231F]'}`}>{typeLabels[type]}</button>)}<span className="hidden h-4 w-px bg-[#D8D3CA] sm:block" /><label className="ml-auto flex items-center gap-2 text-xs text-[#69665F]">NT$ {maxPrice.toLocaleString()}<input type="range" min={1000} max={30000} step={500} value={maxPrice} onChange={event => setMaxPrice(Number(event.target.value))} className="w-24 accent-[#817565]" /></label><select value={sortMode} onChange={event => setSortMode(event.target.value as Props['sortMode'])} className="border-0 bg-transparent text-xs text-[#69665F] outline-none"><option value="recommended">{labels.recommended}</option><option value="price-asc">{labels.priceAsc}</option><option value="price-desc">{labels.priceDesc}</option><option value="capacity">{labels.capacity}</option></select></div>
        </div>
        {(aiError || availabilityError || aiSummary || translationNotice) && <div className="mt-5 space-y-2 text-xs text-[#69665F]">{aiError && <p>{aiError}</p>}{availabilityError && <p>{availabilityError}</p>}{aiSummary && <p>{aiSummary}</p>}{translationNotice && <p>{translationNotice}</p>}</div>}
        {loading ? <div className="py-16 text-center text-sm text-[#69665F]">Loading...</div> : featured.length === 0 ? <div className="py-16 text-center text-sm text-[#69665F]">{labels.empty}</div> : <div className="mt-10 grid gap-x-4 gap-y-12 sm:grid-cols-2">{featured.map(room => { const hotel = hotelOf(room); const city = room.location || hotel?.city || labels.locationUnavailable; const capacity = room.min_capacity && room.min_capacity !== room.capacity ? `${room.min_capacity}-${room.capacity}` : `${room.capacity}`; return <Link key={room.id} to={`/rooms/${room.id}`} className="group"><div className="relative aspect-[1.18] overflow-hidden bg-[#E8E3DB]"><img src={coverOf(room, fallbackImage)} alt={room.name} onError={event => onImageError(event, fallbackImage)} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-[#141412]/65 via-transparent to-transparent" /><div className="absolute inset-x-0 bottom-0 p-5 text-white"><p className="text-[11px] tracking-[0.12em] text-white">{hotel?.name || city}</p><h3 className="mt-1 font-serif text-2xl font-normal text-white">{room.name}</h3><p className="mt-2 text-xs text-white/80">{city} · {capacity} {labels.guests}</p></div></div><div className="mt-4 flex items-start justify-between gap-4"><div><p className="text-sm leading-6 text-[#69665F]">{room.description || labels.noDescription}</p><p className="mt-2 text-xs text-[#8C887F]">{formatPrice(room.price_per_night)} / night</p></div><span className="mt-1 flex items-center gap-1 text-xs tracking-[0.12em] text-[#69665F]">{labels.details}<ArrowRight size={14} /></span></div></Link>})}</div>}
      </section>

      <section className="bg-[#EAE6E0] px-6 py-16 sm:px-10 sm:py-24"><div className="mx-auto max-w-[1440px]"><p className="text-xs tracking-[0.28em] text-[#69665F]">EXPERIENCE</p><h2 className="mt-4 font-serif text-3xl font-normal">Stay a little longer.</h2><p className="mt-4 max-w-md text-sm leading-7 text-[#69665F]">在地覓宿、咖啡、飲食與慢生活，一起把旅程變成日常。</p><div className="mt-12 grid grid-cols-2 gap-y-10 sm:grid-cols-4 sm:gap-8"><ExperienceIcon icon={Coffee} title="COFFEE" text="在地咖啡" /><ExperienceIcon icon={Sparkles} title="BREAKFAST" text="早餐時光" /><ExperienceIcon icon={Heart} title="LOCAL GUIDE" text="在地散步" /><ExperienceIcon icon={MapPin} title="SPECIAL OFFER" text="住宿優惠" /></div></div></section>

      <section className="relative min-h-[300px] overflow-hidden bg-[#282824] text-white"><div className="absolute inset-0 bg-[url('/homepage-images/homepage-hero-05.jpg')] bg-cover bg-center opacity-45" /><div className="absolute inset-0 bg-[#171714]/35" /><div className="relative mx-auto flex max-w-[1440px] flex-col items-start px-6 py-20 text-white sm:px-10 sm:py-24 lg:px-16"><p className="text-xs tracking-[0.28em] text-white">BOOK YOUR STAY</p><h2 className="mt-4 font-serif text-4xl font-normal text-white">Find a place to slow down.</h2><p className="mt-4 text-sm text-white/80">選擇日期，開始你的旅程。</p><a href="#our-stays" className="mt-8 inline-flex items-center gap-2 text-xs tracking-[0.18em] text-white underline underline-offset-8">CHECK AVAILABILITY <ArrowRight size={15} /></a></div></section>
    </div>
  );
}

function ExperienceIcon({ icon: Icon, title, text }: { icon: typeof Coffee; title: string; text: string }) { return <div className="flex items-start gap-3"><Icon size={23} strokeWidth={1.4} /><div><p className="text-xs tracking-[0.15em]">{title}</p><p className="mt-1 text-xs text-[#69665F]">{text}</p></div></div>; }
function formatPrice(value: number) { return `NT$ ${Number(value || 0).toLocaleString()}`; }

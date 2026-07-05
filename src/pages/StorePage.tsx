import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Clock, MapPin, Phone } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import { useSEO } from '../hooks/useSEO';
import { breadcrumbSchema, localBusinessSchema } from '../utils/schemaMarkup';

type Store = {
  name: string;
  phone: string;
  address: string;
  hours: string;
  image: string;
};

const withCacheBust = (src: string) => `${src}?v=20260702`;

const NORTH_STORES: Store[] = [
  {
    name: '淞品永和門市',
    phone: '02-8021-1072',
    address: '新北市永和區中和路509號',
    hours: '09:00~19:00（每週一公休，年節除外，售完為止）',
    image: withCacheBust('/sonpin-images/176658686210.jpg'),
  },
  {
    name: '淞品萬華門市',
    phone: '02-2336-5382',
    address: '台北市萬華區三水街84號',
    hours: '08:00-18:00（每週一公休，年節除外，售完為止）',
    image: withCacheBust('/sonpin-images/154079778215.jpg'),
  },
  {
    name: '淞品士林門市',
    phone: '02-2833-0336',
    address: '台北市士林區文林路503號',
    hours: '08:00-18:00（每週一公休，年節除外，售完為止）',
    image: withCacheBust('/sonpin-images/154079808479.jpg'),
  },
  {
    name: '淞品民生門市',
    phone: '02-2761-0766',
    address: '台北市松山區新東街41-6號',
    hours: '08:00~18:00（每週一公休，年節除外，售完為止）',
    image: withCacheBust('/sonpin-images/154079870237.jpg'),
  },
  {
    name: '淞品新埔門市',
    phone: '02-2258-7755',
    address: '新北市板橋區民生路三段11號',
    hours: '08:00~18:00（每週一公休，年節除外，售完為止）',
    image: withCacheBust('/sonpin-images/154079844080.jpg'),
  },
  {
    name: '淞品新店門市',
    phone: '02-29111398',
    address: '新北市新店區中正路246號',
    hours: '08:00-18:00（每週一公休，年節除外，售完為止）',
    image: withCacheBust('/sonpin-images/154079895498.jpg'),
  },
];

const FACTORY_IMAGES = [
  '/sonpin-images/153285065447.jpg',
  '/sonpin-images/153285153270.jpg',
  '/sonpin-images/153285183849.jpg',
  '/sonpin-images/153285185380.jpg',
];

export default function StorePage() {
  const [activeTab, setActiveTab] = useState<'north' | 'factory'>('north');

  useSEO({
    title: '門市據點',
    description: '淞品土雞專賣店門市據點與工廠資訊。',
    keywords: '門市據點,淞品,萬華,永和,士林,民生,新埔,新店',
    schema: [
      localBusinessSchema(),
      breadcrumbSchema([
        { name: '首頁', url: window.location.origin },
        { name: '門市據點', url: `${window.location.origin}/store` },
      ]),
    ],
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf6ee] text-stone-800">
      <SiteHeader />

      <main className="flex-1 pt-20">
        <section className="border-b border-[#eadfd1] bg-[linear-gradient(135deg,#fbf6ee_0%,#f7efe5_44%,#fffaf2_100%)]">
          <div className="container mx-auto px-6 py-16 md:py-24">
            <nav className="mb-8 flex items-center gap-2 text-xs tracking-[0.18em] text-stone-400">
              <Link to="/" className="transition-colors hover:text-stone-700">
                首頁
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-stone-700">門市據點</span>
            </nav>
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.36em] text-[#8e6448]/80">Stores</p>
            <h1 className="max-w-3xl text-4xl font-light leading-tight tracking-[0.16em] text-stone-900 md:text-6xl">
              門市據點
            </h1>
            <p className="mt-7 max-w-2xl text-sm font-light leading-8 text-stone-500">
              淞品土雞專賣店目前提供北部多個門市據點，請依門市營業時間前往購買。
            </p>
          </div>
        </section>

        <section className="container mx-auto px-6 py-10">
          <div className="mb-8 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('north')}
              className={`border px-4 py-2 text-xs tracking-[0.16em] transition-all ${
                activeTab === 'north'
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 text-stone-500 hover:border-stone-700 hover:text-stone-900'
              }`}
            >
              北部
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('factory')}
              className={`border px-4 py-2 text-xs tracking-[0.16em] transition-all ${
                activeTab === 'factory'
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 text-stone-500 hover:border-stone-700 hover:text-stone-900'
              }`}
            >
              廠區
            </button>
          </div>

          {activeTab === 'north' ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {NORTH_STORES.map((store) => (
                <article key={store.name} className="overflow-hidden rounded-3xl border border-[#eadfd1] bg-[#fffaf2] shadow-sm">
                  <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                    <img src={store.image} alt={store.name} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-6">
                    <h2 className="text-xl font-medium text-[#2b221d]">{store.name}</h2>
                    <div className="mt-5 space-y-3 text-sm text-[#6d4f3d]">
                      <p className="flex items-start gap-3">
                        <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#8e6448]" />
                        <span>{store.phone}</span>
                      </p>
                      <p className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#8e6448]" />
                        <span>{store.address}</span>
                      </p>
                      <p className="flex items-start gap-3">
                        <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#8e6448]" />
                        <span>{store.hours}</span>
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <article className="overflow-hidden rounded-3xl border border-[#eadfd1] bg-[#fffaf2] shadow-sm lg:col-span-2">
                <div className="grid gap-6 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8">
                  <div>
                    <h2 className="text-xl font-medium text-[#2b221d]">淞品中央工廠</h2>
                    <div className="mt-5 space-y-3 text-sm text-[#6d4f3d]">
                      <p className="flex items-start gap-3">
                        <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#8e6448]" />
                        <span>05-2698855</span>
                      </p>
                      <p className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#8e6448]" />
                        <span>嘉義縣溪口鄉美北村1鄰崙尾1-18號</span>
                      </p>
                    </div>
                    <p className="mt-5 text-sm leading-8 text-[#6d4f3d]">
                      首創產製銷一條龍作業，淞品用心，食在安心。這裡是淞品自有廠區與加工基地。
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {FACTORY_IMAGES.map((image) => (
                      <img key={image} src={image} alt="淞品中央工廠" className="h-full w-full rounded-2xl object-cover" loading="lazy" />
                    ))}
                  </div>
                </div>
              </article>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

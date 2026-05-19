import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Search,
  Store,
} from 'lucide-react';
import Footer from '../components/Footer';
import Navigation from '../components/Navigation';
import SEOHead from '../components/SEOHead';
import { STORE_FALLBACK_IMAGE, useFallbackImage } from '../lib/images';
import {
  fetchStoreLocations,
  storeLocationToSearchText,
  type StoreLocation,
} from '../lib/storeLocations';

export default function StoreLocations() {
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchStoreLocations(false)
      .then(rows => {
        if (cancelled) return;
        setLocations(rows);
        if (rows.length === 0) setNotice('目前尚未建立門市資料。');
      })
      .catch(() => {
        if (!cancelled) setNotice('門市資料暫時無法連線，已保留頁面架構。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const filteredLocations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return locations;

    return locations.filter(location => storeLocationToSearchText(location).includes(query));
  }, [locations, search]);

  return (
    <div className="min-h-screen bg-[#F8F4EA] text-[#2C1F10]">
      <SEOHead
        title="門市據點"
        description="Nestobi 門市據點資訊，包含營業時間、電話、地址與地圖導航。"
        keywords="門市據點, 根本在旅行, DLAL, 咖啡門市, Nestobi"
        ogType="website"
        pageType="list"
      />
      <Navigation />

      <section className="border-b border-[#2C1F10]/10 bg-[#FEF9EC] px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <p className="section-label">Store Locator</p>
              <h1 className="section-title text-4xl md:text-5xl">門市據點</h1>
              <span className="gold-bar" />
              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#2C1F10]/70">
                找到最接近你的根本在旅行門市，確認營業時間、電話與地圖位置，把咖啡與選物行程安排進旅途中。
              </p>
            </div>

            <div className="rounded-2xl border border-[#2C1F10]/10 bg-white/80 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C09A6A]/15 text-[#8B6840]">
                  <Store size={22} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{locations.length}</p>
                  <p className="text-sm text-[#2C1F10]/55">已建立門市據點</p>
                </div>
              </div>
              <div className="mt-4 flex items-center rounded-xl border border-[#2C1F10]/10 bg-white px-3">
                <Search size={17} className="text-[#C09A6A]" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="搜尋門市、地址或電話"
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-[#2C1F10] placeholder:text-[#2C1F10]/35 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10">
        {notice && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle size={18} />
            <span>{notice}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-9 w-9 animate-spin text-[#C09A6A]" />
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="rounded-2xl border border-[#2C1F10]/10 bg-white p-10 text-center shadow-sm">
            <p className="font-semibold text-[#2C1F10]">找不到符合條件的門市</p>
            <p className="mt-2 text-sm text-[#2C1F10]/60">請換一個關鍵字再試一次。</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {filteredLocations.map((location, index) => (
              <motion.article
                key={location.slug}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.24) }}
                className="overflow-hidden rounded-2xl border border-[#2C1F10]/10 bg-white shadow-sm"
                style={{ contentVisibility: 'auto', containIntrinsicSize: '520px' }}
              >
                <div className="aspect-[16/9] bg-[#E8DDC8]">
                  <img
                    src={location.image_url || STORE_FALLBACK_IMAGE}
                    alt={location.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                    onError={event => useFallbackImage(event, STORE_FALLBACK_IMAGE)}
                  />
                </div>
                <div className="p-5">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#C09A6A]">
                        {location.city} / {location.district}
                      </p>
                      <h2 className="mt-1 text-xl font-bold text-[#2C1F10]">{location.name}</h2>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">營業中資訊</span>
                  </div>

                  <div className="space-y-3 text-sm leading-6 text-[#2C1F10]/72">
                    <p className="flex gap-2">
                      <MapPin size={17} className="mt-1 flex-shrink-0 text-[#C09A6A]" />
                      <span>{location.address}</span>
                    </p>
                    <p className="flex gap-2">
                      <Phone size={17} className="mt-1 flex-shrink-0 text-[#C09A6A]" />
                      <a href={`tel:${location.phone.replace(/\s/g, '')}`} className="font-semibold text-[#2C1F10] hover:text-[#8B6840]">
                        {location.phone}
                      </a>
                    </p>
                    <div className="flex gap-2">
                      <Clock size={17} className="mt-1 flex-shrink-0 text-[#C09A6A]" />
                      <div>
                        <p>{location.hours.primary}</p>
                        {location.hours.secondary && <p>{location.hours.secondary}</p>}
                        {location.hours.note && <p className="text-xs text-[#2C1F10]/50">{location.hours.note}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {location.map_url && (
                      <a
                        href={location.map_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-[#2C1F10] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8B6840]"
                      >
                        <MapPin size={16} />
                        地圖導航
                      </a>
                    )}
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

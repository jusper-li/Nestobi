import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Clock, Loader2, MapPin, Phone, Search, Store } from 'lucide-react';
import Footer from '../components/Footer';
import Navigation from '../components/Navigation';
import SEOHead from '../components/SEOHead';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getTranslationRuntimeState,
  translateStoreLocationsFromCacheOnly,
  translateStoreLocationsOnDemand,
} from '../lib/contentTranslations';
import { STORE_FALLBACK_IMAGE, useFallbackImage } from '../lib/images';
import {
  DEFAULT_STORE_LOCATIONS,
  fetchStoreLocations,
  storeLocationToSearchText,
  type StoreLocation,
} from '../lib/storeLocations';

function isMostlyAscii(input: string | undefined | null) {
  if (!input) return false;
  const text = input.trim();
  if (!text) return false;
  const asciiChars = [...text].filter(char => char.charCodeAt(0) <= 127).length;
  return asciiChars / text.length > 0.8;
}

function localizeStoreRow(row: StoreLocation, lang: string): StoreLocation {
  if (lang !== 'zh-TW') return row;
  const zhFallback = DEFAULT_STORE_LOCATIONS.find(item => item.slug === row.slug);
  if (!zhFallback) return row;
  return {
    ...row,
    name: isMostlyAscii(row.name) ? zhFallback.name : row.name,
    city: isMostlyAscii(row.city) ? zhFallback.city : row.city,
    district: isMostlyAscii(row.district) ? zhFallback.district : row.district,
    address: isMostlyAscii(row.address) ? zhFallback.address : row.address,
    hours: {
      ...row.hours,
      primary: isMostlyAscii(row.hours?.primary) ? zhFallback.hours?.primary || row.hours?.primary || '' : row.hours?.primary || '',
      secondary: isMostlyAscii(row.hours?.secondary) ? zhFallback.hours?.secondary || row.hours?.secondary || '' : row.hours?.secondary || '',
      note: isMostlyAscii(row.hours?.note) ? zhFallback.hours?.note || row.hours?.note || '' : row.hours?.note || '',
    },
  };
}

export default function StoreLocations() {
  const { lang } = useLanguage();
  const locale = lang === 'ja' ? 'ja' : lang === 'ko' ? 'ko' : lang === 'en' ? 'en' : 'zh-TW';
  const t4 = (zh: string, en: string, ja: string, ko: string) =>
    locale === 'ja' ? ja : locale === 'ko' ? ko : locale === 'en' ? en : zh;

  const labels = {
    seoTitle: t4('門市據點', 'Store Locator', '店舗案内', '매장 안내'),
    seoDesc: t4(
      '查看 Nestobi 門市據點、營業時間、電話與地圖導航資訊。',
      'Find Nestobi stores, opening hours, phone numbers, and map links.',
      'Nestobi の店舗情報、営業時間、電話、地図リンクを確認できます。',
      'Nestobi 매장 위치, 영업시간, 전화번호, 지도 링크를 확인하세요.',
    ),
    sectionLabel: t4('門市據點', 'Store Locator', '店舗案内', '매장 안내'),
    title: t4('門市據點', 'Store Locations', '店舗一覧', '매장 목록'),
    intro: t4(
      '找到離你最近的門市，確認營業時間、電話與地圖位置，把咖啡與選物行程安排進旅途中。',
      'Find the nearest store, then check hours, phone, and map details for your trip.',
      '最寄りの店舗を見つけ、営業時間・電話・地図を確認して旅の計画に組み込みましょう。',
      '가까운 매장을 찾고 영업시간, 전화, 지도 정보를 확인해 여행 동선에 넣어보세요.',
    ),
    storeCount: t4('已建立門市據點', 'Stores Available', '登録済み店舗', '등록된 매장'),
    searchPlaceholder: t4('搜尋門市、地址或電話', 'Search by name, address, or phone', '店舗名・住所・電話で検索', '매장명·주소·전화 검색'),
    noStoreNotice: t4('目前沒有門市資料。', 'No store data available yet.', '現在、店舗データはありません。', '현재 매장 데이터가 없습니다.'),
    fallbackNotice: t4('暫時無法讀取門市資料，請稍後再試。', 'Unable to load store data right now. Please try again later.', '店舗データの読み込みに失敗しました。しばらくして再試行してください。', '매장 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'),
    noResult: t4('找不到符合的門市', 'No matching stores found', '一致する店舗が見つかりません', '일치하는 매장을 찾을 수 없습니다'),
    noResultHint: t4('請嘗試其他關鍵字。', 'Try another keyword.', '別のキーワードでお試しください。', '다른 키워드로 검색해 보세요.'),
    openInfo: t4('營業中資訊', 'Business Info', '営業情報', '영업 정보'),
    mapNav: t4('地圖導航', 'Map Navigation', '地図ナビ', '지도 길찾기'),
    transCacheNotReady: t4('目前先顯示原文門市資料，翻譯快取尚未就緒。', 'Showing source store data first. Translation cache is not ready yet.', '翻訳キャッシュ未準備のため、先に原文データを表示します。', '번역 캐시 준비 전이라 원문 데이터를 먼저 표시합니다.'),
    transSyncing: t4('背景同步其餘翻譯中...', 'Syncing remaining store translations in background...', '残りの翻訳をバックグラウンドで同期中...', '나머지 번역을 백그라운드에서 동기화 중...'),
    transFallback: t4('目前先顯示原文/快取資料。', 'Showing source/cached store data.', '原文/キャッシュデータを表示しています。', '원문/캐시 데이터를 표시 중입니다.'),
  };

  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [displayLocations, setDisplayLocations] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [translationNotice, setTranslationNotice] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchStoreLocations(false)
      .then(rows => {
        if (cancelled) return;
        setLocations(rows);
        setDisplayLocations(rows);
        if (rows.length === 0) setNotice(labels.noStoreNotice);
      })
      .catch(() => {
        if (!cancelled) setNotice(labels.fallbackNotice);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [labels.noStoreNotice, labels.fallbackNotice]);

  useEffect(() => {
    let cancelled = false;
    if (!locations.length || lang === 'zh-TW') {
      setDisplayLocations(locations);
      setTranslationNotice('');
      return () => {
        cancelled = true;
      };
    }

    setDisplayLocations(locations);
    const runtime = getTranslationRuntimeState();
    setTranslationNotice(runtime.tableUnavailable || runtime.isLocalProxyMode ? labels.transCacheNotReady : labels.transSyncing);

    translateStoreLocationsFromCacheOnly(locations, lang).then(translated => {
      if (!cancelled) setDisplayLocations(translated);
    }).catch(() => {});

    translateStoreLocationsOnDemand(locations.slice(0, 3), lang).then(translated => {
      if (cancelled) return;
      const translatedById = new Map(translated.map(item => [item.id, item]));
      setDisplayLocations(current => current.map(item => translatedById.get(item.id) || item));
      setTranslationNotice('');
    }).catch(() => {
      if (!cancelled) setTranslationNotice(labels.transFallback);
    });

    return () => {
      cancelled = true;
    };
  }, [locations, lang, labels.transCacheNotReady, labels.transSyncing, labels.transFallback]);

  const localizedLocations = useMemo(
    () => displayLocations.map(row => localizeStoreRow(row, lang)),
    [displayLocations, lang],
  );

  const filteredLocations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return localizedLocations;
    return localizedLocations.filter(location => storeLocationToSearchText(location).includes(query));
  }, [localizedLocations, search]);

  return (
    <div className="min-h-screen bg-[#F8F4EA] text-[#2C1F10]">
      <SEOHead
        title={labels.seoTitle}
        description={labels.seoDesc}
        keywords={locale === 'zh-TW' ? '門市據點, 根本在旅行, 咖啡門市, 地圖導航' : 'store locator, nestobi, coffee store, address, map'}
        ogType="website"
        pageType="list"
      />
      <Navigation />

      <section className="border-b border-[#2C1F10]/10 bg-[#FEF9EC] px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <p className="section-label">{labels.sectionLabel}</p>
              <h1 className="section-title text-4xl md:text-5xl">{labels.title}</h1>
              <span className="gold-bar" />
              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#2C1F10]/70">{labels.intro}</p>
            </div>
            <div className="rounded-2xl border border-[#2C1F10]/10 bg-white/80 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C09A6A]/15 text-[#8B6840]">
                  <Store size={22} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{locations.length}</p>
                  <p className="text-sm text-[#2C1F10]/55">{labels.storeCount}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center rounded-xl border border-[#2C1F10]/10 bg-white px-3">
                <Search size={17} className="text-[#C09A6A]" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder={labels.searchPlaceholder}
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
        {translationNotice && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
            {translationNotice}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-9 w-9 animate-spin text-[#C09A6A]" />
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="rounded-2xl border border-[#2C1F10]/10 bg-white p-10 text-center shadow-sm">
            <p className="font-semibold text-[#2C1F10]">{labels.noResult}</p>
            <p className="mt-2 text-sm text-[#2C1F10]/60">{labels.noResultHint}</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {filteredLocations.map((location, index) => (
              <motion.article
                key={`${location.id || location.slug}-${index}`}
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
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {labels.openInfo}
                    </span>
                  </div>
                  <div className="space-y-3 text-sm leading-6 text-[#2C1F10]/72">
                    <p className="flex gap-2">
                      <MapPin size={17} className="mt-1 flex-shrink-0 text-[#C09A6A]" />
                      <span>{location.address}</span>
                    </p>
                    <p className="flex gap-2">
                      <Phone size={17} className="mt-1 flex-shrink-0 text-[#C09A6A]" />
                      <a className="font-semibold hover:text-[#8B6840]" href={`tel:${location.phone}`}>
                        {location.phone}
                      </a>
                    </p>
                    <p className="flex gap-2">
                      <Clock size={17} className="mt-1 flex-shrink-0 text-[#C09A6A]" />
                      <span>
                        {location.hours?.primary || ''}
                        {location.hours?.secondary ? <><br />{location.hours.secondary}</> : null}
                        {location.hours?.note ? <><br />{location.hours.note}</> : null}
                      </span>
                    </p>
                  </div>
                  <div className="mt-5 flex gap-3">
                    <a
                      href={location.map_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-[#2C1F10] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8B6840]"
                    >
                      <MapPin size={15} />
                      {labels.mapNav}
                    </a>
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

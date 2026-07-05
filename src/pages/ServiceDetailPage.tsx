import { Link, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import { useSEO } from '../hooks/useSEO';

type ServiceShareDetail = {
  title: string;
  image: string;
  banner: string;
  storeName: string;
  phone: string;
  address: string;
  paragraphs: string[];
};

const SERVICE_SHARES: Record<string, ServiceShareDetail> = {
  '73': {
    title: '萬華龍山寺週邊(三水街)美食',
    image: '/sonpin-images/20180730130930.jpg',
    banner: '/sonpin-images/153285217452.jpg',
    storeName: '淞品(畜產)商行',
    phone: '02-2336-5382',
    address: '台北市萬華區三水街84號',
    paragraphs: [
      '三水街有很多賣雞肉的店，但生意能好到這麼誇張的，淞品畜產算是少數。',
      '每逢拜拜日子，店門口幾乎都會大排長龍，常常到最後還有人買不到。',
      '淞品賣的是土雞，分成煙燻和鹹水兩種口味，也可以切成一盤方便帶回家。',
      '雞肉雖然是土雞，卻沒有一般土雞那種過瘦的感覺，肉汁豐富又嫩甜，吃起來相當過癮。',
      '店裡除了雞肉外，也有推薦滴雞精，可以一併參考。',
    ],
  },
  '72': {
    title: '雞肉半隻(鹹水+煙燻)',
    image: '/sonpin-images/153267470935.png',
    banner: '/sonpin-images/153285217452.jpg',
    storeName: '淞品(畜產)商行',
    phone: '02-2336-5382',
    address: '台北市萬華區三水街84號',
    paragraphs: [
      '這篇食記主要記錄雞肉半隻的分享，作者看到有人團購就忍不住一起買了兩種口味。',
      '半隻雞分為鹹水與煙燻兩款，店家會附上紙袋、胡椒鹽與沾醬，包裝也相當有質感。',
      '鹹水口味肉凍明顯、雞肉鮮甜；煙燻口味香氣更重，入口更有層次。',
      '文章特別提到這種熟雞很適合送禮或家人分享，份量也很充足。',
    ],
  },
  '71': {
    title: '淞品土雞',
    image: '/sonpin-images/153267463973.png',
    banner: '/sonpin-images/153285217452.jpg',
    storeName: '淞品(畜產)商行',
    phone: '02-2336-5382',
    address: '台北市萬華區三水街84號',
    paragraphs: [
      '這篇食記是從節目推薦延伸來的實訪文章，作者原本就對這家三水街排隊名店很好奇。',
      '淞品土雞分成白斬與煙燻兩種口味，也有小盤份量可以外帶，對第一次嘗鮮的人很友善。',
      '文章提到雞肉口感扎實但不乾柴，雞皮帶有油潤甜香，尤其煙燻版本更有迷人香氣。',
      '最後作者也提到，如果喜歡土雞的人，這家真的值得專程來排隊。',
    ],
  },
  '70': {
    title: '萬華半日行。勇伯米苔目、淞品土雞、龍都冰果店',
    image: '/sonpin-images/153267457195.png',
    banner: '/sonpin-images/153285217452.jpg',
    storeName: '淞品(畜產)商行',
    phone: '02-2336-5382',
    address: '台北市萬華區三水街84號',
    paragraphs: [
      '這篇文章把淞品放進萬華半日散步行程中，與周邊小吃一起介紹。',
      '作者描述三水市場入口的淞品總是人龍不斷，讓人好奇到底是便宜還是太好吃。',
      '文章裡提到鹽水與煙燻兩種口味，半雞價格與包裝方式也寫得很仔細。',
      '買回家後的試吃心得則是雞肉鮮甜、口感不錯，讓人覺得值得排隊。',
    ],
  },
  '69': {
    title: '台北 : 萬華 - 淞品畜產',
    image: '/sonpin-images/153267443796.png',
    banner: '/sonpin-images/153285217452.jpg',
    storeName: '淞品(畜產)商行',
    phone: '02-2336-5382',
    address: '台北市萬華區三水街84號',
    paragraphs: [
      '這篇食記以「台北：萬華」為題，描述作者在晚餐聚會中意外吃到淞品煙燻雞，對口感印象很深。',
      '文章中稱讚雞肉鮮、嫩、多汁，雞皮的煙燻香非常明顯，完全不塞牙。',
      '隔天作者特地再來買整隻帶回家，也提到店家在三水街的排隊人潮相當常見。',
      '整篇內容幾乎都在表達：這家的土雞真的很值得一試。',
    ],
  },
  '68': {
    title: '萬華除了有龍山寺之外 很多小吃也不錯',
    image: '/sonpin-images/153267418589.png',
    banner: '/sonpin-images/153285217452.jpg',
    storeName: '淞品(畜產)商行',
    phone: '02-2336-5382',
    address: '台北市萬華區三水街84號',
    paragraphs: [
      '這篇分享以萬華小吃為主軸，特別提到三水市場裡的淞品畜產。',
      '作者介紹淞品只有鹹水與煙燻兩種口味，價錢一致，並分享半雞外帶的盒裝與配料。',
      '試吃心得提到雞肉扎實、肉汁足，煙燻口味香氣更明顯。',
      '文章也提醒，熱門時段很容易賣完，想買要早點出門。',
    ],
  },
  '67': {
    title: '台北補品：淞品滴雞精@雨後',
    image: '/sonpin-images/153267400021.png',
    banner: '/sonpin-images/153285217452.jpg',
    storeName: '淞品(畜產)商行',
    phone: '02-2336-5382',
    address: '台北市萬華區三水街84號',
    paragraphs: [
      '這篇文章主要分享淞品滴雞精的外觀、包裝與食用心得。',
      '作者提到產品包裝越來越有品牌感，和傳統市場印象中的雞店很不一樣。',
      '內容也寫到滴雞精的價格、容量與份量，屬於很早期的產品體驗紀錄。',
      '整體來看，這篇是淞品從熟雞品牌延伸到加工食品的重要紀錄。',
    ],
  },
  '66': {
    title: '淞品商行---令人噴口水的 "白斬雞 & 燻雞"',
    image: '/sonpin-images/153267430289.png',
    banner: '/sonpin-images/153285217452.jpg',
    storeName: '淞品(畜產)商行',
    phone: '02-2336-5382',
    address: '台北市萬華區三水街84號',
    paragraphs: [
      '這篇食記一開始就強調淞品的白斬雞與燻雞真的很容易讓人流口水。',
      '作者說自己是按圖索驥來到艋舺，最後意外發現這家排隊名店。',
      '內容提到店家位在三水街84號，雞肉香氣與口感都讓人印象深刻。',
      '這是一篇很直白、很有熱度的早期口碑文。',
    ],
  },
  '40': {
    title: '淞品商行---令人噴口水的 "白斬雞 & 燻雞"',
    image: '/sonpin-images/153267424872.png',
    banner: '/sonpin-images/153285217452.jpg',
    storeName: '淞品(畜產)商行',
    phone: '02-2336-5382',
    address: '台北市萬華區三水街84號',
    paragraphs: [
      '這篇也是以白斬雞與燻雞為主題的饕客分享，內容和 66 號文章一樣走的是口碑推薦路線。',
      '作者認為這家店是艋舺美食裡容易被忽略、但實際上非常值得排隊的店。',
      '文章最後再次標出店址在萬華三水街84號，是淞品早期曝光的重要食記之一。',
    ],
  },
};

export default function ServiceDetailPage() {
  const { slug = '' } = useParams();
  const item = SERVICE_SHARES[slug];

  useSEO({
    title: item?.title || '饕客分享',
    description: item?.paragraphs?.[0] || '淞品土雞專賣店饕客分享原站內容。',
  });

  if (!item) {
    return (
      <div className="min-h-screen bg-[#fbf6ee] text-stone-800">
        <SiteHeader />
        <main className="container mx-auto px-6 py-24">
          <p className="text-sm text-stone-500">找不到這篇饕客分享。</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

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
              <Link to="/service" className="transition-colors hover:text-stone-700">
                饕客分享
              </Link>
            </nav>
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.36em] text-[#8e6448]/80">Service</p>
            <h1 className="max-w-4xl text-3xl font-light leading-tight tracking-[0.08em] text-stone-900 md:text-5xl">
              {item.title}
            </h1>
          </div>
        </section>

        <section className="container mx-auto px-6 py-14">
          <article className="overflow-hidden rounded-3xl border border-[#eadfd1] bg-[#fffaf2] shadow-sm">
            <img src={item.banner} alt={item.title} className="h-auto w-full object-cover" loading="lazy" />
            <div className="p-6 md:p-8">
              <div className="mb-6 text-sm leading-7 text-[#6d4f3d]">
                <p className="font-medium text-[#8e6448]">{item.storeName}</p>
                <p>電話：{item.phone}</p>
                <p>住址：{item.address}</p>
              </div>

              <div className="overflow-hidden rounded-2xl bg-stone-50">
                <img src={item.image} alt={item.title} className="w-full object-cover" loading="lazy" />
              </div>

              <div className="mt-8 space-y-5 text-sm leading-8 text-[#6d4f3d]">
                {item.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </article>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

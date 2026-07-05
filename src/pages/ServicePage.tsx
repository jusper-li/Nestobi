import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import { useSEO } from '../hooks/useSEO';
import { breadcrumbSchema } from '../utils/schemaMarkup';

const SERVICE_SHARES = [
  { slug: '73', title: '萬華龍山寺週邊(三水街)美食', image: '/sonpin-images/153267480349.png' },
  { slug: '72', title: '雞肉半隻(鹹水+煙燻)', image: '/sonpin-images/153267470935.png' },
  { slug: '71', title: '淞品土雞', image: '/sonpin-images/153267463973.png' },
  { slug: '70', title: '萬華半日行。勇伯米苔目、淞品土雞、龍都冰果店', image: '/sonpin-images/153267457195.png' },
  { slug: '69', title: '台北 : 萬華 - 淞品畜產', image: '/sonpin-images/153267443796.png' },
  { slug: '68', title: '萬華除了有龍山寺之外 很多小吃也不錯', image: '/sonpin-images/153267418589.png' },
  { slug: '67', title: '台北補品：淞品滴雞精@雨後', image: '/sonpin-images/153267400021.png' },
  { slug: '66', title: '淞品商行---令人噴口水的 "白斬雞 & 燻雞"', image: '/sonpin-images/153267430289.png' },
  { slug: '40', title: '淞品商行---令人噴口水的 "白斬雞 & 燻雞"', image: '/sonpin-images/153267424872.png' },
];

export default function ServicePage() {
  useSEO({
    title: '饕客分享',
    description: '蒐集淞品土雞專賣店的饕客分享與食記內容。',
    keywords: '饕客分享,淞品,萬華,土雞,食記',
    schema: breadcrumbSchema([
      { name: '首頁', url: window.location.origin },
      { name: '饕客分享', url: `${window.location.origin}/service` },
    ]),
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
              <span className="text-stone-700">饕客分享</span>
            </nav>
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.36em] text-[#8e6448]/80">Service</p>
            <h1 className="max-w-3xl text-4xl font-light leading-tight tracking-[0.16em] text-stone-900 md:text-6xl">
              饕客分享
            </h1>
          </div>
        </section>

        <section className="container mx-auto px-6 py-14">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICE_SHARES.map((item) => (
              <Link
                key={item.slug}
                to={`/service/${item.slug}`}
                className="group overflow-hidden rounded-3xl border border-[#eadfd1] bg-[#fffaf2] shadow-sm transition-all hover:-translate-y-1 hover:border-stone-300"
              >
                <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm leading-7 text-stone-700 line-clamp-2">{item.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import { useSEO } from '../hooks/useSEO';
import { breadcrumbSchema } from '../utils/schemaMarkup';

const PROCESS_IMAGES = [
  '/sonpin-images/153285065447.jpg',
  '/sonpin-images/153285183849.jpg',
];

export default function ProcessPage() {
  useSEO({
    title: '生產製程',
    description: '淞品土雞專賣店生產製程頁面。',
    keywords: '生產製程,淞品,土雞,製程',
    schema: breadcrumbSchema([
      { name: '首頁', url: window.location.origin },
      { name: '生產製程', url: `${window.location.origin}/process` },
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
              <span className="text-stone-700">生產製程</span>
            </nav>
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.36em] text-[#8e6448]/80">Process</p>
            <h1 className="max-w-3xl text-4xl font-light leading-tight tracking-[0.16em] text-stone-900 md:text-6xl">
              生產製程
            </h1>
          </div>
        </section>

        <section className="container mx-auto grid gap-6 px-6 py-14 md:grid-cols-2">
          {PROCESS_IMAGES.map((src) => (
            <img
              key={src}
              src={src}
              alt="淞品生產製程"
              className="w-full rounded-3xl border border-[#eadfd1] object-cover shadow-sm"
              loading="lazy"
            />
          ))}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

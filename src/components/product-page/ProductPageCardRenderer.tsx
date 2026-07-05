import { useEffect, useRef, useState } from 'react';
import ProductImage from '../ProductImage';
import {
  ProductPageBlock,
  ProductPageDocument,
  ProductPageTone,
  PRODUCT_PAGE_TONE_LABEL,
} from '../../lib/productPageCards';

interface ProductPageCardRendererProps {
  document: ProductPageDocument;
  className?: string;
  layoutMode?: 'auto' | 'mobile' | 'desktop';
}

type ToneStyle = {
  frame: string;
  section: string;
  title: string;
  body: string;
  overline: string;
  badge: string;
  bullet: string;
  button: string;
  divider: string;
  glow: string;
  chip: string;
  sectionLabel: string;
  heroHeadline: string;
  featureHeadline: string;
  ctaHeadline: string;
  ctaButtonShape: string;
};

const toneStyles: Record<ProductPageTone, ToneStyle> = {
  luxury: {
    frame: 'bg-gradient-to-b from-[#f7f4ee] via-[#fcfaf6] to-white border-stone-200',
    section: 'bg-white/90 border-stone-200',
    title: 'text-stone-900',
    body: 'text-stone-600',
    overline: 'text-stone-500',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    bullet: 'bg-amber-500',
    button: 'bg-stone-900 text-white hover:bg-stone-700',
    divider: 'bg-stone-200',
    glow: 'from-[#2f2318]/45 via-[#2f2318]/20 to-transparent',
    chip: 'bg-stone-900/60 text-white border-white/25',
    sectionLabel: 'Collection',
    heroHeadline: 'font-serif tracking-[0.04em]',
    featureHeadline: 'font-serif tracking-[0.03em]',
    ctaHeadline: 'font-serif tracking-[0.04em]',
    ctaButtonShape: 'rounded-full',
  },
  friendly: {
    frame: 'bg-gradient-to-b from-rose-50 via-white to-white border-rose-200',
    section: 'bg-white/90 border-rose-200',
    title: 'text-rose-900',
    body: 'text-rose-700',
    overline: 'text-rose-500',
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
    bullet: 'bg-rose-400',
    button: 'bg-rose-600 text-white hover:bg-rose-700',
    divider: 'bg-rose-200',
    glow: 'from-rose-950/40 via-rose-900/15 to-transparent',
    chip: 'bg-rose-700/65 text-white border-white/25',
    sectionLabel: 'Moments',
    heroHeadline: 'tracking-[0.01em]',
    featureHeadline: 'tracking-[0.01em]',
    ctaHeadline: 'tracking-[0.02em]',
    ctaButtonShape: 'rounded-2xl',
  },
  barista: {
    frame: 'bg-gradient-to-b from-teal-50 via-white to-white border-teal-200',
    section: 'bg-white/90 border-teal-200',
    title: 'text-teal-900',
    body: 'text-teal-700',
    overline: 'text-teal-500',
    badge: 'bg-teal-100 text-teal-700 border-teal-200',
    bullet: 'bg-teal-500',
    button: 'bg-teal-700 text-white hover:bg-teal-800',
    divider: 'bg-teal-200',
    glow: 'from-teal-950/40 via-teal-900/15 to-transparent',
    chip: 'bg-teal-700/65 text-white border-white/25',
    sectionLabel: 'Roast Notes',
    heroHeadline: 'tracking-[0.02em]',
    featureHeadline: 'tracking-[0.02em]',
    ctaHeadline: 'tracking-[0.03em]',
    ctaButtonShape: 'rounded-lg',
  },
  'group-buy': {
    frame: 'bg-gradient-to-b from-orange-50 via-white to-white border-orange-200',
    section: 'bg-white/90 border-orange-200',
    title: 'text-orange-900',
    body: 'text-orange-700',
    overline: 'text-orange-500',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    bullet: 'bg-orange-500',
    button: 'bg-orange-600 text-white hover:bg-orange-700',
    divider: 'bg-orange-200',
    glow: 'from-orange-950/40 via-orange-900/15 to-transparent',
    chip: 'bg-orange-700/65 text-white border-white/25',
    sectionLabel: 'Offer',
    heroHeadline: 'tracking-[0.01em]',
    featureHeadline: 'tracking-[0.01em]',
    ctaHeadline: 'tracking-[0.02em]',
    ctaButtonShape: 'rounded-xl',
  },
};

const hasImage = (block: ProductPageBlock) => Boolean(block.imageUrl);
const hasHtml = (value?: string) => Boolean(value && /<[a-z][\s\S]*>/i.test(value));

const renderBody = (body: string, className: string) => {
  if (!body) return null;
  if (hasHtml(body)) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: body }} />;
  }
  return <p className={`${className} whitespace-pre-line`}>{body}</p>;
};

const renderHighlights = (block: ProductPageBlock, style: ToneStyle) => {
  if (!block.highlights?.length) return null;

  return (
    <ul className="space-y-3">
      {block.highlights.map((item, index) => (
        <li key={`${block.id}-${index}`} className="flex items-start gap-3">
          <span className={`mt-2 h-1.5 w-1.5 rounded-full ${style.bullet}`} />
          <span className={`text-[15px] leading-8 ${style.body}`}>{item}</span>
        </li>
      ))}
    </ul>
  );
};

const renderBlock = (
  block: ProductPageBlock,
  style: ToneStyle,
  index: number,
  layoutMode: 'auto' | 'mobile' | 'desktop'
) => {
  if (block.type === 'hero') {
    return (
      <article key={block.id} className="group overflow-hidden">
        {hasImage(block) && (
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-stone-50 md:aspect-[16/9]">
            <ProductImage
              src={block.imageUrl}
              alt={block.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              sizes="100vw"
            />
            <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t ${style.glow}`} />
            {block.badge && (
              <span className={`absolute left-4 top-4 inline-flex rounded-full border px-3 py-1 text-xs font-medium backdrop-blur ${style.chip}`}>
                {block.badge}
              </span>
            )}
          </div>
        )}
        <div className="space-y-4 px-5 py-7 md:px-10 md:py-10">
          {!hasImage(block) && block.badge && (
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${style.badge}`}>
              {block.badge}
            </span>
          )}
          <h3 className={`text-[22px] font-semibold leading-[1.2] md:text-[34px] ${style.title} ${style.heroHeadline}`}>{block.title}</h3>
          {block.body && renderBody(block.body, `text-[15px] leading-8 md:text-[17px] ${style.body}`)}
        </div>
      </article>
    );
  }

  if (block.type === 'cta') {
    return (
      <article key={block.id} className="transition-all duration-500">
        <div className="space-y-6 px-6 py-10 text-center md:px-10">
          <h3 className={`text-[21px] font-semibold leading-tight md:text-[30px] ${style.title} ${style.ctaHeadline}`}>{block.title}</h3>
          {block.body && renderBody(block.body, `mx-auto max-w-2xl text-[15px] leading-8 ${style.body}`)}
          {block.buttonText && (
            <a
              href={block.buttonHref || '#buy-now'}
              className={`inline-flex min-h-12 min-w-[180px] items-center justify-center px-7 text-sm font-semibold tracking-[0.08em] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${style.button} ${style.ctaButtonShape}`}
            >
              {block.buttonText}
            </a>
          )}
        </div>
      </article>
    );
  }

  const withImage = hasImage(block);

  const useMobileStack = layoutMode === 'mobile';
  const gridClass = withImage
    ? useMobileStack
      ? 'grid grid-cols-1'
      : 'grid grid-cols-1 md:grid-cols-[1fr_1fr]'
    : 'block';
  const imageOrderClass = useMobileStack ? '' : index % 2 === 1 ? 'md:order-2' : '';
  const contentOrderClass = useMobileStack ? '' : index % 2 === 1 ? 'md:order-1' : '';

  return (
    <article key={block.id} className="group overflow-hidden">
      <div className="h-px w-full bg-stone-100" />
      <div className={gridClass}>
        {withImage && (
          <div className={`relative aspect-[4/3] w-full overflow-hidden bg-stone-50 md:aspect-auto ${imageOrderClass}`}>
            <ProductImage
              src={block.imageUrl}
              alt={block.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t ${style.glow}`} />
          </div>
        )}
        <div className={`space-y-5 px-5 py-7 md:py-9 ${withImage ? `md:px-9 ${contentOrderClass}` : 'md:px-10'}`}>
          <p className={`text-[11px] uppercase tracking-[0.2em] ${style.overline}`}>{style.sectionLabel}</p>
          <h3 className={`text-[20px] font-semibold leading-[1.3] md:text-[28px] ${style.title} ${style.featureHeadline}`}>{block.title}</h3>
          {block.body && renderBody(block.body, `text-[15px] leading-8 ${style.body}`)}
          {renderHighlights(block, style)}
        </div>
      </div>
    </article>
  );
};

export default function ProductPageCardRenderer({
  document,
  className = '',
  layoutMode = 'auto',
}: ProductPageCardRendererProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [visibleCards, setVisibleCards] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const next: Record<string, boolean> = {};
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const blockId = (entry.target as HTMLElement).dataset.blockId;
          if (blockId) next[blockId] = true;
          observer.unobserve(entry.target);
        });
        if (Object.keys(next).length > 0) {
          setVisibleCards((prev) => ({ ...prev, ...next }));
        }
      },
      { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.18 }
    );

    Object.values(cardRefs.current).forEach((node) => {
      if (node) observer.observe(node);
    });

    const fallbackTimer = window.setTimeout(() => {
      const allVisible: Record<string, boolean> = {};
      Object.keys(cardRefs.current).forEach((key) => {
        allVisible[key] = true;
      });
      setVisibleCards((prev) => ({ ...allVisible, ...prev }));
      observer.disconnect();
    }, 1800);

    return () => {
      window.clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, [document]);

  const style = toneStyles[document.tone];
  const blocks = document.blocks.filter((block) => block.title || block.body);
  if (blocks.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className={`p-0 ${className}`.trim()}
      data-product-page-tone={document.tone}
    >
      <header className="mb-4 flex items-center justify-between px-1 md:mb-6">
        <p className={`text-[11px] font-medium uppercase tracking-[0.24em] ${style.overline}`}>Story Layout</p>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${style.badge}`}>
          {PRODUCT_PAGE_TONE_LABEL[document.tone]}
        </span>
      </header>

      <div className="space-y-5 md:space-y-7">
        {blocks.map((block, index) => (
          <div
            key={`${block.id}-wrap`}
            ref={(el) => {
              cardRefs.current[block.id] = el;
            }}
            data-block-id={block.id}
            className={`transition-all duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              visibleCards[block.id] ? 'translate-y-0 scale-100 opacity-100 blur-0' : 'translate-y-9 scale-[0.985] opacity-0 blur-[2px]'
            }`}
            style={{ transitionDelay: `${Math.min(index * 90, 360)}ms` }}
          >
            {renderBlock(block, style, index, layoutMode)}
          </div>
        ))}
      </div>

      <div className={`mx-1 mt-7 h-px ${style.divider}`} />
      <p className={`mt-3 px-1 text-[11px] tracking-[0.12em] ${style.overline}`}>Y&M COFFEE PRODUCT STORY</p>
    </section>
  );
}

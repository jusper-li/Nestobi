import { ArrowRight, Search, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductImage from '../components/ProductImage';

interface Product { id: string; name: string; slug: string; summary: string; price: number; sale_price: number | null; stock: number; images: string[]; category_id: string }
interface Category { id: string; name: string; slug: string }

interface Props {
  products: Product[]; categories: Category[]; categoryNameById: Map<string, string>; selectedCategory: string | null; setCategory: (id: string | null) => void;
  searchQuery: string; onSearch: (value: string) => void; onClear: () => void; onAddToCart: (product: Product) => void;
  sortKey: 'newest' | 'price_asc' | 'price_desc' | 'discount'; setSortKey: (value: Props['sortKey']) => void; loading: boolean; addedProductName: string;
  labels: { coffee: string; drinkLike: string; heroBody: string; explore: string; newArrivals: string; viewAll: string; subscription: string; subscriptionBody: string; learnMore: string; journal: string; searchPlaceholder: string; all: string; add: string; soldOut: string; currency: string; sort: string; newest: string; priceAsc: string; priceDesc: string; discount: string };
}

const journalItems = [
  { image: '/blog-images/blog-01-01.jpg', title: 'BREW GUIDE', text: '怎麼沖出一杯好喝的手沖咖啡？' },
  { image: '/blog-images/blog-14-01.webp', title: 'ORIGIN STORY', text: '咖啡與旅程，從產地開始。' },
  { image: '/blog-images/blog-10-01.jpg', title: 'COFFEE BASICS', text: '咖啡保存與風味小知識' },
];

export default function ShopEditorialLanding({ products, categories, categoryNameById, selectedCategory, setCategory, searchQuery, onSearch, onClear, onAddToCart, sortKey, setSortKey, loading, addedProductName, labels }: Props) {
  const heroImage = products[0]?.images?.[0] || '/product-images/the-one-and-only-champion-blend-beans-1.jpg';
  const newArrivals = products.slice(0, 4);
  return (
    <div className="bg-[#F7F5F1] text-[#24231F]">
      <section className="relative min-h-[min(680px,72svh)] overflow-hidden bg-[#E6E0D7]">
        <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#F7F5F1]/95 via-[#F7F5F1]/65 to-transparent" />
        <div className="relative mx-auto flex min-h-[min(680px,72svh)] max-w-[1440px] items-center px-6 py-28 sm:px-10 lg:px-16"><div className="max-w-md"><p className="text-sm tracking-[0.32em]">COFFEE</p><h1 className="mt-4 font-serif text-5xl font-normal leading-[1.05] tracking-[0.05em] sm:text-6xl">DRINK LIKE A LOCAL</h1><p className="mt-7 max-w-xs text-sm leading-8 text-[#69665F]">{labels.heroBody}</p><Link to="#new-arrivals" className="mt-8 inline-flex items-center gap-2 text-xs tracking-[0.18em] text-[#24231F] underline underline-offset-8">{labels.explore} <ArrowRight size={15} /></Link></div></div>
      </section>

      <section id="new-arrivals" className="mx-auto max-w-[1440px] px-6 py-16 sm:px-10 sm:py-24 lg:px-16"><div className="flex items-end justify-between"><div><p className="text-xs tracking-[0.28em] text-[#69665F]">NEW ARRIVALS</p><h2 className="mt-3 font-serif text-3xl font-normal">{labels.newArrivals}</h2></div><Link to="/shop" className="text-xs tracking-[0.15em] text-[#69665F] underline underline-offset-8">{labels.viewAll}</Link></div>
        <div className="mt-8 border-y border-[#D8D3CA] py-4"><div className="flex flex-col gap-4 md:flex-row md:items-center"><div className="flex flex-1 items-center gap-3 border-b border-[#D8D3CA] pb-3 md:border-0 md:pb-0"><Search size={17} className="text-[#69665F]" /><input value={searchQuery} onChange={event => onSearch(event.target.value)} placeholder={labels.searchPlaceholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#8C887F]" />{searchQuery && <button type="button" onClick={onClear} className="text-xs text-[#69665F]">×</button>}</div><div className="flex gap-3 overflow-x-auto pb-1 text-xs text-[#69665F]"><button type="button" onClick={() => setCategory(null)} className={selectedCategory === null ? 'font-semibold text-[#24231F] underline underline-offset-4' : ''}>{labels.all}</button>{categories.slice(0, 6).map(category => <button type="button" key={category.id} onClick={() => setCategory(category.id)} className={selectedCategory === category.id ? 'whitespace-nowrap font-semibold text-[#24231F] underline underline-offset-4' : 'whitespace-nowrap'}>{categoryNameById.get(category.id) || category.name}</button>)}</div><select value={sortKey} onChange={event => setSortKey(event.target.value as Props['sortKey'])} className="border-0 bg-transparent text-xs text-[#69665F] outline-none"><option value="newest">{labels.newest}</option><option value="price_asc">{labels.priceAsc}</option><option value="price_desc">{labels.priceDesc}</option><option value="discount">{labels.discount}</option></select></div></div>
        {loading ? <div className="py-16 text-center text-sm text-[#69665F]">Loading...</div> : <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">{newArrivals.map(product => { const price = product.sale_price ?? product.price; return <article key={product.id} className="group"><Link to={`/shop/${product.slug}`} className="block"><div className="relative aspect-[4/5] overflow-hidden bg-[#EAE6E0]"><ProductImage src={product.images?.[0]} alt={product.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><span className="absolute left-3 top-3 bg-[#F7F5F1] px-2 py-1 text-[10px] tracking-[0.14em]">NEW</span></div><h3 className="mt-4 line-clamp-2 text-sm leading-6">{product.name}</h3><p className="mt-2 text-xs text-[#69665F]">{product.summary}</p><p className="mt-3 text-xs tracking-[0.12em]">{labels.currency}{price.toLocaleString()}</p></Link><button type="button" onClick={() => onAddToCart(product)} disabled={product.stock <= 0} className="mt-4 inline-flex items-center gap-2 text-xs tracking-[0.12em] text-[#69665F] underline underline-offset-4 disabled:no-underline disabled:opacity-45">{product.stock > 0 ? <><ShoppingBag size={14} />{labels.add}</> : labels.soldOut}</button></article>})}</div>}
        {addedProductName && <p className="mt-6 text-xs text-[#817565]">{addedProductName}</p>}
      </section>

      <section className="relative overflow-hidden bg-[#282824] text-white"><img src="/product-images/ynm-pourover-brewing-set-2.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" /><div className="absolute inset-0 bg-[#171714]/40" /><div className="relative mx-auto max-w-[1440px] px-6 py-20 sm:px-10 sm:py-24 lg:px-16"><p className="text-xs tracking-[0.28em]">SUBSCRIPTION</p><h2 className="mt-4 font-serif text-4xl font-normal text-white">{labels.subscription}</h2><p className="mt-5 max-w-sm text-sm leading-8 text-white/85">{labels.subscriptionBody}</p><Link to="/shop?category=subscription" className="mt-8 inline-flex items-center gap-2 text-xs tracking-[0.18em] text-white underline underline-offset-8">{labels.learnMore} <ArrowRight size={15} /></Link></div></section>

      <section className="mx-auto max-w-[1440px] px-6 py-16 sm:px-10 sm:py-24 lg:px-16"><div className="flex items-end justify-between"><div><p className="text-xs tracking-[0.28em] text-[#69665F]">COFFEE JOURNAL</p><h2 className="mt-3 font-serif text-3xl font-normal">{labels.journal}</h2></div><Link to="/blog" className="text-xs tracking-[0.15em] text-[#69665F] underline underline-offset-8">{labels.viewAll}</Link></div><div className="mt-8 grid gap-5 sm:grid-cols-3">{journalItems.map(item => <Link key={item.title} to="/blog" className="group"><img src={item.image} alt={item.text} className="aspect-[1.25] w-full object-cover transition duration-700 group-hover:scale-[1.02]" /><p className="mt-4 text-[10px] tracking-[0.2em] text-[#69665F]">{item.title}</p><h3 className="mt-2 text-sm">{item.text}</h3></Link>)}</div></section>
    </div>
  );
}

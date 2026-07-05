import { Link } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ChevronLeft, Gift, Shield, Truck } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import ProductImage from '../components/ProductImage';
import ProductImagePlaceholder from '../components/ProductImagePlaceholder';

export default function Cart() {
  const { t } = useLanguage();
  const { items, removeFromCart, updateQuantity, total, itemCount } = useCart();

  const cartPromises = [
    { icon: Truck, label: t('cart.promise.shipping.title', '全台免運'), text: t('cart.promise.shipping.desc', '本次訂單免收運費') },
    { icon: Gift, label: t('cart.promise.gift.title', '禮盒包裝'), text: t('cart.promise.gift.desc', '可於結帳備註送禮需求') },
    { icon: Shield, label: t('cart.promise.after.title', '安心售後'), text: t('cart.promise.after.desc', '品質問題協助處理') },
  ];

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col" style={{ scrollSnapType: 'none' }}>
        <SiteHeader />
        <main className="flex-1 bg-[#fbf6ee] flex items-center justify-center pt-20 pb-20">
          <div className="text-center">
            <div className="w-20 h-20 bg-stone-100 flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-10 h-10 text-stone-300" />
            </div>
            <p className="text-[10px] font-medium tracking-[0.35em] uppercase text-[#8e6448]/70 mb-3">Cart</p>
            <h1 className="text-2xl font-light text-stone-700 mb-3 tracking-[0.15em]">
              {t('cart.empty.title', '購物車是空的')}
            </h1>
            <p className="text-sm text-stone-400 tracking-wide mb-8 font-light">
              {t('cart.empty.description', '快去挑選您喜歡的商品吧')}
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#2b221d] hover:bg-[#5b4637] text-[#fffaf2] transition-all duration-300 text-xs tracking-[0.2em] uppercase font-medium"
            >
              {t('cart.go_shop', '前往商城')}
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ scrollSnapType: 'none' }}>
      <SiteHeader />
      <main className="flex-1 bg-[#fbf6ee] pt-20 pb-20">
        <div className="bg-[#f7f0e6] border-b border-[#eadfd1]">
          <div className="container mx-auto px-6 py-14 md:py-20">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 text-xs text-stone-400 hover:text-stone-600 transition-colors tracking-[0.1em] mb-6"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {t('cart.continue', '繼續購物')}
            </Link>
            <p className="text-[10px] font-medium tracking-[0.35em] uppercase text-[#8e6448]/70 mb-4">Cart</p>
            <h1 className="text-4xl md:text-5xl font-light text-stone-700 tracking-[0.15em] mb-5">
              {t('cart.title', '購物車')}
            </h1>
            <div className="flex items-center gap-3">
              <div className="w-10 h-px bg-[#cfa87a]/50" />
              <p className="text-xs text-stone-400 tracking-[0.2em] font-light">
                {t('cart.count', `共 ${itemCount} 件商品`)}
              </p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-3">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="bg-[#fffaf2] p-5 border border-[#eadfd1] hover:border-[#d8bda4] hover:shadow-[0_6px_24px_rgba(120,100,80,0.08)] transition-all duration-300"
                >
                  <div className="flex gap-5">
                    <Link to={`/product/${item.slug}`} className="flex-shrink-0">
                      <div className="w-20 h-20 md:w-24 md:h-24 bg-[#f7efe5] overflow-hidden border border-[#eadfd1]">
                        {item.image ? (
                          <ProductImage
                            src={item.image}
                            alt={item.name}
                            compactPlaceholder
                            className="w-full h-full object-cover"
                            sizes="96px"
                          />
                        ) : (
                          <ProductImagePlaceholder name={item.name} compact />
                        )}
                      </div>
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 pr-3">
                          <Link to={`/product/${item.slug}`}>
                            <h3 className="text-sm font-medium text-stone-700 mb-1.5 hover:text-[#8e6448] transition-colors tracking-wide line-clamp-1">
                              {item.name}
                            </h3>
                          </Link>
                          <div className="flex items-baseline gap-2">
                            {item.salePrice ? (
                              <>
                                <span className="text-sm font-semibold text-stone-700">
                                  NT$ {item.salePrice.toLocaleString()}
                                </span>
                                <span className="text-xs text-stone-300 line-through font-light">
                                  {item.price.toLocaleString()}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm font-semibold text-stone-700">
                                NT$ {item.price.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-stone-300 hover:text-stone-500 transition-colors p-1.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center border border-[#d8c8b6]">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-[#f7efe5] transition-all duration-200 text-stone-500"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-10 text-center text-sm text-stone-700 font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-[#f7efe5] transition-all duration-200 text-stone-500"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] text-stone-400 mb-0.5 tracking-[0.1em] uppercase font-light">
                            {t('cart.subtotal', '小計')}
                          </p>
                          <p className="text-sm font-semibold text-stone-700">
                            NT$ {((item.salePrice || item.price) * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <p className="text-xs text-stone-400 tracking-[0.1em] pt-2 font-light">
                {t('cart.count', `共 ${itemCount} 件商品`)}
              </p>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-[#f7f0e6] p-6 border border-[#eadfd1] sticky top-28">
                <p className="text-[10px] font-medium tracking-[0.3em] uppercase text-[#8e6448]/70 mb-6">
                  {t('cart.summary', '訂單摘要')}
                </p>

                <div className="space-y-3.5 mb-6">
                  <div className="flex justify-between text-sm text-stone-500 tracking-wide font-light">
                    <span>{t('cart.subtotal', '商品小計')}</span>
                    <span>NT$ {total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-stone-500 tracking-wide font-light">
                    <span>{t('cart.shipping', '運費')}</span>
                    <span>{t('cart.shipping.free', '免運費')}</span>
                  </div>
                  <div className="border-t border-[#d8c8b6] pt-4 mt-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-stone-500 tracking-[0.1em] uppercase font-medium">{t('cart.total', '總計')}</span>
                      <span className="text-xl font-semibold text-stone-700">NT$ {total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-6">
                  <div className="w-6 h-px bg-[#cfa87a]/50" />
                  <p className="text-xs text-stone-400 tracking-wide font-light">
                    {t('cart.shipping.note', '免費配送全台灣')}
                  </p>
                </div>

                <div className="space-y-2.5 mb-6">
                  {cartPromises.map(({ icon: Icon, label, text }) => (
                    <div key={label} className="flex items-center gap-3 border border-[#eadfd1] bg-[#fffaf2] px-3 py-2.5">
                      <Icon className="w-4 h-4 text-[#8e6448] flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-stone-700">{label}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">{text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  to="/checkout"
                  className="w-full block py-3.5 bg-[#2b221d] hover:bg-[#5b4637] text-[#fffaf2] text-center transition-all duration-300 text-xs font-medium tracking-[0.2em] uppercase"
                >
                  {t('cart.checkout', '前往結帳')}
                </Link>

                <Link
                  to="/shop"
                  className="w-full block mt-3 py-3.5 text-stone-500 hover:text-stone-700 text-center transition-all duration-300 border border-[#d8c8b6] hover:border-[#a97a4f] text-xs tracking-[0.15em] uppercase font-light"
                >
                  {t('cart.continue', '繼續購物')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

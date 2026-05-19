import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, MapPin, Calendar, TrendingUp, Shield } from 'lucide-react';
import { Property } from '../lib/supabase';

interface PropertyDetailProps {
  property: Property;
  onClose: () => void;
}

export default function PropertyDetail({ property, onClose }: PropertyDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [shares, setShares] = useState(1);

  const images = [
    property.image_url,
    'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1838554/pexels-photo-1838554.jpeg?auto=compress&cs=tinysrgb&w=1200',
  ];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const totalInvestment = property.price_per_share * shares;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-charcoal/90 backdrop-blur-sm">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-6xl mx-auto bg-cream rounded-sm shadow-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-charcoal/80 hover:bg-charcoal text-cream rounded-full transition-colors z-10"
          >
            <X size={24} />
          </button>

          <div className="relative h-96 overflow-hidden rounded-t-sm">
            <img
              src={images[currentImageIndex]}
              alt={property.name}
              className="w-full h-full object-cover"
            />

            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-charcoal/80 hover:bg-charcoal text-cream rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </button>

            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-charcoal/80 hover:bg-charcoal text-cream rounded-full transition-colors"
            >
              <ChevronRight size={24} />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentImageIndex
                      ? 'bg-cream w-8'
                      : 'bg-cream/50 hover:bg-cream/75'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="p-8 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2">
                <div className="mb-8">
                  <h1 className="text-4xl lg:text-5xl font-serif text-charcoal mb-4">
                    {property.name}
                  </h1>
                  <div className="flex items-center text-charcoal/70 text-lg">
                    <MapPin size={20} className="mr-2" />
                    <span>{property.location}</span>
                  </div>
                </div>

                <div className="mb-12">
                  <h2 className="text-2xl font-serif text-charcoal mb-4">物業歷史</h2>
                  <div className="prose prose-lg">
                    <p className="text-charcoal/80 leading-relaxed mb-4">
                      {property.description}
                    </p>
                    <p className="text-charcoal/80 leading-relaxed mb-4">
                      這座非凡的物業代表著擁有建築歷史一部分的獨特機會。最初由知名建築師建造，經過精心修復以保留其遺產，同時融入現代奢華設施。
                    </p>
                    <p className="text-charcoal/80 leading-relaxed">
                      修復過程涉及與當地工匠和保護專家的合作，以確保真實性的同時滿足當代舒適和永續標準。每個細節都經過精心考慮，以尊重物業的傳承。
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-white rounded-sm">
                    <Calendar className="text-[#2C1F10] mx-auto mb-2" size={24} />
                    <p className="text-sm text-charcoal/60">建造年份</p>
                    <p className="text-lg font-medium text-charcoal">1965</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-sm">
                    <TrendingUp className="text-[#2C1F10] mx-auto mb-2" size={24} />
                    <p className="text-sm text-charcoal/60">增值率</p>
                    <p className="text-lg font-medium text-charcoal">8.5%/年</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-sm">
                    <Shield className="text-[#2C1F10] mx-auto mb-2" size={24} />
                    <p className="text-sm text-charcoal/60">保險</p>
                    <p className="text-lg font-medium text-charcoal">已包含</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-sm">
                    <MapPin className="text-[#2C1F10] mx-auto mb-2" size={24} />
                    <p className="text-sm text-charcoal/60">面積</p>
                    <p className="text-lg font-medium text-charcoal">3,200 平方英尺</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white p-8 rounded-sm shadow-lg sticky top-8">
                  <h3 className="text-2xl font-serif text-charcoal mb-6">股份計算器</h3>

                  <div className="mb-6">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-charcoal/60">每股價格</span>
                      <span className="text-2xl font-serif text-charcoal">
                        {formatPrice(property.price_per_share)}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline mb-4">
                      <span className="text-charcoal/60">可售股份</span>
                      <span className="text-lg font-medium text-charcoal">
                        {property.available_shares}/{property.total_shares}
                      </span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-charcoal mb-3">
                      股份數量：{shares}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max={Math.min(property.available_shares, 20)}
                      value={shares}
                      onChange={(e) => setShares(Number(e.target.value))}
                      className="w-full h-2 bg-charcoal/20 rounded-lg appearance-none cursor-pointer accent-[#C09A6A]"
                    />
                    <div className="flex justify-between text-xs text-charcoal/60 mt-1">
                      <span>1</span>
                      <span>{Math.min(property.available_shares, 20)}</span>
                    </div>
                  </div>

                  <div className="border-t border-charcoal/10 pt-6 mb-6">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-charcoal/60">總投資額</span>
                      <span className="text-3xl font-serif text-charcoal">
                        {formatPrice(totalInvestment)}
                      </span>
                    </div>
                    <p className="text-xs text-charcoal/60 mt-2">
                      所有管理費和維護費用已包含
                    </p>
                  </div>

                  <button className="w-full py-4 bg-[#C09A6A] text-white font-medium rounded-sm hover:bg-[#8B6840] transition-all duration-300 mb-3">
                    預訂股份
                  </button>

                  <button className="w-full py-3 border border-charcoal/20 text-charcoal rounded-sm hover:bg-charcoal/5 transition-all duration-300">
                    安排參觀
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { MapPin, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Property } from '../lib/supabase';
import { fadeInUp } from '../lib/animations';

interface PropertyCardProps {
  property: Property;
  onViewDetails: () => void;
}

export default function PropertyCard({ property, onViewDetails }: PropertyCardProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sold out':
        return 'bg-[#C09A6A] text-white';
      case 'waitlist open':
        return 'bg-[#F0E4C8] text-[#2C1F10]';
      case 'available':
        return 'bg-emerald-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Available':
        return '可售';
      case 'Waitlist Open':
        return '候補開放';
      case 'Sold Out':
        return '已售出';
      default:
        return status;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      className="group bg-white rounded-sm overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2"
    >
      <div className="relative h-72 overflow-hidden">
        <img
          src={property.image_url}
          alt={property.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute top-4 right-4">
          <span
            className={`px-4 py-2 text-xs font-medium rounded-sm ${getStatusColor(
              property.status
            )}`}
          >
            {getStatusText(property.status)}
          </span>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-2xl font-serif text-charcoal mb-2 group-hover:text-[#2C1F10] transition-colors">
          {property.name}
        </h3>

        <div className="flex items-center text-charcoal/70 mb-4">
          <MapPin size={16} className="mr-1" />
          <span className="text-sm">{property.location}</span>
        </div>

        <div className="flex items-baseline justify-between mb-4">
          <div>
            <p className="text-sm text-charcoal/60 mb-1">每股價格</p>
            <p className="text-2xl font-serif text-charcoal">
              {formatPrice(property.price_per_share)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-charcoal/60 mb-1">可售股份</p>
            <p className="text-lg font-medium text-charcoal">
              {property.available_shares}/{property.total_shares}
            </p>
          </div>
        </div>

        <p className="text-sm text-charcoal/70 mb-6 line-clamp-2">
          {property.description}
        </p>

        <button
          onClick={onViewDetails}
          className="w-full py-3 border-2 border-charcoal text-charcoal font-medium rounded-sm hover:bg-charcoal hover:text-cream transition-all duration-300 flex items-center justify-center"
        >
          <span>查看詳情</span>
          <TrendingUp size={16} className="ml-2" />
        </button>
      </div>
    </motion.div>
  );
}

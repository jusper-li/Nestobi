const SITE_URL = window.location.origin;
const ORG_NAME = 'Sonpin';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORG_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/LOGO-1.png`,
    description: '精品咖啡禮盒品牌，嚴選產地直送豆款，結合精美包裝工藝，獻給每一個值得被珍視的場合。',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['zh-TW', 'en'],
    },
    sameAs: [],
  };
}

export function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: ORG_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/LOGO-1.png`,
    description: '精品咖啡禮盒品牌，提供咖啡豆、掛耳包、精品禮盒等高品質咖啡相關商品。',
    priceRange: 'NT$$$',
    currenciesAccepted: 'TWD',
    paymentAccepted: '信用卡, 銀行轉帳, 貨到付款',
    openingHours: 'Mo-Fr 09:00-18:00',
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: ORG_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/shop?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

interface ProductSchemaParams {
  name: string;
  description: string;
  images: string[];
  sku?: string;
  price: number;
  salePrice?: number | null;
  stock: number;
  slug: string;
  category?: string;
}

export function productSchema({
  name,
  description,
  images,
  sku,
  price,
  salePrice,
  stock,
  slug,
  category,
}: ProductSchemaParams) {
  const currentPrice = salePrice || price;
  const availability = stock > 0
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: images.length > 0 ? images : [`${SITE_URL}/LOGO-1.png`],
    brand: {
      '@type': 'Brand',
      name: ORG_NAME,
    },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/product/${slug}`,
      priceCurrency: 'TWD',
      price: currentPrice,
      availability,
      seller: {
        '@type': 'Organization',
        name: ORG_NAME,
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: 0,
          currency: 'TWD',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          businessDays: {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          },
          cutoffTime: '15:00:00+08:00',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 2,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 3,
            unitCode: 'DAY',
          },
        },
      },
    },
  };

  if (sku) schema.sku = sku;
  if (category) schema.category = category;

  if (salePrice && salePrice < price) {
    schema.offers.priceValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
  }

  return schema;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

interface FAQItem {
  question: string;
  answer: string;
}

export function faqPageSchema(faqs: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function collectionPageSchema(name: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: `${SITE_URL}/shop`,
    provider: {
      '@type': 'Organization',
      name: ORG_NAME,
    },
  };
}

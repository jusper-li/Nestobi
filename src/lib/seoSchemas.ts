type SeoListItem = {
  name: string;
  url?: string;
  description?: string;
  image?: string;
};

function toAbsoluteUrl(url: string) {
  if (!url) return url;
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return url;
  }
}

export function buildItemListSchema(name: string, items: SeoListItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url ? { url: toAbsoluteUrl(item.url) } : {}),
      ...(item.description ? { description: item.description } : {}),
      ...(item.image ? { image: toAbsoluteUrl(item.image) } : {}),
    })),
  };
}

export function buildFaqSchema(items: SeoListItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.name,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.description || '',
      },
    })),
  };
}

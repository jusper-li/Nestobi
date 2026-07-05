export interface HomepageSubmenuItem {
  label: string;
  title: string;
  href: string;
}

export interface HomepageSectionContent {
  label?: string;
  subtitle?: string;
  title?: string;
  number?: string;
  submenu?: HomepageSubmenuItem[];
  background_image?: string;
  image?: string;
  description?: string;
  main_title?: string;
  tagline?: string;
  href?: string;
  link?: string;
  cta_label?: string;
}

export interface HomepageSection {
  id: string;
  label: string;
  subtitle: string;
  title: string;
  number: string;
  submenu?: HomepageSubmenuItem[];
  section_type: string;
  content: HomepageSectionContent;
  background_image?: string;
  description?: string;
}

export interface HeaderNavItem {
  label: string;
  href: string;
}

export interface HeaderSettings {
  logo_text: string;
  logo_image: string;
  navigation: HeaderNavItem[];
  show_cart: boolean;
  show_language_selector: boolean;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterLinkGroup {
  title: string;
  links: FooterLink[];
}

export interface FooterSettings {
  about_text: string;
  contact_email: string;
  contact_phone: string;
  social_links: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
  copyright_text: string;
  link_groups: FooterLinkGroup[];
}

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSection[] = [
  {
    id: 'hero',
    label: 'Sonpin',
    subtitle: 'You And Me Coffee',
    title: '為送禮而生的精品咖啡',
    number: '01',
    section_type: 'hero',
    content: {
      label: 'Sonpin',
      main_title: 'Y&M',
      subtitle: 'COFFEE',
      tagline: 'ROASTED FOR GIFTING',
      title: '為送禮而生的精品咖啡',
      description: '將台灣風味與送禮心意，化成一盒盒適合分享的精品咖啡禮盒。',
      number: '01',
      background_image: '/product-images/reserved-for-you-huasitian-huo-limited-1.jpg',
    },
    background_image: '/product-images/reserved-for-you-huasitian-huo-limited-1.jpg',
  },
  {
    id: 'shop',
    label: 'Gift Shop',
    subtitle: '精選禮盒',
    title: '禮盒商城',
    number: '02',
    section_type: 'shop',
    submenu: [
      { label: 'Shop', title: '前往商城', href: '/shop' },
      { label: 'Cart', title: '前往購物車', href: '/cart' },
    ],
    content: {
      label: 'Gift Shop',
      subtitle: '精選禮盒',
      title: '禮盒商城',
      description: '以送禮情境為出發，挑選適合節慶、祝福與日常分享的咖啡禮盒組合。',
      number: '02',
      background_image: '/product-images/champion-coffee-chocolate-huo-gang-gift-box-1.jpg',
      submenu: [
        { label: 'Shop', title: '前往商城', href: '/shop' },
        { label: 'Cart', title: '前往購物車', href: '/cart' },
      ],
    },
    background_image: '/product-images/champion-coffee-chocolate-huo-gang-gift-box-1.jpg',
  },
  {
    id: 'story',
    label: 'Brand Story',
    subtitle: '品牌故事',
    title: '從山林風味到送禮提案',
    number: '03',
    section_type: 'story',
    submenu: [
      { label: 'About', title: '關於我們', href: '/about' },
      { label: 'Story', title: '品牌故事', href: '/story' },
    ],
    content: {
      label: 'Brand Story',
      subtitle: '品牌故事',
      title: '從山林風味到送禮提案',
      description: 'Y&M 以精品咖啡禮盒為起點，持續把台灣風味、設計與分享的心意帶進日常。',
      number: '03',
      background_image: '/product-images/the-one-and-only-huo-gang-drip-2.jpg',
      submenu: [
        { label: 'About', title: '關於我們', href: '/about' },
        { label: 'Story', title: '品牌故事', href: '/story' },
      ],
    },
    background_image: '/product-images/the-one-and-only-huo-gang-drip-2.jpg',
  },
  {
    id: 'contact',
    label: 'Contact',
    subtitle: '聯絡我們',
    title: '歡迎聯繫我們',
    number: '04',
    section_type: 'contact',
    submenu: [
      { label: 'Contact', title: '聯絡我們', href: '/contact' },
      { label: 'FAQ', title: '常見問題', href: '/faq' },
    ],
    content: {
      label: 'Contact',
      subtitle: '聯絡我們',
      title: '歡迎聯繫我們',
      description: '若你想詢問商品、訂單、合作或客製需求，歡迎透過聯絡頁與我們取得聯繫。',
      number: '04',
      background_image: '/product-images/huo-gang-coffee-letter-gift-2.jpg',
      submenu: [
        { label: 'Contact', title: '聯絡我們', href: '/contact' },
        { label: 'FAQ', title: '常見問題', href: '/faq' },
      ],
    },
    background_image: '/product-images/huo-gang-coffee-letter-gift-2.jpg',
  },
];

export const DEFAULT_HEADER_SETTINGS: HeaderSettings = {
  logo_text: 'Sonpin',
  logo_image: '/LOGO-1.png',
  navigation: [
    { label: '首頁', href: '/' },
    { label: '禮盒商城', href: '/shop' },
    { label: '專欄文章', href: '/blog' },
    { label: '品牌故事', href: '/story' },
    { label: '關於我們', href: '/about' },
    { label: '聯絡我們', href: '/contact' },
  ],
  show_cart: true,
  show_language_selector: true,
};

export const DEFAULT_FOOTER_SETTINGS: FooterSettings = {
  about_text: '我們相信一份好禮，應該從香氣、設計到內容都能傳達心意。Sonpin 以精品咖啡禮盒為核心，讓送禮成為一件更溫柔也更有質感的事。',
  contact_email: '',
  contact_phone: '',
  social_links: {},
  copyright_text: '© 2026 Sonpin. All Rights Reserved.',
  link_groups: [
    {
      title: '品牌故事',
      links: [
        { label: '關於我們', href: '/about' },
        { label: '品牌故事', href: '/story' },
        { label: '專欄文章', href: '/blog' },
        { label: '聯絡我們', href: '/contact' },
      ],
    },
    {
      title: '服務資訊',
      links: [
        { label: '禮盒商城', href: '/shop' },
        { label: '常見問題', href: '/faq' },
        { label: '配送說明', href: '/shipping' },
      ],
    },
  ],
};

export const toHomepageManagementSections = (
  sections: HomepageSection[] = DEFAULT_HOMEPAGE_SECTIONS
) => sections.map((section, index) => ({
  id: section.id,
  section_type: section.section_type,
  title: section.title,
  content: {
    ...section.content,
    label: section.content.label || section.label,
    title: section.content.title || section.title,
    subtitle: section.content.subtitle || section.subtitle,
    number: section.content.number || section.number,
    submenu: section.content.submenu || section.submenu || [],
  },
  sort_order: index + 1,
  is_active: true,
  source: 'local' as const,
}));

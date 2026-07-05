export const FALLBACK_CATEGORIES = [
  { id: 'beans', name: '頂級精品咖啡豆', slug: 'beans' },
  { id: 'drip-coffee', name: '頂級精品濾掛', slug: 'drip-coffee' },
  { id: 'gift-boxes', name: '藝術聯名禮盒', slug: 'gift-boxes' },
  { id: 'brew-tools', name: '咖啡沖泡器具', slug: 'brew-tools' },
];

const CATEGORY_BY_ID = Object.fromEntries(
  FALLBACK_CATEGORIES.map((category) => [category.id, { name: category.name, slug: category.slug }])
);

export const OBSOLETE_PRODUCT_SLUGS = [
  'huo-gang-2026-money-gift-box',
  'reserved-for-you-zuo-drip-single',
];

const PRODUCT_IMAGE_PATHS: Record<string, string[]> = {
  'reserved-for-you-huasitian-huo-limited': [
    '/product-images/reserved-for-you-huasitian-huo-limited-1.jpg',
    '/product-images/reserved-for-you-huasitian-huo-limited-2.jpg',
  ],
  'reserved-for-you-zuo-wce-wu-limited': [
    '/product-images/reserved-for-you-zuo-wce-wu-limited-1.jpg',
    '/product-images/reserved-for-you-zuo-wce-wu-limited-2.jpg',
  ],
  'reserved-for-you-zuo-champion-beans': [
    '/product-images/reserved-for-you-zuo-champion-beans-1.jpg',
    '/product-images/reserved-for-you-zuo-champion-beans-2.jpg',
  ],
  'champion-coffee-chocolate-koyama-gift-box': [
    '/product-images/champion-coffee-chocolate-koyama-gift-box-1.jpg',
    '/product-images/champion-coffee-chocolate-koyama-gift-box-2.jpg',
  ],
  'the-one-and-only-huo-gang-drip': [
    '/product-images/the-one-and-only-huo-gang-drip-1.jpg',
    '/product-images/the-one-and-only-huo-gang-drip-2.jpg',
  ],
  'champion-coffee-chocolate-huo-gang-gift-box': [
    '/product-images/champion-coffee-chocolate-huo-gang-gift-box-1.jpg',
    '/product-images/champion-coffee-chocolate-huo-gang-gift-box-2.jpg',
  ],
  'huo-gang-art-drip-coffee-gift-box': [
    '/product-images/huo-gang-art-drip-coffee-gift-box-1.jpg',
    '/product-images/huo-gang-art-drip-coffee-gift-box-2.jpg',
  ],
  'the-one-and-only-champion-blend-beans': [
    '/product-images/the-one-and-only-champion-blend-beans-1.jpg',
    '/product-images/the-one-and-only-champion-blend-beans-2.jpg',
  ],
  'the-one-and-only-15-drip-canvas-set': [
    '/product-images/the-one-and-only-15-drip-canvas-set-1.jpg',
    '/product-images/the-one-and-only-15-drip-canvas-set-2.jpg',
  ],
  'reserved-for-you-jinglong-geisha-natural': [
    '/product-images/reserved-for-you-jinglong-geisha-natural-1.jpg',
    '/product-images/reserved-for-you-jinglong-geisha-natural-2.jpg',
  ],
  'ynm-pourover-brewing-set': [
    '/product-images/ynm-pourover-brewing-set-1.jpg',
    '/product-images/ynm-pourover-brewing-set-2.jpg',
  ],
  'huo-gang-coffee-letter-gift': [
    '/product-images/huo-gang-coffee-letter-gift-1.jpg',
    '/product-images/huo-gang-coffee-letter-gift-2.jpg',
  ],
};

const makeProductContent = ({
  lead,
  story,
  notes,
  details,
}: {
  lead: string;
  story: string[];
  notes: string[];
  details: string[];
}) => `
  <section class="ym-product-copy">
    <p class="ym-product-lead">${lead}</p>
    <div class="ym-product-copy-grid">
      <div>
        <h3>商品故事</h3>
        ${story.map((item) => `<p>${item}</p>`).join('')}
      </div>
      <div>
        <h3>風味與特色</h3>
        <ul>${notes.map((item) => `<li>${item}</li>`).join('')}</ul>
      </div>
    </div>
    <div class="ym-product-copy-note">
      <h3>內容與保存</h3>
      <ul>${details.map((item) => `<li>${item}</li>`).join('')}</ul>
    </div>
  </section>
`;

const theOneOnlyStory = [
  '以世界烘豆冠軍團隊監製的精品配方為核心，讓日常咖啡保有清楚果香、乾淨甜感與細緻餘韻。',
  '水洗與日曬處理法以黃金比例搭配，展現耶加雪菲產區的明亮輪廓，也讓濾掛與咖啡豆都能穩定呈現優雅層次。',
];

const championTeam = 'WCE 世界盃烘豆冠軍賴昱權監製，CQI 國際咖啡品質鑑定師與 SCA 烘豆師 Viola Chang 共同把關。';

export const FALLBACK_PRODUCTS = [
  {
    id: 'fallback-drip-canvas-15',
    name: 'The One & Only 世界烘豆冠軍 獨家精品配方 - 15入手工帆布袋組<霍剛藝術聯名系列>',
    slug: 'the-one-and-only-15-drip-canvas-set',
    summary: '15 入精品濾掛搭配手工帆布袋，將冠軍配方、藝術聯名與日常送禮整理成完整組合。',
    description: '手工帆布袋組搭配 The One & Only 世界烘豆冠軍獨家精品配方濾掛，適合自用、企業贈禮與節慶分享。',
    content: makeProductContent({
      lead: '簡約帆布袋承載濾掛咖啡，讓精品咖啡不只是飲品，也成為能被帶著走的生活美學。',
      story: [
        '帆布袋以低調、耐看的設計承接 y & m 對環保與生活質感的關懷，打開後即可享用 15 入冠軍配方濾掛。',
        ...theOneOnlyStory,
      ],
      notes: [
        '風味：蘋果、柑橘、杏桃乾、伯爵茶。',
        '處理法：水洗與日曬配方。',
        '焙度：淺焙，保留清亮果酸與柔和甜感。',
        championTeam,
      ],
      details: [
        '內容物：The One & Only 精品濾掛 15 入與手工帆布袋。',
        '濾掛每包 12g，適合辦公室、旅行與日常沖煮。',
        '建議存放於陰涼乾燥處，開封後盡早飲用。',
      ],
    }),
    price: 1800,
    sale_price: 1580,
    member_price: null,
    images: PRODUCT_IMAGE_PATHS['the-one-and-only-15-drip-canvas-set'],
    category_id: 'drip-coffee',
    specifications: [
      { name: '內容物', value: '精品濾掛咖啡 15 入、手工帆布袋' },
      { name: '風味', value: '蘋果、柑橘、杏桃乾、伯爵茶' },
      { name: '處理法', value: '水洗 + 日曬' },
      { name: '焙度', value: '淺焙' },
    ],
    stock: 16,
    sku: 'YNM-DRIP-CANVAS-15',
    categories: CATEGORY_BY_ID['drip-coffee'],
  },
  {
    id: 'fallback-gift-huasitian-huo',
    name: 'Reserved for You｜限量珍藏系列 花囍田咖啡莊園 × WCE 烘豆冠軍 × 藝術家霍剛 跨界聯名之作',
    slug: 'reserved-for-you-huasitian-huo-limited',
    summary: '台灣雲林花囍田咖啡莊園、WCE 烘豆冠軍與藝術家霍剛跨界聯名的 8 入精品濾掛禮盒。',
    description: '以台灣精品咖啡為核心，結合冠軍烘豆技術與霍剛藝術視覺，適合收藏、贈禮與品牌咖啡品飲。',
    content: makeProductContent({
      lead: 'Reserved for You 是一份留給重要之人的精品咖啡邀請，將台灣莊園、世界賽事技術與藝術聯名收束在同一只禮盒中。',
      story: [
        '花囍田咖啡莊園代表台灣精品咖啡的細膩產地風土，透過冠軍烘豆團隊調整風味表現，讓濾掛也能保有清楚的層次。',
        '霍剛的藝術語彙為禮盒建立收藏感，使咖啡從日常飲用延伸到視覺、情感與儀式。',
      ],
      notes: [
        '產地：台灣雲林花囍田咖啡莊園。',
        '品種資訊：藝伎與 SL34 批次概念。',
        '聯名：WCE 烘豆冠軍團隊 × 藝術家霍剛。',
        '形式：8 入精品濾掛，單包 12g。',
      ],
      details: [
        '內容物：精品濾掛咖啡 8 入。',
        '禮盒系列均附提袋。',
        '建議以 90-92°C 熱水分段注水，呈現更乾淨的甜感與香氣。',
      ],
    }),
    price: 1600,
    sale_price: 1280,
    member_price: null,
    images: PRODUCT_IMAGE_PATHS['reserved-for-you-huasitian-huo-limited'],
    category_id: 'gift-boxes',
    specifications: [
      { name: '系列', value: 'Reserved for You 限量珍藏系列' },
      { name: '莊園', value: '台灣雲林花囍田咖啡莊園' },
      { name: '聯名', value: 'WCE 烘豆冠軍 × 藝術家霍剛' },
      { name: '內容物', value: '8 入精品濾掛，12g／包' },
    ],
    stock: 12,
    sku: 'YNM-GIFT-HUASITIAN-HUO',
    categories: CATEGORY_BY_ID['gift-boxes'],
  },
  {
    id: 'fallback-drip-zuo-single',
    name: 'Reserved for You｜限量珍藏系列 阿里山鄒築園 × 2025 WCE TCRC 烘豆冠軍 × 吳偉丞陶藝家 跨界聯名之作',
    slug: 'reserved-for-you-zuo-wce-wu-limited',
    summary: '阿里山鄒築園、2025 WCE TCRC 烘豆冠軍與陶藝家吳偉丞聯名打造的精品濾掛禮盒。',
    description: '以阿里山咖啡風土為主軸，透過冠軍烘豆與陶藝家的手感視覺，呈現台灣精品咖啡的禮贈價值。',
    content: makeProductContent({
      lead: '從高山咖啡到陶藝器物，這款限量禮盒把台灣風土轉化為可飲用、可收藏的心意。',
      story: [
        '阿里山鄒築園的咖啡帶有高海拔的乾淨酸甜與細緻香氣，經由 2025 WCE TCRC 冠軍烘豆思維呈現穩定輪廓。',
        '吳偉丞陶藝家的跨界聯名，讓禮盒不只表達味覺，也帶有手作質感與藝術溫度。',
      ],
      notes: [
        '產地：台灣阿里山鄒築園。',
        '聯名：2025 WCE TCRC 烘豆冠軍 × 吳偉丞陶藝家。',
        '風格：台灣高山精品咖啡，香氣乾淨、層次細緻。',
        '適合收藏、節慶送禮與品牌贈禮。',
      ],
      details: [
        '內容物：限量系列精品濾掛禮盒。',
        '禮盒系列均附提袋。',
        '建議存放於陰涼乾燥處，避免陽光直射。',
      ],
    }),
    price: 1280,
    sale_price: null,
    member_price: null,
    images: PRODUCT_IMAGE_PATHS['reserved-for-you-zuo-wce-wu-limited'],
    category_id: 'gift-boxes',
    specifications: [
      { name: '系列', value: 'Reserved for You 限量珍藏系列' },
      { name: '莊園', value: '阿里山鄒築園' },
      { name: '聯名', value: '2025 WCE TCRC 烘豆冠軍 × 吳偉丞陶藝家' },
      { name: '形式', value: '精品濾掛禮盒' },
    ],
    stock: 18,
    sku: 'YNM-GIFT-ZUO-WU-LIMITED',
    categories: CATEGORY_BY_ID['gift-boxes'],
  },
  {
    id: 'fallback-bean-zuo-limited',
    name: 'Reserved for you｜阿里山鄒築園 x 2025 WCE TCRC 烘豆冠軍 x 吳偉丞陶藝家跨界聯名',
    slug: 'reserved-for-you-zuo-champion-beans',
    summary: '阿里山鄒築園精品咖啡豆批次，結合 2025 WCE TCRC 烘豆冠軍與陶藝家吳偉丞跨界聯名。',
    description: '台灣高山精品咖啡豆，為限量收藏與手沖愛好者設計，已售完仍保留完整商品資訊。',
    content: makeProductContent({
      lead: '以阿里山鄒築園咖啡豆為核心，保留台灣高山咖啡的清雅輪廓，並以跨界聯名形式呈現收藏價值。',
      story: [
        '鄒築園批次呈現阿里山高海拔的風土條件，霧氣、水土與日夜溫差共同形塑細緻香氣。',
        '冠軍烘豆技術與陶藝家的視覺語彙，讓這款咖啡豆在味覺與器物美學之間形成連結。',
      ],
      notes: [
        '產地：台灣阿里山鄒築園。',
        '聯名：2025 WCE TCRC 烘豆冠軍 × 吳偉丞陶藝家。',
        '形式：精品咖啡豆，適合手沖與收藏。',
        '狀態：限量批次，售完保留展示。',
      ],
      details: [
        '建議使用手沖、聰明濾杯或其他乾淨萃取方式。',
        '開封後請密封保存，並於最佳賞味期內飲用。',
        '售完商品可作為後續相近批次上架參考。',
      ],
    }),
    price: 1880,
    sale_price: null,
    member_price: null,
    images: PRODUCT_IMAGE_PATHS['reserved-for-you-zuo-champion-beans'],
    category_id: 'beans',
    specifications: [
      { name: '產地', value: '台灣阿里山鄒築園' },
      { name: '聯名', value: '2025 WCE TCRC 烘豆冠軍 × 吳偉丞陶藝家' },
      { name: '品項', value: '精品咖啡豆' },
      { name: '狀態', value: '售完' },
    ],
    stock: 0,
    sku: 'YNM-BEAN-ZUO-001',
    categories: CATEGORY_BY_ID['beans'],
  },
  {
    id: 'fallback-gift-chocolate-koyama',
    name: 'y ＆ m｜ORIGIN 冠軍精品咖啡巧克力禮盒',
    slug: 'champion-coffee-chocolate-koyama-gift-box',
    summary: '精品巧克力 1 入與冠軍莊園精品咖啡濾掛 5 入，融合咖啡、巧克力與藝術禮盒語彙。',
    description: 'ORIGIN 冠軍精品咖啡巧克力禮盒，以咖啡濾掛與精品巧克力組成，適合精緻贈禮。',
    content: makeProductContent({
      lead: '以精品咖啡與巧克力共構味覺禮盒，讓香氣、甜感與藝術包裝形成完整的送禮體驗。',
      story: [
        '咖啡與巧克力都帶有產地、發酵與烘焙的層次，兩者並置後能呈現更豐富的甜感與香氣延伸。',
        '禮盒以藝術聯名視覺包裝，將 Sonpin 的冠軍咖啡精神與 ORIGIN 巧克力的甜美輪廓相互呼應。',
      ],
      notes: [
        '內容組合：精品巧克力 1 入 + 冠軍莊園精品咖啡濾掛 5 入。',
        '風格：咖啡香氣、巧克力甜感與禮盒收藏感並重。',
        '適合節慶、企業贈禮與日常犒賞。',
      ],
      details: [
        '禮盒系列均附提袋。',
        '巧克力建議冷藏保存。',
        '常溫保存時請避免高溫，建議不要高於 26°C。',
      ],
    }),
    price: 1280,
    sale_price: null,
    member_price: null,
    images: PRODUCT_IMAGE_PATHS['champion-coffee-chocolate-koyama-gift-box'],
    category_id: 'gift-boxes',
    specifications: [
      { name: '內容物', value: '精品巧克力 1 入、精品咖啡濾掛 5 入' },
      { name: '系列', value: 'ORIGIN 冠軍精品咖啡巧克力禮盒' },
      { name: '保存', value: '巧克力建議冷藏，常溫不高於 26°C' },
    ],
    stock: 18,
    sku: 'YNM-GIFT-CHOC-KOYAMA',
    categories: CATEGORY_BY_ID['gift-boxes'],
  },
  {
    id: 'fallback-drip-one-only-huo',
    name: 'The One and Only｜世界烘豆冠軍 獨家精品配方濾掛咖啡<霍剛藝術聯名系列>',
    slug: 'the-one-and-only-huo-gang-drip',
    summary: '霍剛藝術聯名濾掛咖啡，呈現蘋果、柑橘、杏桃乾與伯爵茶般的細緻風味。',
    description: '世界烘豆冠軍獨家精品配方濾掛，以霍剛藝術聯名包裝呈現，一款風味、多種收藏畫面。',
    content: makeProductContent({
      lead: '品見的藝術，是視覺與香氣的交會；The One and Only 讓一杯濾掛也有清楚的精品咖啡姿態。',
      story: [
        '霍剛的畫面像光與色的節奏，Sonpin 則把香氣留在時間裡，讓濾掛包裝成為小型藝術收藏。',
        ...theOneOnlyStory,
      ],
      notes: [
        '風味：蘋果、柑橘、杏桃乾、伯爵茶。',
        '產地：衣索比亞耶加雪菲。',
        '處理法：水洗 + 日曬。',
        '包裝：霍剛藝術聯名系列，一款風味搭配多款畫面，隨機出貨。',
      ],
      details: [
        '形式：精品濾掛咖啡單包。',
        '每包 12g，適合快速沖煮。',
        '建議存放於陰涼乾燥處，開封後立即沖煮。',
      ],
    }),
    price: 120,
    sale_price: null,
    member_price: null,
    images: PRODUCT_IMAGE_PATHS['the-one-and-only-huo-gang-drip'],
    category_id: 'drip-coffee',
    specifications: [
      { name: '風味', value: '蘋果、柑橘、杏桃乾、伯爵茶' },
      { name: '產地', value: '衣索比亞耶加雪菲' },
      { name: '處理法', value: '水洗 + 日曬' },
      { name: '聯名', value: '霍剛藝術聯名系列' },
    ],
    stock: 80,
    sku: 'YNM-DRIP-ONE-HUO',
    categories: CATEGORY_BY_ID['drip-coffee'],
  },
  {
    id: 'fallback-gift-chocolate-huo',
    name: 'y ＆ m｜ORIGIN 冠軍精品咖啡巧克力禮盒',
    slug: 'champion-coffee-chocolate-huo-gang-gift-box',
    summary: 'The One and Only 精品濾掛 5 入搭配精品咖啡巧克力，結合 Art Deco 與藝術聯名視覺。',
    description: '優惠版 ORIGIN 冠軍精品咖啡巧克力禮盒，將世界盃烘豆冠軍配方與精品巧克力組成精緻禮品。',
    content: makeProductContent({
      lead: '太陽、雨水、咖啡豆與巧克力豆的設計語彙，讓這款禮盒呈現甜美夢想與精品咖啡的雙重想像。',
      story: [
        'Art Deco 元素與自然意象被轉化為禮盒視覺，使咖啡與巧克力不只是內容物，也是一份完整的設計禮物。',
        'The One and Only 5 入濾掛搭配精品咖啡巧克力，讓收禮者能同時感受香氣與甜感。',
      ],
      notes: [
        '內容：The One and Only 精品濾掛 5 入。',
        '搭配：精品咖啡巧克力片 1 入，口味依現場供應選擇。',
        '風味主軸：杏桃乾、蘋果、柑橘與伯爵茶般餘韻。',
        '聯名視覺：藝術家小山俊孝聯名版概念。',
      ],
      details: [
        '禮盒系列均附提袋。',
        '巧克力建議冷藏保存。',
        '常溫保存時請避免高溫，建議不要高於 26°C。',
      ],
    }),
    price: 1280,
    sale_price: 1080,
    member_price: null,
    images: PRODUCT_IMAGE_PATHS['champion-coffee-chocolate-huo-gang-gift-box'],
    category_id: 'gift-boxes',
    specifications: [
      { name: '內容物', value: '精品咖啡濾掛 5 入、精品咖啡巧克力片 1 入' },
      { name: '風味', value: '蘋果、柑橘、杏桃乾、伯爵茶' },
      { name: '保存', value: '巧克力建議冷藏，常溫不高於 26°C' },
    ],
    stock: 20,
    sku: 'YNM-GIFT-CHOC-HUO',
    categories: CATEGORY_BY_ID['gift-boxes'],
  },
  {
    id: 'fallback-gift-art-huo',
    name: 'Reserved for You｜限量珍藏系列',
    slug: 'huo-gang-art-drip-coffee-gift-box',
    summary: '以風味傳心、以藝術贈意的限量珍藏禮盒，讓祝福不止於形式。',
    description: 'Reserved for You 限量珍藏系列禮盒，將精品濾掛、藝術包裝與贈禮儀式結合。',
    content: makeProductContent({
      lead: '讓祝福不止於形式，而成為美學的延伸；以風味傳心，以藝術贈意。',
      story: [
        '此系列以精品咖啡濾掛作為核心，搭配藝術視覺與禮盒包裝，適合在重要時刻傳遞精緻心意。',
        'Reserved for You 的精神，是把精選咖啡留給值得被珍藏的人。',
      ],
      notes: [
        '風格：限量珍藏禮盒。',
        '內容：精品咖啡濾掛與藝術包裝。',
        '適用：節慶贈禮、企業禮贈、收藏型咖啡禮盒。',
      ],
      details: [
        '禮盒系列均附提袋。',
        '建議保存於陰涼乾燥處。',
        '濾掛咖啡開封後請立即沖煮。',
      ],
    }),
    price: 1280,
    sale_price: null,
    member_price: null,
    images: PRODUCT_IMAGE_PATHS['huo-gang-art-drip-coffee-gift-box'],
    category_id: 'gift-boxes',
    specifications: [
      { name: '系列', value: 'Reserved for You 限量珍藏系列' },
      { name: '形式', value: '精品咖啡濾掛禮盒' },
      { name: '包裝', value: '藝術聯名禮盒，附提袋' },
    ],
    stock: 24,
    sku: 'YNM-GIFT-ART-HUO',
    categories: CATEGORY_BY_ID['gift-boxes'],
  },
  {
    id: 'fallback-bean-one-only',
    name: 'The One and Only｜世界烘豆冠軍 獨家精品配方豆',
    slug: 'the-one-and-only-champion-blend-beans',
    summary: '世界烘豆冠軍獨家精品配方豆，呈現蘋果、柑橘、杏桃乾與伯爵茶般餘韻。',
    description: '以耶加雪菲為風味主軸的精品配方咖啡豆，適合手沖與日常細品。',
    content: makeProductContent({
      lead: 'The One and Only 是為精緻日常而生的咖啡豆，清晨或午後都能帶來明亮而細膩的風味。',
      story: [
        ...theOneOnlyStory,
        '品牌總監 Viola 將這款深受喜愛的咖啡命名為 The One & Only，象徵對精品咖啡與唯一偏愛的追求。',
      ],
      notes: [
        '風味：蘋果、柑橘、杏桃乾、伯爵茶。',
        '產地：衣索比亞耶加雪菲。',
        '處理法：水洗 + 日曬。',
        '沖煮建議：90-92°C，20g 咖啡豆搭配 300ml 水。',
        championTeam,
      ],
      details: [
        '形式：精品咖啡豆。',
        '建議研磨後立即沖煮。',
        '開封後請密封保存，避免潮濕與高溫。',
      ],
    }),
    price: 880,
    sale_price: null,
    member_price: null,
    images: PRODUCT_IMAGE_PATHS['the-one-and-only-champion-blend-beans'],
    category_id: 'beans',
    specifications: [
      { name: '風味', value: '蘋果、柑橘、杏桃乾、伯爵茶' },
      { name: '產地', value: '衣索比亞耶加雪菲' },
      { name: '處理法', value: '水洗 + 日曬' },
      { name: '建議水溫', value: '90-92°C' },
    ],
    stock: 28,
    sku: 'YNM-BEAN-ONE-ONLY',
    categories: CATEGORY_BY_ID['beans'],
  },
  {
    id: 'fallback-bean-jinglong-geisha',
    name: 'Reserved for you｜國際賽事COE獲獎競標批次 阿里山璟隆咖啡莊園 藝伎日曬',
    slug: 'reserved-for-you-jinglong-geisha-natural',
    summary: '台灣阿里山璟隆咖啡莊園 COE 獲獎競標批次，藝伎日曬，帶有茉莉花、熱帶水果、焦糖與紅茶感。',
    description: '國際賽事 COE 獲獎競標批次咖啡豆，呈現台灣高海拔藝伎日曬的稀有限量風味。',
    content: makeProductContent({
      lead: '來自台灣阿里山 1,350 公尺高海拔的稀有藝伎日曬，以國際賽事 COE 獲獎競標批次呈現收藏等級風味。',
      story: [
        '阿里山璟隆咖啡莊園受霧氣、冷涼溫差與水土滋養，孕育出質地紮實、香氣層次豐富的咖啡豆。',
        '藝伎日曬批次帶有鮮明花果調，適合喜歡台灣高山精品咖啡與稀有批次的品飲者。',
      ],
      notes: [
        '風味：茉莉花、熱帶水果、焦糖、紅茶。',
        '處理法：日曬 Natural。',
        '焙度：淺焙。',
        '產地：台灣阿里山璟隆咖啡莊園。',
        '沖煮建議：90-92°C，20g 咖啡豆搭配 300ml 水。',
      ],
      details: [
        '品項：COE 獲獎競標批次精品咖啡豆。',
        '狀態：售完。',
        '開封後請密封保存，並於最佳賞味期內飲用。',
      ],
    }),
    price: 1980,
    sale_price: null,
    member_price: null,
    images: PRODUCT_IMAGE_PATHS['reserved-for-you-jinglong-geisha-natural'],
    category_id: 'beans',
    specifications: [
      { name: '產地', value: '台灣阿里山璟隆咖啡莊園' },
      { name: '品種', value: '藝伎' },
      { name: '處理法', value: '日曬 Natural' },
      { name: '風味', value: '茉莉花、熱帶水果、焦糖、紅茶' },
      { name: '狀態', value: '售完' },
    ],
    stock: 0,
    sku: 'YNM-BEAN-JINGLONG-GEISHA',
    categories: CATEGORY_BY_ID['beans'],
  },
  {
    id: 'fallback-tools-pourover-set',
    name: 'y & m 咖啡器具手沖組',
    slug: 'ynm-pourover-brewing-set',
    summary: '雙層玻璃杯、雙層玻璃壺、玫瑰金手沖壺與帆布袋組成的精選手沖器具套組。',
    description: 'y & m 精選咖啡器具組將實用、保溫與手沖儀式感結合，適合入門與日常使用。',
    content: makeProductContent({
      lead: '把手沖所需的基礎器具整理成一組，讓咖啡香氣、溫度與桌面美感一起到位。',
      story: [
        '80ml 雙層玻璃杯保留飲用溫度，200ml 雙層玻璃壺承接沖煮後的乾淨風味，240ml 玫瑰金手沖壺則提供更穩定的注水控制。',
        '附贈手工帆布包，方便收納與攜帶，也延續 y & m 對日常美學與環保質感的關懷。',
      ],
      notes: [
        '適合手沖入門、辦公室與居家咖啡角。',
        '雙層玻璃設計兼具保溫與通透視覺。',
        '玫瑰金手沖壺提升注水儀式感。',
      ],
      details: [
        '內容物：80ml 雙層玻璃杯、200ml 雙層玻璃壺、240ml 玫瑰金手沖壺、手工帆布包。',
        '器具清洗後請充分乾燥。',
        '玻璃器具請避免急冷急熱與強烈碰撞。',
      ],
    }),
    price: 1280,
    sale_price: null,
    member_price: null,
    images: PRODUCT_IMAGE_PATHS['ynm-pourover-brewing-set'],
    category_id: 'brew-tools',
    specifications: [
      { name: '內容物', value: '80ml 雙層玻璃杯、200ml 雙層玻璃壺、240ml 玫瑰金手沖壺、手工帆布包' },
      { name: '用途', value: '手沖咖啡器具組' },
      { name: '特色', value: '保溫、收納、日常手沖' },
    ],
    stock: 10,
    sku: 'YNM-TOOLS-POUROVER',
    categories: CATEGORY_BY_ID['brew-tools'],
  },
  {
    id: 'fallback-bean-colombia-villa-hallazgo-aji-bourbon',
    name: '哥倫比亞 薇拉 發現莊園 辣椒波旁',
    slug: 'colombia-villa-la-hallazgo-aji-bourbon',
    summary: '哥倫比亞薇拉產區發現莊園，辣椒波旁處理，帶有莓果、花香與可可尾韻。',
    description: '以精品烘焙曲線呈現細緻香氣層次，適合手沖與精品濾掛風味表現。',
    content: makeProductContent({
      lead: '來自哥倫比亞薇拉產區的發現莊園辣椒波旁，以優雅酸質與甜感層次為主軸。',
      story: [
        '此批次以乾淨杯感為核心，前段有紅莓與柑橘調，尾段延伸出可可與焦糖香。',
        '建議以中細研磨手沖，水溫 90-92 度，可完整展現花香與果甜的平衡。',
      ],
      notes: [
        '風味：紅莓、柑橘、可可、焦糖',
        '產區：哥倫比亞 薇拉',
        '品種：辣椒波旁（Aji Bourbon）',
        '建議沖煮：手沖、精品濾掛',
      ],
      details: [
        '重量：100g',
        '保存方式：常溫陰涼乾燥，避免日照與高溫',
        '開封後建議兩週內飲用完畢',
      ],
    }),
    price: 980,
    sale_price: null,
    member_price: null,
    images: PRODUCT_IMAGE_PATHS['the-one-and-only-champion-blend-beans'],
    category_id: 'beans',
    specifications: [
      { name: '產區', value: '哥倫比亞 薇拉' },
      { name: '品種', value: '辣椒波旁（Aji Bourbon）' },
      { name: '重量', value: '100g' },
      { name: '烘焙度', value: '淺中焙' },
    ],
    stock: 18,
    sku: 'YNM-BEAN-COL-VILLA-AJI',
    categories: CATEGORY_BY_ID['beans'],
  },
  {
    id: 'fallback-gift-letter-huo',
    name: '精品咖啡信籤禮物<霍剛藝術聯名系列>',
    slug: 'huo-gang-coffee-letter-gift',
    summary: '以精品咖啡與信籤概念組成的小型禮物，搭配霍剛藝術聯名視覺。',
    description: '精品咖啡信籤禮物適合以輕盈形式傳遞心意，將濾掛咖啡與藝術包裝結合。',
    content: makeProductContent({
      lead: '像一封能被沖煮的信，把想說的心意交給香氣與藝術畫面慢慢展開。',
      story: [
        '此款以信籤禮物為概念，把精品咖啡變成輕盈、好分享的小型禮物，適合節慶、感謝與日常問候。',
        '霍剛藝術聯名系列讓包裝保有收藏感，也讓贈禮不只停留在形式。',
      ],
      notes: [
        '系列：霍剛藝術聯名。',
        '形式：精品咖啡信籤禮物。',
        '適合感謝禮、節慶小禮與活動贈品。',
      ],
      details: [
        '禮盒系列均附提袋。',
        '濾掛咖啡請存放於陰涼乾燥處。',
        '開封後請立即沖煮，以保留最佳香氣。',
      ],
    }),
    price: 840,
    sale_price: 760,
    member_price: null,
    images: PRODUCT_IMAGE_PATHS['huo-gang-coffee-letter-gift'],
    category_id: 'gift-boxes',
    specifications: [
      { name: '系列', value: '霍剛藝術聯名系列' },
      { name: '形式', value: '精品咖啡信籤禮物' },
      { name: '用途', value: '小型贈禮、節慶禮、感謝禮' },
    ],
    stock: 22,
    sku: 'YNM-GIFT-LETTER-HUO',
    categories: CATEGORY_BY_ID['gift-boxes'],
  },
];

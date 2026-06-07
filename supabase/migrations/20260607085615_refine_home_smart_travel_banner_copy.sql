UPDATE public.theme_banners
SET
  title_zh = E'智慧旅遊\n從搜尋開始',
  title_en = E'Smart Travel\nStarts with Search',
  title_ja = E'スマートな旅は\n検索から',
  title_ko = E'스마트한 여행은\n검색부터',
  subtitle_zh = '先找住宿與行程靈感，再串接咖啡文章、旅行選物與 AI 客服，讓出發前的決定集中完成。',
  subtitle_en = 'Search stays and trip ideas first, then connect articles, travel goods, and AI support before you go.',
  subtitle_ja = 'まず宿泊と旅のヒントを探し、記事、旅のアイテム、AIサポートまで出発前にまとめて確認できます。',
  subtitle_ko = '먼저 숙소와 여행 아이디어를 찾고, 글과 여행 상품, AI 상담까지 출발 전에 한곳에서 확인하세요.',
  link_url = '/rooms',
  link_label_zh = '開始搜尋住宿',
  link_label_en = 'Search Stays',
  link_label_ja = '宿泊を検索',
  link_label_ko = '숙소 검색',
  updated_at = now()
WHERE theme_key = 'home'
  AND display_order = 10;

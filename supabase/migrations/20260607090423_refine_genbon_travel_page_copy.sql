UPDATE public.theme_banners
SET
  title_zh = E'旅行前後的\n選物補給',
  title_en = E'Travel Goods\nBefore and After',
  title_ja = E'旅の前後に\n必要な選物',
  title_ko = E'여행 전후의\n셀렉트 아이템',
  subtitle_zh = '咖啡、茶點、旅行小物與伴手禮集中整理；先搜尋用途，再決定線上購買或到門市挑選。',
  subtitle_en = 'Coffee, tea snacks, travel goods, and gifts in one place. Search by need, then buy online or visit a store.',
  subtitle_ja = 'コーヒー、お茶菓子、旅の小物、ギフトをまとめて確認。用途で探して、オンライン購入や来店を選べます。',
  subtitle_ko = '커피, 차 간식, 여행 소품, 선물을 한곳에서 찾고 필요에 맞춰 온라인 구매나 매장 방문을 선택하세요.',
  link_label_zh = '搜尋商品',
  link_label_en = 'Search Products',
  link_label_ja = '商品を検索',
  link_label_ko = '상품 검색',
  updated_at = now()
WHERE theme_key = 'genbon_travel'
  AND display_order = 10;

UPDATE public.theme_banners
SET
  title_zh = E'到門市\n看實品',
  title_en = E'See Items\nIn Store',
  title_ja = E'店舗で\n実物を見る',
  title_ko = E'매장에서\n직접 보기',
  subtitle_zh = '想試喝、看包裝或現場取貨時，直接查門市位置、營業時間與地圖。',
  subtitle_en = 'When you want to taste, check packaging, or pick up in person, find store hours, locations, and maps.',
  subtitle_ja = '試飲、パッケージ確認、店頭受け取りをしたい時に、店舗の場所、営業時間、地図を確認できます。',
  subtitle_ko = '시음, 포장 확인, 현장 수령이 필요할 때 매장 위치, 영업시간, 지도를 바로 확인하세요.',
  link_label_zh = '查詢門市',
  link_label_en = 'Find Stores',
  link_label_ja = '店舗を探す',
  link_label_ko = '매장 찾기',
  updated_at = now()
WHERE theme_key = 'genbon_travel'
  AND display_order = 20;

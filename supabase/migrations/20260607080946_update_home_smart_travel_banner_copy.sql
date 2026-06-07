UPDATE public.theme_banners
SET
  title_zh = E'智慧旅遊\n新體驗',
  title_en = E'Smarter Travel\nStarts Here',
  title_ja = E'スマートな旅を\nここから',
  title_ko = E'더 스마트한 여행\n여기서 시작',
  subtitle_zh = '從住宿搜尋、旅遊選物到咖啡文章與 AI 工具，出發前需要的資訊集中在同一個清楚入口。',
  subtitle_en = 'Find stays, travel goods, coffee stories, and AI tools from one clear starting point.',
  subtitle_ja = '宿泊検索、旅の買い物、コーヒー記事、AIツールまで、出発前に必要な情報を一つの入口にまとめます。',
  subtitle_ko = '숙소 검색, 여행 상품, 커피 콘텐츠, AI 도구까지 출발 전 필요한 정보를 한곳에서 찾을 수 있습니다.'
WHERE theme_key = 'home'
  AND display_order = 10;

UPDATE public.theme_banners
SET
  title_zh = E'搜尋住宿\n安排旅程',
  title_en = E'Search Stays\nPlan the Trip',
  title_ja = E'宿を探して\n旅を整える',
  title_ko = E'숙소를 찾고\n여행을 준비',
  subtitle_zh = '用搜尋快速找到住宿與文章，再交給 AI 協助整理行程、翻譯與客服問題。',
  subtitle_en = 'Search stays and articles first, then let AI help with plans, translation, and support.',
  subtitle_ja = '宿泊や記事をすばやく探し、AIで旅程、翻訳、サポートを整えます。',
  subtitle_ko = '숙소와 글을 먼저 찾고, AI로 일정, 번역, 고객지원을 이어갑니다.'
WHERE theme_key = 'home'
  AND display_order = 20;

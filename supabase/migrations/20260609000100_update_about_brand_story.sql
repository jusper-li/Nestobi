/*
  Update the About page brand story so it shows two clear blocks:
  NESTOBI and 根本在旅行.
*/

INSERT INTO static_pages (slug, title, meta_description, content, updated_at)
VALUES (
  'about',
  '關於我們',
  '認識 NESTOBI 與根本在旅行的品牌故事，了解我們如何把旅宿、購物、AI 服務與在地門市串成一個完整旅程。',
  '<section class="space-y-12">
  <div class="text-center">
    <p class="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Brand Story</p>
    <h1 class="mt-3 text-4xl font-bold text-gray-900 md:text-5xl">關於我們</h1>
    <p class="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-gray-600">
      我們把旅宿、購物、AI 服務與在地門市串成同一段旅程，讓使用者不必在多個入口之間來回切換，就能自然找到住宿、商品、文章與門市資訊。
    </p>
  </div>

  <div class="grid gap-6 md:grid-cols-2">
    <article class="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[#C89A59]">NESTOBI</p>
      <h2 class="mt-3 text-2xl font-bold text-gray-900">智慧旅遊的整合入口</h2>
      <p class="mt-4 leading-relaxed text-gray-600">
        NESTOBI 是我們的數位旅遊平台，聚合住宿、購物、AI 客服、點數與內容服務，讓旅客可以用同一個體驗完成搜尋、比較、下單與追蹤。
      </p>
      <ul class="mt-6 space-y-3 text-gray-600">
        <li>• 住宿、商品、文章與常見問題集中呈現，搜尋更直覺。</li>
        <li>• AI 客服與 AI 導遊協助旅客快速找到站內內容與對應連結。</li>
        <li>• 點數、訂單與會員資訊整合，讓每次互動都能延續前一次的進度。</li>
      </ul>
    </article>

    <article class="rounded-3xl border border-amber-100 bg-[#FBF8F1] p-6 shadow-sm md:p-8">
      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[#8E5B1A]">根本在旅行</p>
      <h2 class="mt-3 text-2xl font-bold text-gray-900">根本在旅行的開始</h2>
      <div class="mt-4 space-y-4 leading-relaxed text-gray-600">
        <p>
          品牌的起心動念是創辦人楊邦彥跟住在沖繩的友人 Ryoko 在疫情下一份台日友好的感謝。創辦人曾是入圍金鐘獎的金剪刀剪輯師，更曾經拿過多次台灣 Poker 冠軍，每年赴日滑雪並熱愛日本文化！
        </p>
        <p>
          在 2020 年日本疫情嚴峻時，楊邦彥與長年旅日、現住在沖繩的友人 Ryoko，聊到沖繩因為疫情而帶來的餐飲慘況，兩人就在思考有什麼能幫助與我們如此友好的日本，以及那些喜歡的日本品牌，進而萌生為日本餐飲名店盡一份心力的念頭。加上台灣的朋友不能出國旅行的現況，如何做才能讓大家回溫起在日本旅行的感受，無論是漫步在日本街頭，還是休息在某個日本街角，常常總是一杯咖啡或茶飲在手。
        </p>
        <p>
          於是，打造讓大家彷彿「根本在旅行」的夢想就此誕生。讓大家走進我們的品牌世界中，可以選一杯日本各地最知名的職人咖啡，也可以喝上一杯暖心的日本茶，進而來上一杯香醇的清酒。
        </p>
        <h3 class="pt-2 text-lg font-semibold text-gray-900">根本在旅行的感謝</h3>
        <p>
          在根本在旅行，我們除了做到飲品風味及外帶杯的重現，我們更希望能提供跟日本本店一樣的售價，而不是讓日本到台灣的優質產品都得價格翻倍。
        </p>
        <p>
          於是在最艱難的疫情期間，我們從日本最南端的沖繩開始，並多次遠赴大阪、京都、神奈川、東京。甚至為了談下品牌，一年當中去東京四次親自拜訪名店，與各名店主理人交流，只為了帶給台灣的大家那份想念及感謝的心情。
        </p>
        <p>
          終於，我們達成了起初不敢想像的任務：2013 世界烘豆冠軍、2016 日本烘豆冠軍、2017 日本烘豆冠軍、日本 6 間亞洲最佳 Top 咖啡廳中的 4 間，包含 Mel Coffee Roasters、LiLo Coffee Roasters、Glitch Coffee &amp; Roasters、The Roastery by Nozy coffee，多達 12 間日本各地知名職人咖啡品牌，都放心的將品牌與產品交到我們手中，促成了在最困難時刻的台日友好的攜手合作。
        </p>
        <p>
          無論你想念沖繩的陽光海灘、大阪美國村的熱鬧、京都伏見稻荷大社前的楓葉，還是東京代代木公園的賞櫻，在根本在旅行，你都能拾起那杯伴隨著你日本旅遊回憶的咖啡，為台灣的大家帶回有關日本旅行的味道。
        </p>
      </div>
    </article>
  </div>

</section>',
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  meta_description = EXCLUDED.meta_description,
  content = EXCLUDED.content,
  updated_at = EXCLUDED.updated_at;

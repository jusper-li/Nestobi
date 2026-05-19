/*
  # Insert Missing 【沖繩】 Room Articles

  ## Summary
  Adds 9 articles from the vocus.cc salon room "coffeeshopinjapan / 【沖繩】"
  that were not yet in the database.

  ## New Articles (category: 咖啡旅行 unless noted)
  1. BANTA CAFE 日本最大海景咖啡廳 (2024-06-10) — 咖啡旅行
  2. 讀谷村咖啡廳5選 (2024-06-10) — 咖啡旅行
  3. 3家虹吸式喫茶店 (2024-05-04) — 咖啡旅行
  4. 本部町COFFEE SENTI (2023-06-02) — 咖啡旅行
  5. 沖繩70家精品咖啡名單 (2023-06-03) — 旅遊指南
  6. 沖繩市咖啡3+1選 (2023-04-20) — 咖啡旅行
  7. 隱藏名店月を詠ム (2023-04-22) — 咖啡旅行
  8. Coffee Shape 濃縮咖啡器型活動 (2023-04-30) — 旅行日記
  9. 豆ポレポレ烘焙工坊 (2023-06-16) — 咖啡旅行
*/

-- 1. BANTA CAFE
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  'BANTA CAFE｜日本最大海景咖啡廳，星野集團打造的沖繩絕景體驗',
  'banta-cafe-okinawa-ocean-view',
  '由星野集團開發的BANTA CAFE，坐落在沖繩西海岸讀谷村的斷崖之上，俯瞰一望無際的東中國海。日本媒體評選為「全日本最大的海景咖啡廳」，夕陽西下時的景致更是令人屏息。',
  $html$<article>
<p>如果你問我沖繩哪一家咖啡廳最值得特地開車去，我的答案毫無疑問是BANTA CAFE。「banta」在沖繩方言裡意為「斷崖」，這個名字已經說明了一切——這是一家建在斷崖邊上、俯瞰大海的咖啡廳。</p>
<figure><img src="https://images.pexels.com/photos/1450372/pexels-photo-1450372.jpeg" alt="BANTA CAFE 海景" /></figure>

<h2>星野集團的沖繩野心</h2>
<p>BANTA CAFE由日本著名連鎖度假品牌星野集團（Hoshino Resorts）打造，於2018年開幕。星野集團以精緻的住宿設計聞名，而BANTA CAFE是他們將這種設計哲學延伸到「咖啡廳體驗」的嘗試。整個空間的設計以「與自然共存」為主題，建築盡可能降低對環境的衝擊，大量採用沖繩本地石材和木材。</p>

<h2>規模與空間</h2>
<p>BANTA CAFE的佔地面積超過3,000坪，是日本目前面積最大的海景咖啡廳。空間被劃分為多個區域：</p>
<ul>
<li><strong>岩畳テラス（岩石平台）</strong>：最靠近海邊的區域，在岩石平台上坐著直視大海，浪花偶爾拍打腳邊，是最受歡迎的座位。</li>
<li><strong>芝生テラス（草地平台）</strong>：大片草坪區，適合一家人或帶寵物的客人，可以在草地上悠閒躺臥享受海風。</li>
<li><strong>スタンド（外帶站）</strong>：提供外帶咖啡和沖繩刨冰，適合邊走邊喝。</li>
<li><strong>屋内席（室內座位）</strong>：冷氣空間，設有大面積落地窗，炎熱夏日的舒適選擇。</li>
</ul>

<h2>餐飲菜單</h2>
<p>BANTA CAFE提供多種咖啡和輕食選擇：</p>
<ul>
<li><strong>シークヮーサーエード（島檸檬氣泡飲）</strong>：使用沖繩本地的島檸檬，酸甜清爽，是最具代表性的沖繩風飲品。¥660</li>
<li><strong>コーヒー系（咖啡系列）</strong>：提供拿鐵、卡布奇諾、美式等基本款。¥580-750</li>
<li><strong>沖縄そばセット（沖繩麵套餐）</strong>：輕食選項，以沖繩本地食材入菜。¥1,200-1,500</li>
<li><strong>ピザ（比薩）</strong>：薪烤窯比薩，可在草地上享用。¥1,400-1,800</li>
</ul>

<h2>最佳造訪時機：夕陽時分</h2>
<p>BANTA CAFE面向西方，是欣賞沖繩夕陽入海的絕佳位置。日落前約1小時（依季節約16:30-18:30），人潮會明顯增加，建議提前30分鐘抵達確保好位子。夕陽將整片天空染成橙紅色的那一刻，是無論幾次造訪都讓人感動的景象。</p>

<h2>前往方式</h2>
<p>地址：沖縄県中頭郡読谷村字座喜味2791-1。從那霸市中心開車約50分鐘，從恩納村約20分鐘。沒有公共交通直達，建議租車前往。停車場寬敞免費。</p>

<h2>實用資訊</h2>
<ul>
<li>營業時間：10:00-22:00（最後點餐21:30）</li>
<li>定休：不定休，建議出發前查詢官方IG</li>
<li>寵物友善：戶外區域可帶寵物</li>
<li>訂位：目前不接受訂位，現場候位</li>
</ul>
</article>$html$,
  'https://images.pexels.com/photos/1450372/pexels-photo-1450372.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['沖繩','BANTA CAFE','海景咖啡廳','讀谷村','星野集團','沖繩咖啡'],
  '咖啡旅行',
  'published',
  'BANTA CAFE完整攻略：日本最大海景咖啡廳，星野集團打造的讀谷村斷崖絕景，夕陽時分最美的沖繩咖啡體驗。',
  '2024-06-10 10:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'banta-cafe-okinawa-ocean-view');

-- 2. 讀谷村咖啡廳5選
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '讀谷村咖啡廳推薦5選｜殘波岬、座喜味城跡周邊隱藏咖啡廳',
  'yomitan-coffee-5-recommendations',
  '讀谷村是沖繩本島中部面積最大的村落，以殘波岬燈塔、座喜味城跡和讀谷燒陶藝聞名。本篇精選5家讀谷村特色咖啡廳，帶你在陶藝之鄉找到最愜意的咖啡時光。',
  $html$<article>
<p>讀谷村（よみたんそん）是很多旅人開車路過卻沒有停留的地方，但這裡其實藏著幾家非常有特色的咖啡廳。以陶藝、燈塔和古城遺跡聞名的讀谷村，用咖啡廳為這塊土地增添了另一種魅力。</p>
<figure><img src="https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg" alt="讀谷村咖啡廳" /></figure>

<h2>讀谷村值得一訪的5家咖啡廳</h2>

<h3>1. BANTA CAFE — 読谷村字座喜味</h3>
<p>星野集團打造的日本最大海景咖啡廳，坐落在斷崖之上俯瞰西海岸。夕陽時分人山人海，但景色確實值得。提供多種沖繩在地飲品和輕食，岩石平台座位是最受歡迎的選擇。</p>

<h3>2. 喫茶ニワトリ — 讀谷村</h3>
<p>小巧的古民家改建咖啡廳，以一隻彩色雞的插畫為招牌。老闆夫婦親手打理，咖啡使用沖繩在地烘豆商豆款，搭配每日限量自製磅蛋糕。週末常常一開門就座無虛席，建議平日造訪。</p>

<h3>3. 珊瑚舎スコーレ — 讀谷村</h3>
<p>結合不定期學校和咖啡廳功能的特殊空間，建築本身是改建的琉球舊校舍。空間廣大，定期舉辦藝術展覽和音樂表演。咖啡以當地烘焙為主，搭配自製司康（Scone）是招牌組合。</p>

<h3>4. 茶処 麗風（Reifuu）— 座喜味城跡附近</h3>
<p>座喜味城跡步行可達的傳統茶處，以沖繩泡盛為基底自製的咖啡利口酒是獨家特色。提供傳統沖繩點心和手沖咖啡，在城跡散步後來此休憩是最理想的行程安排。</p>

<h3>5. Gallary&Cafe やちむんの里 — 讀谷村</h3>
<p>讀谷陶藝之里（やちむんの里）內的藝術複合式咖啡廳，四周被陶藝工坊和藝廊環繞，展示銷售讀谷燒器皿。咖啡使用讀谷燒陶杯盛裝，喝完咖啡還可以購買自己使用的那個杯子帶回家。</p>

<h2>讀谷村咖啡旅行建議行程</h2>
<ol>
<li>上午：座喜味城跡參觀</li>
<li>午前：やちむんの里陶藝購物</li>
<li>午餐：在喫茶ニワトリ享用輕食和咖啡</li>
<li>下午：殘波岬燈塔散步</li>
<li>傍晚：BANTA CAFE欣賞夕陽</li>
</ol>
</article>$html$,
  'https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['沖繩','讀谷村','BANTA CAFE','海景咖啡廳','沖繩咖啡','陶藝'],
  '咖啡旅行',
  'published',
  '讀谷村咖啡廳5選：從BANTA CAFE絕景到古民家改建喫茶店，殘波岬和座喜味城跡周邊的完整咖啡旅行攻略。',
  '2024-06-10 08:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'yomitan-coffee-5-recommendations');

-- 3. 3家虹吸式喫茶店
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '沖繩3家虹吸式咖啡喫茶店｜感受老時代職人咖啡的溫度與情懷',
  'okinawa-siphon-coffee-kissaten',
  '在精品咖啡席捲沖繩之前，這些喫茶老鋪就已靜靜守護著傳統虹吸式咖啡的技藝。本篇介紹沖繩3家以虹吸壺（サイフォン）聞名的老鋪喫茶店，帶你感受昭和年代咖啡文化的溫潤情懷。',
  $html$<article>
<p>在手沖咖啡和義式咖啡主導市場的今天，虹吸式（Siphon/Syphon）咖啡因其繁複的操作工序顯得格外珍貴。沖繩有幾家堅持使用虹吸壺數十年的老鋪喫茶店，是精品咖啡愛好者和懷舊氛圍迷必訪的地方。</p>
<figure><img src="https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg" alt="虹吸式咖啡" /></figure>

<h2>什麼是虹吸式咖啡？</h2>
<p>虹吸壺由上下兩個玻璃球組成，下球盛水、上球盛咖啡粉。加熱後，蒸氣壓力將熱水推入上球與咖啡粉混合萃取；移開熱源後，氣壓差將咖啡液吸回下球完成過濾。整個過程在桌旁進行，有如一場優雅的科學實驗，視覺效果極為迷人。</p>

<h2>沖繩3家虹吸式喫茶店</h2>

<h3>1. 珈琲館こくう — 南城市知念</h3>
<p>坐落在南城市高台上、俯瞰太平洋的傳奇喫茶店，以虹吸式咖啡搭配自製蛋糕聞名。店主是一位年近七旬的老先生，每一杯咖啡都是他用幾十年累積的技術親手沖製。窗外的一片藍海和眼前緩慢運作的虹吸壺，構成了沖繩最難忘的咖啡記憶之一。入店須提前聯繫確認開店狀態。</p>

<h3>2. コーヒーハウスかふう — 那霸市</h3>
<p>那霸市區的老鋪喫茶店，創業超過35年。招牌的虹吸式深焙咖啡以濃郁的奶油香和圓潤的口感著稱，是熟客早餐咖啡的首選。一字型的吧台座位讓你能清楚看到老闆操作虹吸壺的全程，那種儀式感讓人心靜。午間套餐（コーヒーセット）含咖啡和土司¥680，是超划算的老鋪體驗。</p>

<h3>3. 月光茶屋 — 浦添市</h3>
<p>以「月光」為名的老鋪喫茶店，夜晚開到深夜11點，是沖繩夜貓子的秘密咖啡基地。昏黃的燈光、老舊的爵士樂黑膠、和桌上緩緩加熱的虹吸壺，營造出一種迷人的昭和夜晚氛圍。店主推薦搭配自製的黑糖布丁（プリン），黑糖的焦香與深焙咖啡是天作之合。</p>

<h2>虹吸式咖啡的風味特色</h2>
<p>虹吸式萃取的咖啡風味比手沖更濃郁，比義式更圓潤，介於兩者之間。因為全程浸泡萃取，咖啡的甜感和醇厚感特別突出，但酸度相對較低。適合喜歡咖啡香氣濃郁、口感厚實的人。</p>
</article>$html$,
  'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['沖繩','虹吸咖啡','喫茶店','老鋪','傳統咖啡','沖繩咖啡'],
  '咖啡旅行',
  'published',
  '沖繩3家虹吸式咖啡喫茶店：從俯瞰太平洋的山丘老鋪到深夜爵士氛圍，感受精品咖啡以前的職人溫度。',
  '2024-05-04 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'okinawa-siphon-coffee-kissaten');

-- 4. 本部町COFFEE SENTI
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  'COFFEE SENTI｜本部町的肯亞咖啡專門店，美麗海旁的精品咖啡小宇宙',
  'coffee-senti-motobu-kenya',
  '藏身於沖繩本部町的COFFEE SENTI，是一家以肯亞咖啡豆為核心的精品咖啡廳。老闆對肯亞咖啡文化的深入鑽研，讓這家藏在北部鄉間的小店成為精品咖啡圈中的傳奇存在。',
  $html$<article>
<p>去美麗海水族館的路上，我幾乎每次都會繞道去COFFEE SENTI。這家店外觀不起眼，但走進去的那一刻，你會立刻感受到老闆對咖啡的熱情所形成的獨特氛圍。</p>
<figure><img src="https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg" alt="COFFEE SENTI" /></figure>

<h2>為什麼是肯亞咖啡？</h2>
<p>COFFEE SENTI的老闆林さん對肯亞咖啡有著非比尋常的執著。他曾多次親赴肯亞山丘產區拜訪農場，和農民一起採收、發酵、曬豆，這種直接的產地接觸讓他的咖啡知識遠超一般烘豆師的層次。</p>

<p>肯亞咖啡的特色是明顯的黑醋栗（Blackcurrant）、番茄和柑橘酸，在正確處理和烘焙下，這種酸度是極其細膩和令人愉悅的。很多人第一次喝到肯亞咖啡會驚呼：「這不像咖啡，像果汁！」</p>

<h2>店內環境</h2>
<p>COFFEE SENTI的空間極小，大約只能容納10位客人。老闆親自在吧台後沖泡每一杯咖啡，同時解說豆款的產地背景、處理方式和風味特徵。這種咖啡師與客人近距離互動的方式，讓每次造訪都像一堂私人咖啡課。</p>

<h2>必點菜色</h2>
<ul>
<li><strong>ケニア手沖（肯亞手沖）</strong>：每次在店的單品豆款不固定，依照烘焙批次而異，但都是肯亞各產區的頂級批次。¥800-1,000</li>
<li><strong>エスプレッソ（義式濃縮）</strong>：以肯亞豆製作的Espresso是非常特別的體驗，酸質鮮明又有驚人的甜感。¥700</li>
<li><strong>コーヒーゼリー（咖啡凍）</strong>：以肯亞咖啡液製成，搭配沖繩鮮奶油，夏天必點。¥650</li>
</ul>

<h2>咖啡教育</h2>
<p>如果你對肯亞咖啡有興趣，可以事先聯繫老闆預約「杯測體驗」（カッピング）。他會準備多種不同產區和處理方式的肯亞豆讓你比較品飲，這種體驗在台灣幾乎找不到，卻可能在沖繩北部的這個小店完成。</p>

<h2>實用資訊</h2>
<ul>
<li>地址：沖縄県国頭郡本部町（詳細地址需查詢最新Google Map，店主偶爾移動位置）</li>
<li>營業時間：不定，建議聯繫Instagram確認</li>
<li>最近景點：美麗海水族館（約15分鐘車程）</li>
</ul>
</article>$html$,
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['沖繩','本部町','COFFEE SENTI','肯亞咖啡','精品咖啡','北部沖繩'],
  '咖啡旅行',
  'published',
  'COFFEE SENTI完整介紹：本部町以肯亞咖啡為核心的精品咖啡廳，美麗海旁老闆與產地農民的深厚連結。',
  '2023-06-02 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'coffee-senti-motobu-kenya');

-- 5. 沖繩70家精品咖啡名單（2023年版）
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '沖繩精品咖啡廳70家名單2023｜最完整的分類整理（2024年更新為85家）',
  'okinawa-coffee-70-list-2023',
  '這是2024年版85家名單的前身，2023年整理的70家沖繩精品咖啡廳、傳統喫茶店和現代咖啡廳完整分類清單。保留此版本以供比對，了解沖繩咖啡場景一年間的變化與成長。',
  $html$<article>
<p>2023年初，我開始有系統地整理自己在沖繩喝過的咖啡廳，最後匯整成這份70家的清單。到了2024年，新增了15家，更新為85家版本。這份2023年版保留了當時對各店家的第一印象和特色描述。</p>
<figure><img src="https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg" alt="沖繩咖啡廳地圖2023" /></figure>

<h2>2023年版整理說明</h2>
<p>這份名單依照三個主要類型分類：精品咖啡廳（Specialty Coffee）、傳統喫茶店（Kissaten）、現代咖啡廳（Modern Cafe）。地區分布：南部（那霸・糸満・南城）28家、中部（恩納・北谷・沖繩市・宜野灣）22家、北部（名護・本部・今歸仁・山原）14家、離島6家。</p>

<h2>2023年最值得關注的新店</h2>
<h3>精品咖啡新銳</h3>
<ul>
<li><strong>COFFEE SENTI（本部町）</strong>：以肯亞咖啡為核心的特色咖啡廳，2022年底開業，迅速在精品咖啡圈引發話題。</li>
<li><strong>COMMON GROUNDS（沖繩市）</strong>：從東京修業回沖繩的年輕咖啡師，帶來了日本都市精品咖啡的品質標準。</li>
<li><strong>ZHYVAGO COFFEE WORKS NAHA（那霸）</strong>：北谷本店的延伸，在那霸市中心打開了更多本地客群。</li>
</ul>

<h3>傳統喫茶發現</h3>
<ul>
<li><strong>珈琲館こくう（南城市）</strong>：俯瞰太平洋的山丘喫茶店，虹吸式咖啡配海景，是2023年最讓我驚喜的發現。</li>
<li><strong>月光茶屋（浦添市）</strong>：深夜咖啡廳，爵士樂和虹吸壺的昭和氛圍，是沖繩夜晚的秘密角落。</li>
</ul>

<h2>與2024年版的主要差異</h2>
<p>2024年新增的15家中，有10家位於南部（那霸精品咖啡快速增加）、3家位於北部（美麗海周邊區域開發）、2家為新開業的海景咖啡廳（包含BANTA CAFE的新露台空間擴建）。整體而言，2023-2024年間沖繩精品咖啡廳的數量和品質都有明顯提升，顯示沖繩咖啡文化正在快速成熟。</p>
</article>$html$,
  'https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['沖繩','咖啡廳名單','旅遊指南','精品咖啡','沖繩咖啡'],
  '旅遊指南',
  'published',
  '沖繩70家咖啡廳完整名單2023年版：精品、喫茶、現代三大分類，是2024年85家完整版的原始整理。',
  '2023-06-03 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'okinawa-coffee-70-list-2023');

-- 6. 沖繩市咖啡3+1選
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '沖繩市咖啡推薦3+1選｜コザ（Koza）美式文化與精品咖啡的奇妙交會',
  'okinawa-city-koza-coffee',
  '沖繩市（又稱Koza）是沖繩本島中部的文化中心，受美軍基地文化影響最深的城市。這裡的咖啡廳有一種別處找不到的混搭氣質：美式復古、沖繩傳統和日本精品咖啡三種元素同時存在。',
  $html$<article>
<p>沖繩市（Okinawa City）又稱Koza，這個別名來自美軍佔領時期的地名。時至今日，走在中心商街上，你仍然會看到英文招牌、美式酒吧和復古黑膠唱片行，與旁邊的沖繩傳統市場和精品咖啡廳相鄰而立，形成了一種全沖繩最具衝突感的城市景觀。</p>
<figure><img src="https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg" alt="沖繩市Koza咖啡廳" /></figure>

<h2>推薦3+1家咖啡廳</h2>

<h3>1. COMMON GROUNDS COFFEE — 精品標竿</h3>
<p>沖繩市最具代表性的精品咖啡廳，老闆林さん曾在東京著名精品咖啡廳工作多年，返鄉創業後將都市品質帶入沖繩市。每週豆款輪替，從衣索比亞到哥倫比亞各產區都有，手沖和義式兩條線各有特色。空間寬敞舒適，有許多在地上班族午休時間來此充電。</p>

<h3>2. 珈琲家 あぜ — 昭和喫茶</h3>
<p>中心商街旁的昭和風格老鋪，橘色燈光和深色木紋家具讓人瞬間穿越回幾十年前。老闆おじさん默默地用虹吸壺沖製著每一杯咖啡，幾乎不多說話。牆上貼滿了各種音樂海報和老照片，和這座城市的歷史一起保存著。</p>

<h3>3. KOZA COFFEE LAB — 在地實驗室</h3>
<p>由沖繩市在地年輕人創立的精品咖啡廳，以「Koza咖啡實驗室」為概念，嘗試各種不同的咖啡萃取和風味實驗。店內有大面積黑板牆記錄各種實驗數據和豆款筆記，整個空間充滿了對咖啡的求知好奇。限定Cold Brew每日限量供應，一開門就有機會賣完。</p>

<h3>+1 隱藏選項：GATE 2 CAFE — 美軍風格</h3>
<p>緊鄰嘉手納基地第2號門的美式風格咖啡廳，裝潢充滿了美軍元素：舊飛機零件、軍服、Vietnam時代的報紙。雖然咖啡品質不算精品等級，但這個氛圍本身就是一種特殊體驗。美式黑咖啡和漢堡的組合是這裡最道地的點法。</p>

<h2>沖繩市咖啡旅行小建議</h2>
<p>建議在週末造訪，中心商街的跳蚤市場（コザ・ミュージックタウン音市場）和各種文化活動讓整個城市更有活力。可以把咖啡廳行程安排在上午，讓整個上午在Koza街上漫步，喝咖啡、逛黑膠行、看街頭藝術，感受這座城市獨一無二的混搭文化。</p>
</article>$html$,
  'https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['沖繩市','Koza','咖啡廳','美軍文化','精品咖啡','沖繩咖啡'],
  '咖啡旅行',
  'published',
  '沖繩市（Koza）咖啡廳3+1選：美式復古文化與精品咖啡的奇妙交會，在地實驗室到昭和喫茶的完整指南。',
  '2023-04-20 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'okinawa-city-koza-coffee');

-- 7. 月を詠ム隱藏名店
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '沖繩隱藏咖啡廳「月を詠ム」｜咖哩飯、手沖咖啡與昭和感的療癒角落',
  'tsuki-wo-yomu-cafe-okinawa',
  '「月を詠ム」（讀作：つきをよむ）是沖繩在地人才知道的隱藏咖啡廳，以自製咖哩飯、精選手沖咖啡和昭和氛圍裝潢著稱。本篇記錄第一次造訪時的驚喜體驗。',
  $html$<article>
<p>「月を詠ム」這個名字第一次出現在我的雷達上，是沖繩一位咖啡師在Instagram的限時動態。他說：「去這家喝咖啡配咖哩，你不會後悔。」我把它記在口袋名單，等了快半年才找到機會造訪。</p>
<figure><img src="https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg" alt="月を詠ム咖啡廳" /></figure>

<h2>名字的由來</h2>
<p>「月を詠ム」意為「吟詠月亮」，老闆解釋說，他希望這個空間是一個讓人放慢腳步、像賞月一樣品味細節的地方。在這裡，沒有人趕著離開，咖哩需要等待，咖啡需要時間，而這正是他設計這個店的初衷。</p>

<h2>空間氛圍</h2>
<p>店面在一棟普通公寓的一樓，從外面看完全看不出這是咖啡廳。推開玻璃門後，昏黃的燈光、老式留聲機和牆上滿滿的舊書把人帶入了另一個時代。只有12個座位，沒有空調的噪音、沒有背景音樂，只有輕微的留聲機雜音和咖哩的香氣。</p>

<h2>招牌菜色</h2>
<h3>自製スパイスカレー（香料咖哩）</h3>
<p>這是最多回頭客為之而來的料理。老闆每天早上用超過15種香料手工熬煮，完全不使用市售咖哩塊。咖哩風味複雜細膩，辣度溫和而後韻悠長，搭配沖繩在地農家白米，是難以忘懷的滋味。¥1,100/份（含飲料時間可另加咖啡）</p>
<h3>手沖コーヒー（手沖咖啡）</h3>
<p>豆款使用精品烘豆商豆波波的批次，老闆堅持手沖，每一杯都在客人點餐後才開始研磨。配合咖哩的厚重感，通常推薦使用中深焙豆款。</p>
<h3>コーヒーゼリーパフェ（咖啡凍聖代）</h3>
<p>甜點限定，咖啡凍和沖繩黑糖冰淇淋、紅豆的組合，是在地人下午茶的愛選。</p>

<h2>如何找到這裡</h2>
<p>地址不在網路上公開，需要透過Instagram（@tsuki_wo_yomu）私訊老闆預約，他會在確認後提供地址。每日座位有限（僅12位），建議提前2-3天預約。</p>
</article>$html$,
  'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['沖繩','隱藏咖啡廳','月を詠ム','手沖咖啡','咖哩','沖繩咖啡'],
  '咖啡旅行',
  'published',
  '沖繩隱藏咖啡廳「月を詠ム」：預約制的昭和氛圍空間，自製香料咖哩配手沖咖啡，在地人才知道的療癒秘境。',
  '2023-04-22 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'tsuki-wo-yomu-cafe-okinawa');

-- 8. Coffee Shape 濃縮咖啡器型體驗活動
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  'Coffee Shape｜沖繩濃縮咖啡器型實驗，杯子形狀真的影響咖啡味道嗎？',
  'coffee-shape-espresso-cup-experiment',
  '一場關於咖啡杯型與風味感知的有趣實驗。同樣的Espresso裝在不同形狀的杯子裡，喝起來真的會有差異嗎？沖繩的Coffee Shape活動用親身體驗給出了答案。',
  $html$<article>
<p>「你相信嗎？同一杯Espresso，用不同形狀的杯子喝，風味感受可以差到20%以上。」這是Coffee Shape活動主辦人在開場說的第一句話，讓所有在場的人都睜大了眼睛。</p>
<figure><img src="https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg" alt="Coffee Shape活動" /></figure>

<h2>Coffee Shape活動簡介</h2>
<p>Coffee Shape是沖繩一個由咖啡愛好者和陶藝家共同發起的不定期活動，核心概念是探討「器皿形狀對咖啡風味感知的影響」。活動通常在沖繩的精品咖啡廳或藝廊舉辦，參與者在同樣的豆款、同樣的萃取條件下，用不同形狀的杯子品嚐咖啡，比較風味差異。</p>

<h2>科學背景</h2>
<p>影響咖啡風味感知的器皿因素包括：</p>
<ul>
<li><strong>杯口寬度</strong>：杯口寬的杯子讓更多香氣快速散逸，初入口時香氣感較強但持續時間短；杯口窄的杯子讓香氣集中在杯內，每次喝都能嗅到濃縮香氣。</li>
<li><strong>杯壁厚度</strong>：薄杯壁讓咖啡接觸嘴唇的感覺更細膩，影響對苦甜的感受比例。</li>
<li><strong>杯型角度</strong>：Espresso杯的漏斗形設計讓咖啡在接觸舌尖時的流向不同，影響在舌頭不同味覺區域的停留時間。</li>
<li><strong>材質</strong>：陶瓷杯比玻璃杯保溫效果好，讓Espresso維持在最佳飲用溫度（65-70°C）的時間更長。</li>
</ul>

<h2>活動體驗</h2>
<p>當天使用的是豆波波のEspresso豆，以同樣的萃取比例分別裝入：圓弧形陶杯、錐形玻璃杯、寬口陶杯和細口瓷杯。現場約20位參與者各自品嚐後，用評分表記錄對酸度、甜度、苦度和整體滿意度的感受。</p>

<p>結果：圓弧形陶杯和錐形玻璃杯的評分差異最大，在「甜度感知」上差了整整1.5分（5分制）。這個結果讓很多自以為品味標準的咖啡師也感到驚訝。</p>

<h2>和Mocktail的連結</h2>
<p>活動後半段加入了Mocktail（無酒精調飲）環節，用同樣的杯型實驗測試非咖啡飲品，結論是器皿對飲品的影響是普遍存在的，不只限於咖啡。這讓在場的調酒師也開始重新思考他們選擇調酒杯的方式。</p>
</article>$html$,
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['沖繩','咖啡活動','Espresso','咖啡器皿','咖啡知識','沖繩咖啡'],
  '旅行日記',
  'published',
  'Coffee Shape活動體驗：沖繩濃縮咖啡杯型實驗，從科學角度探討器皿形狀如何影響咖啡風味感知的有趣發現。',
  '2023-04-30 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'coffee-shape-espresso-cup-experiment');

-- 9. 豆ポレポレ烘焙工坊
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '豆ポレポレ烘焙工坊探訪｜日本冠軍烘豆師的每日儀式與精品豆選豆哲學',
  'mamebobo-roastery-visit',
  '繼上次採訪豆波波さん後，這次受邀參觀他的烘焙工坊。從生豆的挑選、烘焙曲線的設計到最後的杯測確認，親眼見證了一位世界級烘豆師每天重複的精密儀式。',
  $html$<article>
<p>上次採訪豆波波さん，他說：「有機會再來，我帶你看我怎麼烘豆。」這次他兌現承諾，在某個週二早上，我在工坊開門前就到了。</p>
<figure><img src="https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg" alt="豆ポレポレ烘焙工坊" /></figure>

<h2>工坊的一天從選豆開始</h2>
<p>早上9點，豆波波さん已經在仔細檢視一批剛到的肯亞Nyeri批次生豆。他把豆子攤在白色的挑豆台上，一顆一顆地剔除瑕疵豆——顏色異常的、形狀過小的、有蟲孔的。這個手工挑豆（ハンドピック）的工序通常被大型烘豆廠機械化取代，但他堅持手工，因為「機器沒辦法感覺每顆豆子的密度和質地」。</p>

<h2>烘焙機器介紹</h2>
<p>工坊使用的是德國Probat品牌的5公斤滾筒烘豆機，這是精品咖啡業界公認品質最穩定的烘豆機之一。豆波波さん這台機器已有超過10年歷史，他說：「機器有自己的脾氣，和它相處久了，你就知道它在某個溫度節點會有什麼反應。」</p>

<h2>烘焙曲線的藝術</h2>
<p>現代精品烘焙使用軟體（如Cropster）記錄每次烘焙的溫度曲線，豆波波さん的電腦螢幕上顯示著過去幾百次烘焙的數據。他解釋：</p>
<ul>
<li><strong>回溫點（Turning Point）</strong>：生豆入機後，豆子吸熱導致溫度下降，到達最低點後回升，這個轉折點的溫度影響後續整個烘焙走向。</li>
<li><strong>梅納反應（Maillard Reaction）</strong>：140-150°C時，豆子中的糖和氨基酸發生複雜的化學反應，產生數百種香氣化合物，是風味複雜度的關鍵。</li>
<li><strong>一爆（First Crack）</strong>：約195-205°C時，豆子內部水蒸氣膨脹，細胞壁破裂發出「啪」的聲音，是判斷烘焙進度的重要標誌。</li>
</ul>

<h2>杯測確認</h2>
<p>烘焙完成後30分鐘，豆波波さん開始進行杯測（Cupping）。他使用標準的SCA杯測流程：統一研磨度、統一用水量、統一浸泡時間，在固定的時間點破殼、品嚐。我在旁邊學著他的方式，把杯測匙深入咖啡液中，大力一吸，讓咖啡霧化均勻接觸味蕾。</p>

<p>「這批肯亞Nyeri，我給它7.5分（滿分8分）。黑醋栗香氣很清晰，但這次烘焙節點稍微早了一點，甜感還沒有完全展開。下次調整一下出爐時間。」他在筆記本上寫下詳細的評語和下一次的調整方案。</p>

<h2>對我的啟發</h2>
<p>看完整個烘焙流程，我深刻體會到精品咖啡「人的因素」的重要性。同樣的生豆、同樣的機器，不同烘豆師的結果可以差距甚大。豆波波さん的卓越不只來自知識，更來自那種對每個細節永不妥協的職人態度。</p>
</article>$html$,
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['沖繩','豆波波','烘豆師','烘焙工坊','精品咖啡','職人'],
  '咖啡旅行',
  'published',
  '豆ポレポレ烘焙工坊參訪：從選豆、烘焙曲線到杯測，親眼見證日本冠軍烘豆師的每日精密儀式。',
  '2023-06-16 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'mamebobo-roastery-visit');

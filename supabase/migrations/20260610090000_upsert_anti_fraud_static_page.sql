INSERT INTO public.static_pages (slug, title, meta_description, content, updated_at)
VALUES (
  'anti-fraud',
  '防詐騙宣導',
  '根本在旅行購物付款、配送、退換貨與防詐騙說明，若有疑慮請立即聯繫客服或撥打 165 反詐騙專線。',
  $html$
<section class="space-y-8">
  <div class="text-center">
    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Anti-Fraud</p>
    <h1 class="mt-3 text-3xl font-bold text-gray-900 md:text-4xl">防詐騙宣導</h1>
    <p class="mx-auto mt-4 max-w-2xl text-gray-600">
      根本在旅行提醒您，請務必透過官方網站、官方客服與正式付款流程完成交易。若收到可疑訊息、要求變更收款帳號或要求加 LINE 私下付款，請立即停止操作並與客服確認。
    </p>
  </div>

  <div class="rounded-2xl border border-amber-200 bg-amber-50 p-5">
    <p class="text-amber-900">
      如有任何疑慮，請立即撥打 <strong>165 反詐騙專線</strong> 或聯繫客服確認。
    </p>
  </div>

  <div class="space-y-5">
    <article class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900">付款方式</h2>
      <ol class="mt-3 list-decimal space-y-2 pl-5 text-gray-600">
        <li>LINE Pay（請於購物車結帳後的 20 分鐘內付款）</li>
        <li>Apple Pay</li>
        <li>信用卡付款（VISA、MasterCard、JCB、銀聯卡）</li>
        <li>ATM 轉帳（請於 3 日內付款）</li>
        <li>7-11 超商取貨付款</li>
        <li>全家便利商店取貨付款</li>
      </ol>
    </article>

    <article class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900">配送方式</h2>
      <div class="mt-3 space-y-4 text-gray-600">
        <div>
          <p class="font-semibold text-gray-900">出貨天數</p>
          <ul class="mt-2 list-disc space-y-1 pl-5">
            <li>訂單成立後確認款項，預計 2-3 個工作天會寄出商品。</li>
            <li>預購商品備貨期間為 7-21 個工作天，到貨後會立即寄出。</li>
          </ul>
        </div>
        <div>
          <p class="font-semibold text-gray-900">配送類型</p>
          <ul class="mt-2 list-disc space-y-1 pl-5">
            <li>宅配：黑貓宅急便、新竹物流，出貨後 2-3 天送達。</li>
            <li>超商：7-11、全家便利商店（台灣本島、外島超商門市），出貨後 3-5 天配送至指定門市。</li>
            <li>海外配送：順豐速運，配達時間依據順豐速運運輸進度為準。</li>
          </ul>
        </div>
        <div>
          <p class="font-semibold text-gray-900">運費</p>
          <ul class="mt-2 list-disc space-y-1 pl-5">
            <li>宅配 - 黑貓宅急便：運費 NT$120，消費滿 NT$1,000 免運（限台灣境內）。</li>
            <li>宅配 - 新竹物流：運費 NT$110，消費滿 NT$1,000 免運（限台灣境內）。</li>
            <li>超商取貨：運費 NT$70，消費滿 NT$1,000 免運（限台灣境內）。</li>
            <li>海外配送 - 順豐速運（中國大陸含香港、澳門）：1kg 內 TWD300、2kg 內 TWD480、3kg 以上 TWD600。</li>
            <li>海外配送 - 順豐速運（新加坡）：依重量計費，由收件人向順豐速運支付運費。</li>
          </ul>
        </div>
      </div>
    </article>

    <article class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900">退換貨政策</h2>
      <div class="mt-3 space-y-4 text-gray-600">
        <p>如商品有瑕疵、運輸過程造成貨品毀損、貨品品項錯誤，請於收貨 6 小時內錄影拍照存證後，並立即與客服聯繫，以便安排後續退換貨處理。</p>
        <p>若因退貨造成訂單純商品金額未達購物免運費標準，仍將於退貨退款時扣除原訂單之 200 元物流費，免運費標準請依網站免運費條件為依據。</p>
        <p>符合以下條件，客服人員將儘速安排退換貨與退款相關事宜：</p>
        <ol class="list-decimal space-y-1 pl-5">
          <li>因作業程序錯誤，導致寄送的商品與訂購的商品不符。</li>
          <li>單一產品包裝內之物品、贈品不齊。</li>
          <li>商品有明顯瑕疵或已損壞。</li>
        </ol>
        <p class="font-medium text-gray-700">中港澳地區買家目前無退換貨服務，下單前請務必考慮、詢問清楚。</p>
      </div>
    </article>

    <article class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900">關於退貨及七天鑑賞期</h2>
      <div class="mt-3 space-y-4 text-gray-600">
        <p>我們的咖啡豆、濾掛包等屬於「通訊交易解除權合理例外情事適用準則」第二條第一項「易於腐敗、保存期限較短或解約時即將逾期」之商品，因此咖啡豆、咖啡濾掛包等商品排除消費者保護法第十九條第一項解除權，不享有 7 天鑑賞期。</p>
        <p>除商品本身瑕疵或運送過程造成的損毀外，恕無法接受退貨申請。商品一經拆封、食用、失溫或保存不良而導致變質，亦無法辦理退換貨，敬請見諒。</p>
      </div>
    </article>

    <article class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900">退換貨流程</h2>
      <div class="mt-3 space-y-4 text-gray-600">
        <div>
          <p class="font-semibold text-gray-900">步驟一</p>
          <p class="mt-2">請透過以下任一聯絡方式，註明訂購者姓名、聯絡電話、退貨原因並拍下清楚照片：</p>
          <ul class="mt-2 list-disc space-y-1 pl-5">
            <li>客服電話：02-2756-5663（週一至週五 09:00~18:00）</li>
            <li>Email：service@dlalshop.com</li>
            <li>LINE ID：@DLAL</li>
            <li>Facebook 粉絲專頁：根本在旅行</li>
          </ul>
        </div>
        <div>
          <p class="font-semibold text-gray-900">步驟二</p>
          <p class="mt-2">收到您的來信且確認為瑕疵商品後，我們將安排專人與您聯繫，並請黑貓宅急便前往收貨。請將退貨商品包裝妥當，並保留商品本體、贈品、內外包裝、發票及所有附隨文件或資料的完整性。</p>
        </div>
        <div>
          <p class="font-semibold text-gray-900">步驟三</p>
          <p class="mt-2">待商品退回後，我們會儘速安排退款或換貨。</p>
        </div>
      </div>
    </article>

    <article class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900">瑕疵 / 寄錯商品退款說明</h2>
      <p class="mt-3 text-gray-600">
        與客服聯繫後，請將商品包裝完整寄回，瑕疵或寄錯商品不須負擔寄回運費。待客服收到商品後，退款將於 7－15 個工作天內完成。
      </p>
    </article>

    <article class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900">無法下單 / 取貨規則</h2>
      <div class="mt-3 space-y-3 text-gray-600">
        <p>1. 買家下單後忘記或刻意不領取商品，若使用貨到付款不取貨者，將請求買家支付寄出及退回運費之損害賠償。</p>
        <p>2. 凡有不取貨經驗的買家，系統將設為黑名單，欲再次購買須先支付前一次未取貨之運費。</p>
        <p>3. 若有誤會，歡迎聯繫客服，保持良好的交易態度都能讓彼此更加愉快。</p>
        <p>4. 超商出貨狀態「抵達門市」請務必於七日內取貨，超商與根本在旅行皆無權限延長包裹保留時間。</p>
        <p>5. 超商取貨付款之包裹，可協請親友代領；若為已付款包裹，店員無法確認證件時包裹必定退回，若因此造成運費損失，需由買家補償運費。</p>
      </div>
    </article>
  </div>
</section>
  $html$,
  '2026-06-10T00:00:00.000Z'
)
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  meta_description = EXCLUDED.meta_description,
  content = EXCLUDED.content,
  updated_at = EXCLUDED.updated_at;

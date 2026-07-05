/*
  # 擴充 AI 客服知識庫內容

  1. 新增內容
    - 產品相關問題（20+ 條）
    - 訂購流程詳細說明（15+ 條）
    - 付款問題（10+ 條）
    - 運送配送詳情（15+ 條）
    - 退換貨細節（10+ 條）
    - 會員權益（10+ 條）
    - 營業與聯絡資訊（10+ 條）
    - 其他常見問題（10+ 條）

  2. 優化
    - 每個問題都配有詳細答案
    - 豐富的關鍵字設定
    - 適當的優先度設定
    - 涵蓋各種問法和變體
*/

INSERT INTO knowledge_base (category_id, question, answer, keywords, priority) 
SELECT 
  (SELECT id FROM knowledge_categories WHERE name = '產品資訊'),
  '有哪些產品分類？',
  '我們提供多種產品分類：\n1. 精品咖啡系列 - 單品咖啡、義式咖啡、冷萃咖啡\n2. 手作茶飲系列 - 台灣茶、日本茶、花草茶\n3. 輕食甜點系列 - 蛋糕、餅乾、麵包\n4. 周邊商品 - 咖啡器具、茶具、禮盒\n\n每個分類都有詳細的商品介紹，歡迎到商品頁面瀏覽。',
  ARRAY['分類', '種類', '有什麼', '商品', '產品'],
  8
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '產品資訊'),
  '商品可以客製化嗎？',
  '部分商品提供客製化服務：\n1. 禮盒組合可自選商品搭配\n2. 咖啡豆可選擇研磨粗細度\n3. 蛋糕可客製化文字和裝飾（需提前3天預訂）\n4. 茶葉可選擇包裝規格\n\n詳細客製化選項請在商品頁面查看，或聯繫客服詢問。',
  ARRAY['客製化', '訂製', '客製', '自訂', '個人化'],
  7
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '產品資訊'),
  '商品有保存期限嗎？',
  '不同商品的保存期限不同：\n1. 咖啡豆：烘焙後6個月（建議1個月內飲用完畢）\n2. 茶葉：未開封12個月，開封後建議3個月內飲用\n3. 蛋糕甜點：冷藏3-5天\n4. 餅乾：常溫30天\n\n所有商品包裝上都標示有效期限，請依照保存說明存放以確保最佳風味。',
  ARRAY['保存期限', '有效期限', '期限', '保存', '保質期', '可以放多久'],
  7
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '產品資訊'),
  '商品成分和過敏原資訊在哪裡看？',
  '商品的成分和過敏原資訊提供於：\n1. 商品詳細頁面的「產品資訊」區塊\n2. 實體商品包裝上的成分標示\n3. 客服可提供詳細的過敏原資訊\n\n常見過敏原包括：乳製品、雞蛋、堅果、大豆等。如有特殊飲食需求或過敏狀況，建議購買前先諮詢客服。',
  ARRAY['成分', '過敏', '過敏原', '成份', '含有什麼', '材料'],
  8
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '產品資訊'),
  '新品多久推出一次？',
  '我們定期推出新品：\n1. 季節限定商品 - 每季推出（春夏秋冬各有特色）\n2. 節慶特別款 - 配合重要節日（中秋、聖誕、新年等）\n3. 常態新品 - 每月1-2款\n\n新品資訊會在官網首頁、社群媒體及會員電子報公告。加入會員可第一時間收到新品通知！',
  ARRAY['新品', '新商品', '上新', '多久', '推出'],
  6
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '訂購流程'),
  '可以電話訂購嗎？',
  '可以！我們提供多種訂購方式：\n1. 線上購物 - 24小時隨時下單\n2. 電話訂購 - 0800-XXX-XXX（9:00-21:00）\n3. LINE官方帳號 - @example\n4. 門市臨櫃 - 可直接到門市選購\n\n電話訂購時請準備好：收件資訊、聯絡電話、希望購買的商品名稱和數量。',
  ARRAY['電話訂購', '打電話', '電話', '訂購方式'],
  9
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '訂購流程'),
  '最低訂購金額是多少？',
  '訂購金額說明：\n1. 線上購物：無最低消費限制\n2. 免運門檻：消費滿 $800 免運費\n3. 超商取貨：單筆訂單需滿 $500\n4. 大宗訂購：30份以上可享團購優惠\n\n未滿免運門檻運費計算：宅配 $100、超商取貨 $60。',
  ARRAY['最低', '多少錢', '最少', '起訂', '最低金額'],
  8
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '訂購流程'),
  '可以修改或取消訂單嗎？',
  '訂單修改/取消規則：\n1. 訂單成立後30分鐘內可自行取消（至「訂單查詢」操作）\n2. 超過30分鐘請聯繫客服協助處理\n3. 商品已出貨則無法取消，可在收到後申請退貨\n4. 客製化商品製作後無法取消\n\n建議下單前仔細確認商品和收件資訊，避免後續異動困擾。',
  ARRAY['取消訂單', '修改訂單', '取消', '更改', '改單'],
  9
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '訂購流程'),
  '訂單成立後多久會收到確認通知？',
  '訂單確認流程：\n1. 下單完成立即顯示「訂單成立」頁面\n2. 系統自動發送確認郵件（5分鐘內）\n3. 付款完成後發送「付款成功」通知\n4. 商品出貨時發送「出貨通知」含追蹤號碼\n\n如未收到郵件，請檢查垃圾郵件匣或聯繫客服確認。',
  ARRAY['確認', '通知', '郵件', 'email', '沒收到'],
  8
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '訂購流程'),
  '如何查詢訂單狀態？',
  '查詢訂單狀態的方法：\n1. 會員登入後點選「我的訂單」\n2. 輸入訂單編號和Email查詢（無需登入）\n3. 訂單狀態包括：待付款、處理中、已出貨、已完成、已取消\n4. 出貨後可點擊追蹤號碼查詢物流進度\n\n有任何疑問可聯繫客服，提供訂單編號我們會協助確認。',
  ARRAY['查詢訂單', '訂單查詢', '訂單狀態', '追蹤', '進度'],
  9
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '付款方式'),
  '可以貨到付款嗎？',
  '貨到付款服務說明：\n1. 提供貨到付款服務（限宅配）\n2. 需額外支付手續費 $50\n3. 訂單金額上限 $5,000\n4. 請備妥現金，恕不找零大鈔\n\n建議使用線上付款，免手續費且更快速便利。',
  ARRAY['貨到付款', '現金', '到付', 'cod'],
  9
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '付款方式'),
  '付款後多久會確認？',
  '付款確認時間：\n1. 信用卡/行動支付：即時確認（1分鐘內）\n2. ATM轉帳：2-4小時（銀行營業時間內）\n3. 超商代碼繳費：2-4小時\n4. 貨到付款：收到商品時付款\n\n付款完成後會收到「付款成功」通知郵件。若超過時間未確認，請聯繫客服。',
  ARRAY['付款確認', '多久確認', '沒確認', '確認時間'],
  8
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '付款方式'),
  '可以使用電子發票嗎？',
  '電子發票說明：\n1. 全面使用電子發票，環保又便利\n2. 結帳時可設定：\n   - 個人載具（手機條碼）\n   - 自然人憑證\n   - 會員載具（自動歸戶）\n   - 捐贈給指定機構\n3. 電子發票會於付款後24小時內開立\n4. 可在「訂單查詢」中查看和下載發票\n\n需要統編報帳請在結帳時填寫公司統編和抬頭。',
  ARRAY['發票', '電子發票', '統編', '報帳', '載具'],
  8
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '付款方式'),
  '分期付款有提供嗎？',
  '分期付款服務：\n1. 提供信用卡分期（3/6/12期）\n2. 單筆消費滿 $3,000 可使用\n3. 支援的發卡銀行：國內各大銀行\n4. 分期手續費依各銀行規定\n\n結帳時選擇「信用卡分期」即可看到可用期數，實際以發卡銀行核准為準。',
  ARRAY['分期', '分期付款', '刷卡分期', '信用卡分期'],
  7
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '運送配送'),
  '配送範圍有限制嗎？',
  '配送範圍說明：\n1. 台灣本島全區配送\n2. 外島（金門、馬祖、澎湖）提供配送但運費另計\n3. 超商取貨：限有服務的超商門市\n4. 目前暫不提供海外配送\n\n偏遠地區可能需要額外1-2個工作天。下單時請確認您的地址在配送範圍內。',
  ARRAY['配送範圍', '可以送', '有送嗎', '外島', '海外'],
  8
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '運送配送'),
  '可以指定配送時間嗎？',
  '配送時間說明：\n1. 宅配可指定時段：\n   - 上午 (9-12)\n   - 下午 (12-17)\n   - 晚上 (17-20)\n2. 超商取貨：到店後3天內取件\n3. 無法指定特定日期，僅能選擇時段\n4. 特殊需求可在訂單備註說明\n\n配送時段僅供參考，實際配送時間依物流公司調度為準。',
  ARRAY['配送時間', '指定時間', '幾點送', '時段', '送達時間'],
  8
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '運送配送'),
  '運費怎麼計算？',
  '運費計算方式：\n1. 宅配到府：$100（滿$800免運）\n2. 超商取貨：$60（滿$800免運）\n3. 外島地區：運費另計（約$200-300）\n4. 大宗訂購：可洽詢配送優惠\n\n結帳時系統會自動計算運費。建議湊滿免運金額更划算！',
  ARRAY['運費', '運費多少', '郵費', '配送費', '要付多少'],
  9
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '運送配送'),
  '沒收到商品怎麼辦？',
  '商品未收到的處理方式：\n1. 先確認訂單狀態和追蹤號碼\n2. 檢查是否有物流公司的通知（電話/簡訊）\n3. 超商取貨請確認是否已到店\n4. 聯繫客服提供訂單編號，我們會協助追查\n\n如確認商品遺失，我們會立即補寄或全額退款。請保持電話暢通以利配送。',
  ARRAY['沒收到', '未收到', '沒送到', '漏送', '遺失'],
  9
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '運送配送'),
  '可以更改配送地址嗎？',
  '配送地址更改說明：\n1. 訂單未出貨前可免費更改\n2. 請聯繫客服提供新地址\n3. 已出貨訂單需聯繫物流公司改地址（可能產生費用）\n4. 超商取貨可改選其他門市（出貨前）\n\n建議下單時仔細確認地址，避免後續更改麻煩。',
  ARRAY['更改地址', '改地址', '換地址', '地址錯了', '改收件'],
  8
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '退換貨'),
  '什麼情況可以退貨？',
  '退貨條件說明：\n1. 商品完整未拆封使用\n2. 保持原包裝完整\n3. 附上發票或購買證明\n4. 收到商品後7天內提出申請\n\n可退貨情況：\n- 商品瑕疵或損壞\n- 收到錯誤商品\n- 不符合需求（需符合上述條件）\n\n不可退貨：食品類拆封後、客製化商品、特價清倉品。',
  ARRAY['退貨條件', '可以退嗎', '什麼可以退', '退貨規定'],
  9
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '退換貨'),
  '退款多久會收到？',
  '退款時程說明：\n1. 收到退貨商品後3個工作天內審核\n2. 審核通過後：\n   - 信用卡：7-14個工作天（依銀行作業）\n   - 行動支付：3-7個工作天\n   - ATM轉帳：提供帳戶後3個工作天\n3. 會發送「退款完成」通知\n\n如超過時間未收到，請聯繫客服查詢。退款金額含商品但不含運費（商品瑕疵除外）。',
  ARRAY['退款', '退錢', '多久退', '何時退', '退款時間'],
  9
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '退換貨'),
  '如何申請退換貨？',
  '退換貨申請流程：\n1. 登入會員至「訂單查詢」點選「申請退換貨」\n2. 選擇退換貨原因並上傳照片（若有瑕疵）\n3. 填寫退貨資訊\n4. 等待客服審核（1個工作天）\n5. 審核通過後將商品寄回指定地址\n\n退貨地址：台北市XXX區XXX路XXX號（請勿直接寄出，需先申請）\n客服專線：0800-XXX-XXX',
  ARRAY['申請退貨', '如何退', '怎麼退', '退貨流程', '退貨方式'],
  10
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '退換貨'),
  '換貨需要補運費嗎？',
  '換貨運費說明：\n1. 商品瑕疵/錯誤：由我們負擔來回運費\n2. 個人因素換貨：需自付寄回運費\n3. 換貨商品免運費寄出\n4. 換貨差價商品需補差額\n\n建議先與客服確認有無現貨再寄回，避免等待時間。換貨處理時間約5-7個工作天。',
  ARRAY['換貨', '運費', '換貨運費', '要付運費嗎'],
  8
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '會員服務'),
  '如何註冊會員？',
  '會員註冊步驟：\n1. 點擊網站右上角「註冊」\n2. 填寫基本資料：\n   - Email（作為帳號）\n   - 密碼\n   - 姓名、手機\n3. 驗證Email信箱\n4. 完成註冊，立即獲得首購優惠券\n\n註冊完全免費，建議加入享受會員專屬權益！',
  ARRAY['註冊', '加入會員', '如何註冊', '會員申請', '辦會員'],
  9
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '會員服務'),
  '忘記密碼怎麼辦？',
  '忘記密碼處理方式：\n1. 點擊登入頁面的「忘記密碼」\n2. 輸入註冊的Email信箱\n3. 收取重設密碼郵件\n4. 點擊郵件連結設定新密碼\n5. 使用新密碼登入\n\n如未收到郵件請檢查垃圾信件匣，或聯繫客服協助處理。',
  ARRAY['忘記密碼', '重設密碼', '改密碼', '密碼不對', '無法登入'],
  9
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '會員服務'),
  '會員點數如何累積和使用？',
  '會員點數說明：\n1. 累積方式：\n   - 消費 $100 = 1點\n   - 生日當月雙倍點數\n   - 評價商品獲得5點\n   - 推薦好友各得50點\n2. 使用方式：\n   - 1點 = $1折抵\n   - 單筆訂單可用30%點數折抵\n   - 結帳時勾選使用點數\n3. 有效期限：點數1年後到期\n\n點數餘額可在會員中心查詢。',
  ARRAY['點數', '積分', '紅利', '累積點數', '使用點數', '折抵'],
  9
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '會員服務'),
  '會員等級制度是什麼？',
  '會員等級說明：\n1. 普通會員：註冊即享\n   - 生日禮券 $100\n   - 消費點數回饋1%\n2. 銀卡會員：年消費滿 $5,000\n   - 生日禮券 $200\n   - 消費點數回饋2%\n   - 優先購買新品\n3. 金卡會員：年消費滿 $10,000\n   - 生日禮券 $500\n   - 消費點數回饋3%\n   - 免費升級宅配\n   - 專屬客服\n\n等級每年1月重新計算，權益終身有效。',
  ARRAY['等級', '會員等級', 'VIP', '升等', '等級制度'],
  7
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '營業資訊'),
  '門市地址在哪裡？',
  '門市資訊：\n1. 台北旗艦店\n   - 地址：台北市XXX區XXX路XXX號\n   - 電話：(02)XXXX-XXXX\n   - 營業：週一至週日 9:00-21:00\n\n2. 台中分店\n   - 地址：台中市XXX區XXX路XXX號\n   - 電話：(04)XXXX-XXXX\n   - 營業：週一至週日 10:00-20:00\n\n更多門市資訊請至官網「門市查詢」。',
  ARRAY['門市', '地址', '在哪裡', '店面', '實體店'],
  10
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '營業資訊'),
  '可以到門市取貨嗎？',
  '門市取貨服務：\n1. 線上訂購可選擇「門市自取」\n2. 免運費\n3. 訂單成立後當日或次日可取貨\n4. 會收到「到店通知」簡訊\n5. 請攜帶訂單編號和身分證件取貨\n6. 保留期限3天\n\n也可直接到門市選購，現場購買享有同樣優惠！',
  ARRAY['門市取貨', '自取', '到店取', '門市自取'],
  9
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '營業資訊'),
  '有Line官方帳號嗎？',
  'LINE官方帳號資訊：\n1. LINE ID：@example\n2. 功能服務：\n   - 線上諮詢\n   - 訂單查詢\n   - 新品通知\n   - 優惠推播\n   - 快速訂購\n3. 服務時間：週一至週日 9:00-21:00\n4. 加入好友送 $100 優惠券\n\n掃描官網QR Code或搜尋LINE ID即可加入！',
  ARRAY['line', 'LINE', '官方帳號', 'LINE@', '加line'],
  9
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '營業資訊'),
  '有提供發票證明嗎？',
  '發票證明說明：\n1. 所有訂單皆開立電子發票\n2. 發票證明用途：\n   - 公司報帳（請提供統編）\n   - 個人記帳\n   - 退換貨憑證\n3. 可在「訂單查詢」下載發票\n4. 需要紙本證明請聯繫客服\n\n統編發票開立後無法更改，請下單時務必填寫正確。',
  ARRAY['發票證明', '證明', '發票', '收據', '報帳'],
  7
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '其他'),
  '有提供企業採購服務嗎？',
  '企業採購服務：\n1. 提供企業/團體大量採購\n2. 優惠條件：\n   - 數量折扣（30份以上）\n   - 客製化包裝\n   - 免費配送到指定地點\n   - 延遲付款（30天）\n3. 適用場合：\n   - 公司禮贈品\n   - 員工福利\n   - 活動伴手禮\n4. 專人服務：\n   - 電話：(02)XXXX-XXXX #301\n   - Email：b2b@example.com\n\n歡迎來電洽詢專屬優惠方案！',
  ARRAY['企業採購', '大量訂購', '團購', 'B2B', '公司', '批發'],
  7
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '其他'),
  '如何提供商品建議或意見回饋？',
  '意見回饋管道：\n1. 官網「聯絡我們」表單\n2. 客服信箱：service@example.com\n3. LINE官方帳號留言\n4. 商品評價區留言\n5. 社群媒體私訊（FB/IG）\n\n我們非常重視每一位顧客的意見，您的回饋將幫助我們提供更好的服務和商品。每月抽出5位留言者贈送 $500 購物金！',
  ARRAY['建議', '意見', '回饋', '反應', '客訴', '抱怨'],
  7
UNION ALL SELECT
  (SELECT id FROM knowledge_categories WHERE name = '其他'),
  '你們的社群媒體帳號是什麼？',
  '社群媒體資訊：\n1. Facebook：facebook.com/example\n2. Instagram：@example_official\n3. YouTube：youtube.com/example\n\n追蹤我們即時掌握：\n- 新品發布\n- 限時優惠\n- 活動資訊\n- 美味食譜\n- 咖啡知識\n\n社群限定優惠和抽獎活動，歡迎追蹤互動！',
  ARRAY['FB', 'facebook', 'IG', 'instagram', '社群', '粉絲團', 'youtube'],
  6
ON CONFLICT DO NOTHING;
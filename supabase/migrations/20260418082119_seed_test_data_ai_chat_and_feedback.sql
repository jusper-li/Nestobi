/*
  # Seed AI Chat Logs & Chat Feedback Test Data

  1. ai_chat_logs
     - Simulated conversations between visitors/members and the AI assistant
     - Covers common coffee questions, orders, and product inquiries
     - Links some entries to existing members

  2. chat_feedback
     - User ratings and feedback for existing chat sessions/messages
*/

-- AI Chat Logs
INSERT INTO ai_chat_logs (session_id, member_id, message, response, tokens_used, created_at)
VALUES
  (gen_random_uuid(), 'cc000001-0000-4000-c000-000000000001', '請問你們有哪些單品咖啡豆？', '我們目前有來自衣索比亞、哥倫比亞、肯亞、瓜地馬拉等產區的精品單品咖啡豆，每款都有詳細的風味描述。您可以前往商品頁面查看完整列表！', 248, now() - interval '5 days'),
  (gen_random_uuid(), 'cc000001-0000-4000-c000-000000000002', '訂單什麼時候會出貨？', '一般訂單在確認付款後 1-2 個工作天內出貨，宅配通常 2-3 天內送達。若您有急件需求，也可以聯繫我們的客服團隊。', 189, now() - interval '4 days'),
  (gen_random_uuid(), 'cc000001-0000-4000-c000-000000000003', '請問淺焙和深焙有什麼差別？', '淺焙保留了更多咖啡豆原有的果酸與花香風味，口感清爽；深焙則帶有濃郁的焦糖、巧克力香氣，苦味較重，適合喜歡厚實感的朋友。我們的門市也提供試喝服務！', 312, now() - interval '3 days'),
  (gen_random_uuid(), NULL, '你們有提供訂閱方案嗎？', '目前我們尚未推出固定訂閱方案，但您可以加入會員享受專屬折扣和優先購買資格。我們也會不定期推出優惠活動，歡迎追蹤我們的社群帳號！', 201, now() - interval '3 days'),
  (gen_random_uuid(), 'cc000001-0000-4000-c000-000000000004', '如何研磨咖啡豆？', '研磨粗細依沖煮方式不同：義式濃縮需要細研磨、手沖適合中研磨、法式壓壺則用粗研磨。建議購買有刻度的磨豆機，方便調整。我們也有販售適合各種沖煮方式的磨豆機！', 356, now() - interval '2 days'),
  (gen_random_uuid(), NULL, '請問退換貨政策是什麼？', '若商品有品質問題，請在收到後 7 天內聯繫我們，我們會安排換貨或退款。咖啡豆因食品衛生考量，拆封後無法退換，敬請見諒。詳細說明請參閱常見問題頁面。', 278, now() - interval '1 day'),
  (gen_random_uuid(), 'cc000001-0000-4000-c000-000000000005', '有沒有適合新手的咖啡推薦？', '非常推薦我們的「衣索比亞 耶加雪菲」，風味帶有明亮果酸和茉莉花香，非常易飲。如果您偏好較低酸度，「哥倫比亞 花神」也是很棒的選擇，帶有甜感與堅果香氣。', 334, now() - interval '6 hours'),
  (gen_random_uuid(), 'cc000001-0000-4000-c000-000000000001', '你們的咖啡豆是有機的嗎？', '我們的部分產品取得有機認證，商品頁面上會標示「有機認證」標章。我們也嚴格要求所有供應商提供溯源資料，確保每一批豆子的品質與產地透明度。', 267, now() - interval '2 hours');

-- Chat Feedback (using existing chat_sessions and chat_messages)
INSERT INTO chat_feedback (session_id, message_id, rating, feedback_text, created_at)
SELECT
  cs.id as session_id,
  cm.id as message_id,
  4 as rating,
  '回答很清楚，很有幫助！' as feedback_text,
  now() - interval '3 days'
FROM chat_sessions cs
JOIN chat_messages cm ON cm.session_id = cs.id
LIMIT 1;

INSERT INTO chat_feedback (session_id, message_id, rating, feedback_text, created_at)
SELECT
  cs.id as session_id,
  cm.id as message_id,
  5 as rating,
  '非常快速解決我的問題，服務很棒！' as feedback_text,
  now() - interval '2 days'
FROM chat_sessions cs
JOIN chat_messages cm ON cm.session_id = cs.id
OFFSET 1
LIMIT 1;

INSERT INTO chat_feedback (session_id, message_id, rating, feedback_text, created_at)
SELECT
  cs.id as session_id,
  cm.id as message_id,
  3 as rating,
  '回答有點模糊，希望能更詳細說明配送時間。' as feedback_text,
  now() - interval '1 day'
FROM chat_sessions cs
JOIN chat_messages cm ON cm.session_id = cs.id
OFFSET 2
LIMIT 1;

INSERT INTO chat_feedback (session_id, message_id, rating, feedback_text, created_at)
SELECT
  cs.id as session_id,
  cm.id as message_id,
  5 as rating,
  '很專業，推薦給朋友了！' as feedback_text,
  now() - interval '5 hours'
FROM chat_sessions cs
JOIN chat_messages cm ON cm.session_id = cs.id
OFFSET 3
LIMIT 1;

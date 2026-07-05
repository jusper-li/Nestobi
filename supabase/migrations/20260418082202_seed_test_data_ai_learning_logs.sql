/*
  # Seed AI Learning Logs Test Data

  Adds sample AI learning log entries that represent questions the AI has learned from,
  linked to existing knowledge base entries. Useful for verifying the AI Training module.
*/

INSERT INTO ai_learning_logs (question, answer, knowledge_id, confidence_score, was_helpful, created_at)
VALUES
  ('咖啡豆保存多久？', '咖啡豆建議在烘焙後 2-4 週內飲用完畢，以保持最佳風味。請存放在密封袋或密封罐中，避免陽光直射與潮濕環境。', '44c0f302-6348-481b-87e0-e7b5a72cefa8', 0.92, true, now() - interval '10 days'),
  ('手沖咖啡水溫要多少？', '手沖咖啡建議水溫在 88-93°C 之間。淺焙豆可使用較高溫（91-93°C），深焙豆建議稍低（88-90°C）以避免苦澀。', '13885f2e-c544-4cf4-aaef-b6aeb24fa2af', 0.88, true, now() - interval '8 days'),
  ('有沒有不酸的咖啡推薦？', '若不喜歡酸味，建議選擇深焙的咖啡豆，例如曼特寧或義式配方豆。這類咖啡苦中帶甜，酸度極低，口感厚實。', '43a3a3a8-c10d-433e-a8c4-fa031a90e654', 0.85, true, now() - interval '6 days'),
  ('冷萃咖啡怎麼做？', '冷萃咖啡：將粗研磨咖啡粉以 1:8 比例加入冷水，放入冰箱靜置 12-18 小時，過濾後即可飲用。口感甘甜順口，適合夏天飲用。', '36df4fde-550c-4f94-9611-9132c06ed24a', 0.79, true, now() - interval '4 days'),
  ('義式咖啡和美式咖啡有什麼不同？', '義式濃縮（Espresso）是高壓萃取的濃縮咖啡，口感濃郁；美式咖啡（Americano）是將濃縮咖啡加熱水稀釋，口感較清淡，但仍保有咖啡香氣。', 'bcf91326-9402-4937-b535-3388d84eb6c3', 0.94, true, now() - interval '2 days'),
  ('咖啡因含量最高的是哪種咖啡？', '一般來說，義式濃縮每份的咖啡因約 60-80mg。但手沖咖啡因萃取時間較長，整杯咖啡因總量可能更高（約 150-200mg）。淺焙豆的咖啡因含量略高於深焙豆。', '44c0f302-6348-481b-87e0-e7b5a72cefa8', 0.81, false, now() - interval '1 day'),
  ('訂購後可以修改地址嗎？', '若訂單尚未出貨，可聯繫客服修改配送地址。一旦商品已交付物流，則無法變更，請在下單時確認地址正確。', '13885f2e-c544-4cf4-aaef-b6aeb24fa2af', 0.90, true, now() - interval '12 hours');

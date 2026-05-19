/*
  # Update 五分鈿＋五分醒民宿 (K7) with supplemental data

  Source: https://kei.cafe/K7

  Updates:
  1. Hotel: enhanced description, corrected LINE ID (@5k5k), parking (6 cars/building),
     EV charging (Porsche Type 1 free), updated registration number
  2. Rooms: correct toiletries to 茶籽堂, add hand-drip coffee, update room name,
     add Porsche EV charging and parking details to amenities
*/

-- Update hotel record
UPDATE hotels
SET
  description = '位於宜蘭縣三星鄉、羅東、員山三鄉鎮交界田間的電梯合法民宿（登記號碼：2711）。全新電梯農舍設計，長輩及行動不便者友善。公共空間備有過山車電動麻將桌、4K投影視聽設備、3米原木長桌（可坐12人）、開放式廚房（IH爐、烤箱、微波爐、Panasonic自動製冰冰箱）、手沖咖啡設備及冠軍咖啡豆、有遮雨庭院烤肉區，每棟可停6台車，兩棟併訂最多12台車。備有 Porsche 電動車免費充電（Type 1 規格，Tesla 需自備轉接頭）。每棟最多12人，兩棟併訂最多24人。',
  line_id = '@5k5k',
  registration_number = '2711',
  updated_at = now()
WHERE id = 'e9ecb30a-ba5c-455d-9435-74e101a9c0e7';

-- Update 田園全景四人房 amenities
UPDATE tbl_rooms
SET
  amenities = '["頂級訂製床","大採光窗","乾濕分離衛浴（含暖氣）","浴缸","日立冷暖空調","50吋4K HDR Sony智慧電視","高速WiFi","茶籽堂洗髮露、護髮素、沐浴露","電梯","過山車電動麻將桌","4K投影視聽設備","3米原木長桌","開放式廚房","手沖咖啡設備","庭院烤肉區","停車(每棟6台)","Porsche電動車免費充電"]'::jsonb,
  updated_at = now()
WHERE hotel_id = 'e9ecb30a-ba5c-455d-9435-74e101a9c0e7'
  AND name = '田園全景四人房';

-- Rename and update 山田美景雙人房 → 田園美景雙人房
UPDATE tbl_rooms
SET
  name = '田園美景雙人房',
  amenities = '["頂級訂製床","田園景觀窗","乾濕分離衛浴（含暖氣）","日立冷暖空調","50吋4K HDR Sony智慧電視","高速WiFi","茶籽堂洗髮露、護髮素、沐浴露","電梯","過山車電動麻將桌","4K投影視聽設備","3米原木長桌","開放式廚房","手沖咖啡設備","庭院烤肉區","停車(每棟6台)","Porsche電動車免費充電"]'::jsonb,
  updated_at = now()
WHERE hotel_id = 'e9ecb30a-ba5c-455d-9435-74e101a9c0e7'
  AND name = '山田美景雙人房';

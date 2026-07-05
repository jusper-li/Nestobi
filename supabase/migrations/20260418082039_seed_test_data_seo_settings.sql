/*
  # Seed SEO Settings Test Data

  Inserts SEO metadata for all main pages of the site:
  - Homepage, Shop, About, Story, Contact, FAQ, Cart, Checkout, Member pages
  - Each entry includes title, description, keywords, og_image, robots, canonical_url
*/

INSERT INTO seo_settings (page_path, title, description, keywords, og_image, canonical_url, robots)
VALUES
  ('/', 'Coffee House - 精品咖啡專賣', '探索來自世界各地的精品咖啡豆，體驗最純粹的咖啡風味。', '咖啡,精品咖啡,咖啡豆,單品咖啡,Coffee House', 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg', 'https://coffeehouse.com/', 'index, follow'),
  ('/shop', '商品列表 - Coffee House', '瀏覽我們完整的精品咖啡豆與咖啡器具系列，找到最適合您的選擇。', '咖啡豆購買,精品咖啡豆,咖啡器具,網路購物', 'https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg', 'https://coffeehouse.com/shop', 'index, follow'),
  ('/about', '關於我們 - Coffee House', '了解 Coffee House 的品牌故事、創立理念與對咖啡品質的堅持。', '關於Coffee House,品牌故事,咖啡理念', 'https://images.pexels.com/photos/1307698/pexels-photo-1307698.jpeg', 'https://coffeehouse.com/about', 'index, follow'),
  ('/story', '品牌故事 - Coffee House', '從一顆咖啡豆開始，走過十年堅持品質的旅程。', '品牌故事,咖啡歷史,Coffee House故事', 'https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg', 'https://coffeehouse.com/story', 'index, follow'),
  ('/contact', '聯絡我們 - Coffee House', '有任何問題或合作需求，歡迎透過表單、電話或Email與我們聯繫。', '聯絡Coffee House,客服,合作洽詢', NULL, 'https://coffeehouse.com/contact', 'index, follow'),
  ('/faq', '常見問題 - Coffee House', '解答您最常問的問題，包含訂單、配送、退換貨等完整說明。', '常見問題,FAQ,咖啡配送,退換貨政策', NULL, 'https://coffeehouse.com/faq', 'index, follow'),
  ('/cart', '購物車 - Coffee House', '確認您的購物清單並完成結帳。', '購物車,結帳', NULL, 'https://coffeehouse.com/cart', 'noindex, nofollow'),
  ('/checkout', '結帳 - Coffee House', '安全完成您的訂單付款流程。', '結帳,付款,訂單確認', NULL, 'https://coffeehouse.com/checkout', 'noindex, nofollow'),
  ('/member/profile', '會員中心 - Coffee House', '管理您的個人資料、查看訂單記錄與會員優惠。', '會員中心,訂單查詢,會員資料', NULL, 'https://coffeehouse.com/member/profile', 'noindex, nofollow')
ON CONFLICT (page_path) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  keywords = EXCLUDED.keywords,
  og_image = EXCLUDED.og_image,
  canonical_url = EXCLUDED.canonical_url,
  robots = EXCLUDED.robots,
  updated_at = now();

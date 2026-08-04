# Nestobi 完整資料表欄位名稱對照

產生日期：2026-08-03

說明：本文件由本地 `supabase/migrations` 自動彙整，格式為 `英文欄位` 與 `中文欄位名稱` 對照。若線上 Supabase 曾手動改表，請再與線上 schema 比對。

總資料表數：93

總欄位數：1034

## 管理員與權限

### `admin_activity_logs`（後台活動紀錄）

| 欄位 | 欄位名稱 |
| --- | --- |
| `action` | 操作名稱 |
| `actor_user_id` | 操作者會員 ID |
| `commit_sha` | Git 提交代碼 |
| `completed_at` | 完成時間 |
| `created_at` | 建立時間 |
| `details` | 詳細資料 |
| `entity_id` | 資料 ID |
| `entity_type` | 資料類型 |
| `id` | 資料 ID |
| `record_type` | 紀錄類型 |
| `route` | 路由 |
| `status` | 狀態 |
| `summary` | 摘要 |
| `version_label` | 版本標籤 |

### `admin_audit_logs`（管理員稽核紀錄）

| 欄位 | 欄位名稱 |
| --- | --- |
| `action` | 操作名稱 |
| `admin_id` | 管理員 ID |
| `created_at` | 建立時間 |
| `entity_id` | 資料 ID |
| `entity_table` | 資料表 |
| `id` | 資料 ID |
| `ip_address` | IP 位址 |
| `metadata` | 中繼資料 |
| `user_agent` | 使用者代理 |

### `admin_roles`（管理員角色關聯）

| 欄位 | 欄位名稱 |
| --- | --- |
| `admin_id` | 管理員 ID |
| `role_id` | 角色 ID |

### `admins`（管理員）

| 欄位 | 欄位名稱 |
| --- | --- |
| `auth_user_id` | Auth 使用者 ID |
| `avatar_url` | 頭像網址 |
| `created_at` | 建立時間 |
| `email` | 電子郵件 |
| `id` | 資料 ID |
| `is_active` | 是否啟用 |
| `last_login_at` | 最後登入時間 |
| `login_method` | 登入方式 |
| `name` | 名稱 |
| `password_hash` | 密碼雜湊 |
| `updated_at` | 更新時間 |
| `username` | 帳號 |

### `permissions`（權限）

| 欄位 | 欄位名稱 |
| --- | --- |
| `action` | 操作名稱 |
| `created_at` | 建立時間 |
| `description` | 描述 |
| `id` | 資料 ID |
| `module` | 功能模組 |

### `role_permissions`（角色權限關聯）

| 欄位 | 欄位名稱 |
| --- | --- |
| `permission_id` | 權限 ID |
| `role_id` | 角色 ID |

### `roles`（角色）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `description` | 描述 |
| `id` | 資料 ID |
| `name` | 名稱 |

### `tbl_super_admin`（超級管理員）

| 欄位 | 欄位名稱 |
| --- | --- |
| `granted_at` | 授權時間 |
| `granted_by` | 授權者 |
| `id` | 資料 ID |
| `user_id` | 會員 ID |

### `user_permissions`（使用者權限）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `granted` | 是否授權 |
| `granted_by` | 授權者 |
| `id` | 資料 ID |
| `permission` | 權限 |
| `updated_at` | 更新時間 |
| `user_id` | 會員 ID |

## 會員

### `member_favorites`（會員收藏）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `target_id` | 目標 ID |
| `target_type` | 目標類型 |
| `user_id` | 會員 ID |

### `member_point_balances`（會員點數餘額）

| 欄位 | 欄位名稱 |
| --- | --- |
| `current_points` | 目前點數 |
| `expiring_points` | 即將到期點數 |
| `month_earned` | 本月獲得點數 |
| `month_used` | 本月使用點數 |
| `updated_at` | 更新時間 |
| `user_id` | 會員 ID |

### `member_profiles`（會員摘要資料）

| 欄位 | 欄位名稱 |
| --- | --- |
| `avatar_url` | 頭像網址 |
| `created_at` | 建立時間 |
| `display_name` | 顯示名稱 |
| `id` | 資料 ID |
| `is_active` | 是否啟用 |
| `order_count` | 訂單數 |
| `phone` | 電話 |
| `total_spent` | 累積消費金額 |
| `updated_at` | 更新時間 |

### `members`（會員）

| 欄位 | 欄位名稱 |
| --- | --- |
| `avatar_url` | 頭像網址 |
| `created_at` | 建立時間 |
| `email` | 電子郵件 |
| `id` | 資料 ID |
| `is_active` | 是否啟用 |
| `name` | 名稱 |
| `order_count` | 訂單數 |
| `phone` | 電話 |
| `total_spent` | 累積消費金額 |
| `updated_at` | 更新時間 |

### `password_reset_tokens`（密碼重設 Token）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `email` | 電子郵件 |
| `expires_at` | 到期時間 |
| `id` | 資料 ID |
| `token` | Token |
| `used_at` | 使用時間 |

### `tbl_mn5wgzh0`（會員詳細資料）

| 欄位 | 欄位名稱 |
| --- | --- |
| `avatar_url` | 頭像網址 |
| `bio` | 簡介 |
| `coffee_profile_answers` | 咖啡測驗答案 |
| `coffee_profile_key` | 咖啡偏好代碼 |
| `coffee_profile_label` | 咖啡偏好名稱 |
| `coffee_profile_scores` | 咖啡偏好分數 |
| `coffee_profile_summary` | 咖啡偏好摘要 |
| `coffee_quiz_completed_at` | 咖啡測驗完成時間 |
| `created_at` | 建立時間 |
| `display_name` | 顯示名稱 |
| `id` | 資料 ID |
| `nationality` | 國籍 |
| `phone` | 電話 |
| `preferred_language` | 偏好語言 |
| `shipping_address` | 配送地址 |
| `updated_at` | 更新時間 |
| `user_id` | 會員 ID |

### `tbl_user_auth`（使用者角色權限）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `is_active` | 是否啟用 |
| `role` | 角色 |
| `updated_at` | 更新時間 |
| `user_id` | 會員 ID |

### `user_preferences`（會員偏好設定）

| 欄位 | 欄位名稱 |
| --- | --- |
| `currency` | 幣別 |
| `id` | 資料 ID |
| `language` | 語言 |
| `notifications_email` | Email 通知 |
| `notifications_sms` | 簡訊通知 |
| `theme` | 主題 |
| `updated_at` | 更新時間 |
| `user_id` | 會員 ID |

### `user_usage`（使用者功能使用量）

| 欄位 | 欄位名稱 |
| --- | --- |
| `feature_type` | 功能類型 |
| `id` | 資料 ID |
| `last_used_at` | 最後使用時間 |
| `usage_count` | 使用次數 |
| `user_id` | 會員 ID |

### `verification_codes`（驗證碼）

| 欄位 | 欄位名稱 |
| --- | --- |
| `attempts` | 嘗試次數 |
| `code` | 代碼 |
| `created_at` | 建立時間 |
| `email` | 電子郵件 |
| `expires_at` | 到期時間 |
| `id` | 資料 ID |
| `used` | 是否已使用 |

## 商品與商城

### `blog_categories`（文章分類）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `description` | 描述 |
| `display_order` | 顯示排序 |
| `id` | 資料 ID |
| `is_active` | 是否啟用 |
| `name` | 名稱 |
| `parent_id` | 上層分類 ID |
| `slug` | 網址代稱 |
| `updated_at` | 更新時間 |

### `blog_post_category_links`（文章分類關聯）

| 欄位 | 欄位名稱 |
| --- | --- |
| `category_id` | 分類 ID |
| `created_at` | 建立時間 |
| `post_id` | 文章 ID |

### `categories`（商品分類）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `description` | 描述 |
| `id` | 資料 ID |
| `is_active` | 是否啟用 |
| `name` | 名稱 |
| `parent_id` | 上層分類 ID |
| `slug` | 網址代稱 |
| `sort_order` | 排序 |
| `updated_at` | 更新時間 |

### `category_translations`（分類翻譯）

| 欄位 | 欄位名稱 |
| --- | --- |
| `category_id` | 分類 ID |
| `id` | 資料 ID |
| `is_ai_translated` | 是否 AI 翻譯 |
| `lang` | 語言 |
| `name` | 名稱 |
| `review_status` | 審核狀態 |
| `updated_at` | 更新時間 |

### `knowledge_categories`（知識庫分類）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `description` | 描述 |
| `id` | 資料 ID |
| `is_active` | 是否啟用 |
| `name` | 名稱 |
| `updated_at` | 更新時間 |

### `product_category_links`（商品分類關聯）

| 欄位 | 欄位名稱 |
| --- | --- |
| `category_id` | 分類 ID |
| `created_at` | 建立時間 |
| `product_id` | 商品 ID |

### `product_favorites`（商品收藏）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `product_id` | 商品 ID |
| `user_id` | 會員 ID |

### `product_reviews`（商品評價）

| 欄位 | 欄位名稱 |
| --- | --- |
| `comment` | 評論內容 |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `order_id` | 訂單 ID |
| `product_id` | 商品 ID |
| `purchase_record_id` | 購買紀錄 ID |
| `rating` | 評分 |
| `status` | 狀態 |
| `updated_at` | 更新時間 |
| `user_id` | 會員 ID |

### `product_subscriptions`（商品訂閱）

| 欄位 | 欄位名稱 |
| --- | --- |
| `billing_cycle_count` | 已扣款期數 |
| `created_at` | 建立時間 |
| `customer_email` | 顧客 Email |
| `customer_name` | 顧客姓名 |
| `customer_phone` | 顧客電話 |
| `ended_at` | 結束時間 |
| `expires_at` | 到期時間 |
| `id` | 資料 ID |
| `last_billed_at` | 上次扣款時間 |
| `merchant_order_no` | 商店訂單編號 |
| `monthly_amount` | 每期金額 |
| `newebpay_auth_code` | 藍新授權碼 |
| `newebpay_card_no` | 藍新卡號末碼 |
| `newebpay_paid_at` | 藍新付款時間 |
| `newebpay_payment_type` | 藍新付款類型 |
| `newebpay_period_no` | 藍新定期定額編號 |
| `newebpay_respond_code` | 藍新回應碼 |
| `newebpay_status` | 藍新狀態 |
| `newebpay_trade_no` | 藍新交易序號 |
| `next_bill_at` | 下次扣款時間 |
| `notes` | 備註 |
| `order_id` | 訂單 ID |
| `period_point` | 扣款週期點 |
| `period_start_type` | 訂閱起始類型 |
| `period_times` | 訂閱期數 |
| `period_type` | 訂閱週期類型 |
| `product_id` | 商品 ID |
| `quantity` | 數量 |
| `shipping_address` | 配送地址 |
| `started_at` | 開始時間 |
| `status` | 狀態 |
| `updated_at` | 更新時間 |
| `user_id` | 會員 ID |
| `vendor_id` | 廠商 ID |

### `product_translations`（商品翻譯）

| 欄位 | 欄位名稱 |
| --- | --- |
| `description` | 描述 |
| `flavor_notes` | 風味描述 |
| `id` | 資料 ID |
| `is_ai_translated` | 是否 AI 翻譯 |
| `lang` | 語言 |
| `origin` | 產地 |
| `processing_method` | 處理法 |
| `product_id` | 商品 ID |
| `review_status` | 審核狀態 |
| `roast_level` | 烘焙度 |
| `tags` | 標籤 |
| `title` | 標題 |
| `updated_at` | 更新時間 |

### `products`（商品）

| 欄位 | 欄位名稱 |
| --- | --- |
| `altitude` | 海拔 |
| `category_id` | 分類 ID |
| `content` | 內容 |
| `cost_price` | 成本價 |
| `created_at` | 建立時間 |
| `description` | 描述 |
| `flavor_notes` | 風味描述 |
| `id` | 資料 ID |
| `image_url` | 圖片網址 |
| `images` | 圖片列表 |
| `is_active` | 是否啟用 |
| `is_featured` | 是否精選 |
| `is_hidden` | 是否隱藏 |
| `member_price` | 會員價 |
| `name` | 名稱 |
| `og_description` | 社群分享描述 |
| `og_image` | 社群分享圖片 |
| `og_title` | 社群分享標題 |
| `origin` | 產地 |
| `price` | 價格 |
| `processing_method` | 處理法 |
| `published_at` | 發布時間 |
| `roast_date` | 烘焙日期 |
| `roast_level` | 烘焙度 |
| `sale_price` | 優惠價 |
| `seo_description` | SEO 描述 |
| `seo_keywords` | SEO 關鍵字 |
| `seo_title` | SEO 標題 |
| `sku` | SKU |
| `slug` | 網址代稱 |
| `source_url` | 來源網址 |
| `specifications` | 規格資料 |
| `stock` | 庫存 |
| `stock_quantity` | 庫存數量 |
| `store_location_id` | 門市 ID |
| `summary` | 摘要 |
| `tags` | 標籤 |
| `unpublished_at` | 下架時間 |
| `updated_at` | 更新時間 |
| `variety` | 品種 |
| `vendor_id` | 廠商 ID |
| `weight_grams` | 重量克數 |

### `purchase_records`（購買紀錄）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `order_id` | 訂單 ID |
| `payment_method` | 付款方式 |
| `product_id` | 商品 ID |
| `quantity` | 數量 |
| `shipping_address` | 配送地址 |
| `status` | 狀態 |
| `total_price` | 總價 |
| `unit_price` | 單價 |
| `user_id` | 會員 ID |

### `tbl_mn5uxems`（購物車）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `product_id` | 商品 ID |
| `quantity` | 數量 |
| `updated_at` | 更新時間 |
| `user_id` | 會員 ID |

## 訂單與金流

### `newebpay_mpg_orders`（藍新幕前支付紀錄）

| 欄位 | 欄位名稱 |
| --- | --- |
| `amount` | 金額 |
| `card_no` | 卡號末碼 |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `merchant_order_no` | 商店訂單編號 |
| `order_id` | 訂單 ID |
| `paid_at` | 付款時間 |
| `payer_email` | 付款人 Email |
| `raw_response` | 原始回應 |
| `respond_code` | 回應碼 |
| `status` | 狀態 |
| `trade_info` | 交易資訊 |
| `trade_no` | 交易序號 |
| `trade_sha` | 交易 SHA |
| `updated_at` | 更新時間 |

### `order_events`（訂單事件）

| 欄位 | 欄位名稱 |
| --- | --- |
| `actor_name` | 操作者名稱 |
| `actor_type` | 操作者類型 |
| `created_at` | 建立時間 |
| `description` | 描述 |
| `event_type` | 事件類型 |
| `id` | 資料 ID |
| `order_id` | 訂單 ID |

### `order_items`（訂單品項）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `order_id` | 訂單 ID |
| `price` | 價格 |
| `product_id` | 商品 ID |
| `product_name` | 商品名稱 |
| `quantity` | 數量 |
| `total` | 總金額 |

### `order_messages`（訂單留言）

| 欄位 | 欄位名稱 |
| --- | --- |
| `author_email` | 作者 Email |
| `author_name` | 作者名稱 |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `is_starred` | 是否標記星號 |
| `message` | 訊息內容 |
| `order_id` | 訂單 ID |

### `orders`（商店訂單）

| 欄位 | 欄位名稱 |
| --- | --- |
| `channel` | 來源通路 |
| `communication_notes` | 溝通備註 |
| `company_name` | 公司名稱 |
| `company_tax_id` | 公司統編 |
| `completed_at` | 完成時間 |
| `created_at` | 建立時間 |
| `currency` | 幣別 |
| `customer_account` | 顧客帳號 |
| `customer_email` | 顧客 Email |
| `customer_name` | 顧客姓名 |
| `customer_phone` | 顧客電話 |
| `delivery_status` | 配送狀態 |
| `discount_code` | 折扣碼 |
| `id` | 資料 ID |
| `member_id` | 會員 ID |
| `merchant_order_no` | 商店訂單編號 |
| `newebpay_auth_code` | 藍新授權碼 |
| `newebpay_card_no` | 藍新卡號末碼 |
| `newebpay_paid_at` | 藍新付款時間 |
| `newebpay_payment_type` | 藍新付款類型 |
| `newebpay_respond_code` | 藍新回應碼 |
| `newebpay_status` | 藍新狀態 |
| `newebpay_trade_no` | 藍新交易序號 |
| `notes` | 備註 |
| `order_number` | 訂單編號 |
| `payment_method` | 付款方式 |
| `payment_status` | 付款狀態 |
| `points_discount` | 點數折抵金額 |
| `recipient_name` | 收件人姓名 |
| `recipient_phone` | 收件人電話 |
| `recurring_cycle_no` | 訂閱扣款期次 |
| `shipping` | 運費 |
| `shipping_address` | 配送地址 |
| `shipping_city` | 配送縣市 |
| `shipping_country` | 配送國家 |
| `shipping_district` | 配送行政區 |
| `shipping_line1` | 配送地址第一行 |
| `shipping_method` | 配送方式 |
| `shipping_notes` | 配送備註 |
| `shipping_postal_code` | 配送郵遞區號 |
| `shipping_status` | 物流狀態 |
| `source` | 來源 |
| `status` | 狀態 |
| `subscribed_order_notifications` | 是否訂閱訂單通知 |
| `subscription_id` | 訂閱 ID |
| `subtotal` | 小計 |
| `subtotal_amount` | 小計金額 |
| `tax` | 稅額 |
| `total` | 總金額 |
| `total_amount` | 總金額 |
| `tracking_number` | 物流追蹤碼 |
| `updated_at` | 更新時間 |
| `user_id` | 會員 ID |

### `payments`（付款紀錄）

| 欄位 | 欄位名稱 |
| --- | --- |
| `amount` | 金額 |
| `created_at` | 建立時間 |
| `gateway_name` | 金流名稱 |
| `id` | 資料 ID |
| `metadata` | 中繼資料 |
| `method` | 方式 |
| `order_id` | 訂單 ID |
| `paid_at` | 付款時間 |
| `provider_status` | 金流狀態 |
| `status` | 狀態 |
| `transaction_id` | 交易 ID |

## 發票物流與售後

### `after_sales_requests`（售後申請）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `message` | 訊息內容 |
| `order_id` | 訂單 ID |
| `request_type` | 申請類型 |
| `status` | 狀態 |
| `updated_at` | 更新時間 |
| `user_id` | 會員 ID |

### `invoices`（電子發票）

| 欄位 | 欄位名稱 |
| --- | --- |
| `buyer_email` | 買受人 Email |
| `buyer_identifier` | 買受人統編 |
| `buyer_name` | 買受人姓名 |
| `carrier_number` | 載具號碼 |
| `carrier_type` | 載具類型 |
| `created_at` | 建立時間 |
| `error_message` | 錯誤訊息 |
| `ezpay_raw_request` | ezPay 原始請求 |
| `ezpay_raw_response` | ezPay 原始回應 |
| `ezpay_trade_no` | ezPay 交易序號 |
| `id` | 資料 ID |
| `invoice_date` | 發票開立時間 |
| `invoice_number` | 發票號碼 |
| `invoice_random_number` | 發票隨機碼 |
| `invoice_status` | 發票狀態 |
| `love_code` | 愛心碼 |
| `order_id` | 訂單 ID |
| `sales_amount` | 銷售額 |
| `tax_amount` | 稅額 |
| `tax_type` | 課稅別 |
| `total_amount` | 總金額 |
| `updated_at` | 更新時間 |
| `user_id` | 會員 ID |

### `logistics_shipments`（物流出貨單）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `error_message` | 錯誤訊息 |
| `ezpay_raw_request` | ezPay 原始請求 |
| `ezpay_raw_response` | ezPay 原始回應 |
| `id` | 資料 ID |
| `lgs_no` | 物流單號 |
| `logistics_status` | 物流狀態 |
| `logistics_type` | 物流類型 |
| `merchant_order_no` | 商店訂單編號 |
| `order_id` | 訂單 ID |
| `recipient_email` | 收件人 Email |
| `recipient_name` | 收件人姓名 |
| `recipient_phone` | 收件人電話 |
| `ship_type` | 出貨類型 |
| `store_addr` | 超商門市地址 |
| `store_id` | 超商門市代號 |
| `store_name` | 超商門市名稱 |
| `store_print_no` | 門市列印編號 |
| `store_tel` | 超商門市電話 |
| `total_amount` | 總金額 |
| `trade_type` | 交易類型 |
| `updated_at` | 更新時間 |
| `user_id` | 會員 ID |

### `room_reviews`（住宿評價）

| 欄位 | 欄位名稱 |
| --- | --- |
| `booking_id` | 訂房 ID |
| `comment` | 評論內容 |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `rating` | 評分 |
| `room_id` | 房型 ID |
| `status` | 狀態 |
| `updated_at` | 更新時間 |
| `user_id` | 會員 ID |

## 住宿訂房

### `hotels`（旅宿）

| 欄位 | 欄位名稱 |
| --- | --- |
| `address` | 地址 |
| `checkin_time` | 入住時間 |
| `checkout_time` | 退房時間 |
| `city` | 縣市 |
| `created_at` | 建立時間 |
| `deposit_amount` | 押金 |
| `description` | 描述 |
| `email` | 電子郵件 |
| `facebook` | Facebook |
| `id` | 資料 ID |
| `image_url` | 圖片網址 |
| `images` | 圖片列表 |
| `is_active` | 是否啟用 |
| `line_id` | LINE ID |
| `name` | 名稱 |
| `pet_friendly` | 是否寵物友善 |
| `phone` | 電話 |
| `registration_number` | 旅宿登記證號 |
| `star_rating` | 星等 |
| `updated_at` | 更新時間 |
| `vendor_id` | 廠商 ID |

### `room_inventory_items`（房務備品）

| 欄位 | 欄位名稱 |
| --- | --- |
| `category` | 分類 |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `name` | 名稱 |
| `notes` | 備註 |
| `quantity` | 數量 |
| `room_id` | 房型 ID |
| `status` | 狀態 |
| `updated_at` | 更新時間 |

### `room_translations`（住宿翻譯）

| 欄位 | 欄位名稱 |
| --- | --- |
| `amenities` | 設施 |
| `description` | 描述 |
| `id` | 資料 ID |
| `is_ai_translated` | 是否 AI 翻譯 |
| `lang` | 語言 |
| `location` | 地點 |
| `name` | 名稱 |
| `review_status` | 審核狀態 |
| `room_id` | 房型 ID |
| `updated_at` | 更新時間 |

### `tbl_bookings`（訂房紀錄）

| 欄位 | 欄位名稱 |
| --- | --- |
| `check_in_date` | 入住日期 |
| `check_out_date` | 退房日期 |
| `created_at` | 建立時間 |
| `guests` | 入住人數 |
| `id` | 資料 ID |
| `payment_method` | 付款方式 |
| `payment_status` | 付款狀態 |
| `points_discount` | 點數折抵金額 |
| `room_id` | 房型 ID |
| `special_requests` | 特殊需求 |
| `status` | 狀態 |
| `subtotal_price` | 小計金額 |
| `total_price` | 總價 |
| `updated_at` | 更新時間 |
| `user_id` | 會員 ID |

### `tbl_room_day_prices`（房型每日價格）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `day_of_week` | 星期 |
| `id` | 資料 ID |
| `price` | 價格 |
| `room_id` | 房型 ID |
| `updated_at` | 更新時間 |

### `tbl_rooms`（房型）

| 欄位 | 欄位名稱 |
| --- | --- |
| `amenities` | 設施 |
| `capacity` | 可入住人數 |
| `created_at` | 建立時間 |
| `description` | 描述 |
| `floor` | 樓層 |
| `hotel_id` | 旅宿 ID |
| `id` | 資料 ID |
| `image_url` | 圖片網址 |
| `images` | 圖片列表 |
| `is_available` | 是否可預訂 |
| `location` | 地點 |
| `min_capacity` | 最低入住人數 |
| `name` | 名稱 |
| `price_per_night` | 每晚價格 |
| `room_type` | 房型類型 |
| `updated_at` | 更新時間 |
| `vendor_id` | 廠商 ID |
| `weekend_price` | 週末價格 |

## 廠商與門市

### `store_daily_sales`（門市每日營收）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `note` | 備註 |
| `recorded_by` | 紀錄者 |
| `revenue_amount` | 營收金額 |
| `sales_date` | 銷售日期 |
| `store_location_id` | 門市 ID |
| `updated_at` | 更新時間 |

### `store_inventory_movements`（門市庫存異動）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `created_by` | 建立者 |
| `id` | 資料 ID |
| `invoice_no` | 發票號碼 |
| `movement_type` | 異動類型 |
| `note` | 備註 |
| `product_id` | 商品 ID |
| `purchase_date` | 進貨日期 |
| `quantity` | 數量 |
| `store_location_id` | 門市 ID |
| `supplier_name` | 供應商名稱 |
| `unit_cost` | 單位成本 |
| `updated_at` | 更新時間 |

### `store_location_managers`（門市管理員）

| 欄位 | 欄位名稱 |
| --- | --- |
| `can_manage_inventory` | 可管理庫存 |
| `can_manage_points` | 可管理點數 |
| `can_manage_products` | 可管理商品 |
| `can_manage_sales` | 可管理營收 |
| `can_manage_store_info` | 可管理門市資料 |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `is_active` | 是否啟用 |
| `role` | 角色 |
| `store_location_id` | 門市 ID |
| `updated_at` | 更新時間 |
| `user_id` | 會員 ID |

### `store_locations`（門市地點）

| 欄位 | 欄位名稱 |
| --- | --- |
| `address` | 地址 |
| `city` | 縣市 |
| `created_at` | 建立時間 |
| `district` | 行政區 |
| `hours` | 營業時間 |
| `id` | 資料 ID |
| `image_url` | 圖片網址 |
| `is_active` | 是否啟用 |
| `manager_notes` | 管理備註 |
| `map_url` | 地圖網址 |
| `name` | 名稱 |
| `name_en` | 英文名稱 |
| `phone` | 電話 |
| `slug` | 網址代稱 |
| `sort_order` | 排序 |
| `source_image_url` | 來源圖片網址 |
| `source_url` | 來源網址 |
| `updated_at` | 更新時間 |
| `vendor_id` | 廠商 ID |

### `store_point_redemptions`（門市點數折抵）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `created_by` | 建立者 |
| `discount_amount` | 折抵金額 |
| `id` | 資料 ID |
| `note` | 備註 |
| `points_used` | 使用點數 |
| `reference_id` | 關聯 ID |
| `reference_type` | 關聯類型 |
| `store_location_id` | 門市 ID |
| `updated_at` | 更新時間 |
| `used_at` | 使用時間 |
| `user_id` | 會員 ID |

### `stores`（門市）

| 欄位 | 欄位名稱 |
| --- | --- |
| `address` | 地址 |
| `city` | 縣市 |
| `created_at` | 建立時間 |
| `email` | 電子郵件 |
| `id` | 資料 ID |
| `images` | 圖片列表 |
| `is_active` | 是否啟用 |
| `location` | 地點 |
| `name` | 名稱 |
| `opening_hours` | 營業時間 |
| `phone` | 電話 |
| `updated_at` | 更新時間 |

### `vendor_staff`（廠商員工）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `email` | 電子郵件 |
| `id` | 資料 ID |
| `is_active` | 是否啟用 |
| `name` | 名稱 |
| `notes` | 備註 |
| `phone` | 電話 |
| `role` | 角色 |
| `updated_at` | 更新時間 |
| `vendor_id` | 廠商 ID |

### `vendors`（廠商）

| 欄位 | 欄位名稱 |
| --- | --- |
| `address` | 地址 |
| `contact_email` | 聯絡 Email |
| `contact_phone` | 聯絡電話 |
| `created_at` | 建立時間 |
| `description` | 描述 |
| `id` | 資料 ID |
| `is_active` | 是否啟用 |
| `logo_url` | Logo 網址 |
| `name` | 名稱 |
| `note` | 備註 |
| `updated_at` | 更新時間 |
| `user_id` | 會員 ID |
| `website` | 網站 |

## 點數

### `point_reward_rules`（點數獎勵規則）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `is_active` | 是否啟用 |
| `label` | 名稱 |
| `notes` | 備註 |
| `points_per_100` | 每 NT$100 回饋點數 |
| `source_type` | 來源類型 |
| `updated_at` | 更新時間 |

### `points`（點數交易）

| 欄位 | 欄位名稱 |
| --- | --- |
| `amount` | 金額 |
| `created_at` | 建立時間 |
| `description` | 描述 |
| `expires_at` | 到期時間 |
| `id` | 資料 ID |
| `reference_id` | 關聯 ID |
| `source_id` | 來源 ID |
| `source_type` | 來源類型 |
| `store_location_id` | 門市 ID |
| `transaction_type` | 點數交易類型 |
| `user_id` | 會員 ID |
| `vendor_id` | 廠商 ID |

## 內容網站設定

### `articles`（舊版文章）

| 欄位 | 欄位名稱 |
| --- | --- |
| `author_id` | 作者 ID |
| `content` | 內容 |
| `created_at` | 建立時間 |
| `excerpt` | 摘要 |
| `featured_image` | 精選圖片 |
| `id` | 資料 ID |
| `published_at` | 發布時間 |
| `slug` | 網址代稱 |
| `status` | 狀態 |
| `title` | 標題 |
| `updated_at` | 更新時間 |
| `views` | 瀏覽數 |

### `blog_post_translations`（文章翻譯）

| 欄位 | 欄位名稱 |
| --- | --- |
| `author_name` | 作者名稱 |
| `category` | 分類 |
| `content` | 內容 |
| `excerpt` | 摘要 |
| `id` | 資料 ID |
| `is_ai_translated` | 是否 AI 翻譯 |
| `lang` | 語言 |
| `post_id` | 文章 ID |
| `review_status` | 審核狀態 |
| `tags` | 標籤 |
| `title` | 標題 |
| `updated_at` | 更新時間 |

### `blog_posts`（部落格文章）

| 欄位 | 欄位名稱 |
| --- | --- |
| `author_name` | 作者名稱 |
| `category` | 分類 |
| `content` | 內容 |
| `cover_image_url` | 封面圖片網址 |
| `created_at` | 建立時間 |
| `excerpt` | 摘要 |
| `id` | 資料 ID |
| `meta_description` | SEO 描述 |
| `published_at` | 發布時間 |
| `slug` | 網址代稱 |
| `status` | 狀態 |
| `tags` | 標籤 |
| `title` | 標題 |
| `updated_at` | 更新時間 |
| `vendor_id` | 廠商 ID |

### `contact_inquiries`（聯絡表單）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `email` | 電子郵件 |
| `id` | 資料 ID |
| `message` | 訊息內容 |
| `name` | 名稱 |
| `phone` | 電話 |
| `status` | 狀態 |
| `subject` | 主旨 |

### `faqs`（常見問題）

| 欄位 | 欄位名稱 |
| --- | --- |
| `answer` | 答案 |
| `category` | 分類 |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `is_active` | 是否啟用 |
| `is_published` | 是否發布 |
| `question` | 問題 |
| `sort_order` | 排序 |
| `updated_at` | 更新時間 |

### `homepage_sections`（首頁區塊）

| 欄位 | 欄位名稱 |
| --- | --- |
| `content` | 內容 |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `is_active` | 是否啟用 |
| `section_type` | 區塊類型 |
| `sort_order` | 排序 |
| `title` | 標題 |
| `updated_at` | 更新時間 |

### `seo_settings`（SEO 設定）

| 欄位 | 欄位名稱 |
| --- | --- |
| `canonical_url` | Canonical 網址 |
| `created_at` | 建立時間 |
| `description` | 描述 |
| `id` | 資料 ID |
| `keywords` | 關鍵字 |
| `og_image` | 社群分享圖片 |
| `page_path` | 頁面路徑 |
| `robots` | Robots 設定 |
| `schema_markup` | 結構化資料 |
| `title` | 標題 |
| `updated_at` | 更新時間 |

### `site_content_blocks`（網站內容區塊）

| 欄位 | 欄位名稱 |
| --- | --- |
| `area` | 區域 |
| `block_key` | 區塊鍵 |
| `block_type` | 區塊類型 |
| `body_en` | 英文內文 |
| `body_ja` | 日文內文 |
| `body_ko` | 韓文內文 |
| `body_zh` | 中文內文 |
| `created_at` | 建立時間 |
| `cta_label_en` | 英文 CTA 文字 |
| `cta_label_ja` | 日文 CTA 文字 |
| `cta_label_ko` | 韓文 CTA 文字 |
| `cta_label_zh` | 中文 CTA 文字 |
| `display_order` | 顯示排序 |
| `icon_name` | 圖示名稱 |
| `id` | 資料 ID |
| `image_url` | 圖片網址 |
| `is_active` | 是否啟用 |
| `link_url` | 連結網址 |
| `metadata` | 中繼資料 |
| `parent_block_key` | 上層區塊鍵 |
| `placement` | 放置位置 |
| `subtitle_en` | 英文副標題 |
| `subtitle_ja` | 日文副標題 |
| `subtitle_ko` | 韓文副標題 |
| `subtitle_zh` | 中文副標題 |
| `title_en` | 英文標題 |
| `title_ja` | 日文標題 |
| `title_ko` | 韓文標題 |
| `title_zh` | 中文標題 |
| `updated_at` | 更新時間 |

### `site_settings`（網站設定）

| 欄位 | 欄位名稱 |
| --- | --- |
| `ai_site_summary` | AI 網站摘要 |
| `alert_notification_emails` | 警示通知收件 Email |
| `booking_notification_emails` | 訂房通知收件 Email |
| `company_name` | 公司名稱 |
| `company_no` | 公司統編 |
| `contact_email` | 聯絡 Email |
| `contact_phone` | 聯絡電話 |
| `created_at` | 建立時間 |
| `ga_measurement_id` | GA 追蹤 ID |
| `headquarters_address` | 總部地址 |
| `id` | 資料 ID |
| `is_active` | 是否啟用 |
| `member_notification_emails` | 會員通知收件 Email |
| `meta_keywords` | Meta 關鍵字 |
| `og_image_url` | 社群分享圖片網址 |
| `order_notification_emails` | 訂單通知收件 Email |
| `payment_failed_notification_emails` | 付款失敗通知 Email |
| `refund_notification_emails` | 退款通知收件 Email |
| `setting_key` | 設定鍵 |
| `setting_value` | 設定值 |
| `site_description` | 網站描述 |
| `site_icon_url` | 網站圖示 |
| `site_name` | 網站名稱 |
| `site_slogan` | 網站標語 |
| `social_facebook` | Facebook 連結 |
| `social_instagram` | Instagram 連結 |
| `social_line` | LINE 連結 |
| `social_tiktok` | TikTok 連結 |
| `social_twitter` | Twitter 連結 |
| `social_x` | X 連結 |
| `social_youtube` | YouTube 連結 |
| `support_notification_emails` | 客服通知收件 Email |
| `system_notification_emails` | 系統通知收件 Email |
| `theme_color` | 主題色 |
| `updated_at` | 更新時間 |

### `social_accounts`（社群帳號）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `is_active` | 是否啟用 |
| `platform` | 平台 |
| `sort_order` | 排序 |
| `updated_at` | 更新時間 |
| `url` | 網址 |
| `username` | 帳號 |

### `static_page_translations`（靜態頁翻譯）

| 欄位 | 欄位名稱 |
| --- | --- |
| `content` | 內容 |
| `id` | 資料 ID |
| `is_ai_translated` | 是否 AI 翻譯 |
| `lang` | 語言 |
| `meta_description` | SEO 描述 |
| `page_id` | 頁面 ID |
| `review_status` | 審核狀態 |
| `title` | 標題 |
| `updated_at` | 更新時間 |

### `static_pages`（靜態頁面）

| 欄位 | 欄位名稱 |
| --- | --- |
| `content` | 內容 |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `is_published` | 是否發布 |
| `meta_description` | SEO 描述 |
| `sections` | 頁面區塊 |
| `slug` | 網址代稱 |
| `title` | 標題 |
| `updated_at` | 更新時間 |
| `updated_by` | 更新者 |

### `theme_banners`（主題橫幅）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `display_order` | 顯示排序 |
| `ends_at` | 結束顯示時間 |
| `id` | 資料 ID |
| `image_url` | 圖片網址 |
| `is_active` | 是否啟用 |
| `link_label_en` | 英文連結文字 |
| `link_label_ja` | 日文連結文字 |
| `link_label_ko` | 韓文連結文字 |
| `link_label_zh` | 中文連結文字 |
| `link_url` | 連結網址 |
| `starts_at` | 開始顯示時間 |
| `subtitle_en` | 英文副標題 |
| `subtitle_ja` | 日文副標題 |
| `subtitle_ko` | 韓文副標題 |
| `subtitle_zh` | 中文副標題 |
| `theme_key` | 主題鍵 |
| `title_en` | 英文標題 |
| `title_ja` | 日文標題 |
| `title_ko` | 韓文標題 |
| `title_zh` | 中文標題 |
| `updated_at` | 更新時間 |

## 多語翻譯

### `content_translations`（內容翻譯）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `created_by` | 建立者 |
| `entity_id` | 資料 ID |
| `entity_type` | 資料類型 |
| `field_key` | 欄位鍵 |
| `id` | 資料 ID |
| `is_manual` | 是否手動 |
| `source_hash` | 來源雜湊 |
| `source_text` | 來源文字 |
| `target_lang` | 目標語言 |
| `translated_text` | 翻譯文字 |
| `updated_at` | 更新時間 |

### `languages`（語言）

| 欄位 | 欄位名稱 |
| --- | --- |
| `code` | 代碼 |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `is_active` | 是否啟用 |
| `is_default` | 是否預設 |
| `name` | 名稱 |

### `translation_cache`（翻譯快取）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `provider` | 服務提供者 |
| `source_hash` | 來源雜湊 |
| `source_lang` | 來源語言 |
| `source_text` | 來源文字 |
| `target_lang` | 目標語言 |
| `translated_text` | 翻譯文字 |

### `translation_glossary_terms`（翻譯詞彙表）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `is_active` | 是否啟用 |
| `source_lang` | 來源語言 |
| `source_text` | 來源文字 |
| `target_lang` | 目標語言 |
| `target_text` | 目標文字 |
| `updated_at` | 更新時間 |

### `translation_jobs`（翻譯工作）

| 欄位 | 欄位名稱 |
| --- | --- |
| `attempt_count` | 嘗試次數 |
| `created_at` | 建立時間 |
| `entity_id` | 資料 ID |
| `entity_type` | 資料類型 |
| `id` | 資料 ID |
| `last_error` | 最後錯誤 |
| `source_hash` | 來源雜湊 |
| `source_lang` | 來源語言 |
| `source_payload` | 來源資料 |
| `status` | 狀態 |
| `target_langs` | 目標語言列表 |
| `updated_at` | 更新時間 |

### `translations`（一般翻譯字串）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `error_message` | 錯誤訊息 |
| `id` | 資料 ID |
| `key` | 鍵值 |
| `language_code` | 語言代碼 |
| `source_lang` | 來源語言 |
| `source_text` | 來源文字 |
| `status` | 狀態 |
| `target_lang` | 目標語言 |
| `translated_text` | 翻譯文字 |
| `updated_at` | 更新時間 |
| `user_id` | 會員 ID |
| `value` | 值 |

## AI 與客服

### `ai_chat_logs`（AI 聊天紀錄）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `member_id` | 會員 ID |
| `message` | 訊息內容 |
| `response` | 回覆內容 |
| `session_id` | 會話 ID |
| `tokens_used` | 使用 Token 數 |

### `ai_learning_logs`（AI 學習紀錄）

| 欄位 | 欄位名稱 |
| --- | --- |
| `answer` | 答案 |
| `confidence_score` | 信心分數 |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `knowledge_id` | 知識庫 ID |
| `question` | 問題 |
| `was_helpful` | 是否有幫助 |

### `ai_support_documents`（AI 客服向量文件）

| 欄位 | 欄位名稱 |
| --- | --- |
| `content` | 內容 |
| `content_hash` | 內容雜湊 |
| `created_at` | 建立時間 |
| `embedded_at` | 向量建立時間 |
| `embedding` | 向量資料 |
| `embedding_model` | 向量模型 |
| `id` | 資料 ID |
| `is_active` | 是否啟用 |
| `metadata` | 中繼資料 |
| `source_id` | 來源 ID |
| `source_type` | 來源類型 |
| `title` | 標題 |
| `updated_at` | 更新時間 |
| `url_path` | 頁面路徑 |

### `ai_usage_stats`（AI 使用統計）

| 欄位 | 欄位名稱 |
| --- | --- |
| `avg_response_time` | 平均回應時間 |
| `created_at` | 建立時間 |
| `date` | 日期 |
| `id` | 資料 ID |
| `total_requests` | 總請求數 |
| `total_tokens` | 總 Token 數 |

### `chat_feedback`（客服回饋）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `feedback_text` | 回饋文字 |
| `id` | 資料 ID |
| `message_id` | 訊息 ID |
| `rating` | 評分 |
| `session_id` | 會話 ID |

### `chat_messages`（客服訊息）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `message` | 訊息內容 |
| `sender_type` | 發送者類型 |
| `session_id` | 會話 ID |

### `chat_sessions`（客服會話）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `status` | 狀態 |
| `updated_at` | 更新時間 |
| `visitor_email` | 訪客 Email |
| `visitor_name` | 訪客姓名 |

### `coffee_quiz_question_options`（咖啡測驗選項）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `display_order` | 顯示排序 |
| `id` | 資料 ID |
| `option_key` | 選項代號 |
| `option_text` | 選項文字 |
| `question_id` | 題目 ID |
| `score` | 分數 |
| `updated_at` | 更新時間 |

### `coffee_quiz_questions`（咖啡測驗題目）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `display_order` | 顯示排序 |
| `id` | 資料 ID |
| `image_url` | 圖片網址 |
| `is_active` | 是否啟用 |
| `question_text` | 題目文字 |
| `updated_at` | 更新時間 |

### `coffee_quiz_submissions`（咖啡測驗送出紀錄）

| 欄位 | 欄位名稱 |
| --- | --- |
| `acidity_score` | 酸質分數 |
| `adventure_score` | 冒險分數 |
| `agreement` | 同意條款 |
| `answers` | 作答內容 |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `member_email` | 會員 Email |
| `member_name` | 會員姓名 |
| `member_phone` | 會員電話 |
| `result_type` | 結果類型 |
| `roast_score` | 烘焙分數 |
| `user_id` | 會員 ID |

### `knowledge_base`（知識庫）

| 欄位 | 欄位名稱 |
| --- | --- |
| `answer` | 答案 |
| `category_id` | 分類 ID |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `is_active` | 是否啟用 |
| `keywords` | 關鍵字 |
| `priority` | 優先順序 |
| `question` | 問題 |
| `updated_at` | 更新時間 |
| `usage_count` | 使用次數 |

### `tbl_mn5wn257`（AI 對話訊息）

| 欄位 | 欄位名稱 |
| --- | --- |
| `content` | 內容 |
| `created_at` | 建立時間 |
| `id` | 資料 ID |
| `role` | 角色 |
| `session_id` | 會話 ID |
| `user_id` | 會員 ID |

## 旅遊其他

### `itinerary_plans`（AI 行程規劃）

| 欄位 | 欄位名稱 |
| --- | --- |
| `created_at` | 建立時間 |
| `destination` | 目的地 |
| `end_date` | 結束日期 |
| `id` | 資料 ID |
| `interests` | 興趣偏好 |
| `notes` | 備註 |
| `plan_data` | 行程資料 |
| `start_date` | 開始日期 |
| `status` | 狀態 |
| `title` | 標題 |
| `updated_at` | 更新時間 |
| `user_id` | 會員 ID |

### `properties`（資產物件）

| 欄位 | 欄位名稱 |
| --- | --- |
| `available_shares` | 可售份數 |
| `created_at` | 建立時間 |
| `description` | 描述 |
| `id` | 資料 ID |
| `image_url` | 圖片網址 |
| `location` | 地點 |
| `name` | 名稱 |
| `price_per_share` | 每份價格 |
| `status` | 狀態 |
| `total_shares` | 總份數 |

### `travel_passport`（旅遊護照）

| 欄位 | 欄位名稱 |
| --- | --- |
| `category` | 分類 |
| `created_at` | 建立時間 |
| `destination` | 目的地 |
| `id` | 資料 ID |
| `itinerary_plan_id` | 行程規劃 ID |
| `notes` | 備註 |
| `place_name` | 地點名稱 |
| `source` | 來源 |
| `user_id` | 會員 ID |
| `visited_date` | 造訪日期 |

## 其他

### `tbl_management_dashboard`（管理儀表板統計）

| 欄位 | 欄位名稱 |
| --- | --- |
| `id` | 資料 ID |
| `stat_key` | 統計鍵 |
| `stat_value` | 統計值 |
| `updated_at` | 更新時間 |

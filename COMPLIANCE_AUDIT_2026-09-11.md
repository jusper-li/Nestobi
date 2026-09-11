# Nestobi 串接規範與管理端同步驗證

驗證日期：2026-09-11  
範圍：NDNF 幕前支付、NDNP 信用卡定期定額、NDNS 物流，以及前台結帳、Supabase Edge Functions、管理端資料同步。

## 結論

目前不能判定「全部按照規範串接完成」。一般付款的主要欄位與回呼驗簽已具備，定期定額大致具備，但物流回呼沒有驗證 `HashData_`，實際前台 `/cart` 也沒有收集完整的物流與發票資料。生產資料目前有 6 筆已付款訂單，但 `invoices` 與 `logistics_shipments` 都是 0 筆，因此管理端無法提出發票與物流已同步的證據。

## 對照結果

| 項目 | 結果 | 證據與風險 |
|---|---|---|
| NDNF 一般信用卡/幕前支付 | 部分通過 | `newebpay-mpg-payment` 使用 Version 2.3；`newebpay-mpg-webhook` 有驗證 TradeSha 與金額。尚未以沙盒完成一筆完整交易，因此不能宣告交易成功閉環。 |
| NDNP 定期定額 | 部分通過 | `newebpay-period-payment` 使用 Version 1.5、MerOrderNo、PeriodAmt、PeriodType、PeriodPoint、NotifyURL、ReturnURL。未明確阻擋 `PeriodAmt <= 0`，商品描述也未限制手冊要求的字元集合，需補輸入驗證。 |
| NDNS 物流 | 未通過 | 建立請求有 `UID_`、`EncryptData_`、`HashData_`、`Version_`、`RespondType_`；但 `decodeEzpayLogisticsCallback` 只解密 `EncryptData`，沒有比對回呼 `HashData_`，而 `ezpay-logistics-notify` 直接使用解密結果更新資料。這不符合回呼完整性驗證要求。 |
| 發票 | 無法依本次三份手冊認證 | 專案有 ezPay 發票函式與管理端操作，但提供的手冊沒有發票 API 規格；需以 ezPay 發票手冊逐欄位對照。 |
| 前台結帳 | 未通過完整業務閉環 | 實際 `/cart` 路由使用 `src/pages/shop/Cart.tsx`，只送姓名、電話、地址、Email；沒有發票類型/統編/載具/捐贈碼、物流方式、門市代號等欄位。雖然 `src/pages/Checkout.tsx` 有發票欄位，但目前不是 `/cart` 的實際路由。 |
| 管理端同步 | 未通過 | 生產 Supabase 專案 `qthciyizquumeufrujyp` 的查詢結果：`orders=14`、已付款 6 筆、`invoices=0`、`logistics_shipments=0`。函式皆為 ACTIVE，但沒有成功同步資料可核對。 |
| 退款 | 未通過 | 已部署 `newebpay-order-refund`，但實際退款請求收到 NewebPay `Access Denied`；退款紀錄為 failed，訂單仍未退款。需由 NewebPay/主機網路/商店環境確認來源與商店設定。 |
| Vendor 管理端 | 未完成 | superadmin 帳號沒有 vendor_id；實際 vendor 頁面需要獨立廠商帳號，現有測試憑證不足以驗證廠商訂單、退款與物流操作。 |

## 已執行檢查

- `npm run build` 通過，包含 mojibake 檢查與 Vite production build。
- 生產 Supabase Edge Functions 清單確認付款、定期定額、發票、物流、退款函式均為 ACTIVE。
- 查詢生產資料庫的訂單、付款、發票、物流與退款狀態；沒有送出新的扣款、退款、發票開立或出貨請求。

## 必須修正後再驗收

1. 在 NDNS 物流回呼加入 `HashData_` 驗證，驗證失敗時不得更新訂單或物流狀態。
2. 將實際 `/cart` 結帳接上完整物流與發票欄位，並在後端再次驗證必要欄位。
3. 對 NDNP 加上 `PeriodAmt > 0` 與商品描述字元限制。
4. 提供 sandbox 商店設定、可登入的 vendor 測試帳號，完成一筆「付款 → 回呼 → 發票 → 物流 → 管理端/會員端」測試，再核對資料庫與畫面狀態。
5. 將退款 `Access Denied` 的時間、MerchantOrderNo 與 NewebPay reference 提供給 NewebPay 查明；在此之前不可視為退款串接通過。

## 本次修正進度（2026-09-11）

- 已在工作區加入 NDNS `HashData_` 驗簽；尚未部署至生產環境。
- 已加入 NDNP 金額與商品描述驗證；尚未部署至生產環境。
- 已將實際 `/cart` 的發票與宅配／超商欄位傳入訂單快照，並在 Edge Function 端再次驗證；尚未部署至生產環境。
- `npm run build` 與 `npm run typecheck` 均通過。部署後仍需使用 sandbox 完成端到端交易驗收。
- 退款錯誤處理已改善：`Access Denied` 會轉成可讀的設定／白名單提示，且退款失敗時不會關閉售後申請；退款成功後才會標記為已處理。
- 以上前端已部署至 Netlify `nestobi.com`；後端已部署至 Supabase，物流回呼版本 5、一般付款版本 13、訪客結帳版本 3、定期定額版本 14、退款版本 11。
- 退款函式現在只接受官方 `core.newebpay.com`／`ccore.newebpay.com` 的 CreditCard/Close 路徑，並在回應中記錄端點；`Access Denied` 仍需由 NewebPay 處理來源 IP 或商店環境設定。

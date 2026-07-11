# ezPay 電子發票測試清單

以下情境建議在 Supabase staging 與 ezPay sandbox 先完成驗證，再切 production。

## 1. 個人發票開立成功
- 條件：`invoice_type = personal`
- 必填：`buyer_email`
- 預期：
  - `invoices.invoice_status = issued`
  - 產生發票號碼與隨機碼
  - `ezpay_raw_response` 有完整回應

## 2. 公司戶統編發票開立成功
- 條件：`invoice_type = company`
- 必填：`buyer_email`、`buyer_identifier`
- 預期：
  - `invoices.invoice_status = issued`
  - `buyer_identifier` 有值

## 3. 手機條碼載具發票開立成功
- 條件：`invoice_type = mobile_carrier`
- 必填：`buyer_email`、`carrier_number`
- 預期：
  - `invoices.invoice_status = issued`
  - `carrier_type` 與 `carrier_number` 有值

## 4. 捐贈發票開立成功
- 條件：`invoice_type = donation`
- 必填：`buyer_email`、`love_code`
- 預期：
  - `invoices.invoice_status = issued`
  - `love_code` 有值

## 5. 付款成功但開票失敗
- 條件：ezPay API 回傳失敗或逾時
- 預期：
  - 訂單仍維持 `paid`
  - `invoices.invoice_status = failed`
  - `error_message` 有值
  - `ezpay_raw_response` 有完整回應

## 6. 重複呼叫同一筆 order
- 條件：同一筆 `order_id` 重複呼叫 `ezpay-invoice-create`
- 預期：
  - 不會重複開立
  - 若已是 `issued`，直接回傳既有資料

## 7. 缺少 buyer_email
- 條件：結帳或後台開票資料未提供 email
- 預期：
  - 回傳錯誤
  - 不呼叫 ezPay API

## 8. 選公司戶但缺少統編
- 條件：`invoice_type = company` 但 `buyer_identifier` 空白
- 預期：
  - 回傳錯誤
  - 不呼叫 ezPay API

## 建議額外檢查
- `ezpay_raw_request` 是否完整保存
- `ezpay_raw_response` 是否完整保存
- 後台「重新補開發票」是否能重新補單
- 後台「作廢發票」「查詢發票狀態」按鈕是否能正常打到 Edge Function

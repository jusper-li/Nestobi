import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type EzPayLogisticsEnv = "sandbox" | "production";
export type EzPayLogisticsType = "B2C" | "C2C";
export type EzPayLogisticsShipType = "1" | "2" | "3" | "4";

export interface EzPayLogisticsInput {
  order_id: string;
  logistics_type?: string;
  ship_type?: string;
  trade_type?: string | number;
  store_id?: string;
  store_name?: string;
  store_tel?: string;
  store_addr?: string;
  recipient_name?: string;
  recipient_phone?: string;
  recipient_email?: string;
  notify_url?: string;
}

export interface EzPayLogisticsResult {
  success: boolean;
  logisticsStatus: "pending" | "created" | "failed" | "cancelled" | null;
  logisticsNo?: string | null;
  storePrintNo?: string | null;
  error?: string | null;
  existing?: boolean;
}

interface LogisticsShipmentRecord {
  id: string;
  order_id: string;
  user_id: string;
  logistics_status: "pending" | "created" | "failed" | "cancelled";
  logistics_type: string | null;
  ship_type: string | null;
  trade_type: number | null;
  merchant_order_no: string;
  lgs_no: string | null;
  store_print_no: string | null;
  store_id: string | null;
  store_name: string | null;
  store_tel: string | null;
  store_addr: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_email: string | null;
  total_amount: number | string | null;
  ezpay_raw_request: Record<string, unknown> | null;
  ezpay_raw_response: Record<string, unknown> | null;
  error_message: string | null;
}

interface OrderLogisticsRow {
  id: string;
  user_id: string;
  total_amount: number | string;
  payment_status?: string | null;
  payment_method?: string | null;
  merchant_order_no?: string | null;
  newebpay_trade_no?: string | null;
  shipping_address?: Record<string, unknown> | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  shipping_method?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  tracking_number?: string | null;
  shipping_country?: string | null;
  shipping_postal_code?: string | null;
  shipping_city?: string | null;
  shipping_district?: string | null;
  shipping_line1?: string | null;
  shipping_notes?: string | null;
  created_at?: string | null;
}

interface OrderItemRow {
  quantity: number | string;
  unit_price: number | string;
  product_name?: string | null;
  products?: { name?: string | null } | null;
}

interface AuthUserProfile {
  display_name?: string | null;
  phone?: string | null;
}

const EZPAY_ENDPOINTS: Record<EzPayLogisticsEnv, Record<"createShipment" | "queryShipment" | "printLabel", string>> = {
  sandbox: {
    createShipment: "https://cinv.ezpay.com.tw/Api/Logistic/createShipment",
    queryShipment: "https://cinv.ezpay.com.tw/Api/Logistic/queryShipment",
    printLabel: "https://cinv.ezpay.com.tw/Api/Logistic/printLabel",
  },
  production: {
    createShipment: "https://inv.ezpay.com.tw/Api/Logistic/createShipment",
    queryShipment: "https://inv.ezpay.com.tw/Api/Logistic/queryShipment",
    printLabel: "https://inv.ezpay.com.tw/Api/Logistic/printLabel",
  },
};

export function trimText(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizeEzpayLogisticsEnv(value: unknown): EzPayLogisticsEnv {
  return trimText(value).toLowerCase() === "production" ? "production" : "sandbox";
}

export function getMerchantOrderNo(orderId: string) {
  return `LOG${orderId.replaceAll("-", "").slice(0, 27)}`.slice(0, 30);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickRecordValue(source: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!source) return "";
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function parseNumeric(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value: number) {
  return String(Math.max(0, Math.round(value)));
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function parseResponseBody(text: string) {
  const parsed = safeJsonParse(text);
  if (parsed) return parsed;
  const params = new URLSearchParams(text);
  if ([...params.keys()].length > 0) return Object.fromEntries(params.entries());
  return { raw: text };
}

function pkcs7Pad(input: Uint8Array, blockSize = 16) {
  const remainder = input.length % blockSize;
  const paddingSize = remainder === 0 ? blockSize : blockSize - remainder;
  const padded = new Uint8Array(input.length + paddingSize);
  padded.set(input, 0);
  padded.fill(paddingSize, input.length);
  return padded;
}

async function aes256CbcEncryptToHex(text: string, key: string, iv: string) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "AES-CBC" },
    false,
    ["encrypt"],
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv: encoder.encode(iv) },
    cryptoKey,
    pkcs7Pad(encoder.encode(text)),
  );
  return Array.from(new Uint8Array(encrypted)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeLogisticsType(value: unknown, shippingAddress?: Record<string, unknown> | null): EzPayLogisticsType {
  const raw = trimText(value).toUpperCase();
  if (raw === "B2C" || raw === "C2C") return raw;

  const hint = [
    pickRecordValue(shippingAddress, ["logistics_type", "lgs_type", "shipping_type"]),
    pickRecordValue(shippingAddress, ["delivery_method", "shipping_method"]),
    pickRecordValue(shippingAddress, ["store_id", "store_name"]),
  ].join(" ").toLowerCase();

  if (hint.includes("c2c") || hint.includes("store") || hint.includes("family") || hint.includes("hilife") || hint.includes("ok")) {
    return "C2C";
  }
  return "B2C";
}

function normalizeShipType(value: unknown, shippingAddress?: Record<string, unknown> | null): EzPayLogisticsShipType {
  const raw = trimText(value);
  if (raw === "1" || raw === "2" || raw === "3" || raw === "4") return raw;

  const hint = [
    pickRecordValue(shippingAddress, ["ship_type"]),
    pickRecordValue(shippingAddress, ["store_name"]),
    pickRecordValue(shippingAddress, ["delivery_method"]),
  ].join(" ").toLowerCase();

  if (hint.includes("family")) return "2";
  if (hint.includes("hilife") || hint.includes("hi-life")) return "3";
  if (hint.includes("ok")) return "4";
  return "1";
}

function normalizeTradeType(value: unknown, paymentStatus?: string | null) {
  const raw = Number(value);
  if (raw === 1 || raw === 3) return raw;
  return trimText(paymentStatus).toLowerCase() === "paid" ? 3 : 1;
}

function getShippingSource(shippingAddress: Record<string, unknown> | null | undefined) {
  const nestedSources = [
    asRecord(shippingAddress?.logistics),
    asRecord(shippingAddress?.shipping),
    asRecord(shippingAddress?.store),
    asRecord(shippingAddress?.pickup),
    asRecord(shippingAddress?.invoice),
    shippingAddress ?? null,
  ];

  const source = nestedSources.find(Boolean) || null;
  return {
    logisticsType: pickRecordValue(source, ["logistics_type", "lgs_type", "shipping_type"]),
    shipType: pickRecordValue(source, ["ship_type"]),
    tradeType: pickRecordValue(source, ["trade_type"]),
    storeId: pickRecordValue(source, ["store_id", "storeID", "storeId"]),
    storeName: pickRecordValue(source, ["store_name", "storeName"]),
    storeTel: pickRecordValue(source, ["store_tel", "storeTel"]),
    storeAddr: pickRecordValue(source, ["store_addr", "storeAddr"]),
    recipientName: pickRecordValue(source, ["recipient_name", "buyer_name", "customer_name", "name"]),
    recipientPhone: pickRecordValue(source, ["recipient_phone", "buyer_phone", "customer_phone", "phone"]),
    recipientEmail: pickRecordValue(source, ["recipient_email", "buyer_email", "customer_email", "email"]),
  };
}

function buildItemDesc(items: OrderItemRow[]) {
  const names = items
    .map((item) => trimText(item.product_name || item.products?.name || "Item"))
    .filter(Boolean);
  const text = names.length > 0 ? Array.from(new Set(names)).join(", ") : "Item";
  return text.slice(0, 100);
}

function buildCommonPostData(params: {
  merchantOrderNo: string;
  logisticsType: EzPayLogisticsType;
  shipType: EzPayLogisticsShipType;
  tradeType: number;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  storeId: string;
  storeName: string;
  storeTel: string;
  storeAddr: string;
  totalAmount: number;
  itemDesc: string;
  notifyUrl: string;
}) {
  return {
    RespondType: "JSON",
    Version: "1.0",
    TimeStamp: String(Math.floor(Date.now() / 1000)),
    MerchantOrderNo: params.merchantOrderNo,
    LgsType: params.logisticsType,
    ShipType: params.shipType,
    TradeType: String(params.tradeType),
    UserName: params.recipientName,
    UserTel: params.recipientPhone,
    UserEmail: params.recipientEmail,
    StoreID: params.storeId,
    StoreName: params.storeName,
    StoreTel: params.storeTel,
    StoreAddr: params.storeAddr,
    Amt: formatAmount(params.totalAmount),
    NotifyURL: params.notifyUrl,
    ItemDesc: params.itemDesc,
  };
}

function buildQueryPostData(params: {
  merchantOrderNo: string;
  logisticsType: EzPayLogisticsType;
  shipType: EzPayLogisticsShipType;
  storeId: string;
  storePrintNo: string;
  lgsNo: string;
}) {
  return {
    RespondType: "JSON",
    Version: "1.0",
    TimeStamp: String(Math.floor(Date.now() / 1000)),
    MerchantOrderNo: params.merchantOrderNo,
    LgsType: params.logisticsType,
    ShipType: params.shipType,
    StoreID: params.storeId,
    StorePrintNo: params.storePrintNo,
    LgsNo: params.lgsNo,
  };
}

function buildPrintPostData(params: {
  merchantOrderNo: string;
  logisticsType: EzPayLogisticsType;
  shipType: EzPayLogisticsShipType;
  tradeType: number;
  storeId: string;
  storeName: string;
  storeTel: string;
  storeAddr: string;
  storePrintNo: string;
  lgsNo: string;
}) {
  return {
    RespondType: "JSON",
    Version: "1.0",
    TimeStamp: String(Math.floor(Date.now() / 1000)),
    MerchantOrderNo: params.merchantOrderNo,
    LgsType: params.logisticsType,
    ShipType: params.shipType,
    TradeType: String(params.tradeType),
    StoreID: params.storeId,
    StoreName: params.storeName,
    StoreTel: params.storeTel,
    StoreAddr: params.storeAddr,
    StorePrintNo: params.storePrintNo,
    LgsNo: params.lgsNo,
  };
}

function getEzpayLogisticsUrls(env: EzPayLogisticsEnv) {
  return EZPAY_ENDPOINTS[env];
}

function mergeLogisticsResponse(
  existing: Record<string, unknown> | null | undefined,
  key: string,
  value: unknown,
) {
  return {
    ...(existing || {}),
    [key]: value,
  };
}

export async function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

async function createAuthClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
}

export async function assertAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing authorization");

  const callerClient = await createAuthClient(authHeader);
  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user) throw new Error("Unauthorized");

  const adminClient = await createServiceClient();
  const { data: callerAuth, error: callerError } = await adminClient
    .from("tbl_user_auth")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (callerError) throw new Error(callerError.message);
  if (!callerAuth || (callerAuth.role !== "superadmin" && callerAuth.role !== "admin")) {
    throw new Error("Forbidden");
  }

  return { user, adminClient };
}

async function loadOrderContext(supabase: SupabaseClient, orderId: string) {
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id,user_id,total_amount,payment_status,payment_method,merchant_order_no,newebpay_trade_no,shipping_address,customer_name,customer_email,customer_phone,shipping_method,recipient_name,recipient_phone,tracking_number,shipping_country,shipping_postal_code,shipping_city,shipping_district,shipping_line1,shipping_notes,created_at",
    )
    .eq("id", orderId)
    .maybeSingle<OrderLogisticsRow>();

  if (error) throw new Error(error.message);
  if (!order) throw new Error("Order not found.");

  const [itemsResult, profileResult, authResult, logisticsResult] = await Promise.all([
    supabase.from("purchase_records").select("quantity,unit_price,product_name,products(name)").eq("order_id", order.id),
    supabase.from("tbl_mn5wgzh0").select("display_name,phone").eq("user_id", order.user_id).maybeSingle(),
    supabase.auth.admin.getUserById(order.user_id),
    supabase.from("logistics_shipments").select("*").eq("order_id", order.id).maybeSingle<LogisticsShipmentRecord>(),
  ]);

  if (itemsResult.error) throw new Error(itemsResult.error.message);
  if (profileResult.error) throw new Error(profileResult.error.message);
  if (authResult.error) throw new Error(authResult.error.message);
  if (logisticsResult.error && logisticsResult.error.code !== "42P01") throw new Error(logisticsResult.error.message);

  return {
    order,
    items: (itemsResult.data || []).map((item: OrderItemRow) => ({
      quantity: Math.max(1, Number(item.quantity || 1)),
      price: Math.max(0, Number(item.unit_price || 0)),
      name: trimText(item.product_name || item.products?.name || "Item"),
    })),
    profile: (profileResult.data as AuthUserProfile) || null,
    buyerEmailFallback: authResult.data.user?.email || "",
    existingLogistics: (logisticsResult.data as LogisticsShipmentRecord) || null,
  };
}

async function upsertLogisticsRecord(
  supabase: SupabaseClient,
  draft: Omit<LogisticsShipmentRecord, "id">,
) {
  const { error } = await supabase.from("logistics_shipments").upsert(draft, { onConflict: "order_id" });
  if (error) throw new Error(error.message);
}

async function updateLogisticsRecord(
  supabase: SupabaseClient,
  orderId: string,
  values: Partial<LogisticsShipmentRecord>,
) {
  const { error } = await supabase.from("logistics_shipments").update(values).eq("order_id", orderId);
  if (error) throw new Error(error.message);
}

async function updateOrderShipmentFields(
  supabase: SupabaseClient,
  orderId: string,
  values: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("orders")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
}

async function sendEzpayRequest(endpoint: string, requestBody: URLSearchParams) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: requestBody.toString(),
  });
  const rawText = await response.text();
  const parsed = parseResponseBody(rawText) as Record<string, unknown>;
  const result = (parsed.Result || parsed.result || parsed) as Record<string, unknown>;
  return { rawText, parsed, result, ok: response.ok, contentType: response.headers.get("content-type") || "text/plain" };
}

function getErrorMessage(parsed: Record<string, unknown>, fallback: string) {
  return trimText(parsed.Message || parsed.message || parsed.ErrMsg || parsed.errMsg || parsed.error_message) || fallback;
}

export async function createEzpayLogisticsForOrder(
  supabase: SupabaseClient,
  orderId: string,
  input: EzPayLogisticsInput = {},
  env = normalizeEzpayLogisticsEnv(Deno.env.get("EZPAY_LOGISTICS_ENV")),
): Promise<EzPayLogisticsResult> {
  const merchantId = trimText(Deno.env.get("EZPAY_LOGISTICS_MERCHANT_ID"));
  const hashKey = trimText(Deno.env.get("EZPAY_LOGISTICS_HASH_KEY"));
  const hashIV = trimText(Deno.env.get("EZPAY_LOGISTICS_HASH_IV"));
  if (!merchantId || !hashKey || !hashIV) throw new Error("ezPay logistics credentials are not configured.");

  const { order, items, profile, existingLogistics, buyerEmailFallback } = await loadOrderContext(supabase, orderId);
  if (trimText(order.payment_status).toLowerCase() !== "paid") throw new Error("Order is not marked as paid.");

  if (existingLogistics?.logistics_status === "created" && (existingLogistics.lgs_no || existingLogistics.store_print_no)) {
    return {
      success: true,
      logisticsStatus: "created",
      logisticsNo: existingLogistics.lgs_no,
      storePrintNo: existingLogistics.store_print_no,
      existing: true,
    };
  }

  const shippingAddress = order.shipping_address || {};
  const source = getShippingSource(shippingAddress);
  const logisticsType = normalizeLogisticsType(input.logistics_type || source.logisticsType || order.shipping_method, shippingAddress);
  const shipType = normalizeShipType(input.ship_type || source.shipType, shippingAddress);
  const tradeType = normalizeTradeType(input.trade_type || source.tradeType, order.payment_status);
  const merchantOrderNo = trimText(order.merchant_order_no) || getMerchantOrderNo(order.id);
  const recipientName = trimText(input.recipient_name || order.recipient_name || source.recipientName || order.customer_name || profile?.display_name);
  const recipientPhone = trimText(input.recipient_phone || order.recipient_phone || source.recipientPhone || order.customer_phone || profile?.phone);
  const recipientEmail = trimText(input.recipient_email || source.recipientEmail || order.customer_email || buyerEmailFallback);
  const storeId = trimText(input.store_id || source.storeId);
  const storeName = trimText(input.store_name || source.storeName);
  const storeTel = trimText(input.store_tel || source.storeTel);
  const storeAddr = trimText(input.store_addr || source.storeAddr);
  const totalAmount = Math.max(0, Math.round(parseNumeric(order.total_amount)));
  const itemDesc = buildItemDesc(items);
  const notifyUrl = trimText(input.notify_url || `${Deno.env.get("SUPABASE_URL")}/functions/v1/ezpay-logistics-notify`);

  if (!recipientName) throw new Error("Recipient name is required.");
  if (!recipientPhone) throw new Error("Recipient phone is required.");
  if (!recipientEmail) throw new Error("Recipient email is required.");
  if (logisticsType === "C2C" && (!storeId || !storeName || !storeTel || !storeAddr)) {
    throw new Error("Store information is required for C2C logistics.");
  }

  const postData = buildCommonPostData({
    merchantOrderNo,
    logisticsType,
    shipType,
    tradeType,
    recipientName,
    recipientPhone,
    recipientEmail,
    storeId,
    storeName,
    storeTel,
    storeAddr,
    totalAmount,
    itemDesc,
    notifyUrl,
  });

  const encryptedPostData = await aes256CbcEncryptToHex(new URLSearchParams(postData).toString(), hashKey, hashIV);
  const requestBody = new URLSearchParams({
    MerchantID_: merchantId,
    PostData_: encryptedPostData,
  });

  const rawRequest = {
    endpoint: getEzpayLogisticsUrls(env).createShipment,
    body: Object.fromEntries(requestBody.entries()),
    postData,
  };

  await upsertLogisticsRecord(supabase, {
    order_id: order.id,
    user_id: order.user_id,
    logistics_status: "pending",
    logistics_type: logisticsType,
    ship_type: shipType,
    trade_type: tradeType,
    merchant_order_no: merchantOrderNo,
    lgs_no: existingLogistics?.lgs_no || null,
    store_print_no: existingLogistics?.store_print_no || null,
    store_id: storeId || null,
    store_name: storeName || null,
    store_tel: storeTel || null,
    store_addr: storeAddr || null,
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    recipient_email: recipientEmail,
    total_amount: totalAmount,
    ezpay_raw_request: rawRequest,
    ezpay_raw_response: existingLogistics?.ezpay_raw_response || {},
    error_message: null,
  });

  const response = await sendEzpayRequest(getEzpayLogisticsUrls(env).createShipment, requestBody);
  const status = trimText(response.parsed.Status || response.parsed.status).toUpperCase();
  const message = getErrorMessage(response.parsed, response.rawText || "ezPay logistics create failed.");
  const result = response.result;
  const logisticsNo = trimText(result.LgsNo || result.lgsNo || result.LogisticsNo || result.logisticsNo);
  const storePrintNo = trimText(result.StorePrintNo || result.storePrintNo);
  const success = response.ok && status === "SUCCESS" && (logisticsNo || storePrintNo);

  await updateLogisticsRecord(supabase, order.id, {
    logistics_status: success ? "created" : "failed",
    logistics_type: logisticsType,
    ship_type: shipType,
    trade_type: tradeType,
    merchant_order_no: merchantOrderNo,
    lgs_no: logisticsNo || null,
    store_print_no: storePrintNo || null,
    store_id: storeId || null,
    store_name: storeName || null,
    store_tel: storeTel || null,
    store_addr: storeAddr || null,
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    recipient_email: recipientEmail,
    total_amount: totalAmount,
    ezpay_raw_request: rawRequest,
    ezpay_raw_response: mergeLogisticsResponse(existingLogistics?.ezpay_raw_response, "create", response.parsed),
    error_message: success ? null : message,
  });

  if (success) {
    await updateOrderShipmentFields(supabase, order.id, {
      tracking_number: logisticsNo || storePrintNo || order.tracking_number || null,
      shipping_status: "shipped",
      delivery_status: "shipping",
    });
  }

  return {
    success,
    logisticsStatus: success ? "created" : "failed",
    logisticsNo: logisticsNo || null,
    storePrintNo: storePrintNo || null,
    error: success ? null : message,
  };
}

export async function queryEzpayLogisticsForOrder(
  supabase: SupabaseClient,
  orderId: string,
  env = normalizeEzpayLogisticsEnv(Deno.env.get("EZPAY_LOGISTICS_ENV")),
): Promise<EzPayLogisticsResult> {
  const merchantId = trimText(Deno.env.get("EZPAY_LOGISTICS_MERCHANT_ID"));
  const hashKey = trimText(Deno.env.get("EZPAY_LOGISTICS_HASH_KEY"));
  const hashIV = trimText(Deno.env.get("EZPAY_LOGISTICS_HASH_IV"));
  if (!merchantId || !hashKey || !hashIV) throw new Error("ezPay logistics credentials are not configured.");

  const { order, existingLogistics } = await loadOrderContext(supabase, orderId);
  if (!existingLogistics) throw new Error("Logistics record not found.");

  const merchantOrderNo = trimText(existingLogistics.merchant_order_no || order.merchant_order_no || getMerchantOrderNo(order.id));
  const lgsNo = trimText(existingLogistics.lgs_no || order.tracking_number);
  const storePrintNo = trimText(existingLogistics.store_print_no);
  const logisticsType = normalizeLogisticsType(existingLogistics.logistics_type || order.shipping_method, order.shipping_address);
  const shipType = normalizeShipType(existingLogistics.ship_type, order.shipping_address);

  const postData = buildQueryPostData({
    merchantOrderNo,
    logisticsType,
    shipType,
    storeId: trimText(existingLogistics.store_id),
    storePrintNo,
    lgsNo,
  });

  const encryptedPostData = await aes256CbcEncryptToHex(new URLSearchParams(postData).toString(), hashKey, hashIV);
  const requestBody = new URLSearchParams({
    MerchantID_: merchantId,
    PostData_: encryptedPostData,
  });

  const rawRequest = {
    endpoint: getEzpayLogisticsUrls(env).queryShipment,
    body: Object.fromEntries(requestBody.entries()),
    postData,
  };

  const response = await sendEzpayRequest(getEzpayLogisticsUrls(env).queryShipment, requestBody);
  const status = trimText(response.parsed.Status || response.parsed.status).toUpperCase();
  const message = getErrorMessage(response.parsed, response.rawText || "ezPay logistics query failed.");
  const success = response.ok && status === "SUCCESS";

  await updateLogisticsRecord(supabase, order.id, {
    logistics_status: success ? (existingLogistics.logistics_status || "created") : "failed",
    logistics_type: logisticsType,
    ship_type: shipType,
    merchant_order_no: merchantOrderNo,
    lgs_no: lgsNo || existingLogistics.lgs_no,
    store_print_no: storePrintNo || existingLogistics.store_print_no,
    store_id: existingLogistics.store_id,
    store_name: existingLogistics.store_name,
    store_tel: existingLogistics.store_tel,
    store_addr: existingLogistics.store_addr,
    recipient_name: existingLogistics.recipient_name,
    recipient_phone: existingLogistics.recipient_phone,
    recipient_email: existingLogistics.recipient_email,
    total_amount: existingLogistics.total_amount,
    ezpay_raw_request: rawRequest,
    ezpay_raw_response: mergeLogisticsResponse(existingLogistics.ezpay_raw_response, "query", response.parsed),
    error_message: success ? null : message,
  });

  return {
    success,
    logisticsStatus: success ? existingLogistics.logistics_status : "failed",
    logisticsNo: lgsNo || existingLogistics.lgs_no,
    storePrintNo: storePrintNo || existingLogistics.store_print_no,
    error: success ? null : message,
  };
}

export async function printEzpayLogisticsForOrder(
  supabase: SupabaseClient,
  orderId: string,
  env = normalizeEzpayLogisticsEnv(Deno.env.get("EZPAY_LOGISTICS_ENV")),
): Promise<{ success: boolean; body: string; contentType: string; logisticsNo?: string | null; storePrintNo?: string | null; error?: string | null }> {
  const merchantId = trimText(Deno.env.get("EZPAY_LOGISTICS_MERCHANT_ID"));
  const hashKey = trimText(Deno.env.get("EZPAY_LOGISTICS_HASH_KEY"));
  const hashIV = trimText(Deno.env.get("EZPAY_LOGISTICS_HASH_IV"));
  if (!merchantId || !hashKey || !hashIV) throw new Error("ezPay logistics credentials are not configured.");

  const { order, existingLogistics } = await loadOrderContext(supabase, orderId);
  if (!existingLogistics) throw new Error("Logistics record not found.");

  const merchantOrderNo = trimText(existingLogistics.merchant_order_no || order.merchant_order_no || getMerchantOrderNo(order.id));
  const logisticsType = normalizeLogisticsType(existingLogistics.logistics_type || order.shipping_method, order.shipping_address);
  const shipType = normalizeShipType(existingLogistics.ship_type, order.shipping_address);
  const tradeType = normalizeTradeType(existingLogistics.trade_type, order.payment_status);
  const storeId = trimText(existingLogistics.store_id);
  const storeName = trimText(existingLogistics.store_name);
  const storeTel = trimText(existingLogistics.store_tel);
  const storeAddr = trimText(existingLogistics.store_addr);
  const storePrintNo = trimText(existingLogistics.store_print_no);
  const lgsNo = trimText(existingLogistics.lgs_no || order.tracking_number);

  const postData = buildPrintPostData({
    merchantOrderNo,
    logisticsType,
    shipType,
    tradeType,
    storeId,
    storeName,
    storeTel,
    storeAddr,
    storePrintNo,
    lgsNo,
  });

  const encryptedPostData = await aes256CbcEncryptToHex(new URLSearchParams(postData).toString(), hashKey, hashIV);
  const requestBody = new URLSearchParams({
    MerchantID_: merchantId,
    PostData_: encryptedPostData,
  });

  const rawRequest = {
    endpoint: getEzpayLogisticsUrls(env).printLabel,
    body: Object.fromEntries(requestBody.entries()),
    postData,
  };

  const response = await fetch(getEzpayLogisticsUrls(env).printLabel, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: requestBody.toString(),
  });

  const body = await response.text();
  const contentType = response.headers.get("content-type") || "text/plain";
  const parsed = contentType.includes("application/json") ? parseResponseBody(body) : { raw: body };

  await updateLogisticsRecord(supabase, order.id, {
    logistics_status: existingLogistics.logistics_status,
    logistics_type: logisticsType,
    ship_type: shipType,
    trade_type: tradeType,
    merchant_order_no: merchantOrderNo,
    lgs_no: lgsNo || existingLogistics.lgs_no,
    store_print_no: storePrintNo || existingLogistics.store_print_no,
    store_id: storeId || existingLogistics.store_id,
    store_name: storeName || existingLogistics.store_name,
    store_tel: storeTel || existingLogistics.store_tel,
    store_addr: storeAddr || existingLogistics.store_addr,
    recipient_name: existingLogistics.recipient_name,
    recipient_phone: existingLogistics.recipient_phone,
    recipient_email: existingLogistics.recipient_email,
    total_amount: existingLogistics.total_amount,
    ezpay_raw_request: rawRequest,
    ezpay_raw_response: mergeLogisticsResponse(existingLogistics.ezpay_raw_response, "print", parsed),
    error_message: response.ok ? null : getErrorMessage(parsed as Record<string, unknown>, body || "ezPay logistics print failed."),
  });

  return {
    success: response.ok,
    body,
    contentType,
    logisticsNo: lgsNo || existingLogistics.lgs_no,
    storePrintNo: storePrintNo || existingLogistics.store_print_no,
    error: response.ok ? null : getErrorMessage(parsed as Record<string, unknown>, body || "ezPay logistics print failed."),
  };
}

export async function handleEzpayLogisticsNotify(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
) {
  const merchantOrderNo = trimText(
    payload.MerchantOrderNo || payload.merchantOrderNo || payload.OrderNo || payload.orderNo || payload.LgsNo || payload.lgsNo,
  );
  const lgsNo = trimText(payload.LgsNo || payload.lgsNo);
  const storePrintNo = trimText(payload.StorePrintNo || payload.storePrintNo);
  const status = trimText(payload.Status || payload.status || payload.RetId || payload.retId || payload.logistics_status).toUpperCase();

  let targetOrderId = "";
  if (merchantOrderNo) {
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .or(`merchant_order_no.eq.${merchantOrderNo},id.eq.${merchantOrderNo}`)
      .maybeSingle();
    targetOrderId = order?.id || "";
  }

  if (!targetOrderId && (lgsNo || storePrintNo)) {
    const { data: shipment } = await supabase
      .from("logistics_shipments")
      .select("order_id")
      .or([lgsNo ? `lgs_no.eq.${lgsNo}` : null, storePrintNo ? `store_print_no.eq.${storePrintNo}` : null].filter(Boolean).join(","));
    targetOrderId = shipment?.[0]?.order_id || "";
  }

  if (!targetOrderId) {
    return { success: false, error: "Logistics record not found." };
  }

  const { data: existingLogistics } = await supabase
    .from("logistics_shipments")
    .select("*")
    .eq("order_id", targetOrderId)
    .maybeSingle<LogisticsShipmentRecord>();

  const mergedResponse = mergeLogisticsResponse(existingLogistics?.ezpay_raw_response, "notify", payload);

  await updateLogisticsRecord(supabase, targetOrderId, {
    logistics_status: status === "SUCCESS" || status === "DONE" ? "created" : (existingLogistics?.logistics_status || "created"),
    merchant_order_no: merchantOrderNo || existingLogistics?.merchant_order_no || "",
    lgs_no: lgsNo || existingLogistics?.lgs_no || null,
    store_print_no: storePrintNo || existingLogistics?.store_print_no || null,
    ezpay_raw_response: mergedResponse,
    error_message: status === "SUCCESS" || status === "DONE"
      ? null
      : trimText(payload.Message || payload.message || payload.error_message) || existingLogistics?.error_message || null,
  });

  return {
    success: true,
    targetOrderId,
    status,
  };
}

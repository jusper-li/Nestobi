import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type EzPayInvoiceEnv = "sandbox" | "production";
export type EzPayInvoiceType = "personal" | "mobile_carrier" | "company" | "donation";

export interface EzPayInvoiceInput {
  order_id: string;
}

export interface EzPayInvoiceRequestSource {
  invoice_type?: string;
  buyer_email?: string;
  buyer_name?: string;
  buyer_identifier?: string;
  carrier_number?: string;
  love_code?: string;
  tax_type?: string;
}

export interface EzPayInvoiceResult {
  success: boolean;
  invoiceStatus: "pending" | "issued" | "failed" | "cancelled" | "allowance" | null;
  invoiceNumber?: string | null;
  invoiceRandomNumber?: string | null;
  invoiceDate?: string | null;
  error?: string | null;
  existing?: boolean;
}

interface InvoiceRecord {
  id: string;
  order_id: string;
  user_id: string;
  invoice_status: "pending" | "issued" | "failed" | "cancelled" | "allowance";
  invoice_number: string | null;
  invoice_random_number: string | null;
  invoice_date: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_identifier: string | null;
  carrier_type: string | null;
  carrier_number: string | null;
  love_code: string | null;
  tax_type: string | null;
  sales_amount: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  ezpay_trade_no: string | null;
  ezpay_raw_request: Record<string, unknown> | null;
  ezpay_raw_response: Record<string, unknown> | null;
  error_message: string | null;
}

interface OrderInvoiceRow {
  id: string;
  user_id: string;
  total_amount: number | string;
  subtotal_amount?: number | string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  merchant_order_no?: string | null;
  newebpay_trade_no?: string | null;
  shipping_address?: Record<string, unknown> | null;
  created_at?: string | null;
}

const EZPAY_ENDPOINTS: Record<EzPayInvoiceEnv, string> = {
  sandbox: "https://cinv.ezpay.com.tw/Api/invoice_issue",
  production: "https://inv.ezpay.com.tw/Api/invoice_issue",
};

function normalizeEzpayInvoiceEnv(value: unknown): EzPayInvoiceEnv {
  return trimText(value).toLowerCase() === "production" ? "production" : "sandbox";
}

function trimText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeInvoiceType(value: unknown): EzPayInvoiceType {
  const raw = trimText(value).toLowerCase();
  if (raw === "mobile_carrier" || raw === "mobile" || raw === "carrier") return "mobile_carrier";
  if (raw === "company" || raw === "b2b") return "company";
  if (raw === "donation" || raw === "love") return "donation";
  return "personal";
}

function parseNumeric(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value: number) {
  return String(Math.max(0, Math.round(value)));
}

async function sha256Hex(data: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
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
  return Array.from(new Uint8Array(encrypted))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseInvoiceDate(value: unknown) {
  const text = trimText(value);
  if (!text) return new Date().toISOString();
  if (text.includes("T")) return text;
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (compact) {
    return `${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}+08:00`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function getInvoiceSource(shippingAddress: Record<string, unknown> | null | undefined): EzPayInvoiceRequestSource {
  if (!shippingAddress || typeof shippingAddress !== "object") return {};
  const nested = shippingAddress.invoice && typeof shippingAddress.invoice === "object"
    ? shippingAddress.invoice as Record<string, unknown>
    : {};
  return {
    invoice_type: nested.invoice_type ?? shippingAddress.invoice_type,
    buyer_email: nested.buyer_email ?? shippingAddress.buyer_email ?? shippingAddress.email ?? shippingAddress.customer_email,
    buyer_name: nested.buyer_name ?? shippingAddress.buyer_name ?? shippingAddress.name ?? shippingAddress.customer_name,
    buyer_identifier: nested.buyer_identifier ?? shippingAddress.buyer_identifier,
    carrier_number: nested.carrier_number ?? shippingAddress.carrier_number,
    love_code: nested.love_code ?? shippingAddress.love_code,
    tax_type: nested.tax_type ?? shippingAddress.tax_type,
  };
}

function buildItemPipe(values: Array<string | number>) {
  return values.map((value) => String(value)).join("|");
}

function getInvoiceCategory(invoiceType: EzPayInvoiceType) {
  return invoiceType === "company" ? "B2B" : "B2C";
}

function getCarrierFields(invoiceType: EzPayInvoiceType, source: EzPayInvoiceRequestSource) {
  if (invoiceType === "mobile_carrier") {
    return {
      CarrierType: "0",
      CarrierNum: trimText(source.carrier_number),
      LoveCode: "",
      PrintFlag: "N",
    };
  }

  if (invoiceType === "donation") {
    return {
      CarrierType: "",
      CarrierNum: "",
      LoveCode: trimText(source.love_code),
      PrintFlag: "N",
    };
  }

  return {
    CarrierType: "",
    CarrierNum: "",
    LoveCode: "",
    PrintFlag: "Y",
  };
}

function buildRequestPayload(params: {
  order: OrderInvoiceRow;
  source: EzPayInvoiceRequestSource;
  items: Array<{ name: string; quantity: number; price: number }>;
  taxType: string;
}) {
  const invoiceType = normalizeInvoiceType(params.source.invoice_type);
  const buyerEmail = trimText(params.source.buyer_email);
  const buyerName = trimText(params.source.buyer_name);
  const buyerIdentifier = trimText(params.source.buyer_identifier);
  const carrierFields = getCarrierFields(invoiceType, params.source);
  const totalAmount = Math.max(0, Math.round(parseNumeric(params.order.total_amount)));
  const salesAmount = Math.max(0, Math.round(totalAmount / 1.05));
  const taxAmount = Math.max(0, totalAmount - salesAmount);
  const itemNames = params.items.length > 0 ? params.items.map((item) => item.name || "Product") : ["Product"];
  const itemCounts = params.items.length > 0 ? params.items.map((item) => item.quantity || 1) : [1];
  const itemUnits = params.items.length > 0 ? params.items.map(() => "ea") : ["ea"];
  const itemPrices = params.items.length > 0
    ? params.items.map((item) => Math.max(0, Math.round(item.price || 0)))
    : [totalAmount];
  const itemAmts = params.items.length > 0
    ? params.items.map((item) => Math.max(0, Math.round((item.price || 0) * (item.quantity || 1))))
    : [totalAmount];

  const postData: Record<string, string> = {
    RespondType: "JSON",
    Version: "1.4",
    TimeStamp: String(Math.floor(Date.now() / 1000)),
    TransNum: trimText(params.order.newebpay_trade_no || params.order.merchant_order_no),
    MerchantOrderNo: `INV${params.order.id.replaceAll("-", "").slice(0, 17)}`.slice(0, 20),
    Status: "1",
    Category: getInvoiceCategory(invoiceType),
    BuyerName: buyerName,
    BuyerUBN: invoiceType === "company" ? buyerIdentifier : "",
    BuyerAddress: "",
    BuyerEmail: buyerEmail,
    TaxType: trimText(params.source.tax_type) || params.taxType || "1",
    TaxRate: "5",
    Amt: formatAmount(salesAmount),
    TaxAmt: formatAmount(taxAmount),
    TotalAmt: formatAmount(totalAmount),
    ItemName: buildItemPipe(itemNames),
    ItemCount: buildItemPipe(itemCounts),
    ItemUnit: buildItemPipe(itemUnits),
    ItemPrice: buildItemPipe(itemPrices),
    ItemAmt: buildItemPipe(itemAmts),
    Comment: trimText(params.order.merchant_order_no || params.order.id),
    CreateStatusTime: "",
    ...carrierFields,
  };

  return { postData, invoiceType, buyerEmail, buyerName, buyerIdentifier, totalAmount, salesAmount, taxAmount };
}

function parseResponseBody(text: string) {
  const parsed = safeJsonParse(text);
  if (parsed) return parsed;

  const params = new URLSearchParams(text);
  if ([...params.keys()].length > 0) return Object.fromEntries(params.entries());
  return { raw: text };
}

async function loadOrderContext(supabase: SupabaseClient, orderId: string) {
  const { data: order, error } = await supabase
    .from("orders")
    .select("id,user_id,total_amount,subtotal_amount,payment_status,payment_method,merchant_order_no,newebpay_trade_no,shipping_address,created_at")
    .eq("id", orderId)
    .maybeSingle<OrderInvoiceRow>();

  if (error) throw new Error(error.message);
  if (!order) throw new Error("Order not found.");

  const [itemsResult, profileResult, invoiceResult, authResult] = await Promise.all([
    supabase.from("purchase_records").select("quantity,unit_price,products(name)").eq("order_id", order.id),
    supabase.from("tbl_mn5wgzh0").select("display_name,preferred_language").eq("user_id", order.user_id).maybeSingle(),
    supabase.from("invoices").select("*").eq("order_id", order.id).maybeSingle<InvoiceRecord>(),
    supabase.auth.admin.getUserById(order.user_id),
  ]);

  if (itemsResult.error) throw new Error(itemsResult.error.message);
  if (profileResult.error) throw new Error(profileResult.error.message);
  if (invoiceResult.error) throw new Error(invoiceResult.error.message);
  if (authResult.error) throw new Error(authResult.error.message);

  return {
    order,
    items: (itemsResult.data || []).map((item: any) => ({
      name: String(item.products?.name || "Product"),
      quantity: Math.max(1, Number(item.quantity || 1)),
      price: Math.max(0, Number(item.unit_price || 0)),
    })),
    profile: profileResult.data || null,
    existingInvoice: invoiceResult.data || null,
    buyerEmailFallback: authResult.data.user?.email || "",
  };
}

async function persistInvoiceDraft(
  supabase: SupabaseClient,
  draft: Omit<InvoiceRecord, "id" | "created_at" | "updated_at">,
) {
  const { error } = await supabase.from("invoices").upsert(draft, { onConflict: "order_id" });
  if (error) throw new Error(error.message);
}

async function updateInvoiceRecord(
  supabase: SupabaseClient,
  orderId: string,
  values: Partial<InvoiceRecord>,
) {
  const { error } = await supabase.from("invoices").update(values).eq("order_id", orderId);
  if (error) throw new Error(error.message);
}

export async function createEzpayInvoiceForOrder(
  supabase: SupabaseClient,
  orderId: string,
  env = normalizeEzpayInvoiceEnv(Deno.env.get("EZPAY_INVOICE_ENV")),
): Promise<EzPayInvoiceResult> {
  const merchantId = trimText(Deno.env.get("EZPAY_INVOICE_MERCHANT_ID"));
  const hashKey = trimText(Deno.env.get("EZPAY_INVOICE_HASH_KEY"));
  const hashIV = trimText(Deno.env.get("EZPAY_INVOICE_HASH_IV"));

  if (!merchantId || !hashKey || !hashIV) {
    throw new Error("ezPay invoice credentials are not configured.");
  }

  const { order, items, profile, existingInvoice, buyerEmailFallback } = await loadOrderContext(supabase, orderId);
  if (trimText(order.payment_status).toLowerCase() !== "paid") {
    throw new Error("Order is not marked as paid.");
  }

  if (existingInvoice?.invoice_status === "issued" && existingInvoice.invoice_number) {
    return {
      success: true,
      invoiceStatus: "issued",
      invoiceNumber: existingInvoice.invoice_number,
      invoiceRandomNumber: existingInvoice.invoice_random_number,
      invoiceDate: existingInvoice.invoice_date,
      existing: true,
    };
  }

  const source = getInvoiceSource(order.shipping_address);
  const buyerEmail = trimText(source.buyer_email || buyerEmailFallback);
  if (!buyerEmail) throw new Error("buyer_email is required.");

  const invoiceType = normalizeInvoiceType(source.invoice_type);
  const buyerName = trimText(source.buyer_name || profile?.display_name || "");
  const buyerIdentifier = trimText(source.buyer_identifier);
  const carrierNumber = trimText(source.carrier_number);
  const loveCode = trimText(source.love_code);

  if (invoiceType === "company" && !buyerIdentifier) throw new Error("buyer_identifier is required for company invoices.");
  if (invoiceType === "mobile_carrier" && !carrierNumber) throw new Error("carrier_number is required for mobile carrier invoices.");
  if (invoiceType === "donation" && !loveCode) throw new Error("love_code is required for donation invoices.");

  const taxType = trimText(source.tax_type) || "1";
  const payload = buildRequestPayload({
    order,
    source: {
      ...source,
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      buyer_identifier: buyerIdentifier,
      carrier_number: carrierNumber,
      love_code: loveCode,
      tax_type: taxType,
    },
    items,
    taxType,
  });

  const encryptedPostData = await aes256CbcEncryptToHex(new URLSearchParams(payload.postData).toString(), hashKey, hashIV);
  const requestBody = new URLSearchParams({
    MerchantID_: merchantId,
    PostData_: encryptedPostData,
  });

  const rawRequest = {
    endpoint: EZPAY_ENDPOINTS[env],
    body: Object.fromEntries(requestBody.entries()),
    postData: payload.postData,
  };

  await persistInvoiceDraft(supabase, {
    order_id: order.id,
    user_id: order.user_id,
    invoice_status: "pending",
    invoice_number: null,
    invoice_random_number: null,
    invoice_date: null,
    buyer_name: buyerName || null,
    buyer_email: buyerEmail,
    buyer_identifier: invoiceType === "company" ? buyerIdentifier || null : null,
    carrier_type: payload.postData.CarrierType || null,
    carrier_number: payload.postData.CarrierNum || null,
    love_code: payload.postData.LoveCode || null,
    tax_type: taxType,
    sales_amount: payload.salesAmount,
    tax_amount: payload.taxAmount,
    total_amount: payload.totalAmount,
    ezpay_trade_no: trimText(order.newebpay_trade_no || order.merchant_order_no) || null,
    ezpay_raw_request: rawRequest,
    ezpay_raw_response: {},
    error_message: null,
  });

  const response = await fetch(EZPAY_ENDPOINTS[env], {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: requestBody.toString(),
  });

  const rawText = await response.text();
  const parsed = parseResponseBody(rawText) as Record<string, unknown>;
  const status = trimText(parsed.Status || parsed.status).toUpperCase();
  const message = trimText(parsed.Message || parsed.message);
  const result = (parsed.Result || parsed.result || parsed) as Record<string, unknown>;
  const invoiceNumber = trimText(result.InvoiceNumber || result.invoiceNumber);
  const invoiceRandomNumber = trimText(result.RandomNum || result.randomNum || result.RandomNumber);
  const invoiceDate = parseInvoiceDate(result.CreateTime || result.createTime);
  const errorMessage = status === "SUCCESS" && invoiceNumber ? "" : (message || rawText || "ezPay invoice issue failed.");

  if (status !== "SUCCESS" || !invoiceNumber) {
    await updateInvoiceRecord(supabase, order.id, {
      invoice_status: "failed",
      ezpay_raw_response: parsed,
      error_message: errorMessage,
      buyer_name: buyerName || null,
      buyer_email: buyerEmail,
      buyer_identifier: invoiceType === "company" ? buyerIdentifier || null : null,
      carrier_type: payload.postData.CarrierType || null,
      carrier_number: payload.postData.CarrierNum || null,
      love_code: payload.postData.LoveCode || null,
      tax_type: taxType,
      sales_amount: payload.salesAmount,
      tax_amount: payload.taxAmount,
      total_amount: payload.totalAmount,
    });

    return {
      success: false,
      invoiceStatus: "failed",
      error: errorMessage,
    };
  }

  await updateInvoiceRecord(supabase, order.id, {
    invoice_status: "issued",
    invoice_number: invoiceNumber,
    invoice_random_number: invoiceRandomNumber || null,
    invoice_date: invoiceDate,
    ezpay_raw_response: parsed,
    error_message: null,
    buyer_name: buyerName || null,
    buyer_email: buyerEmail,
    buyer_identifier: invoiceType === "company" ? buyerIdentifier || null : null,
    carrier_type: payload.postData.CarrierType || null,
    carrier_number: payload.postData.CarrierNum || null,
    love_code: payload.postData.LoveCode || null,
    tax_type: taxType,
    sales_amount: payload.salesAmount,
    tax_amount: payload.taxAmount,
    total_amount: payload.totalAmount,
  });

  return {
    success: true,
    invoiceStatus: "issued",
    invoiceNumber,
    invoiceRandomNumber: invoiceRandomNumber || null,
    invoiceDate,
    error: null,
  };
}

export function getEzpayInvoiceMerchantOrderNo(orderId: string) {
  return `INV${orderId.replaceAll("-", "").slice(0, 17)}`.slice(0, 20);
}

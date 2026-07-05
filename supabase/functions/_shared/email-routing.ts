import { createClient } from "npm:@supabase/supabase-js@2.57.4";

export type EmailRoute =
  | "customer"
  | "support"
  | "booking"
  | "order"
  | "system"
  | "payment-failed"
  | "refund"
  | "member"
  | "alert"
  | "vendor";

export interface NotificationEmailSettings {
  contact_email: string;
  support_notification_emails: string;
  booking_notification_emails: string;
  order_notification_emails: string;
  system_notification_emails: string;
  payment_failed_notification_emails: string;
  refund_notification_emails: string;
  member_notification_emails: string;
  alert_notification_emails: string;
}

const DEFAULT_EMAIL_SETTINGS: NotificationEmailSettings = {
  contact_email: "service@dlalshop.com",
  support_notification_emails: "service@dlalshop.com",
  booking_notification_emails: "service@dlalshop.com",
  order_notification_emails: "service@dlalshop.com",
  system_notification_emails: "service@dlalshop.com",
  payment_failed_notification_emails: "service@dlalshop.com",
  refund_notification_emails: "service@dlalshop.com",
  member_notification_emails: "service@dlalshop.com",
  alert_notification_emails: "service@dlalshop.com",
};

const CACHE_TTL_MS = 15_000;
let cachedSettings: NotificationEmailSettings | null = null;
let cachedAt = 0;
let loadingPromise: Promise<NotificationEmailSettings> | null = null;

export function parseEmailList(value: unknown): string[] {
  const raw = Array.isArray(value) ? value.join(",") : String(value ?? "");
  return [...new Set(
    raw
      .split(/[\s,;]+/)
      .map((item) => item.trim())
      .filter(Boolean),
  )];
}

export function dedupeEmails(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function normalizeEmailRoute(value: unknown): EmailRoute | "" {
  const raw = String(value ?? "").trim().toLowerCase();
  if (
    raw === "customer" ||
    raw === "support" ||
    raw === "booking" ||
    raw === "order" ||
    raw === "system" ||
    raw === "payment-failed" ||
    raw === "refund" ||
    raw === "member" ||
    raw === "alert" ||
    raw === "vendor"
  ) {
    return raw;
  }
  return "";
}

export async function getNotificationEmailSettings(): Promise<NotificationEmailSettings> {
  if (cachedSettings && Date.now() - cachedAt < CACHE_TTL_MS) return cachedSettings;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      cachedSettings = DEFAULT_EMAIL_SETTINGS;
      return cachedSettings;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data } = await supabase
      .from("site_settings")
      .select(
        "contact_email,support_notification_emails,booking_notification_emails,order_notification_emails,system_notification_emails,payment_failed_notification_emails,refund_notification_emails,member_notification_emails,alert_notification_emails",
      )
      .eq("is_active", true)
      .maybeSingle();

    cachedSettings = {
      contact_email: String(data?.contact_email || DEFAULT_EMAIL_SETTINGS.contact_email),
      support_notification_emails: String(
        data?.support_notification_emails || data?.contact_email || DEFAULT_EMAIL_SETTINGS.support_notification_emails,
      ),
      booking_notification_emails: String(
        data?.booking_notification_emails ||
          data?.support_notification_emails ||
          data?.contact_email ||
          DEFAULT_EMAIL_SETTINGS.booking_notification_emails,
      ),
      order_notification_emails: String(
        data?.order_notification_emails ||
          data?.support_notification_emails ||
          data?.contact_email ||
          DEFAULT_EMAIL_SETTINGS.order_notification_emails,
      ),
      system_notification_emails: String(
        data?.system_notification_emails ||
          data?.support_notification_emails ||
          data?.contact_email ||
          DEFAULT_EMAIL_SETTINGS.system_notification_emails,
      ),
      payment_failed_notification_emails: String(
        data?.payment_failed_notification_emails ||
          data?.system_notification_emails ||
          data?.support_notification_emails ||
          data?.contact_email ||
          DEFAULT_EMAIL_SETTINGS.payment_failed_notification_emails,
      ),
      refund_notification_emails: String(
        data?.refund_notification_emails ||
          data?.system_notification_emails ||
          data?.support_notification_emails ||
          data?.contact_email ||
          DEFAULT_EMAIL_SETTINGS.refund_notification_emails,
      ),
      member_notification_emails: String(
        data?.member_notification_emails ||
          data?.system_notification_emails ||
          data?.support_notification_emails ||
          data?.contact_email ||
          DEFAULT_EMAIL_SETTINGS.member_notification_emails,
      ),
      alert_notification_emails: String(
        data?.alert_notification_emails ||
          data?.system_notification_emails ||
          data?.support_notification_emails ||
          data?.contact_email ||
          DEFAULT_EMAIL_SETTINGS.alert_notification_emails,
      ),
    };
    cachedAt = Date.now();

    return cachedSettings;
  })();

  try {
    return await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

export function resolveRouteRecipients(
  route: EmailRoute,
  settings: NotificationEmailSettings,
  fallbackTo?: string,
): string[] {
  const fallback = dedupeEmails([
    ...parseEmailList(fallbackTo),
    ...parseEmailList(settings.contact_email),
  ]);

  if (route === "customer" || route === "vendor") {
    return parseEmailList(fallbackTo);
  }

  if (route === "support") {
    return dedupeEmails([
      ...parseEmailList(settings.support_notification_emails),
      ...fallback,
    ]);
  }

  if (route === "booking") {
    return dedupeEmails([
      ...parseEmailList(settings.booking_notification_emails),
      ...parseEmailList(settings.support_notification_emails),
      ...fallback,
    ]);
  }

  if (route === "order") {
    return dedupeEmails([
      ...parseEmailList(settings.order_notification_emails),
      ...parseEmailList(settings.support_notification_emails),
      ...fallback,
    ]);
  }

  if (route === "payment-failed") {
    return dedupeEmails([
      ...parseEmailList(settings.payment_failed_notification_emails),
      ...parseEmailList(settings.system_notification_emails),
      ...fallback,
    ]);
  }

  if (route === "refund") {
    return dedupeEmails([
      ...parseEmailList(settings.refund_notification_emails),
      ...parseEmailList(settings.system_notification_emails),
      ...fallback,
    ]);
  }

  if (route === "member") {
    return dedupeEmails([
      ...parseEmailList(settings.member_notification_emails),
      ...parseEmailList(settings.system_notification_emails),
      ...fallback,
    ]);
  }

  if (route === "alert") {
    return dedupeEmails([
      ...parseEmailList(settings.alert_notification_emails),
      ...parseEmailList(settings.system_notification_emails),
      ...fallback,
    ]);
  }

  return dedupeEmails([
    ...parseEmailList(settings.system_notification_emails),
    ...parseEmailList(settings.support_notification_emails),
    ...fallback,
  ]);
}

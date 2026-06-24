import { supabase } from './supabase';

export type SubscriptionPlanMonths = number | 'NE';

export interface SubscriptionCheckoutResponse {
  success: true;
  mode: 'newebpay';
  subscriptionId: string;
  merchantOrderNo: string;
  paymentUrl?: string;
  merchantId?: string;
  tradeInfo?: string;
  tradeSha?: string;
  version?: string;
  returnUrl?: string;
  clientBackUrl?: string;
}

async function ensureFreshSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not signed in');
  }

  const expiresAt = (session.expires_at ?? 0) * 1000;
  if (expiresAt - Date.now() < 60_000) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      throw new Error('Session expired');
    }
  }
}

export async function createSubscriptionCheckout(
  productId: string,
  quantity: number,
  planMonths: SubscriptionPlanMonths,
): Promise<SubscriptionCheckoutResponse> {
  await ensureFreshSession();

  const { data, error } = await supabase.functions.invoke('newebpay-period-payment', {
    body: { productId, quantity, planMonths },
  });

  if (error) {
    throw new Error(error.message || 'Subscription checkout failed');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Subscription checkout failed');
  }

  return data as SubscriptionCheckoutResponse;
}

export function submitNewebPayPeriodForm(
  paymentUrl: string,
  merchantId: string,
  tradeInfo: string,
  tradeSha: string,
  version: string,
) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = paymentUrl;

  const fields: Record<string, string> = {
    MerchantID: merchantId,
    TradeInfo: tradeInfo,
    TradeSha: tradeSha,
    Version: version,
  };

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}


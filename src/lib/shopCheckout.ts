import { supabase } from './supabase';

export type ShopCheckoutMode = 'points' | 'newebpay';

export interface ShopCheckoutResponse {
  success: true;
  mode: ShopCheckoutMode;
  orderId: string;
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

export type NewebPayPaymentMethod = 'CREDIT' | 'WEBATM' | 'ATM' | 'CVS' | 'BARCODE';

export async function createShopCheckout(pointsToUse: number, paymentMethod: NewebPayPaymentMethod = 'CREDIT'): Promise<ShopCheckoutResponse> {
  await ensureFreshSession();

  const { data, error } = await supabase.functions.invoke('newebpay-mpg-payment', {
    body: { pointsToUse, paymentMethod },
  });

  if (error) {
    throw new Error(error.message || 'Checkout failed');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Checkout failed');
  }

  return data as ShopCheckoutResponse;
}

export function submitNewebPayMpgForm(
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

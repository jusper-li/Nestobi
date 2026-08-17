import { supabase } from './supabase';

export interface OrderRefundResponse {
  success: boolean;
  refundedAmount?: number;
  paymentStatus?: string;
  orderStatus?: string;
  message?: string;
  providerStatus?: number | null;
  providerResponse?: Record<string, unknown>;
  refundAuditId?: string;
}

async function getFunctionErrorMessage(error: unknown): Promise<string | null> {
  if (!error || typeof error !== 'object') return null;

  const context = (error as { context?: unknown }).context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json() as { error?: string; message?: string };
      return body.error || body.message || null;
    } catch {
      // Fall back to the SDK error message when the response is not JSON.
    }
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' ? message : null;
}

export async function refundOrder(orderId: string): Promise<OrderRefundResponse> {
  const { data, error } = await supabase.functions.invoke('newebpay-order-refund', {
    body: { orderId },
  });

  if (error) {
    throw new Error((await getFunctionErrorMessage(error)) || 'Refund failed');
  }

  if (!data?.success) {
    throw new Error(data?.message || data?.error || 'Refund failed');
  }

  return data as OrderRefundResponse;
}

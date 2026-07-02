import { supabase } from './supabase';

export interface OrderRefundResponse {
  success: boolean;
  refundedAmount?: number;
  paymentStatus?: string;
  orderStatus?: string;
  message?: string;
}

export async function refundOrder(orderId: string): Promise<OrderRefundResponse> {
  const { data, error } = await supabase.functions.invoke('newebpay-order-refund', {
    body: { orderId },
  });

  if (error) {
    throw new Error(error.message || 'Refund failed');
  }

  if (!data?.success) {
    throw new Error(data?.message || data?.error || 'Refund failed');
  }

  return data as OrderRefundResponse;
}

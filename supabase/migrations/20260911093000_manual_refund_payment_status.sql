CREATE OR REPLACE FUNCTION public.create_manual_refund(p_order_id uuid, p_amount numeric, p_reason text DEFAULT '', p_note text DEFAULT '')
RETURNS public.refunds LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order orders%ROWTYPE; v_refunded numeric; v_ref public.refunds;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tbl_user_auth WHERE user_id=auth.uid() AND role IN ('admin','superadmin')) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT * INTO v_order FROM orders WHERE id=p_order_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  SELECT COALESCE(SUM(refund_amount),0) INTO v_refunded FROM refunds WHERE order_id=p_order_id AND status='completed';
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > GREATEST(0,COALESCE(v_order.total_amount,0)-v_refunded) THEN RAISE EXCEPTION 'Refund amount exceeds refundable amount'; END IF;
  INSERT INTO refunds(order_id,merchant_order_no,newebpay_trade_no,refund_amount,refund_reason,admin_note,requested_by) VALUES (p_order_id,v_order.merchant_order_no,v_order.newebpay_trade_no,p_amount,NULLIF(trim(p_reason),''),NULLIF(trim(p_note),''),auth.uid()) RETURNING * INTO v_ref;
  UPDATE orders SET payment_status='refund_pending', updated_at=now() WHERE id=p_order_id AND payment_status='paid';
  RETURN v_ref;
END; $$;

CREATE OR REPLACE FUNCTION public.complete_manual_refund(p_refund_id uuid, p_note text DEFAULT '')
RETURNS public.refunds LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ref public.refunds; v_paid numeric; v_refunded numeric; v_new_total numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tbl_user_auth WHERE user_id=auth.uid() AND role IN ('admin','superadmin')) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT * INTO v_ref FROM refunds WHERE id=p_refund_id FOR UPDATE; IF NOT FOUND OR v_ref.status NOT IN ('pending','processing') THEN RAISE EXCEPTION 'Refund is not pending'; END IF;
  SELECT COALESCE(total_amount,0) INTO v_paid FROM orders WHERE id=v_ref.order_id FOR UPDATE;
  SELECT COALESCE(SUM(refund_amount),0) INTO v_refunded FROM refunds WHERE order_id=v_ref.order_id AND status='completed' AND id<>v_ref.id;
  IF v_ref.refund_amount > GREATEST(0,v_paid-v_refunded) THEN RAISE EXCEPTION 'Refund amount exceeds refundable amount'; END IF;
  UPDATE refunds SET status='completed',processed_by=auth.uid(),completed_at=now(),admin_note=COALESCE(NULLIF(trim(p_note),''),admin_note),updated_at=now() WHERE id=p_refund_id RETURNING * INTO v_ref;
  v_new_total := v_refunded + v_ref.refund_amount;
  UPDATE orders SET payment_status=CASE WHEN v_new_total >= v_paid THEN 'refunded' ELSE 'partially_refunded' END, updated_at=now() WHERE id=v_ref.order_id;
  RETURN v_ref;
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_manual_refund(p_refund_id uuid)
RETURNS public.refunds LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ref public.refunds; v_pending boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tbl_user_auth WHERE user_id=auth.uid() AND role IN ('admin','superadmin')) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  UPDATE refunds SET status='cancelled',cancelled_at=now(),processed_by=auth.uid(),updated_at=now() WHERE id=p_refund_id AND status='pending' RETURNING * INTO v_ref;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only pending refunds can be cancelled'; END IF;
  SELECT EXISTS(SELECT 1 FROM refunds WHERE order_id=v_ref.order_id AND status IN ('pending','processing')) INTO v_pending;
  IF NOT v_pending THEN UPDATE orders SET payment_status='paid',updated_at=now() WHERE id=v_ref.order_id AND payment_status='refund_pending'; END IF;
  RETURN v_ref;
END; $$;

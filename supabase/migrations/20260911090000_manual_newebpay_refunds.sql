CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id), payment_id uuid NULL,
  merchant_order_no text, newebpay_trade_no text, refund_amount numeric NOT NULL, refund_reason text,
  refund_method text NOT NULL DEFAULT 'manual_newebpay', status text NOT NULL DEFAULT 'pending', requested_by uuid NULL,
  processed_by uuid NULL, requested_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz NULL,
  cancelled_at timestamptz NULL, admin_note text NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT refunds_amount_positive CHECK (refund_amount > 0),
  CONSTRAINT refunds_status_check CHECK (status IN ('pending','processing','completed','cancelled','failed')),
  CONSTRAINT refunds_method_check CHECK (refund_method IN ('manual_newebpay','api_newebpay'))
);
CREATE INDEX IF NOT EXISTS refunds_order_id_idx ON public.refunds(order_id);
CREATE INDEX IF NOT EXISTS refunds_status_idx ON public.refunds(status);
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.refunds FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.refunds TO authenticated;
DROP POLICY IF EXISTS refunds_admin_read ON public.refunds;
CREATE POLICY refunds_admin_read ON public.refunds FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.tbl_user_auth a WHERE a.user_id = auth.uid() AND a.role IN ('admin','superadmin')));

CREATE OR REPLACE FUNCTION public.get_order_refund_summary(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_paid numeric; v_refunded numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tbl_user_auth WHERE user_id=auth.uid() AND role IN ('admin','superadmin')) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT COALESCE(total_amount,0) INTO v_paid FROM orders WHERE id=p_order_id;
  SELECT COALESCE(SUM(refund_amount),0) INTO v_refunded FROM refunds WHERE order_id=p_order_id AND status='completed';
  RETURN jsonb_build_object('paid_amount',v_paid,'refunded_amount',v_refunded,'refundable_amount',GREATEST(0,v_paid-v_refunded));
END; $$;

CREATE OR REPLACE FUNCTION public.create_manual_refund(p_order_id uuid, p_amount numeric, p_reason text DEFAULT '', p_note text DEFAULT '')
RETURNS public.refunds LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order orders%ROWTYPE; v_refunded numeric; v_ref public.refunds;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tbl_user_auth WHERE user_id=auth.uid() AND role IN ('admin','superadmin')) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT * INTO v_order FROM orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  SELECT COALESCE(SUM(refund_amount),0) INTO v_refunded FROM refunds WHERE order_id=p_order_id AND status='completed';
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > GREATEST(0,COALESCE(v_order.total_amount,0)-v_refunded) THEN RAISE EXCEPTION 'Refund amount exceeds refundable amount'; END IF;
  INSERT INTO refunds(order_id,merchant_order_no,newebpay_trade_no,refund_amount,refund_reason,admin_note,requested_by)
  VALUES (p_order_id,v_order.merchant_order_no,v_order.newebpay_trade_no,p_amount,NULLIF(trim(p_reason),''),NULLIF(trim(p_note),''),auth.uid()) RETURNING * INTO v_ref;
  RETURN v_ref;
END; $$;

CREATE OR REPLACE FUNCTION public.complete_manual_refund(p_refund_id uuid, p_note text DEFAULT '')
RETURNS public.refunds LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ref public.refunds; v_paid numeric; v_refunded numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tbl_user_auth WHERE user_id=auth.uid() AND role IN ('admin','superadmin')) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT * INTO v_ref FROM refunds WHERE id=p_refund_id FOR UPDATE;
  IF NOT FOUND OR v_ref.status NOT IN ('pending','processing') THEN RAISE EXCEPTION 'Refund is not pending'; END IF;
  SELECT COALESCE(total_amount,0) INTO v_paid FROM orders WHERE id=v_ref.order_id FOR UPDATE;
  SELECT COALESCE(SUM(refund_amount),0) INTO v_refunded FROM refunds WHERE order_id=v_ref.order_id AND status='completed' AND id<>v_ref.id;
  IF v_ref.refund_amount > GREATEST(0,v_paid-v_refunded) THEN RAISE EXCEPTION 'Refund amount exceeds refundable amount'; END IF;
  UPDATE refunds SET status='completed',processed_by=auth.uid(),completed_at=now(),admin_note=COALESCE(NULLIF(trim(p_note),''),admin_note),updated_at=now() WHERE id=p_refund_id RETURNING * INTO v_ref;
  RETURN v_ref;
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_manual_refund(p_refund_id uuid)
RETURNS public.refunds LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ref public.refunds;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tbl_user_auth WHERE user_id=auth.uid() AND role IN ('admin','superadmin')) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  UPDATE refunds SET status='cancelled',cancelled_at=now(),processed_by=auth.uid(),updated_at=now() WHERE id=p_refund_id AND status='pending' RETURNING * INTO v_ref;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only pending refunds can be cancelled'; END IF;
  RETURN v_ref;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_order_refund_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_manual_refund(uuid,numeric,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_manual_refund(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_manual_refund(uuid) TO authenticated;

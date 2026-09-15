/* Phase 2: coffee bean inventory core */
CREATE TABLE IF NOT EXISTS public.coffee_beans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sku text NOT NULL UNIQUE, name text NOT NULL, origin text NOT NULL DEFAULT '', farm text NOT NULL DEFAULT '', processing_method text NOT NULL DEFAULT '', roast_level text, supplier_id uuid, unit text NOT NULL DEFAULT 'kg', package_size numeric NOT NULL DEFAULT 0 CHECK (package_size >= 0), purchase_cost numeric NOT NULL DEFAULT 0 CHECK (purchase_cost >= 0), lead_time_days integer NOT NULL DEFAULT 7 CHECK (lead_time_days >= 0), safety_stock numeric NOT NULL DEFAULT 0 CHECK (safety_stock >= 0), target_stock_days integer NOT NULL DEFAULT 30 CHECK (target_stock_days >= 0), minimum_order_qty numeric NOT NULL DEFAULT 0 CHECK (minimum_order_qty >= 0), order_multiple numeric NOT NULL DEFAULT 1 CHECK (order_multiple > 0), is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.suppliers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, contact_name text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '', line_id text, minimum_order_amount numeric CHECK (minimum_order_amount IS NULL OR minimum_order_amount >= 0), default_lead_time_days integer NOT NULL DEFAULT 7 CHECK (default_lead_time_days >= 0), notes text NOT NULL DEFAULT '', is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coffee_beans ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS public.inventory_locations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, type text NOT NULL CHECK (type IN ('warehouse','store','roastery')), address text, store_location_id uuid REFERENCES public.store_locations(id) ON DELETE SET NULL, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.bean_inventory (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bean_id uuid NOT NULL REFERENCES public.coffee_beans(id) ON DELETE CASCADE, location_id uuid NOT NULL REFERENCES public.inventory_locations(id) ON DELETE CASCADE, on_hand_qty numeric NOT NULL DEFAULT 0 CHECK (on_hand_qty >= 0), reserved_qty numeric NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0), incoming_qty numeric NOT NULL DEFAULT 0 CHECK (incoming_qty >= 0), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(bean_id, location_id), CHECK (reserved_qty <= on_hand_qty)
);
CREATE TABLE IF NOT EXISTS public.product_bean_bom (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, bean_id uuid NOT NULL REFERENCES public.coffee_beans(id) ON DELETE CASCADE, usage_grams numeric NOT NULL CHECK (usage_grams > 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(product_id, bean_id)
);
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bean_id uuid NOT NULL REFERENCES public.coffee_beans(id), location_id uuid NOT NULL REFERENCES public.inventory_locations(id), transaction_type text NOT NULL CHECK (transaction_type IN ('purchase_in','sale_usage','production_usage','transfer_in','transfer_out','adjustment','waste','reservation','reservation_release')), quantity numeric NOT NULL CHECK (quantity > 0), before_qty numeric NOT NULL CHECK (before_qty >= 0), after_qty numeric NOT NULL CHECK (after_qty >= 0), reference_type text, reference_id uuid, notes text NOT NULL DEFAULT '', created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bean_inventory_location ON public.bean_inventory(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_lookup ON public.inventory_transactions(bean_id, location_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_bean_bom_product ON public.product_bean_bom(product_id);
CREATE INDEX IF NOT EXISTS idx_coffee_beans_active ON public.coffee_beans(is_active);
ALTER TABLE public.coffee_beans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bean_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_bean_bom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.can_manage_inventory() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.tbl_user_auth WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','superadmin')); $$;
CREATE POLICY coffee_beans_admin_read ON public.coffee_beans FOR SELECT TO authenticated USING (public.can_manage_inventory());
CREATE POLICY suppliers_admin_read ON public.suppliers FOR SELECT TO authenticated USING (public.can_manage_inventory());
CREATE POLICY inventory_locations_admin_read ON public.inventory_locations FOR SELECT TO authenticated USING (public.can_manage_inventory());
CREATE POLICY bean_inventory_admin_read ON public.bean_inventory FOR SELECT TO authenticated USING (public.can_manage_inventory());
CREATE POLICY product_bean_bom_admin_read ON public.product_bean_bom FOR SELECT TO authenticated USING (public.can_manage_inventory());
CREATE POLICY inventory_transactions_admin_read ON public.inventory_transactions FOR SELECT TO authenticated USING (public.can_manage_inventory());
GRANT SELECT ON public.coffee_beans, public.suppliers, public.inventory_locations, public.bean_inventory, public.product_bean_bom, public.inventory_transactions TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.inventory_transactions FROM authenticated;

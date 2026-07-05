create table if not exists public.newebpay_mpg_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  merchant_order_no text not null unique,
  amount integer not null default 0,
  payer_email text not null default '',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  trade_info text,
  trade_sha text,
  trade_no text,
  respond_code text,
  card_no text,
  paid_at timestamptz,
  raw_response jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_newebpay_mpg_orders_order_id on public.newebpay_mpg_orders(order_id);
create index if not exists idx_newebpay_mpg_orders_status on public.newebpay_mpg_orders(status);

alter table public.newebpay_mpg_orders enable row level security;

drop policy if exists "Public can read own newebpay mpg orders via order access" on public.newebpay_mpg_orders;
create policy "Public can read own newebpay mpg orders via order access"
  on public.newebpay_mpg_orders
  for select
  using (true);

drop policy if exists "Active admins can manage newebpay mpg orders" on public.newebpay_mpg_orders;
create policy "Active admins can manage newebpay mpg orders"
  on public.newebpay_mpg_orders
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'payments' and column_name = 'gateway_name') then
    update public.payments
    set gateway_name = coalesce(nullif(gateway_name, ''), 'manual')
    where gateway_name is null or gateway_name = '';
  end if;
end $$;


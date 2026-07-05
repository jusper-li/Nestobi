/*
  Expand order-management data model for detailed backoffice operations.
*/

alter table public.orders
  add column if not exists completed_at timestamptz,
  add column if not exists source text default 'frontend',
  add column if not exists channel text default 'storefront',
  add column if not exists company_name text default '',
  add column if not exists company_tax_id text default '',
  add column if not exists customer_name text default '',
  add column if not exists customer_email text default '',
  add column if not exists customer_phone text default '',
  add column if not exists customer_account text default '',
  add column if not exists subscribed_order_notifications boolean default false,
  add column if not exists shipping_status text default 'ready_to_ship',
  add column if not exists delivery_status text default 'preparing',
  add column if not exists shipping_method text default '',
  add column if not exists recipient_name text default '',
  add column if not exists recipient_phone text default '',
  add column if not exists tracking_number text default '',
  add column if not exists shipping_country text default '',
  add column if not exists shipping_postal_code text default '',
  add column if not exists shipping_city text default '',
  add column if not exists shipping_district text default '',
  add column if not exists shipping_line1 text default '',
  add column if not exists communication_notes text default '',
  add column if not exists shipping_notes text default '';

alter table public.payments
  add column if not exists provider_status text default '',
  add column if not exists paid_at timestamptz,
  add column if not exists gateway_name text default '';

create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  message text not null,
  is_starred boolean not null default false,
  author_name text default '',
  author_email text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null default 'update',
  description text not null,
  actor_name text default '',
  actor_type text default 'admin',
  created_at timestamptz not null default now()
);

create index if not exists idx_order_messages_order_id on public.order_messages(order_id, created_at desc);
create index if not exists idx_order_events_order_id on public.order_events(order_id, created_at desc);

alter table public.order_messages enable row level security;
alter table public.order_events enable row level security;

drop policy if exists "Active admins can manage order messages" on public.order_messages;
create policy "Active admins can manage order messages"
  on public.order_messages
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "Active admins can manage order events" on public.order_events;
create policy "Active admins can manage order events"
  on public.order_events
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

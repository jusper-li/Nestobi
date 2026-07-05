/*
  Harden admin authentication and RLS for the Sonpin backoffice.

  This migration prepares the backoffice for Supabase Auth magic-link login:
  - Admin identity is matched to auth.users by auth_user_id or verified email.
  - Legacy password login RPC is revoked.
  - Broad USING (true) management policies are replaced with admin-only checks.
  - Public storefront read/checkout/contact/chat paths stay available.
*/

create extension if not exists pgcrypto;

create schema if not exists private;

alter table public.admins
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists login_method text not null default 'email_magic_link';

alter table public.admins
  alter column password_hash drop not null;

update public.admins
set password_hash = null,
    login_method = 'email_magic_link'
where password_hash is not null;

update public.admins a
set auth_user_id = u.id,
    login_method = 'email_magic_link'
from auth.users u
where a.auth_user_id is null
  and lower(a.email) = lower(u.email);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admins a
    where a.is_active = true
      and (
        (a.auth_user_id is not null and a.auth_user_id = auth.uid())
        or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

create or replace function private.current_admin_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select a.id
  from public.admins a
  where a.is_active = true
    and (
      (a.auth_user_id is not null and a.auth_user_id = auth.uid())
      or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  limit 1;
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on function private.is_admin() from public, anon;
revoke all on function private.current_admin_id() from public, anon;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.current_admin_id() to authenticated;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'verify_admin_login'
  ) then
    revoke all on function public.verify_admin_login(text, text) from public, anon, authenticated;
  end if;
end $$;

drop function if exists public.verify_admin_login(text, text);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admins(id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;

create index if not exists admin_audit_logs_admin_id_idx on public.admin_audit_logs(admin_id);
create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs(created_at desc);
create index if not exists admins_auth_user_id_idx on public.admins(auth_user_id);
create unique index if not exists admins_auth_user_id_unique_idx
  on public.admins(auth_user_id)
  where auth_user_id is not null;

-- Remove unsafe all-access policy names from previous migrations.
drop policy if exists "Service role full access to admins" on public.admins;
drop policy if exists "Service role full access to roles" on public.roles;
drop policy if exists "Service role full access to permissions" on public.permissions;
drop policy if exists "Service role full access to role_permissions" on public.role_permissions;
drop policy if exists "Service role full access to admin_roles" on public.admin_roles;
drop policy if exists "Service role full access to members" on public.members;
drop policy if exists "Service role full access to categories" on public.categories;
drop policy if exists "Service role full access to products" on public.products;
drop policy if exists "Service role full access to orders" on public.orders;
drop policy if exists "Service role full access to order_items" on public.order_items;
drop policy if exists "Service role full access to payments" on public.payments;
drop policy if exists "Service role full access to stores" on public.stores;
drop policy if exists "Service role full access to articles" on public.articles;
drop policy if exists "Service role full access to faqs" on public.faqs;
drop policy if exists "Service role full access to homepage_sections" on public.homepage_sections;
drop policy if exists "Service role full access to social_accounts" on public.social_accounts;
drop policy if exists "Service role full access to languages" on public.languages;
drop policy if exists "Service role full access to translations" on public.translations;
drop policy if exists "Service role full access to seo_settings" on public.seo_settings;
drop policy if exists "Service role full access to ai_chat_logs" on public.ai_chat_logs;
drop policy if exists "Service role full access to ai_usage_stats" on public.ai_usage_stats;

-- Remove permissive or stale public/admin policies that can bypass the new admin check.
drop policy if exists "Admins can update site settings" on public.site_settings;
drop policy if exists "Admins can insert site settings" on public.site_settings;

-- Remove old policies before recreating deterministic names.
drop policy if exists "Active admins can read admin records" on public.admins;
drop policy if exists "Active admins can manage admin records" on public.admins;
drop policy if exists "Active admins can manage roles" on public.roles;
drop policy if exists "Active admins can manage permissions" on public.permissions;
drop policy if exists "Active admins can manage role permissions" on public.role_permissions;
drop policy if exists "Active admins can manage admin roles" on public.admin_roles;
drop policy if exists "Active admins can manage members" on public.members;
drop policy if exists "Public can read active categories" on public.categories;
drop policy if exists "Active admins can manage categories" on public.categories;
drop policy if exists "Public can read active products" on public.products;
drop policy if exists "Active admins can manage products" on public.products;
drop policy if exists "Public can create checkout orders" on public.orders;
drop policy if exists "Active admins can manage orders" on public.orders;
drop policy if exists "Public can create checkout order items" on public.order_items;
drop policy if exists "Active admins can manage order items" on public.order_items;
drop policy if exists "Public can create checkout payments" on public.payments;
drop policy if exists "Active admins can manage payments" on public.payments;
drop policy if exists "Public can read active stores" on public.stores;
drop policy if exists "Active admins can manage stores" on public.stores;
drop policy if exists "Public can read published articles" on public.articles;
drop policy if exists "Active admins can manage articles" on public.articles;
drop policy if exists "Public can read active faqs" on public.faqs;
drop policy if exists "Active admins can manage faqs" on public.faqs;
drop policy if exists "Public can read active homepage sections" on public.homepage_sections;
drop policy if exists "Active admins can manage homepage sections" on public.homepage_sections;
drop policy if exists "Public can read active social accounts" on public.social_accounts;
drop policy if exists "Active admins can manage social accounts" on public.social_accounts;
drop policy if exists "Public can read active languages" on public.languages;
drop policy if exists "Active admins can manage languages" on public.languages;
drop policy if exists "Public can read translations" on public.translations;
drop policy if exists "Active admins can manage translations" on public.translations;
drop policy if exists "Public can read seo settings" on public.seo_settings;
drop policy if exists "Active admins can manage seo settings" on public.seo_settings;
drop policy if exists "Public can create ai chat logs" on public.ai_chat_logs;
drop policy if exists "Active admins can read ai chat logs" on public.ai_chat_logs;
drop policy if exists "Active admins can manage ai usage stats" on public.ai_usage_stats;
drop policy if exists "Public can read site settings" on public.site_settings;
drop policy if exists "Active admins can manage site settings" on public.site_settings;
drop policy if exists "Active admins can read audit logs" on public.admin_audit_logs;
drop policy if exists "Active admins can create audit logs" on public.admin_audit_logs;

create policy "Active admins can read admin records"
  on public.admins for select
  to authenticated
  using (private.is_admin());

create policy "Active admins can manage admin records"
  on public.admins for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "Active admins can manage roles"
  on public.roles for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Active admins can manage permissions"
  on public.permissions for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Active admins can manage role permissions"
  on public.role_permissions for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Active admins can manage admin roles"
  on public.admin_roles for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Active admins can manage members"
  on public.members for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Public can read active categories"
  on public.categories for select
  to anon, authenticated
  using (is_active = true);

create policy "Active admins can manage categories"
  on public.categories for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Public can read active products"
  on public.products for select
  to anon, authenticated
  using (
    is_active = true
    and coalesce(is_hidden, false) = false
    and (published_at is null or published_at <= now())
    and (unpublished_at is null or unpublished_at > now())
  );

create policy "Active admins can manage products"
  on public.products for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Public can create checkout orders"
  on public.orders for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and payment_status in ('unpaid', 'pending')
    and total >= 0
    and subtotal >= 0
  );

create policy "Active admins can manage orders"
  on public.orders for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Public can create checkout order items"
  on public.order_items for insert
  to anon, authenticated
  with check (quantity > 0 and price >= 0 and total >= 0);

create policy "Active admins can manage order items"
  on public.order_items for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Public can create checkout payments"
  on public.payments for insert
  to anon, authenticated
  with check (amount >= 0 and status in ('pending', 'unpaid'));

create policy "Active admins can manage payments"
  on public.payments for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Public can read active stores"
  on public.stores for select
  to anon, authenticated
  using (is_active = true);

create policy "Active admins can manage stores"
  on public.stores for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Public can read published articles"
  on public.articles for select
  to anon, authenticated
  using (status = 'published');

create policy "Active admins can manage articles"
  on public.articles for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Public can read active faqs"
  on public.faqs for select
  to anon, authenticated
  using (is_active = true);

create policy "Active admins can manage faqs"
  on public.faqs for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Public can read active homepage sections"
  on public.homepage_sections for select
  to anon, authenticated
  using (is_active = true);

create policy "Active admins can manage homepage sections"
  on public.homepage_sections for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Public can read active social accounts"
  on public.social_accounts for select
  to anon, authenticated
  using (is_active = true);

create policy "Active admins can manage social accounts"
  on public.social_accounts for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Public can read active languages"
  on public.languages for select
  to anon, authenticated
  using (is_active = true);

create policy "Active admins can manage languages"
  on public.languages for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Public can read translations"
  on public.translations for select
  to anon, authenticated
  using (true);

create policy "Active admins can manage translations"
  on public.translations for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Public can read seo settings"
  on public.seo_settings for select
  to anon, authenticated
  using (true);

create policy "Active admins can manage seo settings"
  on public.seo_settings for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Public can create ai chat logs"
  on public.ai_chat_logs for insert
  to anon, authenticated
  with check (true);

create policy "Active admins can read ai chat logs"
  on public.ai_chat_logs for select
  to authenticated
  using (private.is_admin());

create policy "Active admins can manage ai usage stats"
  on public.ai_usage_stats for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Public can read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

create policy "Active admins can manage site settings"
  on public.site_settings for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Active admins can read audit logs"
  on public.admin_audit_logs for select
  to authenticated
  using (private.is_admin());

create policy "Active admins can create audit logs"
  on public.admin_audit_logs for insert
  to authenticated
  with check (private.is_admin());

do $$
begin
  if to_regclass('public.static_pages') is not null then
    drop policy if exists "Admins can insert static pages" on public.static_pages;
    drop policy if exists "Admins can update static pages" on public.static_pages;
    drop policy if exists "Public can read published static pages" on public.static_pages;
    drop policy if exists "Active admins can manage static pages" on public.static_pages;

    create policy "Public can read published static pages"
      on public.static_pages for select
      to anon, authenticated
      using (is_published = true);

    create policy "Active admins can manage static pages"
      on public.static_pages for all
      to authenticated
      using (private.is_admin())
      with check (private.is_admin());
  end if;

  if to_regclass('public.contact_inquiries') is not null then
    drop policy if exists "Anyone can read contact inquiries" on public.contact_inquiries;
    drop policy if exists "Anyone can update contact inquiry status" on public.contact_inquiries;
    drop policy if exists "Public can submit contact inquiries" on public.contact_inquiries;
    drop policy if exists "Active admins can manage contact inquiries" on public.contact_inquiries;

    create policy "Public can submit contact inquiries"
      on public.contact_inquiries for insert
      to anon, authenticated
      with check (true);

    create policy "Active admins can manage contact inquiries"
      on public.contact_inquiries for all
      to authenticated
      using (private.is_admin())
      with check (private.is_admin());
  end if;

  if to_regclass('public.member_profiles') is not null then
    drop policy if exists "Admins can manage member profiles" on public.member_profiles;

    create policy "Admins can manage member profiles"
      on public.member_profiles for all
      to authenticated
      using (private.is_admin())
      with check (private.is_admin());
  end if;

  if to_regclass('public.chat_sessions') is not null then
    drop policy if exists "Admins can update sessions" on public.chat_sessions;
    drop policy if exists "Active admins can manage chat sessions" on public.chat_sessions;

    create policy "Active admins can manage chat sessions"
      on public.chat_sessions for all
      to authenticated
      using (private.is_admin())
      with check (private.is_admin());
  end if;

  if to_regclass('public.chat_messages') is not null then
    drop policy if exists "Active admins can manage chat messages" on public.chat_messages;

    create policy "Active admins can manage chat messages"
      on public.chat_messages for all
      to authenticated
      using (private.is_admin())
      with check (private.is_admin());
  end if;

  if to_regclass('public.knowledge_categories') is not null then
    drop policy if exists "Admins can manage categories" on public.knowledge_categories;
    drop policy if exists "Active admins can manage knowledge categories" on public.knowledge_categories;

    create policy "Active admins can manage knowledge categories"
      on public.knowledge_categories for all
      to authenticated
      using (private.is_admin())
      with check (private.is_admin());
  end if;

  if to_regclass('public.knowledge_base') is not null then
    drop policy if exists "Admins can manage knowledge" on public.knowledge_base;
    drop policy if exists "Active admins can manage knowledge base" on public.knowledge_base;

    create policy "Active admins can manage knowledge base"
      on public.knowledge_base for all
      to authenticated
      using (private.is_admin())
      with check (private.is_admin());
  end if;

  if to_regclass('public.chat_feedback') is not null then
    drop policy if exists "Admins can view all feedback" on public.chat_feedback;
    drop policy if exists "Active admins can manage chat feedback" on public.chat_feedback;

    create policy "Active admins can manage chat feedback"
      on public.chat_feedback for all
      to authenticated
      using (private.is_admin())
      with check (private.is_admin());
  end if;

  if to_regclass('public.ai_learning_logs') is not null then
    drop policy if exists "Admins can view learning logs" on public.ai_learning_logs;
    drop policy if exists "Active admins can manage ai learning logs" on public.ai_learning_logs;

    create policy "Active admins can manage ai learning logs"
      on public.ai_learning_logs for all
      to authenticated
      using (private.is_admin())
      with check (private.is_admin());
  end if;
end $$;

notify pgrst, 'reload schema';

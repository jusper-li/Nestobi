/*
  # Multilingual architecture: pre-translation + cache + background jobs

  This migration introduces:
  1) Entity translation tables for pre-translated content
  2) Global translation cache (hash-based dedupe)
  3) Translation glossary table for brand terminology
  4) Translation job queue + auto enqueue triggers
*/

-- 0) Extensions
create extension if not exists pgcrypto;

-- 1) Pre-translated tables (80% static content path)
create table if not exists product_translations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  lang text not null,
  title text not null default '',
  description text not null default '',
  origin text not null default '',
  roast_level text not null default '',
  processing_method text not null default '',
  flavor_notes text[] not null default '{}',
  tags text[] not null default '{}',
  is_ai_translated boolean not null default true,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  updated_at timestamptz not null default now(),
  unique (product_id, lang)
);

create table if not exists room_translations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references tbl_rooms(id) on delete cascade,
  lang text not null,
  name text not null default '',
  description text not null default '',
  location text not null default '',
  amenities text[] not null default '{}',
  is_ai_translated boolean not null default true,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  updated_at timestamptz not null default now(),
  unique (room_id, lang)
);

create table if not exists blog_post_translations (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references blog_posts(id) on delete cascade,
  lang text not null,
  title text not null default '',
  excerpt text not null default '',
  content text not null default '',
  category text not null default '',
  author_name text not null default '',
  tags text[] not null default '{}',
  is_ai_translated boolean not null default true,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  updated_at timestamptz not null default now(),
  unique (post_id, lang)
);

create table if not exists category_translations (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  lang text not null,
  name text not null default '',
  is_ai_translated boolean not null default true,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  updated_at timestamptz not null default now(),
  unique (category_id, lang)
);

create table if not exists static_page_translations (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references static_pages(id) on delete cascade,
  lang text not null,
  title text not null default '',
  content text not null default '',
  meta_description text not null default '',
  is_ai_translated boolean not null default true,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  updated_at timestamptz not null default now(),
  unique (page_id, lang)
);

-- 2) Translation cache (20% dynamic path + global dedupe)
create table if not exists translation_cache (
  id uuid primary key default gen_random_uuid(),
  source_hash text not null,
  source_text text not null default '',
  source_lang text not null,
  target_lang text not null,
  translated_text text not null default '',
  provider text not null default 'openai',
  created_at timestamptz not null default now(),
  unique (source_hash, source_lang, target_lang)
);

-- 3) Brand glossary / dictionary
create table if not exists translation_glossary_terms (
  id uuid primary key default gen_random_uuid(),
  source_lang text not null default 'zh-TW',
  target_lang text not null,
  source_text text not null,
  target_text text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_lang, target_lang, source_text)
);

-- 4) Background translation jobs
create table if not exists translation_jobs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  source_hash text not null,
  source_payload jsonb not null default '{}'::jsonb,
  source_lang text not null default 'zh-TW',
  target_langs text[] not null default '{en,ja,th,ms}',
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  attempt_count int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_translation_jobs_dedup_pending
  on translation_jobs(entity_type, entity_id, source_hash, status)
  where status in ('pending', 'processing');

create index if not exists idx_translation_jobs_status_created
  on translation_jobs(status, created_at);

create index if not exists idx_translation_cache_lookup
  on translation_cache(source_hash, source_lang, target_lang);

-- 5) RLS
alter table product_translations enable row level security;
alter table room_translations enable row level security;
alter table blog_post_translations enable row level security;
alter table category_translations enable row level security;
alter table static_page_translations enable row level security;
alter table translation_cache enable row level security;
alter table translation_glossary_terms enable row level security;
alter table translation_jobs enable row level security;

-- Public read translated content
drop policy if exists "Public read product translations" on product_translations;
create policy "Public read product translations" on product_translations for select to anon, authenticated using (true);

drop policy if exists "Public read room translations" on room_translations;
create policy "Public read room translations" on room_translations for select to anon, authenticated using (true);

drop policy if exists "Public read blog translations" on blog_post_translations;
create policy "Public read blog translations" on blog_post_translations for select to anon, authenticated using (true);

drop policy if exists "Public read category translations" on category_translations;
create policy "Public read category translations" on category_translations for select to anon, authenticated using (true);

drop policy if exists "Public read static page translations" on static_page_translations;
create policy "Public read static page translations" on static_page_translations for select to anon, authenticated using (true);

drop policy if exists "Public read translation cache" on translation_cache;
create policy "Public read translation cache" on translation_cache for select to anon, authenticated using (true);

drop policy if exists "Public read glossary terms" on translation_glossary_terms;
create policy "Public read glossary terms" on translation_glossary_terms for select to anon, authenticated using (is_active = true);

-- Admin/superadmin manage all translation resources
create or replace function public.is_admin_or_superadmin(_uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from tbl_user_auth ua
    where ua.user_id = _uid
      and ua.role in ('admin', 'superadmin')
      and ua.is_active = true
  );
$$;

drop policy if exists "Admins manage product translations" on product_translations;
create policy "Admins manage product translations" on product_translations
for all to authenticated
using (public.is_admin_or_superadmin(auth.uid()))
with check (public.is_admin_or_superadmin(auth.uid()));

drop policy if exists "Admins manage room translations" on room_translations;
create policy "Admins manage room translations" on room_translations
for all to authenticated
using (public.is_admin_or_superadmin(auth.uid()))
with check (public.is_admin_or_superadmin(auth.uid()));

drop policy if exists "Admins manage blog translations" on blog_post_translations;
create policy "Admins manage blog translations" on blog_post_translations
for all to authenticated
using (public.is_admin_or_superadmin(auth.uid()))
with check (public.is_admin_or_superadmin(auth.uid()));

drop policy if exists "Admins manage category translations" on category_translations;
create policy "Admins manage category translations" on category_translations
for all to authenticated
using (public.is_admin_or_superadmin(auth.uid()))
with check (public.is_admin_or_superadmin(auth.uid()));

drop policy if exists "Admins manage static page translations" on static_page_translations;
create policy "Admins manage static page translations" on static_page_translations
for all to authenticated
using (public.is_admin_or_superadmin(auth.uid()))
with check (public.is_admin_or_superadmin(auth.uid()));

drop policy if exists "Admins manage translation cache" on translation_cache;
create policy "Admins manage translation cache" on translation_cache
for all to authenticated
using (public.is_admin_or_superadmin(auth.uid()))
with check (public.is_admin_or_superadmin(auth.uid()));

drop policy if exists "Admins manage glossary terms" on translation_glossary_terms;
create policy "Admins manage glossary terms" on translation_glossary_terms
for all to authenticated
using (public.is_admin_or_superadmin(auth.uid()))
with check (public.is_admin_or_superadmin(auth.uid()));

drop policy if exists "Admins manage translation jobs" on translation_jobs;
create policy "Admins manage translation jobs" on translation_jobs
for all to authenticated
using (public.is_admin_or_superadmin(auth.uid()))
with check (public.is_admin_or_superadmin(auth.uid()));

-- 6) Auto enqueue translation jobs after content change
create or replace function public.enqueue_translation_job(
  _entity_type text,
  _entity_id uuid,
  _source_payload jsonb,
  _source_lang text default 'zh-TW',
  _target_langs text[] default '{en,ja,th,ms}'
)
returns void
language plpgsql
security definer
as $$
declare
  _source_hash text;
begin
  _source_hash := encode(digest(coalesce(_source_payload::text, ''), 'sha256'), 'hex');

  insert into translation_jobs (
    entity_type,
    entity_id,
    source_hash,
    source_payload,
    source_lang,
    target_langs,
    status
  )
  values (
    _entity_type,
    _entity_id,
    _source_hash,
    coalesce(_source_payload, '{}'::jsonb),
    _source_lang,
    _target_langs,
    'pending'
  )
  on conflict (entity_type, entity_id, source_hash, status)
  where status in ('pending', 'processing')
  do nothing;
end;
$$;

create or replace function public.trg_enqueue_product_translation()
returns trigger
language plpgsql
as $$
begin
  perform public.enqueue_translation_job(
    'product',
    new.id,
    jsonb_build_object(
      'name', coalesce(new.name, ''),
      'description', coalesce(new.description, ''),
      'origin', coalesce(new.origin, ''),
      'roast_level', coalesce(new.roast_level, ''),
      'processing_method', coalesce(new.processing_method, ''),
      'flavor_notes', coalesce(to_jsonb(new.flavor_notes), '[]'::jsonb),
      'tags', coalesce(to_jsonb(new.tags), '[]'::jsonb)
    )
  );
  return new;
end;
$$;

create or replace function public.trg_enqueue_category_translation()
returns trigger
language plpgsql
as $$
begin
  perform public.enqueue_translation_job(
    'category',
    new.id,
    jsonb_build_object('name', coalesce(new.name, ''))
  );
  return new;
end;
$$;

create or replace function public.trg_enqueue_room_translation()
returns trigger
language plpgsql
as $$
begin
  perform public.enqueue_translation_job(
    'room',
    new.id,
    jsonb_build_object(
      'name', coalesce(new.name, ''),
      'description', coalesce(new.description, ''),
      'location', coalesce(new.location, ''),
      'amenities', coalesce(to_jsonb(new.amenities), '[]'::jsonb)
    )
  );
  return new;
end;
$$;

create or replace function public.trg_enqueue_blog_translation()
returns trigger
language plpgsql
as $$
begin
  perform public.enqueue_translation_job(
    'blog_post',
    new.id,
    jsonb_build_object(
      'title', coalesce(new.title, ''),
      'excerpt', coalesce(new.excerpt, ''),
      'content', coalesce(new.content, ''),
      'category', coalesce(new.category, ''),
      'author_name', coalesce(new.author_name, ''),
      'tags', coalesce(to_jsonb(new.tags), '[]'::jsonb)
    )
  );
  return new;
end;
$$;

create or replace function public.trg_enqueue_static_page_translation()
returns trigger
language plpgsql
as $$
begin
  perform public.enqueue_translation_job(
    'static_page',
    new.id,
    jsonb_build_object(
      'title', coalesce(new.title, ''),
      'content', coalesce(new.content, ''),
      'meta_description', coalesce(new.meta_description, '')
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_products_enqueue_translation on products;
create trigger trg_products_enqueue_translation
after insert or update of name, description, origin, roast_level, processing_method, flavor_notes, tags
on products
for each row
execute function public.trg_enqueue_product_translation();

drop trigger if exists trg_categories_enqueue_translation on categories;
create trigger trg_categories_enqueue_translation
after insert or update of name
on categories
for each row
execute function public.trg_enqueue_category_translation();

drop trigger if exists trg_rooms_enqueue_translation on tbl_rooms;
create trigger trg_rooms_enqueue_translation
after insert or update of name, description, location, amenities
on tbl_rooms
for each row
execute function public.trg_enqueue_room_translation();

drop trigger if exists trg_blog_posts_enqueue_translation on blog_posts;
create trigger trg_blog_posts_enqueue_translation
after insert or update of title, excerpt, content, category, author_name, tags
on blog_posts
for each row
execute function public.trg_enqueue_blog_translation();

drop trigger if exists trg_static_pages_enqueue_translation on static_pages;
create trigger trg_static_pages_enqueue_translation
after insert or update of title, content, meta_description
on static_pages
for each row
execute function public.trg_enqueue_static_page_translation();

-- 7) Seed core glossary examples
insert into translation_glossary_terms (source_lang, target_lang, source_text, target_text)
values
  ('zh-TW', 'en', '購物金', 'Shopping Credit'),
  ('zh-TW', 'en', '廣告金', 'Ad Credit'),
  ('zh-TW', 'en', '團主', 'Group Leader'),
  ('zh-TW', 'en', '迪迪購', 'Didigo')
on conflict (source_lang, target_lang, source_text) do update
set target_text = excluded.target_text,
    is_active = true,
    updated_at = now();


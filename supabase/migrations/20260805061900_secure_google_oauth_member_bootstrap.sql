create schema if not exists private;

create or replace function private.bootstrap_nestobi_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
  profile_avatar text;
begin
  profile_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(new.email, ''), '@', 1),
    ''
  );
  profile_avatar := coalesce(
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(new.raw_user_meta_data ->> 'picture', ''),
    ''
  );

  insert into public.tbl_user_auth (user_id, role, is_active)
  values (new.id, 'user', true)
  on conflict (user_id) do nothing;

  insert into public.tbl_mn5wgzh0 (user_id, display_name, avatar_url, preferred_language)
  values (new.id, profile_name, profile_avatar, 'zh-TW')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.bootstrap_nestobi_auth_user() from public, anon, authenticated;

drop trigger if exists on_nestobi_auth_user_created on auth.users;
create trigger on_nestobi_auth_user_created
  after insert on auth.users
  for each row execute function private.bootstrap_nestobi_auth_user();

insert into public.tbl_user_auth (user_id, role, is_active)
select u.id, 'user', true
from auth.users u
on conflict (user_id) do nothing;

insert into public.tbl_mn5wgzh0 (user_id, display_name, avatar_url, preferred_language)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'display_name', ''),
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(u.email, ''), '@', 1),
    ''
  ),
  coalesce(
    nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(u.raw_user_meta_data ->> 'picture', ''),
    ''
  ),
  'zh-TW'
from auth.users u
on conflict (user_id) do nothing;

drop policy if exists "Users can insert own auth record" on public.tbl_user_auth;
drop policy if exists "Users can update own auth record" on public.tbl_user_auth;

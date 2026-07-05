/*
  Expose a safe admin profile RPC for backoffice auth bootstrap.
  This avoids direct client-side reads on public.admins and works with strict RLS.
*/

create or replace function public.get_my_admin_profile()
returns table (
  id uuid,
  email text,
  name text,
  avatar_url text,
  is_active boolean,
  last_login_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    a.id,
    a.email,
    a.name,
    a.avatar_url,
    a.is_active,
    a.last_login_at,
    a.created_at,
    a.updated_at
  from public.admins a
  where a.is_active = true
    and (
      (a.auth_user_id is not null and a.auth_user_id = auth.uid())
      or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  limit 1;
$$;

revoke all on function public.get_my_admin_profile() from public, anon;
grant execute on function public.get_my_admin_profile() to authenticated;

notify pgrst, 'reload schema';

create or replace function public.get_admins_with_roles()
returns table (
  id uuid,
  email text,
  name text,
  is_active boolean,
  last_login_at timestamptz,
  created_at timestamptz,
  role_ids uuid[]
)
language sql
security definer
set search_path = public, auth
as $$
  select
    a.id,
    a.email,
    a.name,
    a.is_active,
    a.last_login_at,
    a.created_at,
    coalesce(array_agg(ar.role_id) filter (where ar.role_id is not null), '{}') as role_ids
  from public.admins a
  left join public.admin_roles ar on ar.admin_id = a.id
  where private.is_admin()
  group by a.id
  order by a.created_at desc;
$$;

grant execute on function public.get_admins_with_roles() to authenticated;

create or replace function public.create_admin_with_roles(
  p_email text,
  p_name text,
  p_is_active boolean default true,
  p_role_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
  v_role_id uuid;
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode='42501';
  end if;

  insert into public.admins(email, name, is_active)
  values (lower(trim(p_email)), trim(p_name), coalesce(p_is_active, true))
  returning id into v_id;

  foreach v_role_id in array coalesce(p_role_ids, '{}') loop
    insert into public.admin_roles(admin_id, role_id)
    values (v_id, v_role_id)
    on conflict do nothing;
  end loop;

  return v_id;
end;
$$;

grant execute on function public.create_admin_with_roles(text,text,boolean,uuid[]) to authenticated;

create or replace function public.set_admin_active(
  p_admin_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode='42501';
  end if;

  update public.admins
  set is_active = p_is_active
  where id = p_admin_id;
end;
$$;

grant execute on function public.set_admin_active(uuid,boolean) to authenticated;

create or replace function public.delete_admin_with_roles(
  p_admin_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode='42501';
  end if;

  delete from public.admin_roles where admin_id = p_admin_id;
  delete from public.admins where id = p_admin_id;
end;
$$;

grant execute on function public.delete_admin_with_roles(uuid) to authenticated;

create or replace function public.set_admin_role(
  p_admin_id uuid,
  p_role_id uuid,
  p_enable boolean
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode='42501';
  end if;

  if p_enable then
    insert into public.admin_roles(admin_id, role_id)
    values (p_admin_id, p_role_id)
    on conflict do nothing;
  else
    delete from public.admin_roles
    where admin_id = p_admin_id
      and role_id = p_role_id;
  end if;
end;
$$;

grant execute on function public.set_admin_role(uuid,uuid,boolean) to authenticated;

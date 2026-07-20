/*
  Allow vendor/admin/superadmin users to write audit logs from admin consoles.

  This keeps the audit table readable only by admins while allowing vendor
  dashboard actions to be recorded. Inserted rows must belong to the current
  authenticated user through actor_user_id, preventing users from spoofing the
  actor on audit records.
*/

alter table public.admin_activity_logs enable row level security;

drop policy if exists "Admins can insert admin activity logs" on public.admin_activity_logs;
drop policy if exists "Authenticated users can insert admin activity logs" on public.admin_activity_logs;
drop policy if exists "Vendor and admin users can insert admin activity logs" on public.admin_activity_logs;

create policy "Vendor and admin users can insert admin activity logs"
  on public.admin_activity_logs
  for insert
  to authenticated
  with check (
    actor_user_id = auth.uid()
    and exists (
      select 1
      from public.tbl_user_auth
      where tbl_user_auth.user_id = auth.uid()
        and tbl_user_auth.role in ('vendor', 'admin', 'superadmin')
        and coalesce(tbl_user_auth.is_active, true) = true
    )
  );

drop policy if exists "Admins can read admin activity logs" on public.admin_activity_logs;
create policy "Admins can read admin activity logs"
  on public.admin_activity_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.tbl_user_auth
      where tbl_user_auth.user_id = auth.uid()
        and tbl_user_auth.role in ('admin', 'superadmin')
        and coalesce(tbl_user_auth.is_active, true) = true
    )
  );

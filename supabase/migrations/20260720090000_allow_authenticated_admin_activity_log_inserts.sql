/*
  Allow signed-in vendor and admin users to write shared activity logs.

  The frontend reuses logAdminAction() across vendor and superadmin pages, so
  admin_activity_logs must accept inserts from any authenticated user while
  keeping read access limited to admins.
*/

alter table public.admin_activity_logs enable row level security;

drop policy if exists "Authenticated users can insert admin activity logs" on public.admin_activity_logs;
create policy "Authenticated users can insert admin activity logs"
  on public.admin_activity_logs
  for insert
  to authenticated
  with check (auth.uid() is not null);

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
    )
  );

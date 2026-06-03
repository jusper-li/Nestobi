drop policy if exists "users read own points" on public.points;
create policy "users read own points"
  on public.points
  for select
  using (user_id = (select auth.uid()) or private.is_admin());

drop policy if exists "Vendors can view linked points" on public.points;
create policy "Vendors can view linked points"
  on public.points
  for select
  using (
    vendor_id in (
      select vendors.id
      from public.vendors
      where vendors.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can view own point balance" on public.member_point_balances;
create policy "Users can view own point balance"
  on public.member_point_balances
  for select
  using (user_id = (select auth.uid()) or private.is_admin());

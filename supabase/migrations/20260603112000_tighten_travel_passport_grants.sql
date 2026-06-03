revoke all on public.travel_passport from anon;
revoke all on public.travel_passport from authenticated;

grant select, insert, update, delete on public.travel_passport to authenticated;

drop policy if exists "users manage own passport" on public.travel_passport;
create policy "users manage own passport"
  on public.travel_passport
  for all
  using (user_id = (select auth.uid()) or private.is_admin())
  with check (user_id = (select auth.uid()) or private.is_admin());

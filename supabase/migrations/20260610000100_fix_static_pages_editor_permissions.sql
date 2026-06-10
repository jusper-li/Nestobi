/*
  # Fix static page editor permissions

  The static page editor needs two things:
  - authenticated admins/superadmins can update `static_pages`
  - authenticated admins/superadmins can upload editor images to `site-assets/static-pages/*`

  This aligns the database policies with the current backoffice workflow.
*/

drop policy if exists "superadmins manage static pages" on public.static_pages;
drop policy if exists "Admins can update static pages" on public.static_pages;

create policy "Admins manage static pages"
  on public.static_pages
  for all
  to authenticated
  using (public.is_admin_or_superadmin(auth.uid()))
  with check (public.is_admin_or_superadmin(auth.uid()));

drop policy if exists "Admins upload static page assets" on storage.objects;

create policy "Admins upload static page assets"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'site-assets'
    and (storage.foldername(name))[1] = 'static-pages'
    and private.has_role(array['admin', 'superadmin'])
  );

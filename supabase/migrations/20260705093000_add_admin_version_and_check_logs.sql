/*
  Add version, check, and completion tracking to admin activity logs.

  The existing admin_activity_logs table becomes the single source of truth for:
  - modifications (record_type = change)
  - automated checks (record_type = check)
  - version baselines (record_type = baseline)

  This keeps the audit trail in one place and lets the front-end write the
  current build label / commit hash alongside each record.
*/

alter table public.admin_activity_logs
  add column if not exists record_type text not null default 'change',
  add column if not exists status text not null default 'completed',
  add column if not exists summary text,
  add column if not exists route text,
  add column if not exists version_label text,
  add column if not exists commit_sha text,
  add column if not exists completed_at timestamptz;

alter table public.admin_activity_logs
  alter column completed_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_activity_logs_record_type_check'
  ) then
    alter table public.admin_activity_logs
      add constraint admin_activity_logs_record_type_check
      check (record_type in ('change', 'check', 'baseline'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_activity_logs_status_check'
  ) then
    alter table public.admin_activity_logs
      add constraint admin_activity_logs_status_check
      check (status in ('pending', 'completed', 'failed'));
  end if;
end $$;

create index if not exists idx_admin_activity_logs_record_type
  on public.admin_activity_logs(record_type, created_at desc);

create index if not exists idx_admin_activity_logs_version_label
  on public.admin_activity_logs(version_label, created_at desc);

create index if not exists idx_admin_activity_logs_status
  on public.admin_activity_logs(status, created_at desc);

create index if not exists idx_admin_activity_logs_route
  on public.admin_activity_logs(route, created_at desc);

create unique index if not exists idx_admin_activity_logs_baseline_version_unique
  on public.admin_activity_logs(version_label)
  where record_type = 'baseline' and version_label is not null;

alter table public.tbl_mn5wgzh0
  add column if not exists coffee_profile_key text,
  add column if not exists coffee_profile_label text,
  add column if not exists coffee_profile_summary text,
  add column if not exists coffee_profile_scores jsonb not null default '{}'::jsonb,
  add column if not exists coffee_profile_answers jsonb not null default '{}'::jsonb,
  add column if not exists coffee_quiz_completed_at timestamptz;

update public.tbl_mn5wgzh0
set
  coffee_profile_scores = coalesce(coffee_profile_scores, '{}'::jsonb),
  coffee_profile_answers = coalesce(coffee_profile_answers, '{}'::jsonb)
where coffee_profile_scores is null
   or coffee_profile_answers is null;

create index if not exists idx_tbl_mn5wgzh0_coffee_profile_key on public.tbl_mn5wgzh0(coffee_profile_key);
create index if not exists idx_tbl_mn5wgzh0_coffee_quiz_completed_at on public.tbl_mn5wgzh0(coffee_quiz_completed_at desc);

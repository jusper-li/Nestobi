/*
  Coffee Quiz CMS + Submissions
*/

create table if not exists public.coffee_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  image_url text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coffee_quiz_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.coffee_quiz_questions(id) on delete cascade,
  option_key text not null check (option_key in ('A', 'B', 'C', 'D')),
  option_text text not null,
  score numeric not null default 1,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, option_key)
);

create table if not exists public.coffee_quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  member_email text,
  member_name text not null,
  member_phone text not null,
  result_type text not null,
  roast_score int not null default 5,
  acidity_score int not null default 5,
  adventure_score int not null default 5,
  answers jsonb not null default '{}'::jsonb,
  agreement boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_quiz_questions_order on public.coffee_quiz_questions(display_order);
create index if not exists idx_quiz_options_question on public.coffee_quiz_question_options(question_id, display_order);
create index if not exists idx_quiz_submissions_created_at on public.coffee_quiz_submissions(created_at desc);
create index if not exists idx_quiz_submissions_user_id on public.coffee_quiz_submissions(user_id);
create index if not exists idx_quiz_submissions_result on public.coffee_quiz_submissions(result_type);

alter table public.coffee_quiz_questions enable row level security;
alter table public.coffee_quiz_question_options enable row level security;
alter table public.coffee_quiz_submissions enable row level security;

grant select on public.coffee_quiz_questions to anon, authenticated;
grant select on public.coffee_quiz_question_options to anon, authenticated;
grant select, insert on public.coffee_quiz_submissions to authenticated;

drop policy if exists "Quiz questions are publicly readable" on public.coffee_quiz_questions;
create policy "Quiz questions are publicly readable"
  on public.coffee_quiz_questions
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Quiz admins can manage questions" on public.coffee_quiz_questions;
create policy "Quiz admins can manage questions"
  on public.coffee_quiz_questions
  for all
  to authenticated
  using (
    exists (
      select 1 from public.tbl_user_auth
      where user_id = auth.uid() and role in ('admin', 'superadmin')
    )
  )
  with check (
    exists (
      select 1 from public.tbl_user_auth
      where user_id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

drop policy if exists "Quiz options are publicly readable" on public.coffee_quiz_question_options;
create policy "Quiz options are publicly readable"
  on public.coffee_quiz_question_options
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.coffee_quiz_questions q
      where q.id = coffee_quiz_question_options.question_id and q.is_active = true
    )
  );

drop policy if exists "Quiz admins can manage options" on public.coffee_quiz_question_options;
create policy "Quiz admins can manage options"
  on public.coffee_quiz_question_options
  for all
  to authenticated
  using (
    exists (
      select 1 from public.tbl_user_auth
      where user_id = auth.uid() and role in ('admin', 'superadmin')
    )
  )
  with check (
    exists (
      select 1 from public.tbl_user_auth
      where user_id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

drop policy if exists "Users can insert own quiz submissions" on public.coffee_quiz_submissions;
create policy "Users can insert own quiz submissions"
  on public.coffee_quiz_submissions
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can view own quiz submissions" on public.coffee_quiz_submissions;
create policy "Users can view own quiz submissions"
  on public.coffee_quiz_submissions
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.tbl_user_auth
      where user_id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

alter table public.social_accounts
add column if not exists sort_order integer;

update public.social_accounts s
set sort_order = ranked.rn
from (
  select id, row_number() over (order by platform asc, created_at asc, id asc) as rn
  from public.social_accounts
) ranked
where s.id = ranked.id
  and s.sort_order is null;

alter table public.social_accounts
alter column sort_order set default 0;

create index if not exists idx_social_accounts_sort_order
on public.social_accounts (sort_order asc, platform asc);

create or replace function public.digest(data text, type text)
returns bytea
language sql
immutable
as $$
  select extensions.digest(convert_to($1, 'UTF8'), $2);
$$;

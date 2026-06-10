create or replace function public.trg_enqueue_product_translation()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  perform public.enqueue_translation_job(
    'product',
    new.id,
    jsonb_build_object(
      'name', coalesce(new.name, ''),
      'description', coalesce(new.description, ''),
      'origin', coalesce(new.origin, ''),
      'roast_level', coalesce(new.roast_level, ''),
      'processing_method', coalesce(new.processing_method, ''),
      'flavor_notes', coalesce(to_jsonb(new.flavor_notes), '[]'::jsonb),
      'tags', coalesce(to_jsonb(new.tags), '[]'::jsonb)
    )
  );
  return new;
end;
$function$;

create or replace function public.trg_enqueue_category_translation()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  perform public.enqueue_translation_job(
    'category',
    new.id,
    jsonb_build_object('name', coalesce(new.name, ''))
  );
  return new;
end;
$function$;

create or replace function public.trg_enqueue_room_translation()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  perform public.enqueue_translation_job(
    'room',
    new.id,
    jsonb_build_object(
      'name', coalesce(new.name, ''),
      'description', coalesce(new.description, ''),
      'location', coalesce(new.location, ''),
      'amenities', coalesce(to_jsonb(new.amenities), '[]'::jsonb)
    )
  );
  return new;
end;
$function$;

create or replace function public.trg_enqueue_blog_translation()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  perform public.enqueue_translation_job(
    'blog_post',
    new.id,
    jsonb_build_object(
      'title', coalesce(new.title, ''),
      'excerpt', coalesce(new.excerpt, ''),
      'content', coalesce(new.content, ''),
      'category', coalesce(new.category, ''),
      'author_name', coalesce(new.author_name, ''),
      'tags', coalesce(to_jsonb(new.tags), '[]'::jsonb)
    )
  );
  return new;
end;
$function$;

create or replace function public.trg_enqueue_static_page_translation()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  perform public.enqueue_translation_job(
    'static_page',
    new.id,
    jsonb_build_object(
      'title', coalesce(new.title, ''),
      'content', coalesce(new.content, ''),
      'meta_description', coalesce(new.meta_description, '')
    )
  );
  return new;
end;
$function$;

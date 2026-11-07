-- Drafts may be incomplete; never fabricate dates or select an audience for the user.
begin;
alter table public.events alter column start_at drop not null;
alter table public.events alter column end_at drop not null;
alter table public.events alter column audience_type drop not null;
alter table public.events alter column audience_type drop default;

alter table public.events drop constraint if exists events_audience_categories_check;
alter table public.events add constraint events_audience_categories_check check (
  status::text in ('draft','cancelled') or (
    (audience_type = 'all' and cardinality(audience_categories) = 0)
    or (audience_type = 'categories' and cardinality(audience_categories) > 0)
  )
) not valid;

alter table public.events drop constraint if exists events_published_details_required;
alter table public.events add constraint events_published_details_required check (
  status::text in ('draft','cancelled') or (
    start_at is not null and end_at is not null and end_at > start_at
    and audience_type is not null and audience_type in ('all','categories')
    and nullif(btrim(description),'') is not null
  )
) not valid;

alter table public.events drop constraint if exists events_title_required;
alter table public.events add constraint events_title_required
  check (nullif(btrim(title),'') is not null) not valid;
-- Existing enum/category value checks, schedule ordering, RLS and triggers are retained.
commit;

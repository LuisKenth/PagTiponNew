begin;

-- Preserve all accounts. Stop rather than delete or demote any existing user.
lock table public.profiles in share row exclusive mode;
alter table public.profiles add column if not exists municipal_admin_slot smallint;

do $$
declare item record; available_slot smallint;
begin
  if exists (
    select 1 from public.profiles
    where role = 'municipal_admin' and verification_status = 'approved'
    group by lower(btrim(municipality)) having count(*) > 2
  ) then
    raise exception 'Cannot apply the limit: a municipality already has more than 2 approved Municipal Admins. Review its accounts first.';
  end if;
  if exists (select 1 from public.profiles where role = 'municipal_admin' and verification_status = 'approved' and nullif(btrim(municipality),'') is null) then
    raise exception 'An approved Municipal Admin has no municipality. Correct the profile before applying this migration.';
  end if;
  for item in select id,municipality from public.profiles
    where role = 'municipal_admin' and verification_status = 'approved' and municipal_admin_slot is null
    order by created_at,id
  loop
    select s into available_slot from generate_series(1,2) s
    where not exists (select 1 from public.profiles p where p.role = 'municipal_admin' and p.verification_status = 'approved'
      and lower(btrim(p.municipality)) = lower(btrim(item.municipality)) and p.municipal_admin_slot = s)
    order by s limit 1;
    if available_slot is null then raise exception 'No available Municipal Admin slot for %.',item.municipality; end if;
    update public.profiles set municipal_admin_slot = available_slot where id = item.id;
  end loop;
end $$;

-- Keep the existing function/trigger name so other dependencies stay attached.
create or replace function public.enforce_one_municipal_admin()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare municipality_key text; available_slot smallint;
begin
  if new.role = 'municipal_admin' and new.verification_status = 'approved' then
    municipality_key := lower(btrim(new.municipality));
    if nullif(municipality_key,'') is null then raise exception 'Municipality is required.'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('municipal-admin:' || municipality_key,0));
    if tg_op = 'UPDATE' then
      if old.role = 'municipal_admin' and old.verification_status = 'approved'
         and lower(btrim(old.municipality)) = municipality_key and old.municipal_admin_slot in (1,2) then
        new.municipal_admin_slot := old.municipal_admin_slot;
        return new;
      end if;
    end if;
    select s into available_slot from pg_catalog.generate_series(1,2) s
    where not exists (select 1 from public.profiles p
      where p.role = 'municipal_admin' and p.verification_status = 'approved'
        and lower(btrim(p.municipality)) = municipality_key
        and p.id is distinct from new.id and p.municipal_admin_slot = s)
    order by s limit 1;
    if available_slot is null then
      raise exception 'Maximum 2 approved Municipal Admins are allowed for this municipality.';
    end if;
    new.municipal_admin_slot := available_slot;
  else
    new.municipal_admin_slot := null;
  end if;
  return new;
end $$;

-- The unique slot index is the final concurrent-write protection.
create unique index if not exists profiles_two_municipal_admin_slots
  on public.profiles (lower(btrim(municipality)),municipal_admin_slot)
  where role = 'municipal_admin' and verification_status = 'approved';

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_municipal_admin_slot_range') then
    alter table public.profiles add constraint profiles_municipal_admin_slot_range check (municipal_admin_slot is null or municipal_admin_slot between 1 and 2);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_approved_municipal_admin_slot_required') then
    alter table public.profiles add constraint profiles_approved_municipal_admin_slot_required check ((role = 'municipal_admin' and verification_status = 'approved') is not true or municipal_admin_slot is not null);
  end if;
end $$;

drop trigger if exists enforce_one_municipal_admin_trigger on public.profiles;
create trigger enforce_one_municipal_admin_trigger before insert or update on public.profiles
for each row execute function public.enforce_one_municipal_admin();
revoke all on function public.enforce_one_municipal_admin() from public,anon,authenticated;
grant execute on function public.enforce_one_municipal_admin() to service_role;
comment on column public.profiles.municipal_admin_slot is 'Internal capacity slot (1 or 2) for approved Municipal Admins. Not a primary/backup role.';
commit;

-- Maximum TWO approved Provincial Admin profiles. Inactive history is retained.
-- Apply after 20261031100000_super_admin_portal.sql.
begin;
-- Prevent profile changes between the initial count and installation of the trigger.
lock table public.profiles in share row exclusive mode;
do $$
begin
 if (select count(*) from public.profiles where role::text='provincial_admin'
     and verification_status::text='approved') > 2 then
  raise exception 'More than 2 Provincial Admin accounts are active. Deactivate extra accounts in the Super Admin portal, then run this migration again.';
 end if;
end;
$$;

-- A private singleton counter makes the ceiling atomic, including concurrent requests.
create table if not exists public.provincial_admin_capacity (
 singleton boolean primary key default true check(singleton),
 active_count integer not null,
 active_limit integer not null default 2 check(active_limit=2),
 check(active_count between 0 and active_limit)
);
alter table public.provincial_admin_capacity enable row level security;
revoke all on public.provincial_admin_capacity from public,anon,authenticated,service_role;
insert into public.provincial_admin_capacity(singleton,active_count,active_limit)
select true,count(*)::integer,2 from public.profiles
where role::text='provincial_admin' and verification_status::text='approved'
on conflict(singleton) do update set active_count=excluded.active_count,active_limit=2;

create or replace function public.enforce_provincial_admin_capacity()
returns trigger language plpgsql security definer set search_path='' as $$
declare was_active boolean := false; will_be_active boolean := false;
begin
 if tg_op<>'INSERT' then
  was_active := coalesce(old.role::text='provincial_admin' and old.verification_status::text='approved',false);
 end if;
 if tg_op<>'DELETE' then
  will_be_active := coalesce(new.role::text='provincial_admin' and new.verification_status::text='approved',false);
 end if;
 if was_active is distinct from will_be_active then
  if will_be_active then
   update public.provincial_admin_capacity set active_count=active_count+1
   where singleton=true and active_count<active_limit;
   if not found then
    raise exception using errcode='PT409',
     message='Maximum of 2 active Provincial Admin accounts reached. Deactivate an existing Provincial Admin before adding or activating another.';
   end if;
  else
   update public.provincial_admin_capacity set active_count=active_count-1
   where singleton=true and active_count>0;
   if not found then raise exception 'Provincial Admin capacity is unavailable. Contact the system maintainer.'; end if;
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$$;
revoke all on function public.enforce_provincial_admin_capacity() from public,anon,authenticated,service_role;
drop trigger if exists enforce_provincial_admin_capacity_trigger on public.profiles;
create trigger enforce_provincial_admin_capacity_trigger after insert or update or delete on public.profiles
for each row execute function public.enforce_provincial_admin_capacity();

create or replace function public.super_provincial_capacity()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 select jsonb_build_object('activeCount',active_count,'activeLimit',active_limit,
  'remaining',active_limit-active_count) into result
 from public.provincial_admin_capacity where singleton=true;
 if result is null then raise exception 'Provincial Admin capacity is unavailable.'; end if;
 return result;
end;
$$;
revoke all on function public.super_provincial_capacity() from public,anon,authenticated;
grant execute on function public.super_provincial_capacity() to service_role;
commit;

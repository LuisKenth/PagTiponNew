-- Run AFTER 20261101060000_two_municipal_admins.sql.
-- Commit the enum value before using it (also works when pasted into SQL Editor).
begin;
alter type public.verification_status add value if not exists 'inactive';
commit;
begin;

create table if not exists public.municipal_admin_account_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null,
 target_id uuid not null, action text not null, details jsonb not null default '{}',
 created_at timestamptz not null default now()
);
alter table public.municipal_admin_account_logs enable row level security;
revoke all on public.municipal_admin_account_logs from public,anon,authenticated;
grant select on public.municipal_admin_account_logs to service_role;
create index if not exists municipal_admin_account_logs_target on public.municipal_admin_account_logs(target_id,created_at);

create or replace function public.municipal_management_actor(p_actor uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join auth.users u on u.id=p.id
 where p.id=p_actor and p.role::text='provincial_admin' and p.verification_status::text='approved'
 and (u.banned_until is null or u.banned_until<=now())
 and coalesce(u.raw_app_meta_data->>'must_change_password','false')<>'true');
$$;
revoke all on function public.municipal_management_actor(uuid) from public,anon,authenticated;
grant execute on function public.municipal_management_actor(uuid) to service_role;

create or replace function public.provincial_set_municipal_admin_status(p_actor uuid,p_target uuid,p_action text)
returns void language plpgsql security definer set search_path='' as $$
declare target public.profiles%rowtype; desired public.verification_status;
begin
 if not public.municipal_management_actor(p_actor) or p_actor=p_target then raise exception using errcode='42501',message='Only approved Provincial Admins may manage Municipal Admins.'; end if;
 if p_action not in ('activate','deactivate') or p_action is null then raise exception 'Invalid action.'; end if;
 select * into target from public.profiles where id=p_target for update;
 if not found or target.role::text<>'municipal_admin' then raise exception using errcode='PT404',message='Municipal Admin not found.'; end if;
 if exists(select 1 from public.municipal_admin_account_logs where target_id=p_target and action='delete_requested'
 and details->>'state'='pending' and created_at>now()-interval '10 minutes') then
  raise exception using errcode='PT409',message='Account deletion is in progress. Refresh and try again later.';
 end if;
 desired := case when p_action='activate' then 'approved'::public.verification_status else 'inactive'::public.verification_status end;
 if target.verification_status=desired then return; end if;
 -- Capacity trigger + unique slot index remain authoritative, including reactivation.
 update public.profiles set verification_status=desired where id=p_target;
 insert into public.municipal_admin_account_logs(actor_id,target_id,action,details)
 values(p_actor,p_target,p_action,jsonb_build_object('targetName',target.full_name,'targetEmail',target.email,'municipality',target.municipality,'previousStatus',target.verification_status));
end $$;
revoke all on function public.provincial_set_municipal_admin_status(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.provincial_set_municipal_admin_status(uuid,uuid,text) to service_role;

-- Do not let older browser code bypass the management endpoint.
create or replace function public.guard_municipal_profile_authority()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if coalesce(auth.role(),'')='authenticated' and (old.role::text='municipal_admin' or new.role::text='municipal_admin')
 and (new.id is distinct from old.id or new.role is distinct from old.role or new.municipality is distinct from old.municipality or new.verification_status is distinct from old.verification_status) then
  raise exception 'Use the Municipal Admin management service to change account access.';
 end if;
 return new;
end $$;
revoke all on function public.guard_municipal_profile_authority() from public,anon,authenticated,service_role;
drop trigger if exists guard_municipal_profile_authority_trigger on public.profiles;
create trigger guard_municipal_profile_authority_trigger before update on public.profiles for each row execute function public.guard_municipal_profile_authority();

-- Old access tokens must lose database access as soon as an admin is deactivated.
create or replace function public.municipal_account_access_allowed()
returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.profiles where id=auth.uid() and role::text='municipal_admin' and verification_status::text<>'approved');
$$;
revoke all on function public.municipal_account_access_allowed() from public,anon;
grant execute on function public.municipal_account_access_allowed() to authenticated,service_role;
do $$ declare t record; begin
 for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity and c.relname<>'profiles'
 loop
  execute format('drop policy if exists municipal_account_access_guard on public.%I',t.relname);
  execute format('create policy municipal_account_access_guard on public.%I as restrictive for all to authenticated using (public.municipal_account_access_allowed()) with check (public.municipal_account_access_allowed())',t.relname);
 end loop;
end $$;
drop policy if exists municipal_account_profile_read_guard on public.profiles;
create policy municipal_account_profile_read_guard on public.profiles as restrictive for select to authenticated
 using (public.municipal_account_access_allowed() or id=auth.uid());
drop policy if exists municipal_account_profile_write_guard on public.profiles;
create policy municipal_account_profile_write_guard on public.profiles as restrictive for update to authenticated
 using (public.municipal_account_access_allowed()) with check (public.municipal_account_access_allowed());
drop policy if exists municipal_account_storage_guard on storage.objects;
create policy municipal_account_storage_guard on storage.objects as restrictive for all to authenticated
 using (public.municipal_account_access_allowed()) with check (public.municipal_account_access_allowed());

create or replace function public.provincial_prepare_municipal_deletion(p_actor uuid,p_target uuid,p_email text)
returns uuid language plpgsql security definer set search_path='' as $$
declare target public.profiles%rowtype; account_email text; ticket uuid;
begin
 if not public.municipal_management_actor(p_actor) or p_actor=p_target then raise exception using errcode='42501',message='Only approved Provincial Admins may delete Municipal Admins.'; end if;
 select * into target from public.profiles where id=p_target for update;
 if not found or target.role::text<>'municipal_admin' then raise exception using errcode='PT404',message='Municipal Admin not found.'; end if;
 if target.verification_status::text<>'inactive' then raise exception using errcode='PT409',message='Deactivate the Municipal Admin before deleting the account.'; end if;
 select email into account_email from auth.users where id=p_target;
 if nullif(btrim(p_email),'') is null or lower(btrim(p_email)) is distinct from lower(account_email) then raise exception 'The confirmation email does not match.'; end if;
 if exists(select 1 from public.municipal_admin_account_logs where target_id=p_target and action='delete_requested' and details->>'state'='pending' and created_at>now()-interval '10 minutes') then raise exception using errcode='PT409',message='Deletion is already in progress.'; end if;
 insert into public.municipal_admin_account_logs(actor_id,target_id,action,details)
 values(p_actor,p_target,'delete_requested',jsonb_build_object('state','pending','targetEmail',account_email,'targetName',target.full_name,'municipality',target.municipality)) returning id into ticket;
 return ticket;
end $$;
revoke all on function public.provincial_prepare_municipal_deletion(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.provincial_prepare_municipal_deletion(uuid,uuid,text) to service_role;

create or replace function public.provincial_cancel_municipal_deletion(p_actor uuid,p_ticket uuid)
returns void language plpgsql security definer set search_path='' as $$
declare candidate uuid;
begin
 select target_id into candidate from public.municipal_admin_account_logs where id=p_ticket and actor_id=p_actor and action='delete_requested';
 if not found then return; end if;
 perform 1 from public.profiles where id=candidate for update;
 update public.municipal_admin_account_logs set details=details||'{"state":"cancelled"}'::jsonb where id=p_ticket and actor_id=p_actor and details->>'state'='pending';
end $$;
revoke all on function public.provincial_cancel_municipal_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function public.provincial_cancel_municipal_deletion(uuid,uuid) to service_role;

-- Public trigger avoids ALTER/DELETE ownership requirements on auth tables.
-- It executes within the Auth deletion's cascade transaction: any failure rolls everything back.
create or replace function public.guard_municipal_profile_deletion()
returns trigger language plpgsql security definer set search_path='' as $$
declare intent public.municipal_admin_account_logs%rowtype;
begin
 if old.role::text<>'municipal_admin' then
  if exists(select 1 from public.municipal_admin_account_logs where target_id=old.id and action='delete_requested' and details->>'state'='pending' and created_at>now()-interval '10 minutes') then raise exception 'The target account changed. Refresh before deleting.'; end if;
  return old;
 end if;
 if old.verification_status::text<>'inactive' then raise exception 'Deactivate the Municipal Admin before deleting the account.'; end if;
 if exists(select 1 from auth.users where id=old.id) then raise exception 'Delete the account through the Municipal Admin management service.'; end if;
 select l.* into intent from public.municipal_admin_account_logs l
 where l.target_id=old.id and l.action='delete_requested' and l.details->>'state'='pending'
 and l.created_at>now()-interval '10 minutes' and public.municipal_management_actor(l.actor_id)
 order by l.created_at desc limit 1 for update;
 if not found then raise exception 'An authorized deletion request is required.'; end if;
 update public.municipal_admin_account_logs set details=details||'{"state":"completed"}'::jsonb where id=intent.id;
 insert into public.municipal_admin_account_logs(actor_id,target_id,action,details)
 values(intent.actor_id,old.id,'deleted',intent.details||jsonb_build_object('state','completed','requestId',intent.id));
 return old;
end $$;
revoke all on function public.guard_municipal_profile_deletion() from public,anon,authenticated,service_role;
drop trigger if exists guard_municipal_profile_deletion_trigger on public.profiles;
create trigger guard_municipal_profile_deletion_trigger before delete on public.profiles for each row execute function public.guard_municipal_profile_deletion();

-- Keep staff assignments when their creator is replaced; only the creator link becomes null.
alter table public.event_staff_assignments alter column assigned_by drop not null;
alter table public.event_staff_assignments drop constraint if exists event_staff_assignments_assigned_by_fkey;
alter table public.event_staff_assignments add constraint event_staff_assignments_assigned_by_fkey foreign key(assigned_by) references public.profiles(id) on delete set null;

CREATE OR REPLACE FUNCTION "public"."get_municipal_attendance"("p_event_municipality_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("rsvp_id" "uuid", "event_municipality_id" "uuid", "event_id" "uuid", "event_title" "text", "event_status" "text", "event_start_date" timestamp with time zone, "event_end_date" timestamp with time zone, "municipality" "text", "municipal_status" "text", "registration_open" boolean, "participant_id" "uuid", "participant_name" "text", "participant_email" "text", "participant_municipality" "text", "registration_status" "text", "registered_at" timestamp with time zone, "attendance_id" "uuid", "attendance_status" "text", "attendance_method" "text", "checked_in_at" timestamp with time zone, "checked_in_by" "uuid", "checked_in_by_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  v_admin_role text;
  v_admin_municipality text;
begin
  if not public.municipal_account_access_allowed() then raise exception using errcode='42501',message='This Municipal Admin account is inactive.'; end if;
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select
    p.role::text,
    p.municipality::text
  into
    v_admin_role,
    v_admin_municipality
  from public.profiles p
  where p.id = auth.uid();

  if v_admin_role is distinct from 'municipal_admin' then
    raise exception
      'Only municipal administrators can view municipal attendance records.';
  end if;

  if nullif(trim(v_admin_municipality), '') is null then
    raise exception
      'Your municipal administrator account has no assigned municipality.';
  end if;

  return query
  select
    r.id::uuid
      as rsvp_id,

    em.id::uuid
      as event_municipality_id,

    e.id::uuid
      as event_id,

    e.title::text
      as event_title,

    e.status::text
      as event_status,

    e.start_at::timestamptz
      as event_start_date,

    e.end_at::timestamptz
      as event_end_date,

    em.municipality::text
      as municipality,

    em.municipal_status::text
      as municipal_status,

    coalesce(
      em.registration_open,
      false
    )::boolean
      as registration_open,

    participant.id::uuid
      as participant_id,

    coalesce(
      nullif(
        trim(participant.full_name),
        ''
      ),
      participant.email,
      'Unknown participant'
    )::text
      as participant_name,

    participant.email::text
      as participant_email,

    participant.municipality::text
      as participant_municipality,

    r.status::text
      as registration_status,

    r.registered_at::timestamptz
      as registered_at,

    a.id::uuid
      as attendance_id,

    coalesce(
      a.status::text,
      'pending'
    )::text
      as attendance_status,

    a.method::text
      as attendance_method,

    a.checked_in_at::timestamptz
      as checked_in_at,

    a.checked_in_by::uuid
      as checked_in_by,

    checker.full_name::text
      as checked_in_by_name

  from public.rsvps r

  join public.event_municipalities em
    on em.id =
      r.event_municipality_id

  join public.events e
    on e.id =
      em.event_id

  join public.profiles participant
    on participant.id =
      r.user_id

  left join public.attendance a
    on a.event_municipality_id =
      em.id
    and a.user_id =
      r.user_id

  left join public.profiles checker
    on checker.id =
      a.checked_in_by

  where
    lower(trim(em.municipality::text)) =
    lower(trim(v_admin_municipality))

    and participant.role::text =
      'participant'

    and r.status::text =
      'registered'

    and (
      p_event_municipality_id is null
      or em.id =
        p_event_municipality_id
    )

  order by
    e.start_at desc nulls last,
    e.title asc,
    participant.full_name asc;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_municipal_registrations"("p_event_municipality_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("rsvp_id" "uuid", "event_municipality_id" "uuid", "event_id" "uuid", "event_title" "text", "event_status" "text", "municipal_status" "text", "registration_open" boolean, "participant_id" "uuid", "participant_name" "text", "participant_email" "text", "participant_municipality" "text", "participant_category" "text", "participant_category_other" "text", "rsvp_status" "text", "registered_at" timestamp with time zone, "qr_available" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_role text;
  current_user_municipality text;
begin
  if not public.municipal_account_access_allowed() then raise exception using errcode='42501',message='This Municipal Admin account is inactive.'; end if;
  /*
   * Verify the current account and retrieve
   * its municipality directly from profiles.
   */
  select
    p.role::text,
    p.municipality
  into
    current_user_role,
    current_user_municipality
  from public.profiles p
  where p.id = auth.uid()
  limit 1;

  if current_user_role is distinct from 'municipal_admin' then
    raise exception using
      errcode = '42501',
      message = 'Only municipal administrators can view municipal registrations.';
  end if;

  if current_user_municipality is null
     or trim(current_user_municipality) = ''
  then
    raise exception using
      errcode = 'P0001',
      message = 'The municipal administrator has no assigned municipality.';
  end if;

  return query
  select
    r.id as rsvp_id,
    r.event_municipality_id,
    em.event_id,
    coalesce(e.title, 'Untitled Event')::text as event_title,
    e.status::text as event_status,
    em.municipal_status::text as municipal_status,
    coalesce(em.registration_open, false) as registration_open,

    participant.id as participant_id,
    participant.full_name::text as participant_name,
    participant.email::text as participant_email,
    participant.municipality::text as participant_municipality,

    participant.participant_category::text as participant_category,
    participant.participant_category_other::text as participant_category_other,

    r.status::text as rsvp_status,
    r.registered_at,

    (
      r.qr_token is not null
      and trim(r.qr_token) <> ''
    ) as qr_available

  from public.rsvps r

  inner join public.event_municipalities em
    on em.id = r.event_municipality_id

  inner join public.events e
    on e.id = em.event_id

  inner join public.profiles participant
    on participant.id = r.user_id

  where
    lower(trim(em.municipality)) =
    lower(trim(current_user_municipality))

    and participant.role::text = 'participant'

    and (
      p_event_municipality_id is null
      or em.id = p_event_municipality_id
    )

  order by
    r.registered_at desc,
    participant.full_name asc;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."validate_event_staff_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  target_staff record;
  assigning_admin record;
  target_event record;
begin
  -- The FK action may clear only assigned_by during an authorized profile deletion.
  if tg_op='UPDATE' and new.assigned_by is null and old.assigned_by is not null
     and not exists(select 1 from public.profiles where id=old.assigned_by)
     and (to_jsonb(new)-'assigned_by')=(to_jsonb(old)-'assigned_by') then
    return new;
  end if;
  -- Existing assignments may be managed by the replacement approved admin.
  -- Creator validation applies to new assignments; caller authorization stays in RLS/RPCs.
  if tg_op = 'UPDATE' then
    if new.event_municipality_id <> old.event_municipality_id then
      raise exception
        'The municipal event of an existing staff assignment cannot be changed.';
    end if;

    if new.staff_id <> old.staff_id then
      raise exception
        'The Event Staff account of an existing assignment cannot be changed.';
    end if;

    if new.assigned_by is distinct from old.assigned_by then
      raise exception
        'The administrator of an existing assignment cannot be changed.';
    end if;
  end if;

  if tg_op = 'INSERT' and new.status <> 'active' then
    raise exception
      'A new Event Staff assignment must be active.';
  end if;

  select
    em.id,
    em.municipality,
    em.municipal_status
  into target_event
  from public.event_municipalities em
  where em.id = new.event_municipality_id;

  if not found then
    raise exception
      'The municipal event assignment could not be found.';
  end if;

  select
    p.id,
    p.role,
    p.verification_status,
    p.municipality
  into target_staff
  from public.profiles p
  where p.id = new.staff_id;

  if not found then
    raise exception
      'The Event Staff profile could not be found.';
  end if;

  if target_staff.role <> 'event_staff' then
    raise exception
      'Only an Event Staff account can be assigned to an event.';
  end if;

  if lower(trim(coalesce(target_staff.municipality, '')))
    <> lower(trim(coalesce(target_event.municipality, '')))
  then
    raise exception
      'Event Staff must belong to the same municipality as the event.';
  end if;

  if tg_op = 'INSERT' then
  select
    p.id,
    p.role,
    p.verification_status,
    p.municipality
  into assigning_admin
  from public.profiles p
  where p.id = new.assigned_by;

  if not found then
    raise exception
      'The assigning administrator profile could not be found.';
  end if;

  if assigning_admin.role <> 'municipal_admin'
    or assigning_admin.verification_status <> 'approved'
  then
    raise exception
      'Only an approved Municipal Administrator can assign Event Staff.';
  end if;

  if lower(trim(coalesce(assigning_admin.municipality, '')))
    <> lower(trim(coalesce(target_event.municipality, '')))
  then
    raise exception
      'The Municipal Administrator can only manage assignments in their municipality.';
  end if;

  end if;
  if new.status = 'active' then
    if lower(trim(coalesce(target_event.municipal_status::text, '')))
      <> 'prepared'
    then
      raise exception
        'Event Staff can only be assigned to a prepared municipal event.';
    end if;

    if target_staff.verification_status <> 'approved' then
      raise exception
        'Only an approved Event Staff account can be assigned.';
    end if;

    new.removed_at := null;

    if tg_op = 'UPDATE'
      and old.status = 'removed'
    then
      new.assigned_at := now();
    end if;
  else
    new.removed_at :=
      coalesce(new.removed_at, now());
  end if;

  new.updated_at := now();

  return new;
end;
$$;
commit;

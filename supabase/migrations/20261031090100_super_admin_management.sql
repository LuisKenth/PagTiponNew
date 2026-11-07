-- Run after 20261031090000_super_admin_role.sql has committed.
begin;

create table if not exists public.admin_audit_logs (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid,
 target_id uuid not null,
 action text not null,
 created_at timestamptz not null default now()
);
alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_audit_logs from public, anon, authenticated;
grant select on public.admin_audit_logs to authenticated;
grant all on public.admin_audit_logs to service_role;

-- Uses current database status, not a potentially stale role claim.
create or replace function public.super_admin_verified()
returns boolean language sql stable security definer set search_path = '' as $$
 select exists (
  select 1 from public.profiles p join auth.users u on u.id=p.id
  where p.id=auth.uid() and p.role::text='super_admin'
   and p.verification_status::text='approved'
   and (u.banned_until is null or u.banned_until <= now())
   and coalesce(u.raw_app_meta_data->>'must_change_password','false') <> 'true'
 ) and coalesce(auth.jwt()->>'aal','')='aal2';
$$;
revoke all on function public.super_admin_verified() from public, anon;
grant execute on function public.super_admin_verified() to authenticated, service_role;
create policy super_admin_audit_read on public.admin_audit_logs
 for select to authenticated using (public.super_admin_verified());
create policy super_admin_provincial_read on public.profiles
 for select to authenticated using (role::text='provincial_admin' and public.super_admin_verified());

-- Clients cannot provision or change privileged account authority directly.
create or replace function public.guard_privileged_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if coalesce(auth.role(),'')='authenticated' then
  if tg_op='INSERT' then
   if new.role::text in ('super_admin','provincial_admin') then
    raise exception 'Privileged accounts must be provisioned through the server.';
   end if;
  elsif tg_op='DELETE' then
   if old.role::text in ('super_admin','provincial_admin') then
    raise exception 'Privileged accounts cannot be deleted through a client.';
   end if;
  elsif (new.role is distinct from old.role or
         new.verification_status is distinct from old.verification_status) and
        (new.role::text in ('super_admin','provincial_admin') or
         old.role::text in ('super_admin','provincial_admin')) then
   raise exception 'Only the Super Admin management service can change privileged authority.';
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$$;
create trigger guard_privileged_profile_trigger before insert or update or delete on public.profiles
 for each row execute function public.guard_privileged_profile();

-- Serialize last-Super-Admin removal checks across both Auth and profiles.
create or replace function public.protect_last_super_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
declare removing boolean; candidate uuid;
begin
 candidate := old.id;
 if tg_table_schema='auth' then
  removing := tg_op='DELETE';
  if tg_op='UPDATE' then
   removing := new.banned_until is not null and new.banned_until > now();
  end if;
  if not removing then return new; end if;
  if not exists(select 1 from public.profiles where id=candidate and role::text='super_admin'
     and verification_status::text='approved') then
   if tg_op='DELETE' then return old; else return new; end if;
  end if;
 else
  if old.role::text <> 'super_admin' or old.verification_status::text <> 'approved' then
   if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if tg_op='UPDATE' then
   if new.role::text='super_admin' and new.verification_status::text='approved' then return new; end if;
  end if;
 end if;
 perform pg_catalog.pg_advisory_xact_lock(723991001);
 if not exists (
  select 1 from public.profiles p join auth.users u on u.id=p.id
  where p.id<>candidate and p.role::text='super_admin' and p.verification_status::text='approved'
   and (u.banned_until is null or u.banned_until <= now())
 ) then raise exception 'Cannot remove or deactivate the last active Super Admin.'; end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$$;
create trigger protect_last_super_profile before update or delete on public.profiles
 for each row execute function public.protect_last_super_admin();
create trigger protect_last_super_auth before update of banned_until or delete on auth.users
 for each row execute function public.protect_last_super_admin();

-- No profile changes are needed to add the new role to public signup.
-- Only trusted raw_app_meta_data can request a privileged role.
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  requested_role text;
  selected_role public.user_role;
  selected_status public.verification_status;

  selected_first_name text;
  selected_middle_name text;
  selected_last_name text;
  selected_suffix text;
  selected_full_name text;

  selected_municipality text;

  requested_participant_category text;
  selected_participant_category text;
  selected_participant_category_other text;

begin
  -- Read final Auth metadata before creating the profile.
  select u.*
  into new
  from auth.users as u
  where u.id = new.id;

  if not found then
    return null;
  end if;

  selected_first_name :=
    nullif(btrim(new.raw_user_meta_data->>'first_name'), '');

  selected_middle_name :=
    nullif(btrim(new.raw_user_meta_data->>'middle_name'), '');

  selected_last_name :=
    nullif(btrim(new.raw_user_meta_data->>'last_name'), '');

  selected_suffix :=
    nullif(btrim(new.raw_user_meta_data->>'suffix'), '');

  if selected_first_name is not null
     or selected_last_name is not null then

    if selected_first_name is null then
      raise exception 'Please enter your first name.';
    end if;

    if selected_last_name is null then
      raise exception 'Please enter your last name.';
    end if;

    selected_full_name := concat_ws(
      ' ',
      selected_first_name,
      selected_middle_name,
      selected_last_name,
      selected_suffix
    );
  else
    selected_full_name := coalesce(
      nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
      ''
    );
  end if;

  requested_role :=
    new.raw_app_meta_data->>'provisioned_role';

  if requested_role in (
    'super_admin',
    'provincial_admin',
    'municipal_admin',
    'event_staff'
  ) then
    selected_role := requested_role::public.user_role;
  else
    selected_role := 'participant'::public.user_role;
  end if;

  selected_status :=
    'approved'::public.verification_status;

  selected_municipality :=
    nullif(btrim(new.raw_user_meta_data->>'municipality'), '');

  if selected_role = 'participant' then
    requested_participant_category := lower(
      coalesce(
        nullif(
          btrim(new.raw_user_meta_data->>'participant_category'),
          ''
        ),
        ''
      )
    );

    if requested_participant_category not in (
      'farmer',
      'fisherman',
      'senior_citizen',
      '4ps',
      'others'
    ) then
      raise exception 'Please select a valid participant category.';
    end if;

    selected_participant_category :=
      requested_participant_category;

    if requested_participant_category = 'others' then
      selected_participant_category_other :=
        nullif(
          btrim(new.raw_user_meta_data->>'participant_category_other'),
          ''
        );

      if selected_participant_category_other is null then
        raise exception 'Please specify your participant category.';
      end if;

      if char_length(selected_participant_category_other) > 100 then
        raise exception 'Participant category description is too long.';
      end if;
    else
      selected_participant_category_other := null;
    end if;
  else
    selected_participant_category := null;
    selected_participant_category_other := null;
  end if;

  insert into public.profiles (
    id,
    first_name,
    middle_name,
    last_name,
    suffix,
    full_name,
    email,
    role,
    municipality,
    verification_status,
    participant_category,
    participant_category_other
  )
  values (
    new.id,
    selected_first_name,
    selected_middle_name,
    selected_last_name,
    selected_suffix,
    selected_full_name,
    coalesce(new.email, ''),
    selected_role,
    selected_municipality,
    selected_status,
    selected_participant_category,
    selected_participant_category_other
  );

  return new;
end;
$$;

-- Preserve the working deferred profile-creation trigger.
drop trigger if exists on_auth_user_created on auth.users;
create constraint trigger on_auth_user_created after insert on auth.users
 deferrable initially deferred for each row execute function public.handle_new_user();

create or replace function public.audit_admin_profile_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor uuid; action_name text;
begin
 if new.role::text not in ('super_admin','provincial_admin') then return new; end if;
 if tg_op='INSERT' then
  select nullif(u.raw_app_meta_data->>'provisioned_by','')::uuid into actor from auth.users u where u.id=new.id;
  action_name := 'account_created';
 else
  if (new.verification_status,new.email) is not distinct from (old.verification_status,old.email) then return new; end if;
  actor := coalesce(nullif(current_setting('app.super_actor',true),'')::uuid,auth.uid());
  action_name := case when new.verification_status is distinct from old.verification_status
    then case when new.verification_status::text='approved' then 'account_activated' else 'account_deactivated' end
    else 'profile_email_changed' end;
 end if;
 insert into public.admin_audit_logs(actor_id,target_id,action) values(actor,new.id,action_name);
 return new;
end;
$$;
create trigger audit_admin_profile_change_trigger after insert or update on public.profiles
 for each row execute function public.audit_admin_profile_change();

-- Additional restrictive policy: existing permissive policies cannot override it.
create or replace function public.account_operations_allowed()
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles p join auth.users u on u.id=p.id
 where p.id=auth.uid() and p.verification_status::text='approved'
 and p.role::text <> 'super_admin'
 and (u.banned_until is null or u.banned_until <= now())
 and coalesce(u.raw_app_meta_data->>'must_change_password','false') <> 'true');
$$;
revoke all on function public.account_operations_allowed() from public,anon;
grant execute on function public.account_operations_allowed() to authenticated,service_role;
do $$
declare t text;
begin
 foreach t in array array['events','event_municipalities','attendance','rsvps','certificates',
  'email_notification_deliveries','event_certificate_signatories','event_email_deliveries',
  'event_memos','event_staff_assignments','notifications','participant_verifications',
  'proof_cleanup_queue','reports','staff_email_deliveries','venues'] loop
  execute format('create policy account_operations_gate on public.%I as restrictive for all to authenticated using (public.account_operations_allowed()) with check (public.account_operations_allowed())',t);
 end loop;
end;
$$;
create policy account_operations_gate on storage.objects as restrictive for all to authenticated
 using (public.account_operations_allowed()) with check (public.account_operations_allowed());

-- Protect SECURITY DEFINER RPCs that otherwise bypass RLS.
create or replace function public.assert_account_operations_allowed()
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and coalesce(auth.role(),'') <> 'service_role'
    and not public.account_operations_allowed() then
  raise exception 'Account inactive or initial password change required.';
 end if;
end;
$$;
revoke all on function public.assert_account_operations_allowed() from public,anon;
grant execute on function public.assert_account_operations_allowed() to authenticated,service_role;
do $$
declare f record; definition text;
begin
 for f in select p.oid,p.prosrc,p.proretset from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prokind='f' and p.proname = any(array[
 'check_local_venue_schedule_conflict','open_event_check_in','close_event_check_in',
 'open_event_check_out','close_event_check_out','get_municipal_attendance','get_municipal_registrations',
 'get_my_certificate','get_my_certificate_events','get_participant_event_capacity_status',
 'issue_my_certificate','issue_my_event_certificate','process_attendance_check_out',
 'process_attendance_check_out_token','process_attendance_token',
 'review_participant_verification','submit_participant_verification','withdraw_participant_verification']) loop
  definition := pg_get_functiondef(f.oid);
  if definition ilike '%LANGUAGE plpgsql%' then
   execute regexp_replace(definition,'\mbegin\M','begin perform public.assert_account_operations_allowed();','i');
  elsif definition ilike '%LANGUAGE sql%' and f.proretset then
   execute replace(replace(definition,'LANGUAGE sql','LANGUAGE plpgsql'),f.prosrc,
     E'begin perform public.assert_account_operations_allowed(); return query ' || f.prosrc || E'\nend;');
  else
   raise exception 'Unexpected RPC language; review %',f.oid::regprocedure;
  end if;
 end loop;
end;
$$;

-- Maintenance jobs and internal notification helpers are server-only.
do $$
declare f record;
begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prokind='f' and p.proname=any(array[
 'create_municipal_event_reminders','finalize_ended_event_attendance','sync_event_statuses',
 'proof_cleanup_candidates','claim_proof_cleanup','create_notification_once','generate_rsvp_attendance_code']) loop
  execute format('revoke all on function %s from public,anon,authenticated', f.oid::regprocedure);
  execute format('grant execute on function %s to service_role', f.oid::regprocedure);
 end loop;
end;
$$;

-- These RPCs are called only by the checked server API, never directly by clients.
create or replace function public.super_set_provincial_status(p_actor uuid,p_target uuid,p_active boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id
  where p.id=p_actor and p.role::text='super_admin' and p.verification_status::text='approved'
  and (u.banned_until is null or u.banned_until<=now())
  and coalesce(u.raw_app_meta_data->>'must_change_password','false')<>'true') then raise exception 'Unauthorized actor.'; end if;
 perform set_config('app.super_actor',p_actor::text,true);
 update public.profiles set verification_status=(case when p_active then 'approved' else 'rejected' end)::public.verification_status
 where id=p_target and role::text='provincial_admin';
 if not found then raise exception 'Provincial Admin not found.'; end if;
end;
$$;
revoke all on function public.super_set_provincial_status(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.super_set_provincial_status(uuid,uuid,boolean) to service_role;
create or replace function public.super_reserve_recovery(p_actor uuid,p_target uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id
  where p.id=p_actor and p.role::text='super_admin' and p.verification_status::text='approved'
  and (u.banned_until is null or u.banned_until<=now())
  and coalesce(u.raw_app_meta_data->>'must_change_password','false')<>'true') then raise exception 'Unauthorized actor.'; end if;
 if not exists(select 1 from public.profiles where id=p_target and role::text='provincial_admin') then raise exception 'Account not found.'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('admin-recovery:'||p_target::text,0));
 if exists(select 1 from public.admin_audit_logs where target_id=p_target and action='recovery_requested'
  and created_at>now()-interval '60 seconds') then raise exception 'Please wait before requesting another link.'; end if;
 insert into public.admin_audit_logs(actor_id,target_id,action) values(p_actor,p_target,'recovery_requested');
end;
$$;
revoke all on function public.super_reserve_recovery(uuid,uuid) from public,anon,authenticated;
grant execute on function public.super_reserve_recovery(uuid,uuid) to service_role;

commit;

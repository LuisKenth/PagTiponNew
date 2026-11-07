-- Delete only inactive Provincial Admins through the server Auth Admin API.
-- Existing accounts are preserved by installation of this migration.
begin;
create or replace function public.super_prepare_provincial_deletion(
 p_actor uuid,p_target uuid,p_email text,p_reason text
) returns uuid language plpgsql security definer set search_path='' as $$
declare target_profile public.profiles%rowtype; target_email text; actor_name text; ticket uuid;
begin
 select p.full_name into actor_name from public.profiles p join auth.users u on u.id=p.id
 where p.id=p_actor and p.role::text='super_admin' and p.verification_status::text='approved'
 and (u.banned_until is null or u.banned_until<=now())
 and coalesce(u.raw_app_meta_data->>'must_change_password','false')<>'true';
 if not found or p_actor=p_target then raise exception 'Unauthorized actor.'; end if;
 if p_reason is null or char_length(btrim(p_reason)) not between 10 and 500 then
  raise exception 'Provide a deletion reason of 10-500 characters.';
 end if;
 select * into target_profile from public.profiles where id=p_target for update;
 if not found or target_profile.role::text<>'provincial_admin' then
  raise exception 'Provincial Admin not found.';
 end if;
 if target_profile.verification_status::text='approved' then
  raise exception using errcode='PT409',message='Deactivate the Provincial Admin before deleting the account.';
 end if;
 select email into target_email from auth.users where id=p_target;
 if target_email is null or p_email is null or lower(btrim(p_email))<>lower(target_email) then
  raise exception 'The confirmation email does not match. Refresh the account list.';
 end if;
 if exists(select 1 from public.admin_audit_logs where target_id=p_target
  and action='account_deletion_requested' and details->>'deletionState'='pending'
  and created_at>now()-interval '10 minutes') then
  raise exception 'Deletion is already in progress. Refresh the list before retrying.';
 end if;
 insert into public.admin_audit_logs(actor_id,target_id,action,details)
 values(p_actor,p_target,'account_deletion_requested',jsonb_build_object(
  'actorName',actor_name,'targetName',target_profile.full_name,'targetEmail',target_email,'reason',btrim(p_reason),'deletionState','pending'))
 returning id into ticket;
 return ticket;
end;
$$;
revoke all on function public.super_prepare_provincial_deletion(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.super_prepare_provincial_deletion(uuid,uuid,text,text) to service_role;

create or replace function public.super_cancel_provincial_deletion(p_actor uuid,p_ticket uuid)
returns void language plpgsql security definer set search_path='' as $$
declare candidate uuid;
begin
 select target_id into candidate from public.admin_audit_logs where id=p_ticket
 and actor_id=p_actor and action='account_deletion_requested';
 if not found then return; end if;
 -- Serialize cancellation with Auth deletion so a completed deletion cannot be canceled.
 perform 1 from public.profiles where id=candidate for update;
 update public.admin_audit_logs set details=details||'{"deletionState":"cancelled"}'::jsonb
 where id=p_ticket and actor_id=p_actor and details->>'deletionState'='pending';
end;
$$;
revoke all on function public.super_cancel_provincial_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function public.super_cancel_provincial_deletion(uuid,uuid) to service_role;

create or replace function public.guard_provincial_auth_deletion()
returns trigger language plpgsql security definer set search_path='' as $$
declare target_profile public.profiles%rowtype; intent public.admin_audit_logs%rowtype;
begin
 select * into target_profile from public.profiles where id=old.id for update;
 if not found or target_profile.role::text<>'provincial_admin' then
  if exists(select 1 from public.admin_audit_logs where target_id=old.id
   and action='account_deletion_requested' and details->>'deletionState'='pending' and created_at>now()-interval '10 minutes') then
   raise exception 'The target account changed. Refresh before deleting.';
  end if;
  return old;
 end if;
 if target_profile.verification_status::text='approved' then
  raise exception using errcode='PT409',message='Deactivate the Provincial Admin before deleting the account.';
 end if;
 select a.* into intent from public.admin_audit_logs a
 join public.profiles p on p.id=a.actor_id join auth.users u on u.id=p.id
 where a.target_id=old.id and a.action='account_deletion_requested'
 and a.details->>'deletionState'='pending'
 and a.created_at>now()-interval '10 minutes'
 and lower(a.details->>'targetEmail')=lower(old.email)
 and p.role::text='super_admin' and p.verification_status::text='approved'
 and (u.banned_until is null or u.banned_until<=now())
 and coalesce(u.raw_app_meta_data->>'must_change_password','false')<>'true'
 order by a.created_at desc,a.id desc limit 1;
 if not found then raise exception 'Use the Super Admin portal to confirm inactive account deletion.'; end if;
 -- Retain readable names in older audit records even after the profile disappears.
 update public.admin_audit_logs set details=details||jsonb_build_object('targetName',target_profile.full_name,'targetEmail',old.email)
 where target_id=old.id;
 update public.admin_audit_logs set details=details||jsonb_build_object('actorName',target_profile.full_name)
 where actor_id=old.id;
 update public.admin_audit_logs set details=details||'{"deletionState":"completed"}'::jsonb where id=intent.id;
 -- This completion record commits only when Auth deletion and all cascades succeed.
 insert into public.admin_audit_logs(actor_id,target_id,action,details)
 values(intent.actor_id,old.id,'account_deleted',intent.details||jsonb_build_object(
  'requestId',intent.id,'targetName',target_profile.full_name,'targetEmail',old.email,'deletionState','completed'));
 return old;
end;
$$;
revoke all on function public.guard_provincial_auth_deletion() from public,anon,authenticated,service_role;
drop trigger if exists guard_provincial_auth_deletion_trigger on auth.users;
create trigger guard_provincial_auth_deletion_trigger before delete on auth.users
 for each row execute function public.guard_provincial_auth_deletion();

create or replace function public.guard_provincial_profile_deletion()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.role::text='provincial_admin' then
  if old.verification_status::text='approved' then
   raise exception using errcode='PT409',message='Deactivate the Provincial Admin before deleting the account.';
  end if;
  if exists(select 1 from auth.users where id=old.id) then
   raise exception 'Delete the inactive account through the server Auth Admin API.';
  end if;
 end if;
 return old;
end;
$$;
revoke all on function public.guard_provincial_profile_deletion() from public,anon,authenticated,service_role;
drop trigger if exists guard_provincial_profile_deletion_trigger on public.profiles;
create trigger guard_provincial_profile_deletion_trigger before delete on public.profiles
 for each row execute function public.guard_provincial_profile_deletion();
commit;

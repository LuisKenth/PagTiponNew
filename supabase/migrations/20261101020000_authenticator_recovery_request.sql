-- A recovery REQUEST only. This never resets, removes, or bypasses MFA.
begin;
create or replace function public.super_request_authenticator_recovery(p_actor uuid,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor_name text; actor_email text; request_id uuid;
begin
 select p.full_name,u.email into actor_name,actor_email from public.profiles p
 join auth.users u on u.id=p.id
 where p.id=p_actor and p.role::text='super_admin' and p.verification_status::text='approved'
 and (u.banned_until is null or u.banned_until<=now())
 and coalesce(u.raw_app_meta_data->>'must_change_password','false')<>'true';
 if not found then raise exception using errcode='PT403',message='Only the active Super Admin may request recovery for their own account.'; end if;
 if p_reason is null or char_length(btrim(p_reason)) not between 10 and 500 then
  raise exception using errcode='PT400',message='Provide a recovery reason of 10-500 characters.';
 end if;
 if not exists(select 1 from auth.mfa_factors where user_id=p_actor and status::text='verified' and factor_type::text='totp') then
  raise exception using errcode='PT409',message='No verified authenticator is linked. Refresh and use Set Up Authenticator.';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mfa-recovery:'||p_actor::text,0));
 if exists(select 1 from public.admin_audit_logs where actor_id=p_actor and target_id=p_actor
  and action='authenticator_recovery_requested' and created_at>now()-interval '10 minutes') then
  raise exception using errcode='PT429',message='A recovery request was recently recorded. Wait 10 minutes before submitting another.';
 end if;
 insert into public.admin_audit_logs(actor_id,target_id,action,details)
 values(p_actor,p_actor,'authenticator_recovery_requested',jsonb_build_object(
  'actorName',actor_name,'targetName',actor_name,'targetEmail',actor_email,'reason',btrim(p_reason),
  'review','manual_identity_check_required')) returning id into request_id;
 return request_id;
end;
$$;
revoke all on function public.super_request_authenticator_recovery(uuid,text) from public,anon,authenticated;
grant execute on function public.super_request_authenticator_recovery(uuid,text) to service_role;
commit;

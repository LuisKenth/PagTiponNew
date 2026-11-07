-- Apply AFTER the two original Super Admin migrations. No existing data is deleted.
begin;
alter table public.admin_audit_logs add column if not exists details jsonb not null default '{}'::jsonb;
create index if not exists admin_audit_logs_time_idx on public.admin_audit_logs(created_at desc,id desc);
create index if not exists admin_audit_logs_target_idx on public.admin_audit_logs(target_id,created_at desc);

create or replace function public.audit_admin_profile_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid; action_name text; info jsonb := '{}'::jsonb;
begin
 if new.role::text not in ('super_admin','provincial_admin') then return new; end if;
 if tg_op='INSERT' then
  select nullif(u.raw_app_meta_data->>'provisioned_by','')::uuid into actor from auth.users u where u.id=new.id;
  action_name := 'account_created';
 else
  actor := coalesce(nullif(current_setting('app.super_actor',true),'')::uuid,auth.uid());
  if new.verification_status is distinct from old.verification_status then
   action_name := case when new.verification_status::text='approved' then 'account_activated' else 'account_deactivated' end;
  elsif new.email is distinct from old.email then
   action_name := 'profile_email_changed';info:=jsonb_build_object('oldEmail',old.email,'newEmail',new.email);
  elsif new.full_name is distinct from old.full_name then
   action_name := 'profile_name_changed';
  else return new;
  end if;
 end if;
 insert into public.admin_audit_logs(actor_id,target_id,action,details) values(actor,new.id,action_name,info);
 return new;
end;
$$;

-- A client may update its profile name, but not forge the recovery email shown by the app.
create or replace function public.guard_profile_email_source()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.email is distinct from old.email and not exists(
  select 1 from auth.users u where u.id=new.id and lower(coalesce(u.email,''))=lower(coalesce(new.email,''))
 ) then raise exception 'Change the account email through Supabase Auth first.'; end if;
 return new;
end;
$$;
create trigger guard_profile_email_source_trigger before update of email on public.profiles
 for each row execute function public.guard_profile_email_source();

-- Auth email is the source of truth. Its update and profile synchronization share a transaction.
create or replace function public.sync_profile_auth_email()
returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid; old_actor text;
begin
 if new.email is not distinct from old.email then return new; end if;
 select a.actor_id into actor from public.admin_audit_logs a
 where a.target_id=new.id and a.action in ('email_correction_requested','self_email_change_requested')
 and lower(a.details->>'newEmail')=lower(new.email)
 and a.created_at>now()-interval '24 hours'
 order by a.created_at desc,a.id desc limit 1;
 old_actor := current_setting('app.super_actor',true);
 perform set_config('app.super_actor',coalesce(actor::text,''),true);
 update public.profiles set email=coalesce(new.email,'') where id=new.id;
 perform set_config('app.super_actor',coalesce(old_actor,''),true);
 return new;
end;
$$;
create trigger sync_profile_auth_email_trigger after update of email on auth.users
 for each row execute function public.sync_profile_auth_email();

create or replace function public.super_update_own_name(p_actor uuid,p_name text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if nullif(btrim(p_name),'') is null or char_length(btrim(p_name))>100 then raise exception 'Invalid name.'; end if;
 if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id
  where p.id=p_actor and p.role::text='super_admin' and p.verification_status::text='approved'
  and (u.banned_until is null or u.banned_until<=now())
  and coalesce(u.raw_app_meta_data->>'must_change_password','false')<>'true') then raise exception 'Unauthorized actor.'; end if;
 perform set_config('app.super_actor',p_actor::text,true);
 update public.profiles set full_name=btrim(p_name) where id=p_actor;
end;
$$;
revoke all on function public.super_update_own_name(uuid,text) from public,anon,authenticated;
grant execute on function public.super_update_own_name(uuid,text) to service_role;

-- Durable audit intent; the actual email change is made by Supabase's server Admin API.
create or replace function public.super_prepare_email_correction(p_actor uuid,p_target uuid,p_email text,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare old_email text; ticket uuid;
begin
 if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id
  where p.id=p_actor and p.role::text='super_admin' and p.verification_status::text='approved'
  and (u.banned_until is null or u.banned_until<=now())
  and coalesce(u.raw_app_meta_data->>'must_change_password','false')<>'true') then raise exception 'Unauthorized actor.'; end if;
 if p_reason is null or p_email is null or char_length(btrim(p_reason)) not between 10 and 500 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  or char_length(p_email)>254 then raise exception 'Invalid recovery details.'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('recovery-email:'||p_target::text,0));
 select u.email into old_email from auth.users u join public.profiles p on p.id=u.id
 where p.id=p_target and p.role::text='provincial_admin';
 if not found or lower(old_email)=lower(p_email) then raise exception 'Select a Provincial Admin and a different email.'; end if;
 if exists(select 1 from auth.users where lower(email)=lower(p_email) and id<>p_target) then raise exception 'Email already registered.'; end if;
 if exists(select 1 from public.admin_audit_logs where target_id=p_target and action='email_correction_requested'
  and created_at>now()-interval '60 seconds') then raise exception 'Wait before another correction.'; end if;
 insert into public.admin_audit_logs(actor_id,target_id,action,details)
 values(p_actor,p_target,'email_correction_requested',jsonb_build_object('oldEmail',old_email,'newEmail',lower(btrim(p_email)),'reason',btrim(p_reason),'identityCheck','confirmed_by_super_admin'))
 returning id into ticket;
 return ticket;
end;
$$;
revoke all on function public.super_prepare_email_correction(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.super_prepare_email_correction(uuid,uuid,text,text) to service_role;

-- Keep a verified backup before removing an authenticator from a Super Admin.
create or replace function public.protect_last_super_authenticator()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.factor_type::text<>'totp' or old.status::text<>'verified' then
  if tg_op='DELETE' then return old; else return new; end if;
 end if;
 if tg_op='UPDATE' then
  if new.status::text='verified' and new.factor_type::text='totp' and new.user_id=old.user_id then return new; end if;
 end if;
 if exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=old.user_id and p.role::text='super_admin') then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('super-mfa:'||old.user_id::text,0));
  if not exists(select 1 from auth.mfa_factors f where f.user_id=old.user_id and f.id<>old.id and f.status::text='verified' and f.factor_type::text='totp') then
   raise exception 'Add and verify a backup authenticator before removing the last one.';
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$$;
create trigger protect_last_super_authenticator_trigger before delete or update on auth.mfa_factors
 for each row execute function public.protect_last_super_authenticator();

create or replace function public.audit_super_authenticator()
returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; action_name text;
begin
 if tg_op='DELETE' then
  target:=old.user_id;
  if old.factor_type::text='totp' and old.status::text='verified' then action_name:='authenticator_removed'; end if;
 else
  target:=new.user_id;
  if new.factor_type::text='totp' and new.status::text='verified' then
   if tg_op='INSERT' then action_name:='authenticator_added';
   elsif old.status::text is distinct from new.status::text then action_name:='authenticator_added'; end if;
  end if;
 end if;
 if action_name is not null and exists(select 1 from public.profiles where id=target and role::text='super_admin') then
  insert into public.admin_audit_logs(actor_id,target_id,action) values(target,target,action_name);
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$$;
create trigger audit_super_authenticator_trigger after insert or update or delete on auth.mfa_factors
 for each row execute function public.audit_super_authenticator();
commit;

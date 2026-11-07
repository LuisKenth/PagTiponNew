-- Requires the installed Municipal Admin management migration (20261101070000).
-- Existing events/accounts are preserved. Only already recorded account actions are backfilled.
begin;
create table if not exists public.provincial_activity_logs (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid, actor_name text not null, actor_email text,
 category text not null check(category in ('municipal_admin','event','memo')),
 action text not null, target_id text not null, target_name text not null,
 municipality text, event_id uuid, event_title text,
 details jsonb not null default '{}', source_key text unique,
 created_at timestamptz not null default now(),
 search_text text generated always as (lower(
  coalesce(actor_name,'')||' '||coalesce(actor_email,'')||' '||coalesce(target_name,'')||' '||
  coalesce(municipality,'')||' '||coalesce(event_title,'')||' '||coalesce(details->>'email',''))) stored
);
-- Snapshot IDs intentionally have no FK: deletion must not erase the audit trail.
alter table public.provincial_activity_logs enable row level security;
revoke all on public.provincial_activity_logs from public,anon,authenticated,service_role;
grant select on public.provincial_activity_logs to authenticated,service_role;
create index if not exists provincial_activity_time_idx on public.provincial_activity_logs(created_at desc,id desc);
create index if not exists provincial_activity_action_idx on public.provincial_activity_logs(action,created_at desc);
create index if not exists provincial_activity_category_idx on public.provincial_activity_logs(category,created_at desc);

create or replace function public.provincial_activity_reader()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join auth.users u on u.id=p.id
 where p.id=auth.uid() and p.role::text='provincial_admin' and p.verification_status::text='approved'
 and (u.banned_until is null or u.banned_until<=now())
 and coalesce(u.raw_app_meta_data->>'must_change_password','false')<>'true');
$$;
revoke all on function public.provincial_activity_reader() from public,anon;
grant execute on function public.provincial_activity_reader() to authenticated,service_role;
drop policy if exists provincial_activity_read on public.provincial_activity_logs;
create policy provincial_activity_read on public.provincial_activity_logs for select to authenticated using(public.provincial_activity_reader());

-- Internal writer only. Browser/API clients cannot fabricate, change, or delete entries.
create or replace function public.write_provincial_activity(
 p_actor uuid,p_category text,p_action text,p_target_id text,p_target_name text,
 p_municipality text default null,p_event_id uuid default null,p_event_title text default null,
 p_details jsonb default '{}',p_source_key text default null,p_created_at timestamptz default now()
) returns void language plpgsql security definer set search_path='' as $$
declare actor_label text; actor_email_address text;
begin
 if p_actor is not null then
  select nullif(btrim(full_name),''),email into actor_label,actor_email_address from public.profiles where id=p_actor;
 end if;
 actor_label:=coalesce(actor_label,case when p_actor is null then 'System / controlled setup' else 'Former administrator' end);
 insert into public.provincial_activity_logs(actor_id,actor_name,actor_email,category,action,target_id,target_name,municipality,event_id,event_title,details,source_key,created_at)
 values(p_actor,actor_label,actor_email_address,p_category,p_action,p_target_id,coalesce(nullif(p_target_name,''),'Unnamed record'),p_municipality,p_event_id,p_event_title,coalesce(p_details,'{}'),p_source_key,p_created_at)
 on conflict(source_key) do nothing;
end $$;
revoke all on function public.write_provincial_activity(uuid,text,text,text,text,text,uuid,text,jsonb,text,timestamptz) from public,anon,authenticated,service_role;

create or replace function public.audit_municipal_account_activity()
returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid; actor_text text;
begin
 if new.role::text<>'municipal_admin' then return new; end if;
 select u.raw_app_meta_data->>'provisioned_by' into actor_text from auth.users u where u.id=new.id;
 if coalesce(actor_text,'') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
  actor:=actor_text::uuid;
 end if;
 perform public.write_provincial_activity(actor,'municipal_admin','municipal_admin_created',new.id::text,new.full_name,new.municipality,null,null,
  jsonb_build_object('email',new.email,'status',new.verification_status));
 return new;
end $$;
revoke all on function public.audit_municipal_account_activity() from public,anon,authenticated,service_role;
drop trigger if exists audit_municipal_account_activity_trigger on public.profiles;
create trigger audit_municipal_account_activity_trigger after insert on public.profiles for each row execute function public.audit_municipal_account_activity();

create or replace function public.audit_municipal_management_activity()
returns trigger language plpgsql security definer set search_path='' as $$
declare activity text;
begin
 activity:=case new.action when 'activate' then 'municipal_admin_activated' when 'deactivate' then 'municipal_admin_deactivated' when 'deleted' then 'municipal_admin_deleted' end;
 if activity is null then return new; end if;
 perform public.write_provincial_activity(new.actor_id,'municipal_admin',activity,new.target_id::text,new.details->>'targetName',new.details->>'municipality',null,null,
  jsonb_build_object('email',new.details->>'targetEmail','previousStatus',new.details->>'previousStatus'),
  'municipal:'||new.id::text,new.created_at);
 return new;
end $$;
revoke all on function public.audit_municipal_management_activity() from public,anon,authenticated,service_role;
drop trigger if exists audit_municipal_management_activity_trigger on public.municipal_admin_account_logs;
create trigger audit_municipal_management_activity_trigger after insert on public.municipal_admin_account_logs for each row execute function public.audit_municipal_management_activity();

-- Backfill only genuine already-recorded actions, using their original timestamps.
do $$ declare entry record; activity text; begin
 for entry in select * from public.municipal_admin_account_logs where action in ('activate','deactivate','deleted') order by created_at,id loop
  activity:=case entry.action when 'activate' then 'municipal_admin_activated' when 'deactivate' then 'municipal_admin_deactivated' else 'municipal_admin_deleted' end;
  perform public.write_provincial_activity(entry.actor_id,'municipal_admin',activity,entry.target_id::text,entry.details->>'targetName',entry.details->>'municipality',null,null,
   jsonb_build_object('email',entry.details->>'targetEmail','previousStatus',entry.details->>'previousStatus'),
   'municipal:'||entry.id::text,entry.created_at);
 end loop;
end $$;

create or replace function public.audit_provincial_event_activity()
returns trigger language plpgsql security definer set search_path='' as $$
declare activity text; previous jsonb; current_value jsonb; changed text[]; event_data public.events%rowtype;
begin
 if tg_op='DELETE' then
  event_data:=old; activity:='event_deleted';
  previous:=jsonb_build_object('status',old.status,'title',old.title);
 elsif tg_op='INSERT' then
  event_data:=new;
  activity:=case when new.status::text='draft' then 'draft_saved' when new.status::text='cancelled' then 'event_cancelled' else 'event_published' end;
  current_value:=jsonb_build_object('status',new.status,'title',new.title);
 else
  event_data:=new;
  -- Ignore updated_at, creator FK cleanup, and legacy memo mirror writes.
  previous:=jsonb_build_object('title',old.title,'description',old.description,'start_at',old.start_at,'end_at',old.end_at,
   'status',old.status,'audience_type',old.audience_type,'audience_categories',old.audience_categories,'audience_category_other',old.audience_category_other);
  current_value:=jsonb_build_object('title',new.title,'description',new.description,'start_at',new.start_at,'end_at',new.end_at,
   'status',new.status,'audience_type',new.audience_type,'audience_categories',new.audience_categories,'audience_category_other',new.audience_category_other);
  if previous=current_value then return new; end if;
  select array_agg(k order by k) into changed from jsonb_object_keys(current_value) k where previous->k is distinct from current_value->k;
  activity:=case
   when old.status is distinct from new.status and new.status::text='cancelled' then 'event_cancelled'
   when old.status::text='draft' and new.status::text<>'draft' then 'event_published'
   when new.status::text='draft' then 'draft_saved'
   when old.status is distinct from new.status then 'event_status_changed'
   else 'event_updated' end;
  -- Store only changed fields, not unchanged descriptions or unrelated data.
  select jsonb_object_agg(k,previous->k),jsonb_object_agg(k,current_value->k) into previous,current_value from unnest(changed) k;
 end if;
 perform public.write_provincial_activity(auth.uid(),'event',activity,event_data.id::text,event_data.title,null,event_data.id,event_data.title,
  jsonb_build_object('before',previous,'after',current_value,'changedFields',coalesce(to_jsonb(changed),'[]'::jsonb)));
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function public.audit_provincial_event_activity() from public,anon,authenticated,service_role;
drop trigger if exists audit_provincial_event_activity_trigger on public.events;
create trigger audit_provincial_event_activity_trigger after insert or update on public.events for each row execute function public.audit_provincial_event_activity();
-- Log before FK cascades so memo deletions retain their parent event's title.
drop trigger if exists audit_provincial_event_delete_trigger on public.events;
create trigger audit_provincial_event_delete_trigger before delete on public.events for each row execute function public.audit_provincial_event_activity();

create or replace function public.audit_provincial_memo_activity()
returns trigger language plpgsql security definer set search_path='' as $$
declare item public.event_memos%rowtype; title_snapshot text; activity text; info jsonb;
begin
 if tg_op='DELETE' then item:=old;activity:='memo_deleted';
 elsif tg_op='INSERT' then item:=new;activity:='memo_uploaded';
 else
  if (new.file_name,new.file_url,new.file_path,new.file_size,new.file_type) is not distinct from (old.file_name,old.file_url,old.file_path,old.file_size,old.file_type) then return new; end if;
  item:=new;activity:='memo_replaced';
 end if;
 select title into title_snapshot from public.events where id=item.event_id;
 if title_snapshot is null then
  select event_title into title_snapshot from public.provincial_activity_logs where event_id=item.event_id and category='event' order by created_at desc,id desc limit 1;
 end if;
 info:=jsonb_build_object('fileName',item.file_name,'fileSize',item.file_size);
 if tg_op='UPDATE' then info:=info||jsonb_build_object('previousFileName',old.file_name); end if;
 if tg_op='DELETE' and not exists(select 1 from public.events where id=item.event_id) then info:=info||'{"eventDeleted":true}'::jsonb; end if;
 perform public.write_provincial_activity(auth.uid(),'memo',activity,item.id::text,item.file_name,null,item.event_id,coalesce(title_snapshot,'Former event'),info);
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function public.audit_provincial_memo_activity() from public,anon,authenticated,service_role;
drop trigger if exists audit_provincial_memo_activity_trigger on public.event_memos;
create trigger audit_provincial_memo_activity_trigger after insert or update or delete on public.event_memos for each row execute function public.audit_provincial_memo_activity();

create or replace function public.audit_provincial_event_target_activity()
returns trigger language plpgsql security definer set search_path='' as $$
declare item public.event_municipalities%rowtype; title_snapshot text;
begin
 -- Only deliberate Provincial Admin targeting changes; exclude background writes and parent cascades.
 if not public.provincial_activity_reader() then
  if tg_op='DELETE' then return old; else return new; end if;
 end if;
 if tg_op='DELETE' then item:=old;else item:=new;end if;
 select title into title_snapshot from public.events where id=item.event_id;
 if not found then
  if tg_op='DELETE' then return old;else return new;end if;
 end if;
 perform public.write_provincial_activity(auth.uid(),'event',
  case when tg_op='INSERT' then 'event_municipality_added' else 'event_municipality_removed' end,
  item.event_id::text,title_snapshot,item.municipality,item.event_id,title_snapshot);
 if tg_op='DELETE' then return old;else return new;end if;
end $$;
revoke all on function public.audit_provincial_event_target_activity() from public,anon,authenticated,service_role;
drop trigger if exists audit_provincial_event_target_activity_trigger on public.event_municipalities;
create trigger audit_provincial_event_target_activity_trigger after insert or delete on public.event_municipalities for each row execute function public.audit_provincial_event_target_activity();

comment on table public.provincial_activity_logs is 'Read-only Provincial Admin activity history with actor/target snapshots. No passwords, tokens, QR codes, or document URLs.';
commit;

begin;
-- Expand automatic participation certificate eligibility consistently.
create or replace function public.review_event_certificates(p_assignment_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare em public.event_municipalities; ev public.events; actor public.profiles; people jsonb; signatures jsonb; has_issued boolean;
begin
 perform public.assert_account_operations_allowed();
 select * into actor from public.profiles where id=auth.uid() and role::text='municipal_admin' and verification_status::text='approved';
 select * into em from public.event_municipalities where id=p_assignment_id and municipality=actor.municipality;
 if actor.id is null or em.id is null then raise exception 'Certificate review access denied.' using errcode='42501';end if;
 select * into ev from public.events where id=em.event_id;
 select coalesce(jsonb_agg(jsonb_build_object('position',s.position,'name',s.name,'title',s.title) order by s.position),'[]'::jsonb) into signatures from public.event_certificate_signatories s where s.event_id=ev.id;
 select exists(select 1 from public.certificates where event_id=ev.id) into has_issued;
 select coalesce(jsonb_agg(to_jsonb(t) order by t.name,t.user_id),'[]'::jsonb) into people from (
  select distinct on(a.user_id) a.user_id,p.full_name as name,a.id as attendance_id,a.status,a.checked_in_at,a.checked_out_at,c.certificate_number,c.issued_at
  from public.attendance a join public.profiles p on p.id=a.user_id
  left join public.certificates c on c.event_id=ev.id and c.user_id=a.user_id
  where a.event_municipality_id=em.id and em.municipal_status is distinct from 'cancelled' and a.status in ('present','late') and a.checked_in_at is not null and a.checked_out_at is not null and a.checked_out_at>=a.checked_in_at and public.participant_can_register(a.user_id)
  order by a.user_id,a.checked_out_at desc,a.created_at desc
 ) t;
 return jsonb_build_object('eventId',ev.id,'title',ev.title,'source',ev.event_origin,'municipality',em.municipality,'enabled',ev.certificates_enabled,'completed',ev.status='completed' and ev.end_at<=now() and em.municipal_status is distinct from 'cancelled','canConfigure',public.can_manage_event_certificate(ev.id),'hasIssued',has_issued,'signatories',signatures,'participants',people);
end;$$;

create or replace function public.get_my_certificate_events()
returns table(event_id uuid,event_title text,event_start_at timestamptz,event_end_at timestamptz,attendance_id uuid,checked_in_at timestamptz,checked_out_at timestamptz,certificate_id uuid,certificate_number text,issued_at timestamptz)
language plpgsql security definer set search_path='public' as $$
begin
 perform public.assert_account_operations_allowed();
 return query
 with eligible as (
 select distinct on(e.id) e.id eid,e.title,e.start_at,e.end_at,a.id aid,a.checked_in_at tin,a.checked_out_at tout
 from public.attendance a join public.event_municipalities em on em.id=a.event_municipality_id join public.events e on e.id=em.event_id
 where a.user_id=auth.uid() and public.participant_can_register(auth.uid()) and a.status in ('present','late') and a.checked_in_at is not null and a.checked_out_at>=a.checked_in_at and e.status='completed' and e.end_at<=now() and e.certificates_enabled and em.municipal_status is distinct from 'cancelled'
 order by e.id,a.checked_out_at desc,a.created_at desc), available as (
 select x.eid,x.title,x.start_at,x.end_at,x.aid,x.tin,x.tout,c.id cid,c.certificate_number num,c.issued_at issued from eligible x left join public.certificates c on c.event_id=x.eid and c.user_id=auth.uid()
 union all
 select e.id,e.title,e.start_at,e.end_at,a.id,a.checked_in_at,a.checked_out_at,c.id,c.certificate_number,c.issued_at
 from public.certificates c join public.events e on e.id=c.event_id join public.attendance a on a.id=c.attendance_id
 where c.user_id=auth.uid() and public.participant_can_register(auth.uid()) and not exists(select 1 from eligible x where x.eid=e.id))
 select x.eid,x.title,x.start_at,x.end_at,x.aid,x.tin,x.tout,x.cid,x.num,x.issued from available x order by x.end_at desc;
end;$$;

create or replace function public.get_event_certificate_progress(p_event_id uuid, p_assignment_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 actor public.profiles; ev public.events; scope_id uuid;
 eligible_count integer; issued_count integer; ready boolean;
begin
 perform public.assert_account_operations_allowed();
 select * into actor from public.profiles where id=auth.uid() and verification_status::text='approved';
 if actor.id is null or actor.role::text not in ('provincial_admin','municipal_admin') then
  raise exception 'Certificate progress access denied.' using errcode='42501';
 end if;
 select * into ev from public.events where id=p_event_id;
 if ev.id is null then raise exception 'Event not found.';end if;
 if actor.role::text='municipal_admin' then
  select em.id into scope_id from public.event_municipalities em
  where em.event_id=ev.id and em.municipality=actor.municipality
  and (p_assignment_id is null or em.id=p_assignment_id)
  order by em.id limit 1;
  if scope_id is null then raise exception 'Certificate progress access denied.' using errcode='42501';end if;
 elsif p_assignment_id is not null then
  raise exception 'Provincial progress uses the whole event.' using errcode='42501';
 end if;
 if not ev.certificates_enabled or ev.status<>'completed' or ev.end_at is null or ev.end_at>now() then return null;end if;
 select exists(select 1 from public.event_certificate_signatories s where s.event_id=ev.id and s.position=1 and length(trim(s.name))>0 and length(trim(s.title))>0) into ready;
 with eligible as (
  select distinct a.user_id from public.attendance a
  join public.event_municipalities em on em.id=a.event_municipality_id
  where em.event_id=ev.id and (scope_id is null or em.id=scope_id)
  and em.municipal_status is distinct from 'cancelled'
  and a.status in ('present','late') and a.checked_in_at is not null
  and a.checked_out_at is not null and a.checked_out_at>=a.checked_in_at
  and public.participant_can_register(a.user_id)
 )
 select count(*)::integer,count(c.id)::integer into eligible_count,issued_count
 from eligible x left join public.certificates c on c.event_id=ev.id and c.user_id=x.user_id;
 return jsonb_build_object('eligible',eligible_count,'issued',issued_count,'setupReady',ready,
 'canConfigure',public.can_manage_event_certificate(ev.id),'assignmentId',scope_id,
 'municipal',actor.role::text='municipal_admin');
end;$$;

create or replace function public.generate_completed_event_certificates()
returns jsonb language plpgsql security definer set search_path='' as $$
declare ev record; candidate record; cert_id uuid; signatures jsonb; serial text; issued integer:=0;
begin
 -- Bound each run. Only events with outstanding eligible attendance are locked.
 for ev in
  select e.* from public.events e
  where e.certificates_enabled and e.status='completed' and e.end_at<=now()
  and exists(select 1 from public.event_certificate_signatories s where s.event_id=e.id and s.position=1 and length(btrim(s.name))>0 and length(btrim(s.title))>0)
  and exists(select 1 from public.attendance a join public.event_municipalities em on em.id=a.event_municipality_id
   where em.event_id=e.id and em.municipal_status is distinct from 'cancelled'
   and a.status in ('present','late') and a.checked_in_at is not null and a.checked_out_at is not null and a.checked_out_at>=a.checked_in_at
   and public.participant_can_register(a.user_id)
   and not exists(select 1 from public.certificates c where c.event_id=e.id and c.user_id=a.user_id))
  order by e.end_at,e.id limit 50 for update of e skip locked
 loop
  select jsonb_agg(jsonb_build_object('position',s.position,'name',s.name,'title',s.title) order by s.position)
  into signatures from public.event_certificate_signatories s where s.event_id=ev.id;
  for candidate in
   select distinct on(a.user_id) a.id aid,a.user_id,em.id assignment_id,em.municipality,p.full_name
   from public.attendance a join public.event_municipalities em on em.id=a.event_municipality_id
   join public.profiles p on p.id=a.user_id
   where em.event_id=ev.id and em.municipal_status is distinct from 'cancelled'
   and a.status in ('present','late') and a.checked_in_at is not null and a.checked_out_at is not null and a.checked_out_at>=a.checked_in_at
   and public.participant_can_register(a.user_id)
   and not exists(select 1 from public.certificates c where c.event_id=ev.id and c.user_id=a.user_id)
   order by a.user_id,a.checked_out_at desc,a.created_at desc,a.id limit 500
  loop
   -- Lock and recheck attendance before taking the immutable snapshot.
   perform 1 from public.attendance a join public.event_municipalities em on em.id=a.event_municipality_id
   where a.id=candidate.aid and a.user_id=candidate.user_id and em.event_id=ev.id
   and em.municipal_status is distinct from 'cancelled' and a.status in ('present','late')
   and a.checked_in_at is not null and a.checked_out_at is not null and a.checked_out_at>=a.checked_in_at
   and public.participant_can_register(a.user_id) for share of a,em;
   if not found then continue;end if;
   serial:='PTP-'||extract(year from timezone('Asia/Manila',ev.end_at))::integer::text||'-'||lpad(nextval('public.certificate_serial_seq')::text,6,'0');
   cert_id:=null;
   insert into public.certificates(event_id,user_id,attendance_id,certificate_number,issued_at,created_at,signatories_snapshot,participant_name_snapshot,issuer_name,municipality_snapshot,event_origin_snapshot)
   values(ev.id,candidate.user_id,candidate.aid,serial,now(),now(),signatures,candidate.full_name,
    case when ev.event_origin='municipal' then 'Municipality of '||candidate.municipality else 'Province of Antique' end,candidate.municipality,ev.event_origin)
   on conflict(event_id,user_id) do nothing returning id into cert_id;
   if cert_id is null then continue;end if;
   insert into public.notifications(user_id,event_id,event_municipality_id,type,title,message,read,dedupe_key)
   values(candidate.user_id,ev.id,candidate.assignment_id,'system','Certificate available','Your participation certificate for '||ev.title||' is available in My Certificates.',false,'certificate_issued:'||ev.id::text||':'||candidate.user_id::text)
   on conflict do nothing;
   issued:=issued+1;
  end loop;
 end loop;
 return jsonb_build_object('issued',issued);
end;$$;
-- Preserve automatic-only issuance permissions.
revoke all on function public.generate_completed_event_certificates() from public,anon,authenticated;
grant execute on function public.generate_completed_event_certificates() to service_role;
revoke all on function public.issue_event_certificates(uuid,uuid[]) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;

begin;
-- Runs as a scheduled database worker, never as an untrusted client.
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
   and a.status='present' and a.checked_in_at is not null and a.checked_out_at is not null and a.checked_out_at>=a.checked_in_at
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
   and a.status='present' and a.checked_in_at is not null and a.checked_out_at is not null and a.checked_out_at>=a.checked_in_at
   and public.participant_can_register(a.user_id)
   and not exists(select 1 from public.certificates c where c.event_id=ev.id and c.user_id=a.user_id)
   order by a.user_id,a.checked_out_at desc,a.created_at desc,a.id limit 500
  loop
   -- Lock and recheck attendance before taking the immutable snapshot.
   perform 1 from public.attendance a join public.event_municipalities em on em.id=a.event_municipality_id
   where a.id=candidate.aid and a.user_id=candidate.user_id and em.event_id=ev.id
   and em.municipal_status is distinct from 'cancelled' and a.status='present'
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
revoke all on function public.generate_completed_event_certificates() from public,anon,authenticated;
grant execute on function public.generate_completed_event_certificates() to service_role;
-- Automatic issuance replaces manual participant selection. Keep old RPC body for
-- migration compatibility, but deny clients access to it.
revoke all on function public.issue_event_certificates(uuid,uuid[]) from public,anon,authenticated;

create or replace function public.issue_my_certificate(p_event_id uuid)
returns public.certificates language plpgsql security definer set search_path='public' as $$
declare result public.certificates;
begin
 perform public.assert_account_operations_allowed();
 if auth.uid() is null or not public.participant_can_register(auth.uid()) then raise exception 'Account verification required.';end if;
 select * into result from public.certificates where event_id=p_event_id and user_id=auth.uid();
 if found then return result;end if;
 raise exception 'Your certificate will be generated automatically after the completed event, once signatories and eligible attendance are complete.';
end;$$;
revoke all on function public.issue_my_certificate(uuid) from public,anon;
grant execute on function public.issue_my_certificate(uuid) to authenticated;

-- pg_cron is already installed in this project. Re-running replaces this named job.
do $$declare old_job bigint;begin
 for old_job in select jobid from cron.job where jobname='pagtipon-generate-certificates-every-minute' loop
  perform cron.unschedule(old_job);
 end loop;
 perform cron.schedule('pagtipon-generate-certificates-every-minute','* * * * *','select public.generate_completed_event_certificates();');
end;$$;
notify pgrst,'reload schema';
commit;

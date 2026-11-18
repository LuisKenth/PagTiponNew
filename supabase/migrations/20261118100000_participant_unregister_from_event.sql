begin;

create or replace function public.participant_unregister_from_event(p_rsvp_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_assignment_id uuid;
  v_start_at timestamptz;
  v_event_status text;
  v_municipal_status text;
begin
  if v_user_id is null or not exists (
    select 1
    from public.profiles
    where id = v_user_id and role = 'participant'
  ) then
    raise exception 'Please sign in as a participant.';
  end if;

  select r.event_municipality_id
    into v_assignment_id
  from public.rsvps as r
  where r.id = p_rsvp_id and r.user_id = v_user_id and r.status = 'registered';

  if not found then
    raise exception 'This registration is no longer available.';
  end if;

  select e.start_at, e.status, em.municipal_status
    into v_start_at, v_event_status, v_municipal_status
  from public.events as e
  join public.event_municipalities as em on em.event_id = e.id
  where em.id = v_assignment_id
  for share of e, em;

  if not found
    or v_event_status is null
    or v_event_status not in ('published', 'upcoming')
    or v_municipal_status = 'cancelled'
    or v_start_at is null
    or v_start_at <= clock_timestamp()
  then
    raise exception 'You can only unregister before a scheduled event starts.';
  end if;

  perform 1
  from public.rsvps as r
  where r.id = p_rsvp_id
    and r.user_id = v_user_id
    and r.event_municipality_id = v_assignment_id
    and r.status = 'registered'
  for update;

  if not found then
    raise exception 'This registration is no longer available.';
  end if;

  perform 1 from public.attendance as a
  where a.rsvp_id = p_rsvp_id
  for update;

  if exists (
    select 1 from public.attendance as a
    where a.rsvp_id = p_rsvp_id
      and (
        a.status is distinct from 'pending'
        or a.checked_in_at is not null
        or a.checked_out_at is not null
      )
  ) then
    raise exception 'You can no longer unregister once attendance has been recorded.';
  end if;

  if v_start_at <= clock_timestamp() then
    raise exception 'The event has already started.';
  end if;

  delete from public.rsvps where id = p_rsvp_id and user_id = v_user_id;

  if not found then
    raise exception 'Unable to remove this registration.';
  end if;
end;
$$;

revoke execute on function public.participant_unregister_from_event(uuid) from public, anon;
grant execute on function public.participant_unregister_from_event(uuid) to authenticated;

commit;

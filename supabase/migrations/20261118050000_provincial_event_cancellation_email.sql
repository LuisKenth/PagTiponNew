-- Capture registered RSVPs before the existing cancellation triggers update them.
create or replace function public.capture_municipal_event_cancellation_recipients()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.municipal_event_cancellation_recipients (
    event_municipality_id, participant_id
  )
  select em.id, r.user_id
  from public.event_municipalities em
  join public.rsvps r on r.event_municipality_id = em.id
  join public.profiles p on p.id = r.user_id
  where em.event_id = old.id
    and (old.event_origin = 'provincial' or em.municipality = old.owner_municipality)
    and r.status = 'registered'
    and p.role = 'participant'
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function public.capture_municipal_event_cancellation_recipients() from public, anon, authenticated;

drop trigger capture_municipal_event_cancellation_recipients on public.events;

create trigger capture_municipal_event_cancellation_recipients
before update of status on public.events
for each row
when (
  old.event_origin in ('municipal', 'provincial')
  and old.status in ('published', 'upcoming')
  and new.status = 'cancelled'
)
execute function public.capture_municipal_event_cancellation_recipients();

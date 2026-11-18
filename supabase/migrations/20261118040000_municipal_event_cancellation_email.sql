alter table public.email_notification_deliveries
  drop constraint email_notification_deliveries_notification_type_check,
  add constraint email_notification_deliveries_notification_type_check
    check (notification_type in (
      'registration_open', 'local_instructions_updated', 'venue_updated',
      'event_reminder', 'event_cancelled'
    ));

create table public.municipal_event_cancellation_recipients (
  event_municipality_id uuid not null references public.event_municipalities(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  primary key (event_municipality_id, participant_id)
);

alter table public.municipal_event_cancellation_recipients enable row level security;
revoke all on public.municipal_event_cancellation_recipients from public, anon, authenticated;
grant select on public.municipal_event_cancellation_recipients to service_role;

-- Capture registered RSVPs before the existing cancellation triggers update them.
create function public.capture_municipal_event_cancellation_recipients()
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
    and em.municipality = old.owner_municipality
    and r.status = 'registered'
    and p.role = 'participant'
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function public.capture_municipal_event_cancellation_recipients() from public, anon, authenticated;

create trigger capture_municipal_event_cancellation_recipients
before update of status on public.events
for each row
when (
  old.event_origin = 'municipal'
  and old.status in ('published', 'upcoming')
  and new.status = 'cancelled'
)
execute function public.capture_municipal_event_cancellation_recipients();

begin;

create or replace function public.save_municipal_event(
  p_actor uuid,
  p_id uuid,
  p_payload jsonb,
  p_document jsonb default null,
  p_expected timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor public.profiles;
  current_event public.events;
  result public.events;
  action text := p_payload->>'action';
  start_time timestamptz;
  end_time timestamptz;
  selected_venue uuid := nullif(p_payload->>'venue_id','')::uuid;
  assignment_id uuid;
  categories text[];
  audience text := nullif(p_payload->>'audience_type','');
  doc_path text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Server access required.' using errcode = '42501';
  end if;

  select p.* into actor
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = p_actor
    and p.role::text = 'municipal_admin'
    and p.verification_status::text = 'approved'
    and nullif(btrim(p.municipality),'') is not null
    and coalesce((u.raw_app_meta_data->>'must_change_password')::boolean,false) = false
    and (u.banned_until is null or u.banned_until <= now())
  for share of p,u;

  if not found then
    raise exception 'Only an active approved Municipal Admin may manage municipal events.' using errcode = '42501';
  end if;
  if action is null or action not in ('draft','published','cancelled','deleted','edited') then
    raise exception 'Invalid action.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('municipal-event:' || p_id::text, 0));
  select * into current_event from public.events where id = p_id for update;

  if found then
    if current_event.event_origin is distinct from 'municipal'
      or current_event.owner_municipality is distinct from actor.municipality then
      raise exception 'Event access denied.' using errcode = '42501';
    end if;

    if (current_event.status::text = action and action = 'cancelled')
      or (action = 'published' and current_event.municipal_approval_recorded_at is not null
        and current_event.status::text in ('published','upcoming','ongoing','completed')) then
      return to_jsonb(current_event);
    end if;
    if p_expected is null or current_event.updated_at is distinct from p_expected then
      raise exception 'This event changed. Refresh before saving again.' using errcode = '40001';
    end if;

    if action = 'deleted' then
      if current_event.status::text <> 'draft' then raise exception 'Only drafts may be deleted.'; end if;
      delete from public.events where id = p_id;
      return jsonb_build_object('id',p_id,'deleted',true);
    end if;
    if action = 'cancelled' then
      if current_event.status::text not in ('draft','published','upcoming')
        or (current_event.status::text <> 'draft' and current_event.start_at <= now()) then
        raise exception 'Only drafts or future events may be cancelled.';
      end if;
      update public.events set status = 'cancelled' where id = p_id returning * into result;
      return to_jsonb(result);
    end if;
    if action = 'edited' then
      if current_event.status::text not in ('published','upcoming')
        or current_event.start_at is null or current_event.start_at <= clock_timestamp() then
        raise exception 'Only upcoming municipal events may be edited.';
      end if;
    elsif current_event.status::text <> 'draft' then
      raise exception 'Use Edit Event to update an upcoming event.';
    end if;
  else
    if p_expected is not null or action in ('cancelled','deleted','edited') then
      raise exception 'Event not found. Refresh the list.';
    end if;
    insert into public.events(id,title,created_by,status,event_origin,owner_municipality)
    values(p_id,upper(btrim(p_payload->>'title')),p_actor,'draft','municipal',actor.municipality)
    returning * into current_event;
  end if;

  if nullif(btrim(p_payload->>'title'),'') is null or char_length(p_payload->>'title') > 150 then
    raise exception 'Event title is required (maximum 150 characters).';
  end if;
  if char_length(p_payload->>'description') > 2000 or char_length(p_payload->>'local_instructions') > 2000 then
    raise exception 'Description or local instructions are too long.';
  end if;
  start_time := nullif(p_payload->>'start_at','')::timestamptz;
  end_time := nullif(p_payload->>'end_at','')::timestamptz;
  if start_time is not null and end_time is not null and end_time <= start_time then
    raise exception 'End time must be after start time.';
  end if;
  categories := array(select distinct jsonb_array_elements_text(coalesce(p_payload->'audience_categories','[]'::jsonb)));
  if audience = 'all' then categories := '{}'; end if;
  if audience is not null and audience not in ('all','categories') then raise exception 'Choose a valid event audience.'; end if;
  if not categories <@ array['farmer','fisherman','senior citizen','4ps','others'] then
    raise exception 'Invalid participant category.';
  end if;
  if char_length(p_payload->>'audience_category_other') > 100 then raise exception 'Other category is too long.'; end if;

  if selected_venue is not null then
    perform 1 from public.venues v
    where v.id = selected_venue and v.municipality = actor.municipality and v.status::text = 'active' and v.capacity > 0
    for share;
    if not found then raise exception 'Choose an active venue in your municipality with a valid capacity.'; end if;
  end if;

  if action in ('published','edited') then
    if nullif(btrim(p_payload->>'description'),'') is null or audience is null
      or start_time is null or end_time is null or start_time <= clock_timestamp() or selected_venue is null then
      raise exception 'Complete description, audience, future schedule and venue before saving.';
    end if;
    if audience = 'categories' and (cardinality(categories) = 0
      or ('others' = any(categories) and nullif(btrim(p_payload->>'audience_category_other'),'') is null)) then
      raise exception 'Complete the target audience.';
    end if;
    if coalesce((p_payload->>'approval_confirmed')::boolean,false) = false then
      raise exception 'Confirm that the uploaded document has municipal approval.';
    end if;
  end if;

  update public.events set
    title = upper(btrim(p_payload->>'title')),
    description = nullif(btrim(p_payload->>'description'),''),
    start_at = start_time,
    end_at = end_time,
    audience_type = audience,
    audience_categories = categories,
    audience_category_other = case when audience = 'categories' and 'others' = any(categories)
      then nullif(btrim(p_payload->>'audience_category_other'),'') else null end
  where id = p_id;

  select id into assignment_id from public.event_municipalities where event_id = p_id and municipality = actor.municipality;
  if assignment_id is null then
    if action = 'edited' then raise exception 'The municipal event assignment is missing.'; end if;
    insert into public.event_municipalities(event_id,municipality,local_venue_id,local_instructions,municipal_status,preparation_status,registration_open,prepared_by)
    values(p_id,actor.municipality,selected_venue,nullif(btrim(p_payload->>'local_instructions'),''),'pending','pending',false,p_actor)
    returning id into assignment_id;
  else
    update public.event_municipalities set
      local_venue_id = selected_venue,
      local_instructions = nullif(btrim(p_payload->>'local_instructions'),'')
    where id = assignment_id;
  end if;

  if p_document is not null then
    doc_path := p_document->>'file_path';
    if doc_path is null or doc_path !~ ('^municipal-memos/' || p_actor::text || '/' || p_id::text || '/[a-f0-9]{64}[.]pdf$') then
      raise exception 'Invalid approval document path.';
    end if;
    if not exists (
      select 1 from storage.objects o where o.bucket_id = 'official-memos' and o.name = doc_path
        and o.metadata->>'mimetype' = 'application/pdf'
        and (o.metadata->>'size')::bigint between 1 and 3145728
    ) then raise exception 'Upload a valid PDF approval document, maximum 3 MB.'; end if;
    if char_length(p_document->>'file_name') > 255 or nullif(btrim(p_document->>'file_name'),'') is null
      or nullif(p_document->>'file_url','') is null then raise exception 'Invalid document details.'; end if;
    if not exists (select 1 from public.event_memos where event_id = p_id and file_path = doc_path) then
      insert into public.event_memos(event_id,file_name,file_url,file_path,file_size,file_type)
      values(p_id,p_document->>'file_name',p_document->>'file_url',doc_path,(p_document->>'file_size')::bigint,'application/pdf');
    end if;
    update public.events set memo_url = p_document->>'file_url', memo_filename = p_document->>'file_name', memo_uploaded_at = now() where id = p_id;
  end if;

  if action in ('published','edited') and not exists (
    select 1 from public.event_memos m
    join storage.objects o on o.name = m.file_path and o.bucket_id = 'official-memos'
    where m.event_id = p_id and m.file_path like 'municipal-memos/%' and o.metadata->>'mimetype' = 'application/pdf'
  ) then raise exception 'An approved municipal memo or activity design is required.'; end if;

  if action = 'published' then
    update public.events set municipal_approval_recorded_by = p_actor, municipal_approval_recorded_at = now(), status = 'published' where id = p_id;
    update public.event_municipalities set municipal_status = 'prepared', preparation_status = 'ready', prepared_by = p_actor, registration_open = false where id = assignment_id;
    update public.events set status = 'upcoming' where id = p_id;
  elsif action = 'edited' then
    if least(current_event.start_at, start_time) <= clock_timestamp() then
      raise exception 'The event has already reached its start time.';
    end if;
    if p_document is not null then
      update public.events set municipal_approval_recorded_by = p_actor, municipal_approval_recorded_at = now() where id = p_id;
    end if;
  end if;

  select * into result from public.events where id = p_id;
  return to_jsonb(result);
end;
$function$;

commit;

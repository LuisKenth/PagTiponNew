begin;
alter table public.venues
 add column if not exists address text,
 add column if not exists landmark text,
 add column if not exists maps_url text,
 add column if not exists map_embed_url text,
 add column if not exists photo_paths text[] not null default '{}',
 add column if not exists location_revision integer not null default 0;

create or replace function public.can_manage_venue_location(p_venue_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join auth.users u on u.id=p.id join public.venues v on v.id=p_venue_id
 where p.id=auth.uid() and p.role::text='municipal_admin' and p.verification_status::text='approved'
 and lower(btrim(p.municipality))=lower(btrim(v.municipality)) and (u.banned_until is null or u.banned_until<=now()));
$$;
create or replace function public.can_view_venue_location(p_venue_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join auth.users u on u.id=p.id join public.venues v on v.id=p_venue_id
 where p.id=auth.uid() and (u.banned_until is null or u.banned_until<=now()) and (
 (p.role::text in ('provincial_admin','super_admin') and p.verification_status::text='approved')
 or public.can_manage_venue_location(v.id)
 or (p.role::text in ('participant','event_staff') and
 ((p.role::text='participant' and p.verification_status::text in ('approved','pending')) or (p.role::text='event_staff' and p.verification_status::text='approved'))
 and exists(select 1 from public.event_municipalities em join public.events e on e.id=em.event_id
 where em.local_venue_id=v.id and lower(btrim(em.municipality))=lower(btrim(p.municipality))
 and e.status::text<>'draft' and public.can_view_event_municipality(em.id)))
 ));
$$;

create or replace function public.valid_venue_maps_url(p_value text,p_embed boolean default false)
returns boolean language sql immutable set search_path='' as $$
 select p_value is null or (length(p_value)<=4000 and p_value !~ '[[:space:][:cntrl:]]' and
 case when p_embed then p_value ~ '^https://www[.]google[.]com/maps/embed[?]([^#]*&)?pb=[^&#]+(&[^#]*)?(#.*)?$'
 else p_value ~ '^https://((www[.])?google[.]com/maps([/?#].*)?|maps[.]google[.]com(/.*)?|maps[.]app[.]goo[.]gl/.+|goo[.]gl/maps/.+)$' end);
$$;

create or replace function public.validate_venue_location()
returns trigger language plpgsql security definer set search_path='' as $$
declare path text; changed boolean;
begin
 if tg_op='UPDATE' then
   changed := (new.address,new.landmark,new.maps_url,new.map_embed_url,new.photo_paths)
     is distinct from (old.address,old.landmark,old.maps_url,old.map_embed_url,old.photo_paths);
   new.location_revision:=old.location_revision;
   if not changed then return new;end if;
   if not public.can_manage_venue_location(old.id) then raise exception 'Only an active Municipal Admin of this municipality may edit venue location and photos.' using errcode='42501';end if;
 else
   changed:=true;
   -- Existing venue creation remains supported without location/photos.
   if coalesce(new.address,new.landmark,new.maps_url,new.map_embed_url) is not null or cardinality(new.photo_paths)>0 then
     if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=auth.uid() and p.role::text='municipal_admin' and p.verification_status::text='approved' and lower(btrim(p.municipality))=lower(btrim(new.municipality)) and (u.banned_until is null or u.banned_until<=now())) then raise exception 'Only an active Municipal Admin may add venue location.' using errcode='42501';end if;
   end if;
   new.location_revision:=0;
 end if;
 new.address:=nullif(btrim(new.address),'');new.landmark:=nullif(btrim(new.landmark),'');
 new.maps_url:=nullif(btrim(new.maps_url),'');new.map_embed_url:=nullif(btrim(new.map_embed_url),'');
 if length(new.address)>500 or length(new.landmark)>250 then raise exception 'Venue address or landmark is too long.';end if;
 if not public.valid_venue_maps_url(new.maps_url) or not public.valid_venue_maps_url(new.map_embed_url,true) then raise exception 'Use a valid Google Maps share or embed link.';end if;
 if new.photo_paths is null or cardinality(new.photo_paths)>3 or array_position(new.photo_paths,null) is not null or (select count(distinct x) from unnest(new.photo_paths) x)<>cardinality(new.photo_paths) then raise exception 'A venue may have at most 3 distinct photos.';end if;
 foreach path in array new.photo_paths loop
   if path !~ ('^'||new.id::text||'/[0-9a-f-]{36}[.](jpg|png|webp)$') then raise exception 'Invalid venue photo path.';end if;
   if not exists(select 1 from storage.objects o where o.bucket_id='venue-photos' and o.name=path and o.metadata->>'mimetype' in ('image/jpeg','image/png','image/webp') and (o.metadata->>'size')::bigint between 1 and 5242880) then raise exception 'Upload a JPG, PNG, or WebP photo no larger than 5 MB before saving.';end if;
 end loop;
 if tg_op='UPDATE' then new.location_revision:=old.location_revision+1;end if;
 return new;
end;$$;
drop trigger if exists validate_venue_location_trigger on public.venues;
create trigger validate_venue_location_trigger before insert or update on public.venues for each row execute function public.validate_venue_location();

create or replace function public.get_venue_location(p_venue_id uuid default null,p_event_municipality_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare venue_id uuid;result jsonb; actor_role text;
begin
 select p.role::text into actor_role from public.profiles p where p.id=auth.uid();
 if p_event_municipality_id is not null then
   if not public.can_view_event_municipality(p_event_municipality_id) or not exists(select 1 from public.event_municipalities em join public.events e on e.id=em.event_id where em.id=p_event_municipality_id and e.status::text<>'draft') then raise exception 'Event venue is unavailable.' using errcode='42501';end if;
   select em.local_venue_id into venue_id from public.event_municipalities em where em.id=p_event_municipality_id;
 else
   if actor_role not in ('municipal_admin','provincial_admin','super_admin') or actor_role is null then raise exception 'Open venue details through your event.' using errcode='42501';end if;
   venue_id:=p_venue_id;
 end if;
 if venue_id is null then return null;end if;
 if not public.can_view_venue_location(venue_id) then raise exception 'Venue access is unavailable.' using errcode='42501';end if;
 select jsonb_build_object('id',v.id,'venue_name',v.venue_name,'municipality',v.municipality,'capacity',v.capacity,'address',v.address,'landmark',v.landmark,'maps_url',v.maps_url,'map_embed_url',v.map_embed_url,'photo_paths',v.photo_paths,'location_revision',v.location_revision) into result from public.venues v where v.id=venue_id;
 return result;
end;$$;

-- Private assets. Only current authorized viewers can request a signed URL.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('venue-photos','venue-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create or replace function public.venue_photo_access(p_path text,p_write boolean default false)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare venue_id uuid;
begin
 if p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|png|webp)$' then return false;end if;
 begin venue_id:=split_part(p_path,'/',1)::uuid;exception when invalid_text_representation then return false;end;
 if public.can_manage_venue_location(venue_id) then return true;end if;
 if p_write then return false;end if;
 return public.can_view_venue_location(venue_id) and exists(select 1 from public.venues v where v.id=venue_id and p_path=any(v.photo_paths));
end;$$;
drop policy if exists venue_photos_read on storage.objects;
create policy venue_photos_read on storage.objects for select to authenticated using(bucket_id='venue-photos' and public.venue_photo_access(name));
drop policy if exists venue_photos_upload on storage.objects;
create policy venue_photos_upload on storage.objects for insert to authenticated with check(bucket_id='venue-photos' and public.venue_photo_access(name,true));
drop policy if exists venue_photos_delete on storage.objects;
create policy venue_photos_delete on storage.objects for delete to authenticated using(bucket_id='venue-photos' and public.venue_photo_access(name,true) and not exists(select 1 from public.venues v where name=any(v.photo_paths)));
-- No UPDATE policy: photos are immutable objects with random names; replacement uses a new object.
revoke all on function public.validate_venue_location() from public,anon,authenticated;
revoke all on function public.can_manage_venue_location(uuid),public.can_view_venue_location(uuid),public.venue_photo_access(text,boolean),public.get_venue_location(uuid,uuid) from public,anon;
grant execute on function public.can_manage_venue_location(uuid),public.can_view_venue_location(uuid),public.venue_photo_access(text,boolean),public.get_venue_location(uuid,uuid) to authenticated;
create or replace function public.protect_venue_photo_deletion()
returns trigger language plpgsql set search_path='' as $$
begin
 if cardinality(old.photo_paths)>0 then raise exception 'Remove venue photos in Venue Details and save before deleting this venue.';end if;
 return old;
end;$$;
drop trigger if exists protect_venue_photo_deletion_trigger on public.venues;
create trigger protect_venue_photo_deletion_trigger before delete on public.venues for each row execute function public.protect_venue_photo_deletion();
revoke all on function public.protect_venue_photo_deletion() from public,anon,authenticated;
commit;

begin;
alter table public.venues add column if not exists google_place_id text;
alter table public.venues drop constraint if exists venues_google_place_id_format;
alter table public.venues add constraint venues_google_place_id_format check(google_place_id is null or (char_length(google_place_id) between 1 and 1024 and google_place_id ~ '^[A-Za-z0-9_-]+$'));
-- Store only the selected place identifier; map geometry is requested live.
-- Venue name/address are reviewed and maintained by the municipal administrator.
create or replace function public.validate_venue_location()
returns trigger language plpgsql security definer set search_path='' as $$
declare path text; changed boolean;
begin
 if tg_op='UPDATE' then
   changed := (new.address,new.landmark,new.maps_url,new.map_embed_url,new.google_place_id,new.photo_paths)
     is distinct from (old.address,old.landmark,old.maps_url,old.map_embed_url,old.google_place_id,old.photo_paths);
   new.location_revision:=old.location_revision;
   if not changed then return new;end if;
   if not public.can_manage_venue_location(old.id) then raise exception 'Only an active Municipal Admin of this municipality may edit venue location and photos.' using errcode='42501';end if;
 else
   changed:=true;
   -- Existing venue creation remains supported without location/photos.
   if coalesce(new.address,new.landmark,new.maps_url,new.map_embed_url,new.google_place_id) is not null or cardinality(new.photo_paths)>0 then
     if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=auth.uid() and p.role::text='municipal_admin' and p.verification_status::text='approved' and lower(btrim(p.municipality))=lower(btrim(new.municipality)) and (u.banned_until is null or u.banned_until<=now())) then raise exception 'Only an active Municipal Admin may add venue location.' using errcode='42501';end if;
   end if;
   new.location_revision:=0;
 end if;
 new.address:=nullif(btrim(new.address),'');new.landmark:=nullif(btrim(new.landmark),'');
 new.maps_url:=nullif(btrim(new.maps_url),'');new.map_embed_url:=nullif(btrim(new.map_embed_url),'');new.google_place_id:=nullif(btrim(new.google_place_id),'');
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
 select jsonb_build_object('id',v.id,'venue_name',v.venue_name,'municipality',v.municipality,'capacity',v.capacity,'address',v.address,'landmark',v.landmark,'maps_url',v.maps_url,'map_embed_url',v.map_embed_url,'photo_paths',v.photo_paths,'location_revision',v.location_revision,'google_place_id',v.google_place_id) into result from public.venues v where v.id=venue_id;
 return result;
end;$$;


create or replace function public.require_active_venue_editor()
returns trigger language plpgsql security definer set search_path='' as $$
declare actor_municipality text; target_municipality text;
begin
 if auth.role()='authenticated' then
  select p.municipality into actor_municipality from public.profiles p join auth.users u on u.id=p.id
   where p.id=auth.uid() and p.role::text='municipal_admin' and p.verification_status::text='approved' and (u.banned_until is null or u.banned_until<=now());
  if tg_op='DELETE' then target_municipality:=old.municipality;else target_municipality:=new.municipality;end if;
  if actor_municipality is null or lower(btrim(actor_municipality))<>lower(btrim(target_municipality)) then raise exception 'Only an active Municipal Admin of this municipality may manage venues.' using errcode='42501';end if;
  if tg_op='UPDATE' and lower(btrim(old.municipality))<>lower(btrim(actor_municipality)) then raise exception 'Venue municipality cannot be reassigned.' using errcode='42501';end if;
 end if;
 if tg_op='DELETE' then return old;end if;
 return new;
end;$$;
drop trigger if exists require_active_venue_editor_trigger on public.venues;
create trigger require_active_venue_editor_trigger before insert or update or delete on public.venues for each row execute function public.require_active_venue_editor();
revoke all on function public.require_active_venue_editor() from public,anon,authenticated;
commit;

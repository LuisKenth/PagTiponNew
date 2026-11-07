begin;
create or replace function public.protect_preparation_instructions()
returns trigger language plpgsql security definer set search_path='' as $$
declare source text; event_state text;
begin
 if tg_op='UPDATE' and new.local_instructions is not distinct from old.local_instructions then return new;end if;
 if char_length(new.local_instructions)>2000 then raise exception 'Local instructions must not exceed 2,000 characters.';end if;
 select e.event_origin,e.status::text into source,event_state from public.events e where e.id=new.event_id;
 if tg_op='UPDATE' and source='municipal' and event_state<>'draft' and auth.role()='authenticated' then
  raise exception 'Municipal event instructions are retained from Create Event and cannot be changed in Event Preparation.' using errcode='42501';
 end if;
 return new;
end;$$;
drop trigger if exists protect_preparation_instructions on public.event_municipalities;
create trigger protect_preparation_instructions before insert or update of local_instructions on public.event_municipalities for each row execute function public.protect_preparation_instructions();
revoke all on function public.protect_preparation_instructions() from public,anon,authenticated;
commit;

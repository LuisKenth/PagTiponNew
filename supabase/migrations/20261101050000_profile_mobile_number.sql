begin;
alter table public.profiles add column if not exists mobile_number text;

create or replace function public.normalize_ph_mobile(p_value text)
returns text language plpgsql immutable set search_path='' as $$
declare compact text;
begin
 if p_value is null or btrim(p_value)='' then return null; end if;
 if char_length(p_value)>64 then raise exception 'Invalid Philippine mobile number.'; end if;
 compact:=regexp_replace(btrim(p_value),'[ ()-]','','g');
 if compact ~ '^09[0-9]{9}$' then return '+63'||substr(compact,2); end if;
 if compact ~ '^639[0-9]{9}$' then return '+'||compact; end if;
 if compact ~ '^\+639[0-9]{9}$' then return compact; end if;
 raise exception 'Invalid Philippine mobile number. Use 09XXXXXXXXX or +639XXXXXXXXX.';
end;
$$;

-- The existing handle_new_user trigger inserts profiles. This BEFORE trigger
-- adds only the new contact field without replacing the role/category logic.
create or replace function public.set_profile_mobile_number()
returns trigger language plpgsql security definer set search_path='' as $$
declare source_number text;
begin
 source_number:=new.mobile_number;
 if tg_op='INSERT' and source_number is null then
   select u.raw_user_meta_data->>'mobile_number' into source_number
   from auth.users u where u.id=new.id;
 end if;
 new.mobile_number:=public.normalize_ph_mobile(source_number);
 return new;
end;
$$;
revoke all on function public.set_profile_mobile_number() from public,anon,authenticated;
drop trigger if exists set_profile_mobile_number_trigger on public.profiles;
create trigger set_profile_mobile_number_trigger
 before insert or update of mobile_number on public.profiles
 for each row execute function public.set_profile_mobile_number();

alter table public.profiles drop constraint if exists profiles_mobile_number_format;
alter table public.profiles add constraint profiles_mobile_number_format
 check (mobile_number is null or mobile_number ~ '^\+639[0-9]{9}$');
comment on column public.profiles.mobile_number is 'Optional Philippine contact number in +639XXXXXXXXX format. Collection does not verify ownership or enable SMS messaging.';
commit;

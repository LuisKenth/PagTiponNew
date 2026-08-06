create or replace function public.protect_profile_authorization_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  /*
   * Allow trusted server operations where there is
   * no authenticated end-user JWT.
   */
  if auth.uid() is null then
    return new;
  end if;

  select p.role::text
  into actor_role
  from public.profiles p
  where p.id = auth.uid();

  /*
   * Only provincial administrators may change
   * authorization-related profile fields.
   */
  if actor_role is distinct from 'provincial_admin' then
    if new.id is distinct from old.id then
      raise exception
        'You are not allowed to change the profile ID.';
    end if;

    if new.role is distinct from old.role then
      raise exception
        'You are not allowed to change your account role.';
    end if;

    if new.municipality is distinct from old.municipality then
      raise exception
        'You are not allowed to change your municipality.';
    end if;

    if new.verification_status
      is distinct from old.verification_status
    then
      raise exception
        'You are not allowed to change your verification status.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists
  protect_profile_authorization_fields_trigger
on public.profiles;

create trigger protect_profile_authorization_fields_trigger
before update on public.profiles
for each row
execute function
  public.protect_profile_authorization_fields();

alter table public.profiles
enable row level security;

drop policy if exists
  "Approved municipal admins can update own profile settings"
on public.profiles;

create policy
  "Approved municipal admins can update own profile settings"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  and role::text = 'municipal_admin'
  and verification_status::text = 'approved'
)
with check (
  id = auth.uid()
  and role::text = 'municipal_admin'
  and verification_status::text = 'approved'
);

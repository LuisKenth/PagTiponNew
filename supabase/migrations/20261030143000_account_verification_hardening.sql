begin;

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  requested_role text;
  selected_role public.user_role;
  selected_status public.verification_status;

  selected_first_name text;
  selected_middle_name text;
  selected_last_name text;
  selected_suffix text;
  selected_full_name text;

  selected_municipality text;

  requested_participant_category text;
  selected_participant_category text;
  selected_participant_category_other text;
begin
  selected_first_name :=
    nullif(btrim(new.raw_user_meta_data->>'first_name'), '');

  selected_middle_name :=
    nullif(btrim(new.raw_user_meta_data->>'middle_name'), '');

  selected_last_name :=
    nullif(btrim(new.raw_user_meta_data->>'last_name'), '');

  selected_suffix :=
    nullif(btrim(new.raw_user_meta_data->>'suffix'), '');

  /*
   * Structured names take priority.
   * Require both first and last name when either is supplied.
   * Retain full_name fallback for existing account-creation flows.
   */
  if selected_first_name is not null
     or selected_last_name is not null then

    if selected_first_name is null then
      raise exception 'Please enter your first name.';
    end if;

    if selected_last_name is null then
      raise exception 'Please enter your last name.';
    end if;

    selected_full_name := concat_ws(
      ' ',
      selected_first_name,
      selected_middle_name,
      selected_last_name,
      selected_suffix
    );
  else
    selected_full_name :=
      coalesce(
        nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
        ''
      );
  end if;

  requested_role := new.raw_app_meta_data->>'provisioned_role';
  if requested_role in ('provincial_admin', 'municipal_admin', 'event_staff') then
    selected_role := requested_role::public.user_role;
  else
    selected_role := 'participant'::public.user_role;
  end if;
  selected_status := 'approved'::public.verification_status;

  selected_municipality :=
    nullif(btrim(new.raw_user_meta_data->>'municipality'), '');

  if selected_role = 'participant' then
    requested_participant_category := lower(
      coalesce(
        nullif(
          btrim(new.raw_user_meta_data->>'participant_category'),
          ''
        ),
        ''
      )
    );

    if requested_participant_category not in (
      'farmer',
      'fisherman',
      'senior_citizen',
      '4ps',
      'others'
    ) then
      raise exception 'Please select a valid participant category.';
    end if;

    selected_participant_category :=
      requested_participant_category;

    if requested_participant_category = 'others' then
      selected_participant_category_other :=
        nullif(
          btrim(new.raw_user_meta_data->>'participant_category_other'),
          ''
        );

      if selected_participant_category_other is null then
        raise exception 'Please specify your participant category.';
      end if;

      if char_length(selected_participant_category_other) > 100 then
        raise exception 'Participant category description is too long.';
      end if;
    else
      selected_participant_category_other := null;
    end if;
  else
    selected_participant_category := null;
    selected_participant_category_other := null;
  end if;

  insert into public.profiles (
    id,
    first_name,
    middle_name,
    last_name,
    suffix,
    full_name,
    email,
    role,
    municipality,
    verification_status,
    participant_category,
    participant_category_other
  )
  values (
    new.id,
    selected_first_name,
    selected_middle_name,
    selected_last_name,
    selected_suffix,
    selected_full_name,
    coalesce(new.email, ''),
    selected_role,
    selected_municipality,
    selected_status,
    selected_participant_category,
    selected_participant_category_other
  );

  return new;
end;
$$;

drop policy if exists "Users can insert own profile" on public.profiles;
revoke insert on public.profiles from anon, authenticated;

alter table public.participant_verifications
  add column profile_revision bigint not null default 0,
  add column invalidated_at timestamptz,
  add column invalidation_reason text,
  add column withdrawn_at timestamptz,
  add column document_deleted_at timestamptz;
alter table public.profiles
  add column verification_revision bigint not null default 0;

-- Normalize structured names and invalidate identity-dependent approvals.
create or replace function public.sync_verified_profile_details()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.first_name, new.middle_name, new.last_name, new.suffix)
     is distinct from (old.first_name, old.middle_name, old.last_name, old.suffix) then
    if nullif(btrim(new.first_name), '') is null or nullif(btrim(new.last_name), '') is null then
      raise exception 'First name and last name are required.';
    end if;
    new.first_name := btrim(new.first_name);
    new.middle_name := nullif(btrim(new.middle_name), '');
    new.last_name := btrim(new.last_name);
    new.suffix := nullif(btrim(new.suffix), '');
    new.full_name := concat_ws(' ',new.first_name,new.middle_name,new.last_name,new.suffix);
  elsif new.full_name is distinct from old.full_name then
    -- Legacy forms edit full_name only; do not keep contradictory components.
    new.full_name := btrim(new.full_name);
    new.first_name := null; new.middle_name := null;
    new.last_name := null; new.suffix := null;
  end if;
  new.verification_revision := old.verification_revision;
  if old.role = 'participant' and
     (new.full_name,new.first_name,new.middle_name,new.last_name,new.suffix,
      new.municipality,new.participant_category,new.participant_category_other,new.role)
     is distinct from
     (old.full_name,old.first_name,old.middle_name,old.last_name,old.suffix,
      old.municipality,old.participant_category,old.participant_category_other,old.role) then
    new.verification_revision := old.verification_revision + 1;
  end if;
  return new;
end; $$;
create trigger sync_verified_profile_details_trigger before update on public.profiles
for each row execute function public.sync_verified_profile_details();

create or replace function public.invalidate_participant_proofs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.verification_revision is distinct from old.verification_revision then
    update public.participant_verifications
    set invalidated_at = now(),
        invalidation_reason = 'Profile details changed. Please submit updated proofs.'
    where participant_id = new.id and invalidated_at is null and withdrawn_at is null;
  end if;
  return new;
end; $$;
create trigger invalidate_participant_proofs_trigger after update on public.profiles
for each row execute function public.invalidate_participant_proofs();

drop index public.participant_verifications_pending_unique;
create unique index participant_verifications_pending_unique
on public.participant_verifications(participant_id,verification_type)
where status='pending' and invalidated_at is null and withdrawn_at is null;


CREATE OR REPLACE FUNCTION "public"."participant_can_register"("p_participant_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  participant public.profiles%rowtype;
  residency public.participant_verifications%rowtype;
  category_proof public.participant_verifications%rowtype;
begin
  -- Participants can only check their own eligibility.
  if auth.uid() is null
     or auth.uid() <> p_participant_id then
    return false;
  end if;

  select *
  into participant
  from public.profiles
  where id = p_participant_id;

  if not found then
    return false;
  end if;

  if participant.role <> 'participant' or participant.verification_status <> 'approved'
     or participant.municipality is null then
    return false;
  end if;

  select *
  into residency
  from public.participant_verifications
  where participant_id = p_participant_id
    and verification_type = 'residency'
  order by submitted_at desc, id desc
  limit 1;

  if not found then
    return false;
  end if;

  if residency.invalidated_at is not null or residency.withdrawn_at is not null
     or residency.profile_revision <> participant.verification_revision
     or residency.status <> 'approved'
     or residency.municipality is distinct from
        participant.municipality then
    return false;
  end if;

  select *
  into category_proof
  from public.participant_verifications
  where participant_id = p_participant_id
    and verification_type = 'category'
  order by submitted_at desc, id desc
  limit 1;

  if not found then
    return false;
  end if;

  if category_proof.invalidated_at is not null or category_proof.withdrawn_at is not null
     or category_proof.profile_revision <> participant.verification_revision
     or category_proof.status <> 'approved'
     or category_proof.municipality is distinct from
        participant.municipality
     or category_proof.participant_category is distinct from
        participant.participant_category
     or category_proof.participant_category_other is distinct from
        participant.participant_category_other then
    return false;
  end if;

  return true;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."submit_participant_verification"("p_verification_type" "text", "p_document_type" "text", "p_document_path" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  current_profile public.profiles%rowtype;
  submission_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first.';
  end if;

  select *
  into current_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if not found then
    raise exception 'Profile not found.';
  end if;

  if current_profile.role <> 'participant' then
    raise exception 'Only participants can submit verification.';
  end if;

  if nullif(btrim(current_profile.municipality), '') is null then
    raise exception 'Please set your municipality first.';
  end if;

  if p_verification_type is null
     or p_verification_type not in ('residency', 'category') then
    raise exception 'Invalid verification type.';
  end if;

  if nullif(btrim(p_document_type), '') is null
     or char_length(p_document_type) > 100 then
    raise exception 'Please provide a valid document type.';
  end if;

  if p_verification_type = 'category'
     and coalesce(current_profile.participant_category, '') not in (
       'farmer',
       'fisherman',
       'senior_citizen',
       '4ps',
       'others'
     ) then
    raise exception 'Please set a valid participant category first.';
  end if;

  if p_verification_type = 'category'
     and current_profile.participant_category = 'others'
     and nullif(
       btrim(current_profile.participant_category_other),
       ''
     ) is null then
    raise exception 'Please specify your participant category first.';
  end if;

  if split_part(p_document_path, '/', 1) <> auth.uid()::text
     or split_part(p_document_path, '/', 2) <> p_verification_type
     or p_document_path is null then
    raise exception 'Invalid document path.';
  end if;

  perform 1 from storage.objects where bucket_id='participant-proofs' and name=p_document_path for update;
  if exists(select 1 from public.proof_cleanup_queue where document_path=p_document_path) then
    raise exception 'This upload is expired. Please upload a new copy.';
  end if;

  if exists (select 1 from public.participant_verifications where document_path = p_document_path) then
    raise exception 'This upload has already been submitted. Upload a new copy.';
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'participant-proofs'
      and o.name = p_document_path
  ) then
    raise exception 'Please upload your document first.';
  end if;

  if exists (
    select 1
    from public.participant_verifications
    where participant_id = auth.uid()
      and verification_type = p_verification_type
      and status = 'pending' and invalidated_at is null and withdrawn_at is null
  ) then
    raise exception 'You already have a submission pending review.';
  end if;

  insert into public.participant_verifications (
    participant_id,
    verification_type,
    municipality,
    participant_category,
    participant_category_other,
    document_type,
    document_path,
    profile_revision
  )
  values (
    auth.uid(),
    p_verification_type,
    current_profile.municipality,
    case
      when p_verification_type = 'category'
      then current_profile.participant_category
    end,
    case
      when p_verification_type = 'category'
      then current_profile.participant_category_other
    end,
    btrim(p_document_type),
    p_document_path,
    current_profile.verification_revision
  )
  returning id into submission_id;

  return submission_id;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."review_participant_verification"("p_submission_id" "uuid", "p_decision" "text", "p_rejection_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  submission public.participant_verifications%rowtype;
  current_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first.';
  end if;

  if p_decision is null
     or p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid review decision.';
  end if;

  -- Lock profile before submission, matching submit/withdraw/profile-edit order.
  select p.* into current_profile from public.profiles p
  join public.participant_verifications v on v.participant_id=p.id
  where v.id=p_submission_id for update of p;

  select *
  into submission
  from public.participant_verifications
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Submission not found.';
  end if;

  if not public.can_review_participant_verification(
    submission.municipality
  ) then
    raise exception 'You cannot review this submission.';
  end if;

  if submission.participant_id = auth.uid() then
    raise exception 'You cannot review your own submission.';
  end if;

  if submission.invalidated_at is not null or submission.withdrawn_at is not null
     or submission.profile_revision <> current_profile.verification_revision then
    raise exception 'This submission is outdated or withdrawn. A new submission is required.';
  end if;

  if submission.status <> 'pending' then
    raise exception 'This submission has already been reviewed.';
  end if;

  select *
  into current_profile
  from public.profiles
  where id = submission.participant_id
  for share;

  if not found then
    raise exception 'Participant profile not found.';
  end if;

  if current_profile.role <> 'participant'
     or current_profile.municipality is distinct from
        submission.municipality then
    raise exception 'Participant details changed. A new submission is required.';
  end if;

  if submission.verification_type = 'category'
     and (
       current_profile.participant_category is distinct from
         submission.participant_category
       or current_profile.participant_category_other is distinct from
         submission.participant_category_other
     ) then
    raise exception 'Participant category changed. A new submission is required.';
  end if;

  if p_decision = 'rejected'
     and nullif(btrim(p_rejection_reason), '') is null then
    raise exception 'Please provide a rejection reason.';
  end if;

  if char_length(p_rejection_reason) > 1000 then
    raise exception 'Rejection reason must not exceed 1000 characters.';
  end if;

  update public.participant_verifications
  set
    status = p_decision,
    rejection_reason = case
      when p_decision = 'rejected'
      then btrim(p_rejection_reason)
      else null
    end,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_submission_id;
end;
$$;

create or replace function public.withdraw_participant_verification(p_submission_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  update public.participant_verifications
  set withdrawn_at=now()
  where id=p_submission_id and participant_id=auth.uid()
    and status='pending' and withdrawn_at is null and invalidated_at is null;
  if not found then raise exception 'No pending submission available to withdraw.'; end if;
end; $$;
revoke all on function public.withdraw_participant_verification(uuid) from public, anon;
grant execute on function public.withdraw_participant_verification(uuid) to authenticated;

-- Restrictive policies also apply when an existing permissive policy allows access.
-- Staff/admin policies continue to work for those roles.
create policy verified_participant_rsvp_read on public.rsvps as restrictive
for select to authenticated using (
 public.get_current_user_role() is distinct from 'participant'
 or public.participant_can_register(auth.uid())
);
create policy verified_participant_rsvp_update on public.rsvps as restrictive
for update to authenticated using (
 public.get_current_user_role() is distinct from 'participant'
 or public.participant_can_register(auth.uid())
) with check (
 public.get_current_user_role() is distinct from 'participant'
 or public.participant_can_register(auth.uid())
);
create policy verified_participant_attendance_read on public.attendance as restrictive
for select to authenticated using (
 public.get_current_user_role() is distinct from 'participant'
 or public.participant_can_register(auth.uid())
);
create policy verified_participant_certificate_read on public.certificates as restrictive
for select to authenticated using (
 public.get_current_user_role() is distinct from 'participant'
 or public.participant_can_register(auth.uid())
);

-- Allow document reviewers to read participant names before event registration.
create policy municipal_reviewers_read_participant_profiles on public.profiles
for select to authenticated using (
 role='participant' and public.can_review_participant_verification(municipality)
);


CREATE OR REPLACE FUNCTION "public"."get_my_certificate"("p_event_id" "uuid") RETURNS TABLE("certificate_id" "uuid", "certificate_number" "text", "issued_at" timestamp with time zone, "participant_name" "text", "event_id" "uuid", "event_title" "text", "event_start_at" timestamp with time zone, "event_end_at" timestamp with time zone, "checked_in_at" timestamp with time zone, "checked_out_at" timestamp with time zone, "signatories" "jsonb")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$

  select

    c.id as certificate_id,

    c.certificate_number,

    c.issued_at,

    p.full_name as participant_name,

    e.id as event_id,

    e.title as event_title,

    e.start_at as event_start_at,

    e.end_at as event_end_at,

    a.checked_in_at,

    a.checked_out_at,

    coalesce(

      (
        select jsonb_agg(
          jsonb_build_object(
            'position', ecs.position,
            'name', ecs.name,
            'title', ecs.title
          )
          order by ecs.position
        )

        from public.event_certificate_signatories ecs

        where ecs.event_id = e.id
      ),

      '[]'::jsonb

    ) as signatories

  from public.certificates c

  inner join public.profiles p
    on p.id = c.user_id

  inner join public.events e
    on e.id = c.event_id

  inner join public.attendance a
    on a.id = c.attendance_id

  where

    c.user_id = auth.uid() and public.participant_can_register(auth.uid())

    and c.event_id = p_event_id

  limit 1;

$$;

revoke all on function public.get_my_certificate(uuid) from public, anon;

CREATE OR REPLACE FUNCTION "public"."get_my_certificate_events"() RETURNS TABLE("event_id" "uuid", "event_title" "text", "event_start_at" timestamp with time zone, "event_end_at" timestamp with time zone, "attendance_id" "uuid", "checked_in_at" timestamp with time zone, "checked_out_at" timestamp with time zone, "certificate_id" "uuid", "certificate_number" "text", "issued_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$

  with eligible as (

    select distinct on (e.id)

      e.id as event_id,

      e.title as event_title,

      e.start_at as event_start_at,

      e.end_at as event_end_at,

      a.id as attendance_id,

      a.checked_in_at,

      a.checked_out_at

    from public.attendance a

    inner join public.event_municipalities em
      on em.id = a.event_municipality_id

    inner join public.events e
      on e.id = em.event_id

    where

      a.user_id = auth.uid() and public.participant_can_register(auth.uid())

      and a.status = 'present'

      and a.checked_in_at is not null

      and a.checked_out_at is not null

      and e.status = 'completed'

      and e.end_at <= now()

    order by
      e.id,
      a.checked_out_at desc,
      a.created_at desc
  )

  select

    eligible.event_id,

    eligible.event_title,

    eligible.event_start_at,

    eligible.event_end_at,

    eligible.attendance_id,

    eligible.checked_in_at,

    eligible.checked_out_at,

    c.id as certificate_id,

    c.certificate_number,

    c.issued_at

  from eligible

  left join public.certificates c
    on c.event_id = eligible.event_id
   and c.user_id = auth.uid()

  order by eligible.event_end_at desc;

$$;

revoke all on function public.get_my_certificate_events() from public, anon;

CREATE OR REPLACE FUNCTION "public"."issue_my_certificate"("p_event_id" "uuid") RETURNS "public"."certificates"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_attendance_id uuid;
  v_event_end_at timestamptz;
  v_certificate_number text;
  v_certificate public.certificates;
  v_required_signatory_exists boolean;
begin
  if not public.participant_can_register(auth.uid()) then
    raise exception 'Account verification required.';
  end if;

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'Authentication required.';
  end if;


  -- Return existing certificate if already issued.
  select c.*
  into v_certificate
  from public.certificates c
  where
    c.event_id = p_event_id
    and c.user_id = v_user_id;

  if found then
    return v_certificate;
  end if;


  -- ==========================================================
  -- REQUIRED SIGNATORY 1
  -- ==========================================================

  select exists (
    select 1
    from public.event_certificate_signatories ecs
    where
      ecs.event_id = p_event_id
      and ecs.position = 1
      and length(trim(ecs.name)) > 0
      and length(trim(ecs.title)) > 0
  )
  into v_required_signatory_exists;


  if not v_required_signatory_exists then
    raise exception using
      errcode = 'P0001',
      message =
        'Certificate unavailable. The event certificate signatory has not been configured yet.',
      hint =
        'A Provincial Admin must configure Signatory 1 before certificates can be issued.';
  end if;


  -- ==========================================================
  -- VALIDATE ATTENDANCE ELIGIBILITY
  -- ==========================================================

  select
    a.id,
    e.end_at
  into
    v_attendance_id,
    v_event_end_at
  from public.attendance a

  inner join public.event_municipalities em
    on em.id = a.event_municipality_id

  inner join public.events e
    on e.id = em.event_id

  where
    a.user_id = v_user_id
    and e.id = p_event_id

    and a.status = 'present'

    and a.checked_in_at is not null
    and a.checked_out_at is not null

    and e.status = 'completed'
    and e.end_at <= now()

  order by
    a.checked_out_at desc,
    a.created_at desc

  limit 1;


  if v_attendance_id is null then
    raise exception using
      errcode = 'P0001',
      message =
        'Certificate unavailable. Complete Check-In and Check-Out are required for a completed event.',
      hint =
        'The participant must have Present attendance with both Time In and Time Out recorded.';
  end if;


  -- ==========================================================
  -- OFFICIAL CERTIFICATE NUMBER
  --
  -- Example:
  -- PTP-2026-000004
  -- ==========================================================

  v_certificate_number :=
    'PTP-'
    ||
    extract(
      year
      from timezone(
        'Asia/Manila',
        v_event_end_at
      )
    )::integer::text
    ||
    '-'
    ||
    lpad(
      nextval(
        'public.certificate_serial_seq'
      )::text,
      6,
      '0'
    );


  insert into public.certificates (
    event_id,
    user_id,
    attendance_id,
    certificate_number,
    issued_at,
    created_at
  )
  values (
    p_event_id,
    v_user_id,
    v_attendance_id,
    v_certificate_number,
    now(),
    now()
  )

  on conflict (event_id, user_id)
  do nothing

  returning *
  into v_certificate;


  if v_certificate.id is null then
    select c.*
    into v_certificate
    from public.certificates c
    where
      c.event_id = p_event_id
      and c.user_id = v_user_id;
  end if;


  return v_certificate;

end;
$$;

revoke all on function public.issue_my_certificate(uuid) from public, anon;

CREATE OR REPLACE FUNCTION "public"."issue_my_event_certificate"("p_event_id" "uuid") RETURNS "public"."certificates"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_eligibility public.certificate_eligibility%rowtype;
  v_existing_certificate public.certificates%rowtype;
  v_new_certificate public.certificates%rowtype;
  v_certificate_number text;
begin
  if not public.participant_can_register(auth.uid()) then
    raise exception 'Account verification required.';
  end if;
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;


  /*
   * Return existing certificate instead of creating
   * another one.
   */
  select *
  into v_existing_certificate
  from public.certificates
  where event_id = p_event_id
    and user_id = v_user_id
  limit 1;

  if found then
    return v_existing_certificate;
  end if;


  /*
   * Check certificate eligibility.
   */
  select *
  into v_eligibility
  from public.certificate_eligibility
  where event_id = p_event_id
    and user_id = v_user_id
    and certificate_eligible = true
  order by checked_out_at desc nulls last
  limit 1;

  if not found then
    raise exception
      'Certificate unavailable. Complete event Check-In and Check-Out are required before a certificate can be issued.';
  end if;


  /*
   * Generate certificate number.
   *
   * Example:
   * PTP-2026-A1B2C3D4E5
   */
  v_certificate_number :=
    'PTP-' ||
    to_char(now(), 'YYYY') ||
    '-' ||
    upper(
      substr(
        replace(gen_random_uuid()::text, '-', ''),
        1,
        10
      )
    );


  insert into public.certificates (
    event_id,
    user_id,
    attendance_id,
    certificate_number
  )
  values (
    v_eligibility.event_id,
    v_eligibility.user_id,
    v_eligibility.attendance_id,
    v_certificate_number
  )
  returning *
  into v_new_certificate;

  return v_new_certificate;
end;
$$;

revoke all on function public.issue_my_event_certificate(uuid) from public, anon;

revoke all on function public.participant_can_register(uuid) from public, anon;
grant execute on function public.participant_can_register(uuid) to authenticated;

revoke all on function public.can_review_participant_verification(text) from public, anon;
grant execute on function public.can_review_participant_verification(text) to authenticated;

revoke all on function public.submit_participant_verification(text,text,text) from public, anon;
grant execute on function public.submit_participant_verification(text,text,text) to authenticated;

revoke all on function public.review_participant_verification(uuid,text,text) from public, anon;
grant execute on function public.review_participant_verification(uuid,text,text) to authenticated;

revoke all on function public.finalize_ended_event_attendance() from public, anon, authenticated;
grant execute on function public.finalize_ended_event_attendance() to service_role;

revoke all on function public.sync_event_statuses() from public, anon, authenticated;
grant execute on function public.sync_event_statuses() to service_role;

revoke all on function public.create_municipal_event_reminders() from public, anon, authenticated;
grant execute on function public.create_municipal_event_reminders() to service_role;

revoke all on function public.create_notification_once(uuid,uuid,uuid,public.notification_type,text,text,text) from public, anon, authenticated;
grant execute on function public.create_notification_once(uuid,uuid,uuid,public.notification_type,text,text,text) to service_role;

revoke all on function public.sync_verified_profile_details() from public,anon,authenticated;
revoke all on function public.invalidate_participant_proofs() from public,anon,authenticated;
revoke all on function public.handle_new_user() from public,anon,authenticated;
-- Serialize approved administrator assignment without deleting legacy accounts.
create or replace function public.enforce_one_municipal_admin()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.role='municipal_admin' and new.verification_status='approved' then
  if tg_op='UPDATE' then
   if (old.role,old.verification_status,old.municipality) is not distinct from
      (new.role,new.verification_status,new.municipality) then return new; end if;
  end if;
  if nullif(btrim(new.municipality),'') is null then raise exception 'Municipality is required.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('municipal-admin:'||new.municipality,0));
  if exists(select 1 from public.profiles where role='municipal_admin'
    and verification_status='approved' and municipality=new.municipality and id<>new.id) then
   raise exception 'An approved Municipal Admin already exists for this municipality.';
  end if;
 end if;
 return new;
end; $$;
create trigger enforce_one_municipal_admin_trigger before insert or update on public.profiles
for each row execute function public.enforce_one_municipal_admin();
revoke all on function public.enforce_one_municipal_admin() from public,anon,authenticated;
-- Re-establish the intended private bucket and its positive access policies.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('participant-proofs','participant-proofs',false,5242880,array['image/jpeg','image/png','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists participant_proofs_upload on storage.objects;
create policy participant_proofs_upload on storage.objects for insert to authenticated
with check(bucket_id='participant-proofs' and (storage.foldername(name))[1]=auth.uid()::text
 and (storage.foldername(name))[2] in ('residency','category') and public.get_current_user_role()='participant');
drop policy if exists participant_proofs_read on storage.objects;
create policy participant_proofs_read on storage.objects for select to authenticated
using(bucket_id='participant-proofs' and ((storage.foldername(name))[1]=auth.uid()::text or exists(
 select 1 from public.participant_verifications v where v.document_path=storage.objects.name
 and public.can_review_participant_verification(v.municipality))));
drop policy if exists participant_proofs_delete_unsubmitted on storage.objects;
create policy participant_proofs_delete_unsubmitted on storage.objects for delete to authenticated
using(bucket_id='participant-proofs' and (storage.foldername(name))[1]=auth.uid()::text and not exists(
 select 1 from public.participant_verifications v where v.document_path=storage.objects.name));

-- Restrictive storage policies prevent broad older policies from exposing proofs.
create policy proofs_read_guard on storage.objects as restrictive for select to authenticated
using (bucket_id<>'participant-proofs' or
 (storage.foldername(name))[1]=auth.uid()::text or exists (
 select 1 from public.participant_verifications v where v.document_path=storage.objects.name
 and public.can_review_participant_verification(v.municipality)));
create policy proofs_insert_guard on storage.objects as restrictive for insert to authenticated
with check (bucket_id<>'participant-proofs' or (
 (storage.foldername(name))[1]=auth.uid()::text and
 (storage.foldername(name))[2] in ('residency','category') and
 public.get_current_user_role()='participant'));
create policy proofs_update_guard on storage.objects as restrictive for update to authenticated
using (bucket_id<>'participant-proofs') with check (bucket_id<>'participant-proofs');
create policy proofs_delete_guard on storage.objects as restrictive for delete to authenticated
using (bucket_id<>'participant-proofs' or (
 (storage.foldername(name))[1]=auth.uid()::text and not exists (
 select 1 from public.participant_verifications v where v.document_path=storage.objects.name)));

-- Anon users must never read or write private proofs via permissive older policies.
create policy proofs_anon_guard on storage.objects as restrictive for all to anon
using (bucket_id<>'participant-proofs') with check (bucket_id<>'participant-proofs');

create table public.proof_cleanup_queue (
 document_path text primary key,
 claimed_at timestamptz not null default now()
);
alter table public.proof_cleanup_queue enable row level security;
revoke all on public.proof_cleanup_queue from public,anon,authenticated;
grant all on public.proof_cleanup_queue to service_role;

-- Candidate list only. Actual object deletion must use the Storage API.
create or replace function public.proof_cleanup_candidates(p_retention_days integer)
returns table(document_path text) language sql stable security definer set search_path='' as $$
 select o.name from storage.objects o
 where o.bucket_id='participant-proofs' and p_retention_days between 1 and 3650
 and (
   (o.created_at < now()-interval '7 days' and not exists (
      select 1 from public.participant_verifications v where v.document_path=o.name))
   or exists (
      select 1 from public.participant_verifications v where v.document_path=o.name
      and v.document_deleted_at is null
      and (v.status in ('approved','rejected') or v.invalidated_at is not null or v.withdrawn_at is not null)
      and greatest(v.submitted_at,coalesce(v.reviewed_at,v.submitted_at),
          coalesce(v.invalidated_at,v.submitted_at),coalesce(v.withdrawn_at,v.submitted_at))
          < now()-make_interval(days=>p_retention_days)
   )
 )
 and not exists(select 1 from public.participant_verifications v where v.document_path=o.name
   and v.status='pending' and v.invalidated_at is null and v.withdrawn_at is null)
 order by o.created_at limit 100;
$$;
revoke all on function public.proof_cleanup_candidates(integer) from public,anon,authenticated;
grant execute on function public.proof_cleanup_candidates(integer) to service_role;
create or replace function public.claim_proof_cleanup(p_retention_days integer)
returns table(document_path text) language plpgsql security definer set search_path='' as $$
declare candidate record;
begin
 if p_retention_days not between 1 and 3650 then raise exception 'Invalid retention period.'; end if;
 for candidate in select c.document_path from public.proof_cleanup_candidates(p_retention_days) c loop
  -- Same object lock as submission. Recheck after taking the lock.
  perform 1 from storage.objects where bucket_id='participant-proofs' and name=candidate.document_path for update;
  if exists(select 1 from public.proof_cleanup_candidates(p_retention_days) c where c.document_path=candidate.document_path) then
   insert into public.proof_cleanup_queue(document_path) values(candidate.document_path) on conflict do nothing;
  end if;
 end loop;
 return query select q.document_path from public.proof_cleanup_queue q order by q.claimed_at limit 100;
end; $$;
revoke all on function public.claim_proof_cleanup(integer) from public,anon,authenticated;
grant execute on function public.claim_proof_cleanup(integer) to service_role;
notify pgrst, 'reload schema';
commit;



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."attendance_method" AS ENUM (
    'qr',
    'manual'
);


ALTER TYPE "public"."attendance_method" OWNER TO "postgres";


CREATE TYPE "public"."attendance_status" AS ENUM (
    'pending',
    'present',
    'absent',
    'late'
);


ALTER TYPE "public"."attendance_status" OWNER TO "postgres";


CREATE TYPE "public"."event_status" AS ENUM (
    'draft',
    'published',
    'cancelled',
    'completed',
    'upcoming',
    'ongoing'
);


ALTER TYPE "public"."event_status" OWNER TO "postgres";


CREATE TYPE "public"."municipal_event_status" AS ENUM (
    'pending',
    'accepted',
    'preparing',
    'registration_open',
    'ongoing',
    'completed',
    'reported',
    'declined',
    'prepared',
    'cancelled'
);


ALTER TYPE "public"."municipal_event_status" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'event_invitation',
    'event_reminder',
    'registration_confirmation',
    'attendance_confirmation',
    'after_event_acknowledgment',
    'system',
    'municipal_preparation_update',
    'event_updated',
    'event_cancelled',
    'attendance_absent'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."rsvp_status" AS ENUM (
    'registered',
    'cancelled'
);


ALTER TYPE "public"."rsvp_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'provincial_admin',
    'municipal_admin',
    'event_staff',
    'participant'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."verification_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."verification_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assert_no_venue_schedule_conflict"("p_event_municipality_id" "uuid", "p_event_id" "uuid", "p_local_venue_id" "uuid", "p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone, "p_event_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  conflicting_event_title text;
  conflicting_start_at timestamptz;
  conflicting_end_at timestamptz;
begin
  /*
   * No venue assigned yet:
   * nothing to validate.
   */
  if p_local_venue_id is null then
    return;
  end if;

  /*
   * Cancelled events do not reserve venues.
   */
  if coalesce(p_event_status, '') = 'cancelled' then
    return;
  end if;

  /*
   * Serialize checks for the same venue inside the
   * current transaction.
   *
   * This reduces the possibility of two concurrent
   * requests assigning the same venue at overlapping
   * schedules.
   */
  perform pg_advisory_xact_lock(
    hashtextextended(p_local_venue_id::text, 0)
  );

  /*
   * Conflict rule:
   *
   * existing.start_at < new.end_at
   * AND
   * existing.end_at > new.start_at
   *
   * Therefore:
   * 09:00–12:00 + 12:00–14:00 = allowed
   * 09:00–12:00 + 11:00–14:00 = conflict
   */
  select
    e.title,
    e.start_at,
    e.end_at
  into
    conflicting_event_title,
    conflicting_start_at,
    conflicting_end_at
  from public.event_municipalities em
  join public.events e
    on e.id = em.event_id
  where
    em.local_venue_id = p_local_venue_id

    -- Ignore the municipal assignment currently being saved.
    and (
      p_event_municipality_id is null
      or em.id <> p_event_municipality_id
    )

    -- Ignore another municipal assignment belonging
    -- to the exact same provincial event.
    and em.event_id <> p_event_id

    -- Cancelled events no longer occupy the venue.
    and e.status::text <> 'cancelled'

    -- Time overlap.
    and e.start_at < p_end_at
    and e.end_at > p_start_at

  order by e.start_at
  limit 1;

  if found then
    raise exception using
      errcode = 'P0001',
      message =
        'Venue schedule conflict. This venue is already assigned to another event during the selected schedule.',
      detail =
        format(
          'Conflicting event: %s (%s to %s)',
          coalesce(conflicting_event_title, 'Untitled event'),
          conflicting_start_at,
          conflicting_end_at
        ),
      hint =
        'Select another municipal venue or use a non-overlapping event schedule.';
  end if;
end;
$$;


ALTER FUNCTION "public"."assert_no_venue_schedule_conflict"("p_event_municipality_id" "uuid", "p_event_id" "uuid", "p_local_venue_id" "uuid", "p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone, "p_event_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_close_event_check_in"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.status::text in ('cancelled', 'completed')
     and old.status::text is distinct from new.status::text
  then
    perform set_config(
      'app.pagtipon_check_in_control',
      'allowed',
      true
    );


    update public.event_municipalities
    set
      check_in_closed_at = coalesce(check_in_closed_at, now()),
      check_in_closed_by = null,
      updated_at = now()
    where event_id = new.id
      and check_in_opened_at is not null
      and check_in_closed_at is null;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."auto_close_event_check_in"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_municipal_event"("p_event_municipality_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  select
    exists (
      select 1
      from public.profiles as current_profile
      where current_profile.id = auth.uid()
        and current_profile.role::text = 'provincial_admin'
    )
    or
    exists (
      select 1
      from public.profiles as current_profile
      inner join public.event_municipalities as municipal_event
        on municipal_event.id = p_event_municipality_id
      where current_profile.id = auth.uid()
        and current_profile.role::text in (
          'municipal_admin',
          'event_staff'
        )
        and current_profile.verification_status::text = 'approved'
        and lower(trim(coalesce(current_profile.municipality, '')))
            =
            lower(trim(coalesce(municipal_event.municipality, '')))
    );
$$;


ALTER FUNCTION "public"."can_manage_municipal_event"("p_event_municipality_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_view_event"("p_event_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  select exists (
    select 1
    from public.event_municipalities as municipal_event
    where municipal_event.event_id = p_event_id
      and public.can_view_event_municipality(
        municipal_event.id
      )
  );
$$;


ALTER FUNCTION "public"."can_view_event"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_view_event_municipality"("p_event_municipality_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  select
    public.can_manage_municipal_event(
      p_event_municipality_id
    )

    /*
     * Participants may view prepared events in their
     * municipality while registration is open.
     */
    or exists (
      select 1
      from public.profiles as current_profile
      inner join public.event_municipalities as municipal_event
        on municipal_event.id =
           p_event_municipality_id
      where current_profile.id = auth.uid()
        and current_profile.role::text = 'participant'
        and lower(
          trim(
            coalesce(
              current_profile.municipality,
              ''
            )
          )
        ) =
        lower(
          trim(
            coalesce(
              municipal_event.municipality,
              ''
            )
          )
        )
        and municipal_event.municipal_status::text =
            'prepared'
        and municipal_event.registration_open = true
    )

    /*
     * Participants may continue viewing an assigned event
     * when they own a registered or cancelled RSVP.
     *
     * This keeps cancelled registrations visible only to
     * the affected participant.
     */
    or exists (
      select 1
      from public.profiles as current_profile
      inner join public.rsvps as participant_rsvp
        on participant_rsvp.user_id =
           current_profile.id
      where current_profile.id = auth.uid()
        and current_profile.role::text =
            'participant'
        and participant_rsvp.event_municipality_id =
            p_event_municipality_id
        and participant_rsvp.status::text in (
          'registered',
          'cancelled'
        )
    );
$$;


ALTER FUNCTION "public"."can_view_event_municipality"("p_event_municipality_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_view_participant_profile"("p_profile_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  select
    exists (
      select 1
      from public.profiles as target_profile
      inner join public.profiles as current_profile
        on current_profile.id = auth.uid()
      where target_profile.id = p_profile_id
        and target_profile.role::text = 'participant'
        and current_profile.role::text = 'provincial_admin'
    )

    or exists (
      select 1
      from public.profiles as target_profile
      inner join public.rsvps as registered_rsvp
        on registered_rsvp.user_id = target_profile.id
      inner join public.event_municipalities as municipal_event
        on municipal_event.id =
           registered_rsvp.event_municipality_id
      inner join public.profiles as current_profile
        on current_profile.id = auth.uid()
      where target_profile.id = p_profile_id
        and target_profile.role::text = 'participant'
        and current_profile.role::text in (
          'municipal_admin',
          'event_staff'
        )
        and current_profile.verification_status::text =
            'approved'
        and lower(trim(coalesce(current_profile.municipality, '')))
            =
            lower(trim(coalesce(municipal_event.municipality, '')))
    );
$$;


ALTER FUNCTION "public"."can_view_participant_profile"("p_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_local_venue_schedule_conflict"("p_event_municipality_id" "uuid", "p_event_id" "uuid", "p_local_venue_id" "uuid", "p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone) RETURNS TABLE("has_conflict" boolean, "conflicting_event_title" "text", "conflicting_start_at" timestamp with time zone, "conflicting_end_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  return query
  select
    true,
    e.title,
    e.start_at,
    e.end_at
  from public.event_municipalities em
  join public.events e
    on e.id = em.event_id
  where
    em.local_venue_id = p_local_venue_id

    and (
      p_event_municipality_id is null
      or em.id <> p_event_municipality_id
    )

    and em.event_id <> p_event_id

    and e.status::text <> 'cancelled'

    and e.start_at < p_end_at
    and e.end_at > p_start_at

  order by e.start_at
  limit 1;

  if not found then
    return query
    select
      false,
      null::text,
      null::timestamptz,
      null::timestamptz;
  end if;
end;
$$;


ALTER FUNCTION "public"."check_local_venue_schedule_conflict"("p_event_municipality_id" "uuid", "p_event_id" "uuid", "p_local_venue_id" "uuid", "p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."close_event_check_in"("p_event_municipality_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  current_user_id uuid := auth.uid();
  current_time_value timestamptz := now();

  staff_record record;
  assignment_record record;
begin
  if current_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'CHECK_IN_AUTH_REQUIRED',
      detail = 'You must be signed in to close attendance check-in.';
  end if;


  select
    p.id,
    p.role::text as role,
    p.municipality,
    p.verification_status::text as verification_status
  into staff_record
  from public.profiles p
  where p.id = current_user_id
  limit 1;


  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'CHECK_IN_PROFILE_NOT_FOUND',
      detail = 'The authenticated user profile could not be found.';
  end if;


  if staff_record.role <> 'event_staff' then
    raise exception using
      errcode = 'P0001',
      message = 'CHECK_IN_STAFF_ONLY',
      detail = 'Only event staff can close attendance check-in.';
  end if;


  if staff_record.verification_status <> 'approved' then
    raise exception using
      errcode = 'P0001',
      message = 'CHECK_IN_STAFF_NOT_APPROVED',
      detail = 'Your event staff account is not approved.';
  end if;


  select
    em.id,
    em.event_id,
    em.municipality,
    em.check_in_opened_at,
    em.check_in_closed_at,
    e.title
  into assignment_record
  from public.event_municipalities em
  inner join public.events e
    on e.id = em.event_id
  where em.id = p_event_municipality_id
  limit 1;


  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'CHECK_IN_EVENT_NOT_FOUND',
      detail = 'The municipal event assignment could not be found.';
  end if;


  if lower(trim(coalesce(staff_record.municipality, '')))
     <> lower(trim(coalesce(assignment_record.municipality, '')))
  then
    raise exception using
      errcode = 'P0001',
      message = 'CHECK_IN_MUNICIPALITY_MISMATCH',
      detail = 'You cannot control attendance for another municipality.';
  end if;


  if assignment_record.check_in_opened_at is null then
    raise exception using
      errcode = 'P0001',
      message = 'CHECK_IN_NOT_OPENED',
      detail = 'Attendance check-in has not been opened.';
  end if;


  if assignment_record.check_in_closed_at is not null then
    return jsonb_build_object(
      'success', true,
      'already_closed', true,
      'message', 'Attendance check-in is already closed.',
      'event_municipality_id', assignment_record.id,
      'event_id', assignment_record.event_id,
      'event_title', assignment_record.title,
      'closed_at', assignment_record.check_in_closed_at
    );
  end if;


  perform set_config(
    'app.pagtipon_check_in_control',
    'allowed',
    true
  );


  update public.event_municipalities
  set
    check_in_closed_at = current_time_value,
    check_in_closed_by = current_user_id,
    updated_at = current_time_value
  where id = p_event_municipality_id;


  return jsonb_build_object(
    'success', true,
    'already_closed', false,
    'message', 'Attendance check-in is now closed.',
    'event_municipality_id', assignment_record.id,
    'event_id', assignment_record.event_id,
    'event_title', assignment_record.title,
    'closed_at', current_time_value,
    'closed_by', current_user_id
  );
end;
$$;


ALTER FUNCTION "public"."close_event_check_in"("p_event_municipality_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."close_event_check_out"("p_event_municipality_id" "uuid") RETURNS TABLE("success" boolean, "already_open" boolean, "already_closed" boolean, "message" "text", "opened_at" timestamp with time zone, "closed_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'auth', 'pg_temp'
    AS $$
declare
  v_user_id uuid;

  v_role text;
  v_user_municipality text;

  v_event_municipality text;

  v_check_out_opened_at timestamptz;
  v_check_out_closed_at timestamptz;
begin
  v_user_id := auth.uid();


  -- -------------------------------------------------------
  -- Authentication
  -- -------------------------------------------------------

  if v_user_id is null then
    raise exception
      'You must be signed in to close event check-out.';
  end if;


  select
    p.role::text,
    p.municipality::text
  into
    v_role,
    v_user_municipality
  from public.profiles p
  where p.id = v_user_id;


  if not found then
    raise exception
      'The signed-in user profile was not found.';
  end if;


  if v_role not in (
    'event_staff',
    'municipal_admin'
  ) then
    raise exception
      'Your account is not authorized to control event check-out.';
  end if;


  -- -------------------------------------------------------
  -- Lock event assignment
  -- -------------------------------------------------------

  select
    em.municipality::text,
    em.check_out_opened_at,
    em.check_out_closed_at
  into
    v_event_municipality,
    v_check_out_opened_at,
    v_check_out_closed_at
  from public.event_municipalities em
  where em.id = p_event_municipality_id
  for update;


  if not found then
    return query
    select
      false,
      false,
      false,
      'The selected event assignment was not found.'::text,
      null::timestamptz,
      null::timestamptz;

    return;
  end if;


  -- -------------------------------------------------------
  -- Municipality protection
  -- -------------------------------------------------------

  if lower(
       btrim(
         coalesce(
           v_user_municipality,
           ''
         )
       )
     )
     <>
     lower(
       btrim(
         coalesce(
           v_event_municipality,
           ''
         )
       )
     )
  then
    return query
    select
      false,
      false,
      false,
      'You are not authorized to control check-out for this municipality.'::text,
      v_check_out_opened_at,
      v_check_out_closed_at;

    return;
  end if;


  -- -------------------------------------------------------
  -- Check-Out has never been opened
  -- -------------------------------------------------------

  if v_check_out_opened_at is null then
    return query
    select
      false,
      false,
      false,
      'Attendance check-out has not been opened yet.'::text,
      null::timestamptz,
      null::timestamptz;

    return;
  end if;


  -- -------------------------------------------------------
  -- Already closed
  -- -------------------------------------------------------

  if v_check_out_closed_at is not null then
    return query
    select
      true,
      false,
      true,
      'Attendance check-out is already closed.'::text,
      v_check_out_opened_at,
      v_check_out_closed_at;

    return;
  end if;


  -- -------------------------------------------------------
  -- Close Check-Out
  -- -------------------------------------------------------

  update public.event_municipalities
  set
    check_out_closed_at = now(),
    check_out_closed_by = v_user_id
  where id = p_event_municipality_id
  returning
    check_out_closed_at
  into
    v_check_out_closed_at;


  return query
  select
    true,
    false,
    false,
    'Attendance check-out has been closed.'::text,
    v_check_out_opened_at,
    v_check_out_closed_at;
end;
$$;


ALTER FUNCTION "public"."close_event_check_out"("p_event_municipality_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_municipal_event_reminders"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  inserted_count integer := 0;
begin
  with eligible_reminders as (
    select
      profile.id as user_id,
      event_record.id as event_id,
      assignment.id as event_municipality_id,
      event_record.title as event_title,
      event_record.start_at
    from public.events as event_record

    join public.event_municipalities as assignment
      on assignment.event_id = event_record.id

    join public.profiles as profile
      on profile.role::text = 'municipal_admin'
      and lower(trim(coalesce(profile.municipality, ''))) =
          lower(trim(coalesce(assignment.municipality, '')))

    where event_record.status::text in (
      'published',
      'upcoming'
    )
      and event_record.start_at is not null
      and event_record.start_at > now()
      and event_record.start_at <=
          now() + interval '24 hours'
  ),

  inserted_reminders as (
    insert into public.notifications (
      user_id,
      event_id,
      event_municipality_id,
      type,
      title,
      message,
      read,
      created_at
    )
    select
      reminder.user_id,
      reminder.event_id,
      reminder.event_municipality_id,
      'event_reminder'::public.notification_type,
      'Upcoming Provincial Event',
      concat(
        '"',
        coalesce(
          reminder.event_title,
          'Untitled Event'
        ),
        '" will begin on ',
        to_char(
          reminder.start_at at time zone 'Asia/Manila',
          'Mon DD, YYYY at HH12:MI AM'
        ),
        '. Please review the official memo and make sure your municipal preparation is complete.'
      ),
      false,
      now()
    from eligible_reminders as reminder

    where not exists (
      select 1
      from public.notifications as existing_notification
      where existing_notification.user_id =
            reminder.user_id
        and existing_notification.event_id =
            reminder.event_id
        and existing_notification.event_municipality_id =
            reminder.event_municipality_id
        and existing_notification.type::text =
            'event_reminder'
    )

    returning id
  )

  select count(*)
  into inserted_count
  from inserted_reminders;

  return inserted_count;
end;
$$;


ALTER FUNCTION "public"."create_municipal_event_reminders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification_once"("p_user_id" "uuid", "p_event_id" "uuid", "p_event_municipality_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_dedupe_key" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if p_user_id is null then
    return;
  end if;

  if p_dedupe_key is null or btrim(p_dedupe_key) = '' then
    return;
  end if;

  /*
   * Prevent two simultaneous transactions from creating
   * the same notification.
   */
  perform pg_advisory_xact_lock(
    hashtextextended(p_dedupe_key, 0)
  );

  if exists (
    select 1
    from public.notifications
    where dedupe_key = p_dedupe_key
  ) then
    return;
  end if;

  insert into public.notifications (
    user_id,
    event_id,
    event_municipality_id,
    type,
    title,
    message,
    read,
    dedupe_key
  )
  values (
    p_user_id,
    p_event_id,
    p_event_municipality_id,
    p_type,
    coalesce(nullif(btrim(p_title), ''), 'Notification'),
    coalesce(p_message, ''),
    false,
    p_dedupe_key
  );
end;
$$;


ALTER FUNCTION "public"."create_notification_once"("p_user_id" "uuid", "p_event_id" "uuid", "p_event_municipality_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_dedupe_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."event_staff_can_view_event"("p_event_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  select exists (
    select 1
    from public.event_staff_assignments esa

    inner join public.event_municipalities em
      on em.id = esa.event_municipality_id

    inner join public.profiles p
      on p.id = auth.uid()

    where em.event_id = p_event_id

      and esa.staff_id = auth.uid()

      and esa.status = 'active'

      and p.role::text = 'event_staff'

      and p.verification_status::text = 'approved'

      and lower(
        trim(
          coalesce(
            p.municipality,
            ''
          )
        )
      ) = lower(
        trim(
          coalesce(
            em.municipality,
            ''
          )
        )
      )
  );
$$;


ALTER FUNCTION "public"."event_staff_can_view_event"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_ended_event_attendance"() RETURNS TABLE("updated_pending_count" bigint, "inserted_missing_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  affected_updates bigint := 0;
  affected_inserts bigint := 0;
begin
  /*
   * STEP 1:
   * Convert existing pending attendance records to absent
   * after the actual events.end_at time.
   *
   * Present and late records are not changed.
   */
  update public.attendance as attendance_record
  set
    rsvp_id = coalesce(
      attendance_record.rsvp_id,
      registered_rsvp.id
    ),
    status = 'absent'::public.attendance_status,
    method = null,
    checked_in_at = null,
    checked_in_by = null
  from public.rsvps as registered_rsvp
  inner join public.event_municipalities as municipal_event
    on municipal_event.id =
       registered_rsvp.event_municipality_id
  inner join public.events as event_record
    on event_record.id =
       municipal_event.event_id
  where (
      attendance_record.rsvp_id = registered_rsvp.id

      or (
        attendance_record.rsvp_id is null
        and attendance_record.event_municipality_id =
            registered_rsvp.event_municipality_id
        and attendance_record.user_id =
            registered_rsvp.user_id
      )
    )
    and registered_rsvp.status::text = 'registered'
    and attendance_record.status::text = 'pending'

    -- Use the actual event end time, not the status cron.
    and now() > event_record.end_at

    -- Cancelled and draft events must not generate absences.
    and event_record.status::text not in (
      'cancelled',
      'draft'
    );

  get diagnostics affected_updates = row_count;


  /*
   * STEP 2:
   * Create absent attendance records for registered participants
   * who do not have an attendance row yet.
   */
  insert into public.attendance (
    rsvp_id,
    event_municipality_id,
    user_id,
    status,
    method,
    checked_in_at,
    checked_in_by
  )
  select
    registered_rsvp.id,
    registered_rsvp.event_municipality_id,
    registered_rsvp.user_id,
    'absent'::public.attendance_status,
    null,
    null,
    null
  from public.rsvps as registered_rsvp
  inner join public.event_municipalities as municipal_event
    on municipal_event.id =
       registered_rsvp.event_municipality_id
  inner join public.events as event_record
    on event_record.id =
       municipal_event.event_id
  where registered_rsvp.status::text = 'registered'
    and now() > event_record.end_at
    and event_record.status::text not in (
      'cancelled',
      'draft'
    )

    and not exists (
      select 1
      from public.attendance as existing_attendance
      where existing_attendance.rsvp_id =
            registered_rsvp.id

         or (
           existing_attendance.event_municipality_id =
             registered_rsvp.event_municipality_id
           and existing_attendance.user_id =
             registered_rsvp.user_id
         )
    )

  -- Final protection in case two processes run simultaneously.
  on conflict do nothing;

  get diagnostics affected_inserts = row_count;


  return query
  select
    affected_updates,
    affected_inserts;
end;
$$;


ALTER FUNCTION "public"."finalize_ended_event_attendance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_rsvp_attendance_code"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
declare
  code_alphabet constant text :=
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  random_bytes bytea;
  generated_body text;
  generated_code text;
  attempt integer;
  character_position integer;
begin
  for attempt in 1..100 loop
    generated_body := '';

    -- Convert a random UUID into bytes.
    random_bytes := uuid_send(gen_random_uuid());

    -- Use the first eight random bytes.
    for character_position in 0..7 loop
      generated_body :=
        generated_body ||
        substr(
          code_alphabet,
          (get_byte(random_bytes, character_position)
            % char_length(code_alphabet)) + 1,
          1
        );
    end loop;

    generated_code :=
      'PTP-' ||
      substr(generated_body, 1, 4) ||
      '-' ||
      substr(generated_body, 5, 4);

    if not exists (
      select 1
      from public.rsvps
      where attendance_code = generated_code
    ) then
      return generated_code;
    end if;
  end loop;

  raise exception 'Unable to generate a unique attendance code.';
end;
$$;


ALTER FUNCTION "public"."generate_rsvp_attendance_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_municipality"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p.municipality::text
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;


ALTER FUNCTION "public"."get_current_user_municipality"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_role"() RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select role::text
  from public.profiles
  where id = auth.uid();
$$;


ALTER FUNCTION "public"."get_current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_municipal_attendance"("p_event_municipality_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("rsvp_id" "uuid", "event_municipality_id" "uuid", "event_id" "uuid", "event_title" "text", "event_status" "text", "event_start_date" timestamp with time zone, "event_end_date" timestamp with time zone, "municipality" "text", "municipal_status" "text", "registration_open" boolean, "participant_id" "uuid", "participant_name" "text", "participant_email" "text", "participant_municipality" "text", "registration_status" "text", "registered_at" timestamp with time zone, "attendance_id" "uuid", "attendance_status" "text", "attendance_method" "text", "checked_in_at" timestamp with time zone, "checked_in_by" "uuid", "checked_in_by_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  v_admin_role text;
  v_admin_municipality text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select
    p.role::text,
    p.municipality::text
  into
    v_admin_role,
    v_admin_municipality
  from public.profiles p
  where p.id = auth.uid();

  if v_admin_role is distinct from 'municipal_admin' then
    raise exception
      'Only municipal administrators can view municipal attendance records.';
  end if;

  if nullif(trim(v_admin_municipality), '') is null then
    raise exception
      'Your municipal administrator account has no assigned municipality.';
  end if;

  return query
  select
    r.id::uuid
      as rsvp_id,

    em.id::uuid
      as event_municipality_id,

    e.id::uuid
      as event_id,

    e.title::text
      as event_title,

    e.status::text
      as event_status,

    e.start_at::timestamptz
      as event_start_date,

    e.end_at::timestamptz
      as event_end_date,

    em.municipality::text
      as municipality,

    em.municipal_status::text
      as municipal_status,

    coalesce(
      em.registration_open,
      false
    )::boolean
      as registration_open,

    participant.id::uuid
      as participant_id,

    coalesce(
      nullif(
        trim(participant.full_name),
        ''
      ),
      participant.email,
      'Unknown participant'
    )::text
      as participant_name,

    participant.email::text
      as participant_email,

    participant.municipality::text
      as participant_municipality,

    r.status::text
      as registration_status,

    r.registered_at::timestamptz
      as registered_at,

    a.id::uuid
      as attendance_id,

    coalesce(
      a.status::text,
      'pending'
    )::text
      as attendance_status,

    a.method::text
      as attendance_method,

    a.checked_in_at::timestamptz
      as checked_in_at,

    a.checked_in_by::uuid
      as checked_in_by,

    checker.full_name::text
      as checked_in_by_name

  from public.rsvps r

  join public.event_municipalities em
    on em.id =
      r.event_municipality_id

  join public.events e
    on e.id =
      em.event_id

  join public.profiles participant
    on participant.id =
      r.user_id

  left join public.attendance a
    on a.event_municipality_id =
      em.id
    and a.user_id =
      r.user_id

  left join public.profiles checker
    on checker.id =
      a.checked_in_by

  where
    lower(trim(em.municipality::text)) =
    lower(trim(v_admin_municipality))

    and participant.role::text =
      'participant'

    and r.status::text =
      'registered'

    and (
      p_event_municipality_id is null
      or em.id =
        p_event_municipality_id
    )

  order by
    e.start_at desc nulls last,
    e.title asc,
    participant.full_name asc;
end;
$$;


ALTER FUNCTION "public"."get_municipal_attendance"("p_event_municipality_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_municipal_registrations"("p_event_municipality_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("rsvp_id" "uuid", "event_municipality_id" "uuid", "event_id" "uuid", "event_title" "text", "event_status" "text", "municipal_status" "text", "registration_open" boolean, "participant_id" "uuid", "participant_name" "text", "participant_email" "text", "participant_municipality" "text", "participant_category" "text", "participant_category_other" "text", "rsvp_status" "text", "registered_at" timestamp with time zone, "qr_available" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_role text;
  current_user_municipality text;
begin
  /*
   * Verify the current account and retrieve
   * its municipality directly from profiles.
   */
  select
    p.role::text,
    p.municipality
  into
    current_user_role,
    current_user_municipality
  from public.profiles p
  where p.id = auth.uid()
  limit 1;

  if current_user_role is distinct from 'municipal_admin' then
    raise exception using
      errcode = '42501',
      message = 'Only municipal administrators can view municipal registrations.';
  end if;

  if current_user_municipality is null
     or trim(current_user_municipality) = ''
  then
    raise exception using
      errcode = 'P0001',
      message = 'The municipal administrator has no assigned municipality.';
  end if;

  return query
  select
    r.id as rsvp_id,
    r.event_municipality_id,
    em.event_id,
    coalesce(e.title, 'Untitled Event')::text as event_title,
    e.status::text as event_status,
    em.municipal_status::text as municipal_status,
    coalesce(em.registration_open, false) as registration_open,

    participant.id as participant_id,
    participant.full_name::text as participant_name,
    participant.email::text as participant_email,
    participant.municipality::text as participant_municipality,

    participant.participant_category::text as participant_category,
    participant.participant_category_other::text as participant_category_other,

    r.status::text as rsvp_status,
    r.registered_at,

    (
      r.qr_token is not null
      and trim(r.qr_token) <> ''
    ) as qr_available

  from public.rsvps r

  inner join public.event_municipalities em
    on em.id = r.event_municipality_id

  inner join public.events e
    on e.id = em.event_id

  inner join public.profiles participant
    on participant.id = r.user_id

  where
    lower(trim(em.municipality)) =
    lower(trim(current_user_municipality))

    and participant.role::text = 'participant'

    and (
      p_event_municipality_id is null
      or em.id = p_event_municipality_id
    )

  order by
    r.registered_at desc,
    participant.full_name asc;
end;
$$;


ALTER FUNCTION "public"."get_municipal_registrations"("p_event_municipality_id" "uuid") OWNER TO "postgres";


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

    c.user_id = auth.uid()

    and c.event_id = p_event_id

  limit 1;

$$;


ALTER FUNCTION "public"."get_my_certificate"("p_event_id" "uuid") OWNER TO "postgres";


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

      a.user_id = auth.uid()

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


ALTER FUNCTION "public"."get_my_certificate_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_municipality"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select municipality from public.profiles where id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_municipality"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "public"."user_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select role from public.profiles where id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_participant_event_capacity_status"() RETURNS TABLE("event_municipality_id" "uuid", "venue_id" "uuid", "venue_name" "text", "venue_capacity" integer, "registered_count" integer, "available_slots" integer, "is_full" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  with current_participant as (
    select p.municipality
    from public.profiles p
    where p.id = auth.uid()
      and lower(
        trim(
          coalesce(p.role::text, '')
        )
      ) = 'participant'
      and lower(
        trim(
          coalesce(
            p.verification_status::text,
            ''
          )
        )
      ) = 'approved'
    limit 1
  ),

  registration_counts as (
    select
      r.event_municipality_id,
      count(*)::integer
        as registered_count
    from public.rsvps r
    where lower(
      trim(
        coalesce(r.status::text, '')
      )
    ) = 'registered'
    group by
      r.event_municipality_id
  )

  select
    em.id
      as event_municipality_id,

    v.id
      as venue_id,

    v.venue_name,

    v.capacity
      as venue_capacity,

    coalesce(
      rc.registered_count,
      0
    )::integer
      as registered_count,

    case
      when v.capacity is null
        or v.capacity <= 0
      then null

      else greatest(
        v.capacity -
        coalesce(
          rc.registered_count,
          0
        ),
        0
      )::integer
    end
      as available_slots,

    case
      when v.capacity is null
        or v.capacity <= 0
      then false

      else
        coalesce(
          rc.registered_count,
          0
        ) >= v.capacity
    end
      as is_full

  from public.event_municipalities em

  join current_participant cp
    on cp.municipality =
       em.municipality

  left join public.venues v
    on v.id =
       em.local_venue_id

  left join registration_counts rc
    on rc.event_municipality_id =
       em.id

  where lower(
    trim(
      coalesce(
        em.municipal_status::text,
        ''
      )
    )
  ) = 'prepared';
$$;


ALTER FUNCTION "public"."get_participant_event_capacity_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  requested_role text;
  selected_role public.user_role;
  selected_status public.verification_status;

  selected_municipality text;

  requested_participant_category text;
  selected_participant_category text;
  selected_participant_category_other text;
begin
  /*
   * Public signup roles:
   * - participant
   * - municipal_admin
   *
   * Any forged privileged role is downgraded
   * to participant.
   */
  requested_role := lower(
    coalesce(
      nullif(
        trim(new.raw_user_meta_data->>'role'),
        ''
      ),
      'participant'
    )
  );

  if requested_role = 'municipal_admin' then
    selected_role :=
      'municipal_admin'::public.user_role;

    selected_status :=
      'pending'::public.verification_status;
  else
    selected_role :=
      'participant'::public.user_role;

    selected_status :=
      'approved'::public.verification_status;
  end if;


  selected_municipality :=
    nullif(
      trim(
        new.raw_user_meta_data->>'municipality'
      ),
      ''
    );


  /*
   * Participant category is used only
   * for participant accounts.
   */
  if selected_role = 'participant' then
    requested_participant_category :=
      lower(
        coalesce(
          nullif(
            trim(
              new.raw_user_meta_data
                ->>'participant_category'
            ),
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
      raise exception
        'Please select a valid participant category.';
    end if;

    selected_participant_category :=
      requested_participant_category;

    if requested_participant_category = 'others' then
      selected_participant_category_other :=
        nullif(
          trim(
            new.raw_user_meta_data
              ->>'participant_category_other'
          ),
          ''
        );

      if selected_participant_category_other is null then
        raise exception
          'Please specify your participant category.';
      end if;

      if char_length(
        selected_participant_category_other
      ) > 100 then
        raise exception
          'Participant category description is too long.';
      end if;
    else
      selected_participant_category_other :=
        null;
    end if;
  else
    selected_participant_category := null;
    selected_participant_category_other := null;
  end if;


  insert into public.profiles (
    id,
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

    coalesce(
      nullif(
        trim(
          new.raw_user_meta_data->>'full_name'
        ),
        ''
      ),
      ''
    ),

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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_approved_event_staff_for_municipality"("p_municipality" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role::text = 'event_staff'
      and p.verification_status::text = 'approved'
      and lower(trim(coalesce(p.municipality, '')))
          = lower(trim(coalesce(p_municipality, '')))
  );
$$;


ALTER FUNCTION "public"."is_approved_event_staff_for_municipality"("p_municipality" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_approved_municipal_admin_for_municipality"("p_municipality" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  select exists (
    select 1
    from public.profiles as current_profile
    where current_profile.id = auth.uid()
      and current_profile.role::text = 'municipal_admin'
      and current_profile.verification_status::text = 'approved'
      and lower(trim(coalesce(current_profile.municipality, '')))
          =
          lower(trim(coalesce(p_municipality, '')))
  );
$$;


ALTER FUNCTION "public"."is_approved_municipal_admin_for_municipality"("p_municipality" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_provincial_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and role = 'provincial_admin'
  );
$$;


ALTER FUNCTION "public"."is_provincial_admin"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."certificates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "attendance_id" "uuid" NOT NULL,
    "certificate_number" "text" NOT NULL,
    "issued_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."certificates" OWNER TO "postgres";


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


ALTER FUNCTION "public"."issue_my_certificate"("p_event_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."issue_my_event_certificate"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_municipal_admin_on_event_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  event_title_text text;
  event_status_text text;
begin
  select
    event_record.title,
    event_record.status::text
  into
    event_title_text,
    event_status_text
  from public.events as event_record
  where event_record.id = new.event_id;

  /*
   * Draft events must not send invitations.
   */
  if event_status_text is distinct from 'published' then
    return new;
  end if;

  insert into public.notifications (
    user_id,
    event_id,
    event_municipality_id,
    type,
    title,
    message,
    read,
    created_at
  )
  select
    profile.id,
    new.event_id,
    new.id,
    'event_invitation'::public.notification_type,
    'New Provincial Event Invitation',
    concat(
      'Your municipality has been invited to prepare for "',
      coalesce(event_title_text, 'Untitled Event'),
      '". Open the event to review the official memo and preparation details.'
    ),
    false,
    now()
  from public.profiles as profile
  where profile.role::text = 'municipal_admin'
    and lower(trim(coalesce(profile.municipality, ''))) =
        lower(trim(coalesce(new.municipality, '')))
    and not exists (
      select 1
      from public.notifications as existing_notification
      where existing_notification.user_id = profile.id
        and existing_notification.event_id = new.event_id
        and existing_notification.event_municipality_id = new.id
        and existing_notification.type::text = 'event_invitation'
    );

  return new;
end;
$$;


ALTER FUNCTION "public"."notify_municipal_admin_on_event_assignment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_municipal_admins_on_event_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  event_was_updated boolean;
  update_version text;
begin
  -- =======================================================
  -- DRAFT PROTECTION
  --
  -- Walang update/cancellation notification kapag ang
  -- dating status ay draft.
  --
  -- Ang draft -> published flow ay hahawakan pa rin ng
  -- existing publish notification trigger.
  -- =======================================================

  if old.status = 'draft'::public.event_status then
    return new;
  end if;


  -- =======================================================
  -- EVENT CANCELLATION
  -- =======================================================

  if new.status = 'cancelled'::public.event_status
     and old.status is distinct from new.status
     and old.status in (
       'published'::public.event_status,
       'upcoming'::public.event_status,
       'ongoing'::public.event_status
     )
  then

    -- Isara ang municipal preparation at registration.
    update public.event_municipalities
    set
      municipal_status = 'cancelled'::public.municipal_event_status,
      registration_open = false
    where event_id = new.id
      and (
        municipal_status is distinct from
          'cancelled'::public.municipal_event_status
        or registration_open is distinct from false
      );


    -- I-cancel ang existing participant registrations.
    update public.rsvps r
    set status = 'cancelled'::public.rsvp_status
    where r.event_municipality_id in (
      select em.id
      from public.event_municipalities em
      where em.event_id = new.id
    )
    and r.status is distinct from
      'cancelled'::public.rsvp_status;


    -- Magbigay ng cancellation notification sa lahat ng
    -- approved municipal admins ng target municipalities.
    insert into public.notifications (
      user_id,
      title,
      message,
      type,
      event_id,
      event_municipality_id,
      read,
      dedupe_key
    )
    select
      p.id,
      'Event Cancelled',
      format(
        'The provincial event "%s" has been cancelled. Municipal preparation and registration for this event have been stopped.',
        new.title
      ),
      'event_cancelled'::public.notification_type,
      new.id,
      em.id,
      false,
      format(
        'event_cancelled:%s:%s',
        new.id,
        em.id
      )
    from public.event_municipalities em
    join public.profiles p
      on lower(trim(p.municipality)) =
         lower(trim(em.municipality))
    where em.event_id = new.id
      and p.role = 'municipal_admin'::public.user_role
      and p.verification_status =
          'approved'::public.verification_status
    on conflict do nothing;

    return new;
  end if;


  -- =======================================================
  -- MEANINGFUL EVENT UPDATE CHECK
  --
  -- Hindi magno-notify kapag updated_at o automatic status
  -- update lang ang nabago.
  -- =======================================================

  event_was_updated :=
       old.title is distinct from new.title
    or old.description is distinct from new.description
    or old.start_at is distinct from new.start_at
    or old.end_at is distinct from new.end_at
    or old.memo_url is distinct from new.memo_url
    or old.memo_filename is distinct from new.memo_filename
    or old.memo_uploaded_at is distinct from new.memo_uploaded_at;


  -- =======================================================
  -- EVENT UPDATED NOTIFICATION
  -- =======================================================

  if event_was_updated
     and new.status in (
       'published'::public.event_status,
       'upcoming'::public.event_status
     )
     and old.status in (
       'published'::public.event_status,
       'upcoming'::public.event_status
     )
  then

    update_version :=
      coalesce(
        new.updated_at::text,
        clock_timestamp()::text
      );


    insert into public.notifications (
      user_id,
      title,
      message,
      type,
      event_id,
      event_municipality_id,
      read,
      dedupe_key
    )
    select
      p.id,
      'Event Updated',
      format(
        'The provincial event "%s" has been updated. Open the received event to review the latest details.',
        new.title
      ),
      'event_updated'::public.notification_type,
      new.id,
      em.id,
      false,
      format(
        'event_updated:%s:%s:%s',
        new.id,
        em.id,
        update_version
      )
    from public.event_municipalities em
    join public.profiles p
      on lower(trim(p.municipality)) =
         lower(trim(em.municipality))
    where em.event_id = new.id
      and p.role = 'municipal_admin'::public.user_role
      and p.verification_status =
          'approved'::public.verification_status
      and em.municipal_status is distinct from
          'cancelled'::public.municipal_event_status
    on conflict do nothing;

  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."notify_municipal_admins_on_event_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_municipal_admins_when_event_published"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if old.status::text is distinct from new.status::text
     and new.status::text = 'published' then

    insert into public.notifications (
      user_id,
      event_id,
      event_municipality_id,
      type,
      title,
      message,
      read,
      created_at
    )
    select
      profile.id,
      assignment.event_id,
      assignment.id,
      'event_invitation'::public.notification_type,
      'New Provincial Event Invitation',
      concat(
        'Your municipality has been invited to prepare for "',
        coalesce(new.title, 'Untitled Event'),
        '". Open the event to review the official memo and preparation details.'
      ),
      false,
      now()
    from public.event_municipalities as assignment
    join public.profiles as profile
      on lower(trim(coalesce(profile.municipality, ''))) =
         lower(trim(coalesce(assignment.municipality, '')))
    where assignment.event_id = new.id
      and profile.role::text = 'municipal_admin'
      and not exists (
        select 1
        from public.notifications as existing_notification
        where existing_notification.user_id = profile.id
          and existing_notification.event_id = assignment.event_id
          and existing_notification.event_municipality_id = assignment.id
          and existing_notification.type::text = 'event_invitation'
      );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."notify_municipal_admins_when_event_published"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_participant_on_attendance_result"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_event_id uuid;
  v_event_title text;
  v_notification_type public.notification_type;
  v_title text;
  v_message text;
begin
  if new.status::text not in (
    'present',
    'absent'
  ) then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.status::text is not distinct from new.status::text then
    return new;
  end if;

  select
    em.event_id,
    e.title
  into
    v_event_id,
    v_event_title
  from public.event_municipalities em
  join public.events e
    on e.id = em.event_id
  where em.id = new.event_municipality_id;

  if not found then
    return new;
  end if;

  if new.status::text = 'present' then
    v_notification_type :=
      'attendance_confirmation'::public.notification_type;

    v_title := 'Attendance Confirmed';

    v_message := format(
      'Your attendance for "%s" has been successfully recorded.',
      coalesce(v_event_title, 'this event')
    );
  else
    v_notification_type :=
      'attendance_absent'::public.notification_type;

    v_title := 'Attendance Marked Absent';

    v_message := format(
      'No successful check-in was recorded for "%s" before the event ended.',
      coalesce(v_event_title, 'this event')
    );
  end if;

  perform public.create_notification_once(
    new.user_id,
    v_event_id,
    new.event_municipality_id,
    v_notification_type,
    v_title,
    v_message,
    'participant:attendance:' ||
      new.id::text ||
      ':' ||
      new.status::text
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."notify_participant_on_attendance_result"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_participant_on_registration"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_event_id uuid;
  v_event_title text;
begin
  if new.status::text <> 'registered' then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.status::text is not distinct from new.status::text then
    return new;
  end if;

  select
    em.event_id,
    e.title
  into
    v_event_id,
    v_event_title
  from public.event_municipalities em
  join public.events e
    on e.id = em.event_id
  where em.id = new.event_municipality_id;

  if not found then
    return new;
  end if;

  perform public.create_notification_once(
    new.user_id,
    v_event_id,
    new.event_municipality_id,
    'registration_confirmation'::public.notification_type,
    'Registration Confirmed',
    format(
      'Your registration for "%s" has been confirmed. Your attendance pass is now available.',
      coalesce(v_event_title, 'this event')
    ),
    'participant:registration:' || new.id::text
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."notify_participant_on_registration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_participants_on_event_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_registration record;
  v_details_changed boolean;
  v_event_cancelled boolean;
  v_dedupe_key text;
begin
  v_event_cancelled :=
    old.status::text is distinct from new.status::text
    and new.status::text = 'cancelled';

  v_details_changed :=
    old.title is distinct from new.title
    or old.description is distinct from new.description
    or old.start_at is distinct from new.start_at
    or old.end_at is distinct from new.end_at
    or old.memo_url is distinct from new.memo_url
    or old.memo_filename is distinct from new.memo_filename
    or old.memo_uploaded_at is distinct from new.memo_uploaded_at;

  /*
   * Ignore automatic status transitions such as:
   * upcoming -> ongoing -> completed.
   */
  if not v_event_cancelled
     and not v_details_changed then
    return new;
  end if;

  /*
   * Ordinary update notifications are only sent for
   * published, upcoming, or ongoing events.
   */
  if not v_event_cancelled
     and new.status::text not in (
       'published',
       'upcoming',
       'ongoing'
     ) then
    return new;
  end if;

  for v_registration in
    select distinct
      r.user_id,
      em.id as event_municipality_id
    from public.rsvps r
    join public.event_municipalities em
      on em.id = r.event_municipality_id
    where em.event_id = new.id
      and (
        (
          v_event_cancelled
          and r.status::text in (
            'registered',
            'cancelled'
          )
        )
        or
        (
          not v_event_cancelled
          and r.status::text = 'registered'
        )
      )
  loop
    if v_event_cancelled then
      v_dedupe_key :=
        'participant:event_cancelled:' ||
        new.id::text ||
        ':' ||
        v_registration.user_id::text;

      perform public.create_notification_once(
        v_registration.user_id,
        new.id,
        v_registration.event_municipality_id,
        'event_cancelled'::public.notification_type,
        'Event Cancelled',
        format(
          'The event "%s" has been cancelled. Your registration is retained for your records.',
          coalesce(
            new.title,
            'Untitled Event'
          )
        ),
        v_dedupe_key
      );
    else
      v_dedupe_key :=
        'participant:event_updated:' ||
        new.id::text ||
        ':' ||
        v_registration.user_id::text ||
        ':' ||
        coalesce(
          new.updated_at::text,
          clock_timestamp()::text
        );

      perform public.create_notification_once(
        v_registration.user_id,
        new.id,
        v_registration.event_municipality_id,
        'event_updated'::public.notification_type,
        'Event Updated',
        format(
          'The details for "%s" were updated. Review the latest schedule and instructions.',
          coalesce(
            new.title,
            'Untitled Event'
          )
        ),
        v_dedupe_key
      );
    end if;
  end loop;

  return new;
end;
$$;


ALTER FUNCTION "public"."notify_participants_on_event_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_participants_when_registration_opens"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_event_title text;
  v_event_status text;
  v_became_available boolean := false;
begin
  /*
   * The assignment is considered available only when:
   * - municipality preparation is complete
   * - registration is open
   */
  if new.municipal_status::text <> 'prepared'
     or new.registration_open is distinct from true
  then
    return new;
  end if;

  /*
   * For INSERT:
   * notify only if the assignment was created already prepared/open.
   *
   * For UPDATE:
   * notify only when it transitioned into an available state.
   */
  if tg_op = 'INSERT' then
    v_became_available := true;

  elsif tg_op = 'UPDATE' then
    v_became_available :=
      old.registration_open is distinct from true
      or old.municipal_status::text is distinct from 'prepared';
  end if;

  if not v_became_available then
    return new;
  end if;

  /*
   * Verify that the provincial event is still eligible
   * for participant registration.
   */
  select
    e.title,
    e.status::text
  into
    v_event_title,
    v_event_status
  from public.events e
  where e.id = new.event_id;

  if not found then
    return new;
  end if;

  if v_event_status not in (
    'published',
    'upcoming'
  ) then
    return new;
  end if;

  /*
   * Notify approved participants in the municipality.
   *
   * Participants who are already registered for this exact
   * assignment do not need another invitation.
   */
  insert into public.notifications (
    user_id,
    event_id,
    event_municipality_id,
    type,
    title,
    message,
    read,
    created_at
  )
  select
    p.id,
    new.event_id,
    new.id,
    'event_invitation'::public.notification_type,
    'New Event Open for Registration',
    format(
      'Registration is now open for "%s" in %s. Open Available Events to review the schedule, venue, and registration details.',
      coalesce(
        v_event_title,
        'Untitled Event'
      ),
      coalesce(
        new.municipality,
        'your municipality'
      )
    ),
    false,
    now()
  from public.profiles p
  where p.role::text = 'participant'

    and p.verification_status::text = 'approved'

    and lower(
      trim(
        coalesce(
          p.municipality,
          ''
        )
      )
    ) =
    lower(
      trim(
        coalesce(
          new.municipality,
          ''
        )
      )
    )

    and not exists (
      select 1
      from public.rsvps r
      where r.user_id = p.id
        and r.event_municipality_id = new.id
        and r.status::text = 'registered'
    )

    /*
     * Prevent duplicate invitation notifications.
     */
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = p.id
        and n.event_id = new.event_id
        and n.event_municipality_id = new.id
        and n.type::text = 'event_invitation'
    );

  return new;
end;
$$;


ALTER FUNCTION "public"."notify_participants_when_registration_opens"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_provincial_on_preparation_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  old_status_text text;
  new_status_text text;
  event_id_value uuid;
  municipality_value text;
  event_title_text text;
  readable_status text;
begin
  /*
    Tukuyin kung aling status column ang talagang nagbago.
    Sinusuportahan nito ang:
    - preparation_status
    - status
    - municipality_status
  */

  if (
    to_jsonb(old) ->> 'preparation_status'
  ) is distinct from (
    to_jsonb(new) ->> 'preparation_status'
  ) then
    old_status_text :=
      to_jsonb(old) ->> 'preparation_status';

    new_status_text :=
      to_jsonb(new) ->> 'preparation_status';

  elsif (
    to_jsonb(old) ->> 'status'
  ) is distinct from (
    to_jsonb(new) ->> 'status'
  ) then
    old_status_text :=
      to_jsonb(old) ->> 'status';

    new_status_text :=
      to_jsonb(new) ->> 'status';

  elsif (
    to_jsonb(old) ->> 'municipality_status'
  ) is distinct from (
    to_jsonb(new) ->> 'municipality_status'
  ) then
    old_status_text :=
      to_jsonb(old) ->> 'municipality_status';

    new_status_text :=
      to_jsonb(new) ->> 'municipality_status';

  else
    return new;
  end if;

  if new_status_text is null then
    return new;
  end if;

  event_id_value := new.event_id;

  municipality_value := coalesce(
    to_jsonb(new) ->> 'municipality',
    'Municipality'
  );

  select event_record.title
  into event_title_text
  from public.events as event_record
  where event_record.id = event_id_value;

  readable_status :=
    initcap(
      replace(new_status_text, '_', ' ')
    );

  insert into public.notifications (
    user_id,
    event_id,
    event_municipality_id,
    type,
    title,
    message,
    read,
    created_at
  )
  select
    profile.id,
    event_id_value,
    new.id,
    'municipal_preparation_update'::public.notification_type,
    'Municipal Preparation Update',
    concat(
      municipality_value,
      ' changed the preparation status for ',
      coalesce(event_title_text, 'an event'),
      ' from ',
      initcap(
        replace(
          coalesce(old_status_text, 'unknown'),
          '_',
          ' '
        )
      ),
      ' to ',
      readable_status,
      '.'
    ),
    false,
    now()
  from public.profiles as profile
  where profile.role::text = 'provincial_admin';

  return new;
end;
$$;


ALTER FUNCTION "public"."notify_provincial_on_preparation_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."open_event_check_in"("p_event_municipality_id" "uuid") RETURNS TABLE("success" boolean, "already_open" boolean, "already_closed" boolean, "message" "text", "opened_at" timestamp with time zone, "closed_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'auth', 'pg_temp'
    AS $$
declare
  v_user_id uuid;

  v_role text;
  v_verification_status text;
  v_user_municipality text;

  v_event_municipality text;
  v_event_status text;
  v_event_end_at timestamptz;

  v_check_in_opened_at timestamptz;
  v_check_in_closed_at timestamptz;

  v_check_out_opened_at timestamptz;
  v_check_out_closed_at timestamptz;

  v_is_reopen boolean := false;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'You must be signed in to control attendance check-in.';
  end if;


  /*
   * ======================================================
   * 1. LOAD CURRENT STAFF PROFILE
   * ======================================================
   */
  select
    p.role::text,
    p.verification_status::text,
    p.municipality::text
  into
    v_role,
    v_verification_status,
    v_user_municipality
  from public.profiles p
  where p.id = v_user_id;


  if not found then
    raise exception
      'The signed-in user profile was not found.';
  end if;


  if v_role not in (
    'event_staff',
    'municipal_admin'
  ) then
    raise exception
      'Your account is not authorized to control attendance check-in.';
  end if;


  if v_verification_status is distinct from 'approved' then
    raise exception
      'Your account must be approved before controlling attendance.';
  end if;


  /*
   * ======================================================
   * 2. LOCK + LOAD SELECTED EVENT ASSIGNMENT
   * ======================================================
   */
  select
    em.municipality::text,
    e.status::text,
    e.end_at,

    em.check_in_opened_at,
    em.check_in_closed_at,

    em.check_out_opened_at,
    em.check_out_closed_at

  into
    v_event_municipality,
    v_event_status,
    v_event_end_at,

    v_check_in_opened_at,
    v_check_in_closed_at,

    v_check_out_opened_at,
    v_check_out_closed_at

  from public.event_municipalities em

  join public.events e
    on e.id = em.event_id

  where em.id =
    p_event_municipality_id

  for update of em;


  if not found then
    return query
    select
      false,
      false,
      false,
      'The selected event assignment was not found.'::text,
      null::timestamptz,
      null::timestamptz;

    return;
  end if;


  /*
   * ======================================================
   * 3. MUNICIPALITY PROTECTION
   * ======================================================
   */
  if lower(
       btrim(
         coalesce(
           v_user_municipality,
           ''
         )
       )
     )
     <>
     lower(
       btrim(
         coalesce(
           v_event_municipality,
           ''
         )
       )
     )
  then
    return query
    select
      false,
      false,
      false,
      'You are not authorized to control attendance for this municipality.'::text,
      v_check_in_opened_at,
      v_check_in_closed_at;

    return;
  end if;


  /*
   * ======================================================
   * 4. EVENT STATUS PROTECTION
   * ======================================================
   */
  if v_event_status = 'cancelled' then
    return query
    select
      false,
      false,
      false,
      'Check-in cannot be opened because the event was cancelled.'::text,
      v_check_in_opened_at,
      v_check_in_closed_at;

    return;
  end if;


  if v_event_status = 'draft' then
    return query
    select
      false,
      false,
      false,
      'Check-in cannot be opened while the event is still a draft.'::text,
      v_check_in_opened_at,
      v_check_in_closed_at;

    return;
  end if;


  if v_event_status = 'completed' then
    return query
    select
      false,
      false,
      false,
      'Check-in cannot be opened because the event is completed.'::text,
      v_check_in_opened_at,
      v_check_in_closed_at;

    return;
  end if;


  /*
   * ======================================================
   * 5. EVENT END-TIME PROTECTION
   * ======================================================
   */
  if v_event_end_at is null then
    return query
    select
      false,
      false,
      false,
      'The selected event does not have a valid end time.'::text,
      v_check_in_opened_at,
      v_check_in_closed_at;

    return;
  end if;


  /*
   * Check-In may be reopened for late participants
   * only BEFORE the scheduled event end time.
   *
   * At the exact end time, Check-In is permanently
   * unavailable.
   */
  if now() >= v_event_end_at then
    return query
    select
      false,
      false,
      false,
      'Check-in cannot be opened because the scheduled event end time has been reached.'::text,
      v_check_in_opened_at,
      v_check_in_closed_at;

    return;
  end if;


  /*
   * ======================================================
   * 6. ACTIVE CHECK-OUT PROTECTION
   * ======================================================
   *
   * Check-In and Check-Out must never be active
   * at the same time.
   *
   * IMPORTANT:
   *
   * A HISTORICAL CLOSED Check-Out does NOT prevent
   * Check-In from being reopened while the event is
   * still ongoing.
   *
   * This also fixes legacy events that obtained a
   * Check-Out record before the new end-time rules
   * were installed.
   */
  if v_check_out_opened_at is not null
     and v_check_out_closed_at is null
  then
    return query
    select
      false,
      false,
      false,
      'Check-in cannot be reopened while Check-Out is currently open.'::text,
      v_check_in_opened_at,
      v_check_in_closed_at;

    return;
  end if;


  /*
   * ======================================================
   * 7. ALREADY OPEN
   * ======================================================
   */
  if v_check_in_opened_at is not null
     and v_check_in_closed_at is null
  then
    return query
    select
      true,
      true,
      false,
      'Attendance check-in is already open.'::text,
      v_check_in_opened_at,
      null::timestamptz;

    return;
  end if;


  /*
   * ======================================================
   * 8. DETERMINE FIRST OPEN / REOPEN
   * ======================================================
   */
  v_is_reopen :=
    v_check_in_closed_at is not null;


  /*
   * Required by the existing protection trigger.
   */
  perform set_config(
    'app.pagtipon_check_in_control',
    'allowed',
    true
  );


  /*
   * ======================================================
   * 9. OPEN / REOPEN CHECK-IN
   * ======================================================
   *
   * Reopen:
   * - starts a new active Check-In session
   * - clears previous close timestamp
   * - clears previous closer
   */
  update public.event_municipalities
  set
    check_in_opened_at = now(),
    check_in_opened_by = v_user_id,

    check_in_closed_at = null,
    check_in_closed_by = null

  where id =
    p_event_municipality_id

  returning
    check_in_opened_at

  into
    v_check_in_opened_at;


  /*
   * ======================================================
   * 10. RESULT
   * ======================================================
   */
  return query
  select
    true,
    false,
    false,

    case
      when v_is_reopen then
        'Attendance check-in has been reopened for late participants.'
      else
        'Attendance check-in is now open.'
    end::text,

    v_check_in_opened_at,
    null::timestamptz;
end;
$$;


ALTER FUNCTION "public"."open_event_check_in"("p_event_municipality_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."open_event_check_out"("p_event_municipality_id" "uuid") RETURNS TABLE("success" boolean, "already_open" boolean, "already_closed" boolean, "message" "text", "opened_at" timestamp with time zone, "closed_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'auth', 'pg_temp'
    AS $$
declare
  v_user_id uuid;

  v_role text;
  v_verification_status text;
  v_user_municipality text;

  v_event_municipality text;
  v_event_status text;
  v_event_end_at timestamptz;

  v_check_in_opened_at timestamptz;
  v_check_in_closed_at timestamptz;

  v_check_out_opened_at timestamptz;
  v_check_out_closed_at timestamptz;

  v_is_reopen boolean := false;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'You must be signed in to control attendance check-out.';
  end if;


  select
    p.role::text,
    p.verification_status::text,
    p.municipality::text
  into
    v_role,
    v_verification_status,
    v_user_municipality
  from public.profiles p
  where p.id = v_user_id;


  if not found then
    raise exception
      'The signed-in user profile was not found.';
  end if;


  if v_role not in (
    'event_staff',
    'municipal_admin'
  ) then
    raise exception
      'Your account is not authorized to control attendance check-out.';
  end if;


  if v_verification_status is distinct from 'approved' then
    raise exception
      'Your account must be approved before controlling attendance.';
  end if;


  /*
   * Lock selected municipal event.
   */
  select
    em.municipality::text,
    e.status::text,
    e.end_at,

    em.check_in_opened_at,
    em.check_in_closed_at,

    em.check_out_opened_at,
    em.check_out_closed_at

  into
    v_event_municipality,
    v_event_status,
    v_event_end_at,

    v_check_in_opened_at,
    v_check_in_closed_at,

    v_check_out_opened_at,
    v_check_out_closed_at

  from public.event_municipalities em

  join public.events e
    on e.id = em.event_id

  where em.id =
    p_event_municipality_id

  for update of em;


  if not found then
    return query
    select
      false,
      false,
      false,
      'The selected event assignment was not found.'::text,
      null::timestamptz,
      null::timestamptz;

    return;
  end if;


  /*
   * Municipality protection.
   */
  if lower(
       btrim(
         coalesce(
           v_user_municipality,
           ''
         )
       )
     )
     <>
     lower(
       btrim(
         coalesce(
           v_event_municipality,
           ''
         )
       )
     )
  then
    return query
    select
      false,
      false,
      false,
      'You are not authorized to control attendance for this municipality.'::text,
      v_check_out_opened_at,
      v_check_out_closed_at;

    return;
  end if;


  /*
   * Cancelled and draft events cannot use Check-Out.
   *
   * Completed is intentionally allowed because
   * Time Out happens after the scheduled event end.
   */
  if v_event_status = 'cancelled' then
    return query
    select
      false,
      false,
      false,
      'Check-out cannot be opened because the event was cancelled.'::text,
      v_check_out_opened_at,
      v_check_out_closed_at;

    return;
  end if;


  if v_event_status = 'draft' then
    return query
    select
      false,
      false,
      false,
      'Check-out cannot be opened while the event is still a draft.'::text,
      v_check_out_opened_at,
      v_check_out_closed_at;

    return;
  end if;


  /*
   * Event must have a valid end time.
   */
  if v_event_end_at is null then
    return query
    select
      false,
      false,
      false,
      'The selected event does not have a valid end time.'::text,
      v_check_out_opened_at,
      v_check_out_closed_at;

    return;
  end if;


  /*
   * IMPORTANT:
   *
   * Check-Out can only begin once the scheduled
   * event end time has been reached.
   */
  if now() < v_event_end_at then
    return query
    select
      false,
      false,
      false,
      (
        'Check-out cannot be opened before the event ends at ' ||
        to_char(
          v_event_end_at at time zone 'Asia/Manila',
          'Mon DD, YYYY, HH12:MI AM'
        ) ||
        '.'
      )::text,
      v_check_out_opened_at,
      v_check_out_closed_at;

    return;
  end if;


  /*
   * Check-In must have been opened first.
   */
  if v_check_in_opened_at is null then
    return query
    select
      false,
      false,
      false,
      'Open attendance check-in before using check-out.'::text,
      v_check_out_opened_at,
      v_check_out_closed_at;

    return;
  end if;


  /*
   * Check-In must currently be closed.
   */
  if v_check_in_closed_at is null then
    return query
    select
      false,
      false,
      false,
      'Close attendance check-in before opening check-out.'::text,
      v_check_out_opened_at,
      v_check_out_closed_at;

    return;
  end if;


  /*
   * Already open.
   */
  if v_check_out_opened_at is not null
     and v_check_out_closed_at is null
  then
    return query
    select
      true,
      true,
      false,
      'Attendance check-out is already open.'::text,
      v_check_out_opened_at,
      null::timestamptz;

    return;
  end if;


  /*
   * If a previous closed timestamp exists,
   * this operation is a Reopen.
   */
  v_is_reopen :=
    v_check_out_closed_at is not null;


  /*
   * Open / Reopen Check-Out.
   */
  update public.event_municipalities
  set
    check_out_opened_at = now(),
    check_out_opened_by = v_user_id,

    check_out_closed_at = null,
    check_out_closed_by = null

  where id =
    p_event_municipality_id

  returning
    check_out_opened_at

  into
    v_check_out_opened_at;


  return query
  select
    true,
    false,
    false,

    case
      when v_is_reopen then
        'Attendance check-out has been reopened.'
      else
        'Attendance check-out is now open.'
    end::text,

    v_check_out_opened_at,
    null::timestamptz;
end;
$$;


ALTER FUNCTION "public"."open_event_check_out"("p_event_municipality_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_cancelled_event_registration"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  event_status_value text;
begin
  /*
    Get the actual provincial event status through:
    rsvps.event_municipality_id
      -> event_municipalities.id
      -> event_municipalities.event_id
      -> events.id
  */
  select lower(e.status::text)
  into event_status_value
  from public.event_municipalities em
  inner join public.events e
    on e.id = em.event_id
  where em.id = new.event_municipality_id
  limit 1;

  /*
    Reject invalid municipality-event assignments.
  */
  if event_status_value is null then
    raise exception using
      errcode = 'P0001',
      message =
        'Registration failed because the event assignment does not exist.';
  end if;

  /*
    Block new RSVP records for cancelled events.
  */
  if tg_op = 'INSERT'
    and event_status_value = 'cancelled'
  then
    raise exception using
      errcode = 'P0001',
      message =
        'Registration is not allowed because this event has been cancelled.';
  end if;

  /*
    Also prevent an existing pending RSVP from being
    changed to registered after cancellation.
  */
  if tg_op = 'UPDATE'
    and event_status_value = 'cancelled'
    and (
      new.event_municipality_id
        is distinct from old.event_municipality_id
      or (
        lower(coalesce(new.status::text, '')) = 'registered'
        and lower(coalesce(old.status::text, ''))
          is distinct from 'registered'
      )
    )
  then
    raise exception using
      errcode = 'P0001',
      message =
        'Registration is not allowed because this event has been cancelled.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."prevent_cancelled_event_registration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_attendance_check_out"("p_attendance_id" "uuid") RETURNS TABLE("success" boolean, "result_code" "text", "result_message" "text", "attendance_id" "uuid", "participant_id" "uuid", "participant_name" "text", "event_title" "text", "attendance_checked_in_at" timestamp with time zone, "attendance_checked_out_at" timestamp with time zone, "already_checked_out" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'auth', 'pg_temp'
    AS $$
declare
  v_current_user_id uuid;
  v_current_user_role text;
  v_current_user_municipality text;

  v_participant_id uuid;
  v_participant_name text;

  v_event_title text;
  v_event_municipality text;

  v_attendance_status text;
  v_checked_in_at timestamptz;
  v_checked_out_at timestamptz;
begin
  v_current_user_id := auth.uid();


  -- -------------------------------------------------------
  -- Validate authenticated user
  -- -------------------------------------------------------
  if v_current_user_id is null then
    raise exception
      'You must be signed in to process attendance check-out.';
  end if;


  select
    p.role::text,
    p.municipality::text
  into
    v_current_user_role,
    v_current_user_municipality
  from public.profiles p
  where p.id = v_current_user_id;

  if not found then
    raise exception
      'The signed-in user profile was not found.';
  end if;


  if v_current_user_role not in (
    'event_staff',
    'municipal_admin'
  ) then
    raise exception
      'Your account is not authorized to process attendance check-out.';
  end if;


  -- -------------------------------------------------------
  -- Find the attendance record
  -- -------------------------------------------------------
  select
    a.user_id,
    coalesce(
      nullif(btrim(participant.full_name), ''),
      participant.email,
      'Unknown participant'
    ),
    e.title,
    em.municipality::text,
    a.status::text,
    a.checked_in_at,
    a.checked_out_at
  into
    v_participant_id,
    v_participant_name,
    v_event_title,
    v_event_municipality,
    v_attendance_status,
    v_checked_in_at,
    v_checked_out_at
  from public.attendance a
  join public.event_municipalities em
    on em.id = a.event_municipality_id
  join public.events e
    on e.id = em.event_id
  left join public.profiles participant
    on participant.id = a.user_id
  where a.id = p_attendance_id;

  if not found then
    return query
    select
      false,
      'attendance_not_found'::text,
      'The attendance record was not found.'::text,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::timestamptz,
      null::timestamptz,
      false;

    return;
  end if;


  -- -------------------------------------------------------
  -- Municipality protection
  -- -------------------------------------------------------
  if lower(btrim(coalesce(v_current_user_municipality, '')))
     <>
     lower(btrim(coalesce(v_event_municipality, '')))
  then
    return query
    select
      false,
      'wrong_municipality'::text,
      'You are not authorized to process attendance for this municipality.'::text,
      p_attendance_id,
      v_participant_id,
      v_participant_name,
      v_event_title,
      v_checked_in_at,
      v_checked_out_at,
      false;

    return;
  end if;


  -- -------------------------------------------------------
  -- Must already be checked in
  -- -------------------------------------------------------
  if v_attendance_status <> 'present'
     or v_checked_in_at is null
  then
    return query
    select
      false,
      'not_checked_in'::text,
      'The participant must be checked in before check-out.'::text,
      p_attendance_id,
      v_participant_id,
      v_participant_name,
      v_event_title,
      v_checked_in_at,
      v_checked_out_at,
      false;

    return;
  end if;


  -- -------------------------------------------------------
  -- Already checked out
  -- -------------------------------------------------------
  if v_checked_out_at is not null then
    return query
    select
      true,
      'already_checked_out'::text,
      'The participant has already been checked out.'::text,
      p_attendance_id,
      v_participant_id,
      v_participant_name,
      v_event_title,
      v_checked_in_at,
      v_checked_out_at,
      true;

    return;
  end if;


  -- -------------------------------------------------------
  -- Record check-out
  --
  -- protect_attendance_check_out() will replace these
  -- values with database time and auth.uid().
  -- -------------------------------------------------------
  begin
    update public.attendance as attendance_record
    set
      checked_out_at = now(),
      checked_out_by = v_current_user_id,
      updated_at = now()
    where attendance_record.id = p_attendance_id
      and attendance_record.checked_out_at is null
    returning attendance_record.checked_out_at
    into v_checked_out_at;

  exception
    when raise_exception then
      return query
      select
        false,
        'check_out_blocked'::text,
        sqlerrm,
        p_attendance_id,
        v_participant_id,
        v_participant_name,
        v_event_title,
        v_checked_in_at,
        null::timestamptz,
        false;

      return;
  end;


  /*
   * Another request may have completed the check-out
   * at almost exactly the same time.
   */
  if v_checked_out_at is null then
    select a.checked_out_at
    into v_checked_out_at
    from public.attendance a
    where a.id = p_attendance_id;

    return query
    select
      true,
      'already_checked_out'::text,
      'The participant has already been checked out.'::text,
      p_attendance_id,
      v_participant_id,
      v_participant_name,
      v_event_title,
      v_checked_in_at,
      v_checked_out_at,
      true;

    return;
  end if;


  return query
  select
    true,
    'attendance_checked_out'::text,
    'Participant checked out successfully.'::text,
    p_attendance_id,
    v_participant_id,
    v_participant_name,
    v_event_title,
    v_checked_in_at,
    v_checked_out_at,
    false;
end;
$$;


ALTER FUNCTION "public"."process_attendance_check_out"("p_attendance_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_attendance_check_out_token"("p_event_municipality_id" "uuid", "p_token" "text", "p_method" "text" DEFAULT 'manual'::"text") RETURNS TABLE("success" boolean, "result_code" "text", "result_message" "text", "attendance_id" "uuid", "participant_id" "uuid", "participant_name" "text", "participant_email" "text", "event_title" "text", "attendance_status" "text", "attendance_checked_in_at" timestamp with time zone, "attendance_checked_out_at" timestamp with time zone, "already_checked_out" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'auth', 'pg_temp'
    AS $$
declare
  v_current_user_id uuid;
  v_current_user_role text;
  v_current_user_municipality text;

  v_event_municipality text;
  v_event_title text;

  v_raw_token text;
  v_normalized_code text;
  v_method_text text;

  v_rsvp_id uuid;
  v_participant_id uuid;
  v_participant_name text;
  v_participant_email text;

  v_attendance_id uuid;
  v_attendance_status text;
  v_checked_in_at timestamptz;
  v_checked_out_at timestamptz;
begin
  v_current_user_id := auth.uid();


  -- ======================================================
  -- 1. AUTHENTICATION
  -- ======================================================

  if v_current_user_id is null then
    raise exception
      'You must be signed in to process attendance check-out.';
  end if;


  select
    p.role::text,
    p.municipality::text
  into
    v_current_user_role,
    v_current_user_municipality
  from public.profiles p
  where p.id = v_current_user_id;


  if not found then
    raise exception
      'The signed-in user profile was not found.';
  end if;


  if v_current_user_role not in (
    'event_staff',
    'municipal_admin'
  ) then
    raise exception
      'Your account is not authorized to process attendance check-out.';
  end if;


  -- ======================================================
  -- 2. VALIDATE SELECTED EVENT ASSIGNMENT
  -- ======================================================

  select
    em.municipality::text,
    e.title::text
  into
    v_event_municipality,
    v_event_title
  from public.event_municipalities em
  join public.events e
    on e.id = em.event_id
  where em.id = p_event_municipality_id;


  if not found then
    return query
    select
      false,
      'event_not_found'::text,
      'The selected event assignment was not found.'::text,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      null::text,
      null::timestamptz,
      null::timestamptz,
      false;

    return;
  end if;


  -- ======================================================
  -- 3. MUNICIPALITY PROTECTION
  -- ======================================================

  if lower(btrim(coalesce(v_current_user_municipality, '')))
     <>
     lower(btrim(coalesce(v_event_municipality, '')))
  then
    return query
    select
      false,
      'wrong_municipality'::text,
      'You are not authorized to process attendance for this municipality.'::text,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      v_event_title,
      null::text,
      null::timestamptz,
      null::timestamptz,
      false;

    return;
  end if;


  -- ======================================================
  -- 4. NORMALIZE INPUT
  -- ======================================================

  v_raw_token := btrim(
    coalesce(p_token, '')
  );


  if v_raw_token = '' then
    return query
    select
      false,
      'empty_token'::text,
      'Enter or scan the participant attendance token.'::text,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      v_event_title,
      null::text,
      null::timestamptz,
      null::timestamptz,
      false;

    return;
  end if;


  /*
   * Used for readable attendance code matching.
   *
   * Examples accepted:
   *
   * PTP-7KQM-9X2H
   * ptp-7kqm-9x2h
   * PTP 7KQM 9X2H
   * 7KQM9X2H
   */
  v_normalized_code :=
    regexp_replace(
      upper(v_raw_token),
      '[^A-Z0-9]',
      '',
      'g'
    );


  v_method_text :=
    lower(
      btrim(
        coalesce(
          p_method,
          'manual'
        )
      )
    );


  if v_method_text not in (
    'qr',
    'manual'
  ) then
    raise exception
      'Invalid attendance method. Expected qr or manual.';
  end if;


  -- ======================================================
  -- 5. FIND REGISTERED PARTICIPANT
  -- ======================================================

  select
    r.id,
    r.user_id,
    p.full_name,
    p.email
  into
    v_rsvp_id,
    v_participant_id,
    v_participant_name,
    v_participant_email
  from public.rsvps r
  join public.profiles p
    on p.id = r.user_id
  where r.event_municipality_id =
        p_event_municipality_id

    and r.status::text =
        'registered'

    and (
      /*
       * QR token stays exact and case-sensitive.
       */
      r.qr_token = v_raw_token

      or

      /*
       * Readable attendance code ignores:
       * - spaces
       * - hyphens
       * - capitalization
       */
      regexp_replace(
        upper(r.attendance_code),
        '[^A-Z0-9]',
        '',
        'g'
      ) = v_normalized_code
    )
  limit 1;


  if not found then
    return query
    select
      false,
      'participant_not_found'::text,
      'No registered participant matched that QR token or attendance code for the selected event.'::text,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      v_event_title,
      null::text,
      null::timestamptz,
      null::timestamptz,
      false;

    return;
  end if;


  -- ======================================================
  -- 6. FIND ATTENDANCE RECORD
  -- ======================================================

  select
    a.id,
    a.status::text,
    a.checked_in_at,
    a.checked_out_at
  into
    v_attendance_id,
    v_attendance_status,
    v_checked_in_at,
    v_checked_out_at
  from public.attendance a
  where a.rsvp_id = v_rsvp_id
  limit 1
  for update;


  /*
   * No attendance row means there was no valid check-in.
   */
  if not found then
    return query
    select
      false,
      'not_checked_in'::text,
      'The participant must be checked in before check-out.'::text,
      null::uuid,
      v_participant_id,
      v_participant_name,
      v_participant_email,
      v_event_title,
      null::text,
      null::timestamptz,
      null::timestamptz,
      false;

    return;
  end if;


  -- ======================================================
  -- 7. REQUIRE SUCCESSFUL CHECK-IN
  -- ======================================================

  if v_attendance_status <> 'present'
     or v_checked_in_at is null
  then
    return query
    select
      false,
      'not_checked_in'::text,
      'The participant must be checked in before check-out.'::text,
      v_attendance_id,
      v_participant_id,
      v_participant_name,
      v_participant_email,
      v_event_title,
      v_attendance_status,
      v_checked_in_at,
      v_checked_out_at,
      false;

    return;
  end if;


  -- ======================================================
  -- 8. ALREADY CHECKED OUT
  -- ======================================================

  if v_checked_out_at is not null then
    return query
    select
      true,
      'already_checked_out'::text,
      'The participant has already been checked out.'::text,
      v_attendance_id,
      v_participant_id,
      v_participant_name,
      v_participant_email,
      v_event_title,
      v_attendance_status,
      v_checked_in_at,
      v_checked_out_at,
      true;

    return;
  end if;


  -- ======================================================
  -- 9. RECORD CHECK-OUT
  -- ======================================================

  begin
    update public.attendance as attendance_record
    set
      /*
       * protect_attendance_check_out()
       * will replace these with:
       *
       *   checked_out_at = database now()
       *   checked_out_by = auth.uid()
       */
      checked_out_at =
        now(),

      checked_out_by =
        v_current_user_id,

      updated_at =
        now()

    where attendance_record.id =
          v_attendance_id

      and attendance_record.checked_out_at
          is null

    returning
      attendance_record.checked_out_at
    into
      v_checked_out_at;


  exception
    when raise_exception then

      return query
      select
        false,
        'check_out_blocked'::text,
        sqlerrm,
        v_attendance_id,
        v_participant_id,
        v_participant_name,
        v_participant_email,
        v_event_title,
        v_attendance_status,
        v_checked_in_at,
        null::timestamptz,
        false;

      return;
  end;


  -- ======================================================
  -- 10. SUCCESS
  -- ======================================================

  return query
  select
    true,
    'attendance_checked_out'::text,
    'Participant checked out successfully.'::text,
    v_attendance_id,
    v_participant_id,
    v_participant_name,
    v_participant_email,
    v_event_title,
    v_attendance_status,
    v_checked_in_at,
    v_checked_out_at,
    false;
end;
$$;


ALTER FUNCTION "public"."process_attendance_check_out_token"("p_event_municipality_id" "uuid", "p_token" "text", "p_method" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_attendance_token"("p_event_municipality_id" "uuid", "p_token" "text", "p_method" "text" DEFAULT 'manual'::"text") RETURNS TABLE("success" boolean, "result_code" "text", "result_message" "text", "attendance_id" "uuid", "participant_id" "uuid", "participant_name" "text", "participant_email" "text", "event_title" "text", "attendance_status" "text", "attendance_checked_in_at" timestamp with time zone, "already_checked_in" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
declare
  v_current_user_id uuid;
  v_current_user_role text;
  v_current_user_municipality text;

  v_event_id uuid;
  v_event_municipality text;
  v_event_title text;

  v_raw_token text;
  v_normalized_code text;
  v_method_text text;

  v_rsvp_id uuid;
  v_participant_id uuid;
  v_participant_name text;
  v_participant_email text;

  v_attendance_id uuid;
  v_attendance_status text;
  v_checked_in_at timestamp with time zone;

  v_method public.attendance.method%type;
  v_present_status public.attendance.status%type;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'You must be signed in to process attendance.';
  end if;


  -- -------------------------------------------------------
  -- Validate the authenticated staff account.
  -- -------------------------------------------------------
  select
    p.role::text,
    p.municipality
  into
    v_current_user_role,
    v_current_user_municipality
  from public.profiles as p
  where p.id = v_current_user_id;

  if not found then
    raise exception 'The signed-in user profile was not found.';
  end if;

  if v_current_user_role not in (
    'event_staff',
    'municipal_admin'
  ) then
    raise exception
      'Your account is not authorized to process attendance.';
  end if;


  -- -------------------------------------------------------
  -- Validate the selected municipal event.
  -- -------------------------------------------------------
  select
    em.event_id,
    em.municipality,
    e.title
  into
    v_event_id,
    v_event_municipality,
    v_event_title
  from public.event_municipalities as em
  join public.events as e
    on e.id = em.event_id
  where em.id = p_event_municipality_id;

  if not found then
    raise exception 'The selected event assignment was not found.';
  end if;


  -- Staff may process only events belonging to their
  -- municipality.
  if lower(btrim(coalesce(v_current_user_municipality, '')))
     <> lower(btrim(coalesce(v_event_municipality, ''))) then
    raise exception
      'You are not authorized to process attendance for this municipality.';
  end if;


  -- -------------------------------------------------------
  -- Validate and normalize the submitted input.
  -- -------------------------------------------------------
  v_raw_token := btrim(coalesce(p_token, ''));

  if v_raw_token = '' then
    return query
    select
      false,
      'empty_token'::text,
      'Enter or paste the participant attendance token.'::text,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      v_event_title,
      null::text,
      null::timestamp with time zone,
      false;

    return;
  end if;

  -- Used only when matching the readable attendance code.
  v_normalized_code :=
    regexp_replace(
      upper(v_raw_token),
      '[^A-Z0-9]',
      '',
      'g'
    );

  v_method_text :=
    lower(btrim(coalesce(p_method, 'manual')));

  if v_method_text not in ('qr', 'manual') then
    raise exception
      'Invalid attendance method. Expected qr or manual.';
  end if;

  -- Convert the validated text into the table enum types.
  v_method := v_method_text;
  v_present_status := 'present';


  -- -------------------------------------------------------
  -- Find a registered participant only within the selected
  -- event assignment.
  --
  -- QR token matching remains exact and case-sensitive.
  -- Attendance-code matching ignores spaces, hyphens,
  -- and letter case.
  -- -------------------------------------------------------
  select
    r.id,
    r.user_id,
    p.full_name,
    p.email
  into
    v_rsvp_id,
    v_participant_id,
    v_participant_name,
    v_participant_email
  from public.rsvps as r
  join public.profiles as p
    on p.id = r.user_id
  where r.event_municipality_id = p_event_municipality_id
    and r.status::text = 'registered'
    and (
      r.qr_token = v_raw_token
      or regexp_replace(
        upper(r.attendance_code),
        '[^A-Z0-9]',
        '',
        'g'
      ) = v_normalized_code
    )
  limit 1;

  if not found then
    return query
    select
      false,
      'participant_not_found'::text,
      'No registered participant matched that QR token or attendance code for the selected event.'::text,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      v_event_title,
      null::text,
      null::timestamp with time zone,
      false;

    return;
  end if;


  -- -------------------------------------------------------
  -- Check for an already completed check-in.
  -- -------------------------------------------------------
  select
    a.id,
    a.status::text,
    a.checked_in_at
  into
    v_attendance_id,
    v_attendance_status,
    v_checked_in_at
  from public.attendance as a
  where a.rsvp_id = v_rsvp_id
  limit 1;

  if found and v_attendance_status = 'present' then
    return query
    select
      true,
      'already_checked_in'::text,
      'The participant has already been checked in.'::text,
      v_attendance_id,
      v_participant_id,
      v_participant_name,
      v_participant_email,
      v_event_title,
      v_attendance_status,
      v_checked_in_at,
      true;

    return;
  end if;


  -- -------------------------------------------------------
  -- Insert or update the attendance record.
  --
  -- The existing protect_attendance_check_in trigger still
  -- validates:
  --   - cancelled/completed events
  --   - 30-minute opening rule
  --   - event end time
  --   - staff-controlled open/close window
  -- -------------------------------------------------------
  begin
    insert into public.attendance as existing_attendance (
      rsvp_id,
      event_municipality_id,
      user_id,
      status,
      method,
      checked_in_at,
      checked_in_by,
      created_at,
      updated_at
    )
    values (
      v_rsvp_id,
      p_event_municipality_id,
      v_participant_id,
      v_present_status,
      v_method,
      now(),
      v_current_user_id,
      now(),
      now()
    )
    on conflict (rsvp_id)
    do update
    set
      status = excluded.status,
      method = excluded.method,
      checked_in_at = excluded.checked_in_at,
      checked_in_by = excluded.checked_in_by,
      updated_at = now()
    where existing_attendance.status::text <> 'present'
    returning
      existing_attendance.id,
      existing_attendance.status::text,
      existing_attendance.checked_in_at
    into
      v_attendance_id,
      v_attendance_status,
      v_checked_in_at;

  exception
    when raise_exception then
      return query
      select
        false,
        'check_in_blocked'::text,
        sqlerrm,
        null::uuid,
        v_participant_id,
        v_participant_name,
        v_participant_email,
        v_event_title,
        null::text,
        null::timestamp with time zone,
        false;

      return;
  end;


  -- A conflict with an already-present row performs no
  -- update because of the WHERE condition above.
  if v_attendance_id is null then
    select
      a.id,
      a.status::text,
      a.checked_in_at
    into
      v_attendance_id,
      v_attendance_status,
      v_checked_in_at
    from public.attendance as a
    where a.rsvp_id = v_rsvp_id
    limit 1;

    return query
    select
      true,
      'already_checked_in'::text,
      'The participant has already been checked in.'::text,
      v_attendance_id,
      v_participant_id,
      v_participant_name,
      v_participant_email,
      v_event_title,
      v_attendance_status,
      v_checked_in_at,
      true;

    return;
  end if;


  return query
  select
    true,
    'attendance_recorded'::text,
    'Attendance recorded successfully.'::text,
    v_attendance_id,
    v_participant_id,
    v_participant_name,
    v_participant_email,
    v_event_title,
    v_attendance_status,
    v_checked_in_at,
    false;
end;
$$;


ALTER FUNCTION "public"."process_attendance_token"("p_event_municipality_id" "uuid", "p_token" "text", "p_method" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_attendance_check_in"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  event_record record;
  check_in_time timestamptz := now();
  should_validate boolean := false;
begin

  if new.status::text = 'present' then

    if tg_op = 'INSERT' then
      should_validate := true;

    elsif tg_op = 'UPDATE'
      and old.status::text is distinct from 'present'
    then
      should_validate := true;
    end if;

  end if;


  if should_validate then

    select
      e.id as event_id,
      e.title,
      e.status::text as event_status,
      e.start_at,
      e.end_at,

      em.id as event_municipality_id,
      em.check_in_opened_at,
      em.check_in_closed_at

    into event_record

    from public.rsvps r

    inner join public.event_municipalities em
      on em.id = r.event_municipality_id

    inner join public.events e
      on e.id = em.event_id

    where r.id = new.rsvp_id

    limit 1;


    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'ATTENDANCE_EVENT_NOT_FOUND',
        detail =
          'The event connected to the attendance record could not be found.';
    end if;


    if event_record.start_at is null
       or event_record.end_at is null
    then
      raise exception using
        errcode = 'P0001',
        message = 'ATTENDANCE_INVALID_EVENT_SCHEDULE',
        detail =
          'The event does not have a valid start_at and end_at schedule.';
    end if;


    if event_record.event_status = 'cancelled' then
      raise exception using
        errcode = 'P0001',
        message = 'ATTENDANCE_EVENT_CANCELLED',
        detail =
          'Check-in is disabled because the event was cancelled.';
    end if;


    if event_record.event_status = 'draft' then
      raise exception using
        errcode = 'P0001',
        message = 'ATTENDANCE_EVENT_DRAFT',
        detail =
          'Check-in is disabled while the event is still a draft.';
    end if;


    if event_record.event_status = 'completed' then
      raise exception using
        errcode = 'P0001',
        message = 'ATTENDANCE_EVENT_COMPLETED',
        detail =
          'Check-in is disabled because the event is completed.';
    end if;


    /*
     * REMOVED:
     *
     * check_in_time <
     * event_record.start_at - interval '30 minutes'
     *
     * Staff now decides when Check-In begins.
     */


    if check_in_time > event_record.end_at then
      raise exception using
        errcode = 'P0001',
        message = 'ATTENDANCE_WINDOW_CLOSED',
        detail = format(
          'The attendance check-in window ended at: %s.',
          event_record.end_at
        );
    end if;


    if event_record.check_in_opened_at is null then
      raise exception using
        errcode = 'P0001',
        message = 'ATTENDANCE_CHECK_IN_NOT_OPEN',
        detail =
          'Event staff has not opened attendance check-in.';
    end if;


    if event_record.check_in_closed_at is not null then
      raise exception using
        errcode = 'P0001',
        message = 'ATTENDANCE_CHECK_IN_CLOSED',
        detail = format(
          'Event staff closed attendance check-in at: %s.',
          event_record.check_in_closed_at
        );
    end if;


    /*
     * Trusted database Time In.
     */
    new.checked_in_at :=
      check_in_time;

  end if;


  /*
   * Preserve a successful Time In.
   */
  if tg_op = 'UPDATE'
     and old.status::text = 'present'
     and new.status::text = 'present'
  then
    new.checked_in_at :=
      old.checked_in_at;
  end if;


  /*
   * Non-present records should not have
   * a Time In timestamp.
   */
  if new.status::text <> 'present' then
    new.checked_in_at := null;
  end if;


  return new;
end;
$$;


ALTER FUNCTION "public"."protect_attendance_check_in"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_attendance_check_out"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'auth', 'pg_temp'
    AS $$
declare
  v_user_id uuid;

  v_role text;
  v_staff_municipality text;

  v_event_municipality text;
  v_event_status text;
  v_event_end_at timestamptz;

  v_check_out_opened_at timestamptz;
  v_check_out_closed_at timestamptz;

  v_attempting_check_out boolean := false;
begin

  /*
   * ======================================================
   * 1. EXISTING TIME OUT IS IMMUTABLE
   * ======================================================
   *
   * Once a participant already has a Time Out,
   * later updates must not overwrite it.
   */
  if tg_op = 'UPDATE'
     and old.checked_out_at is not null
  then
    new.checked_out_at :=
      old.checked_out_at;

    new.checked_out_by :=
      old.checked_out_by;

    return new;
  end if;


  /*
   * ======================================================
   * 2. DETECT TIME OUT ATTEMPT
   * ======================================================
   */
  if tg_op = 'INSERT' then

    v_attempting_check_out :=
      new.checked_out_at is not null
      or new.checked_out_by is not null;

  elsif tg_op = 'UPDATE' then

    v_attempting_check_out :=
      new.checked_out_at
        is distinct from
        old.checked_out_at

      or

      new.checked_out_by
        is distinct from
        old.checked_out_by;

  end if;


  /*
   * Normal attendance update that does not attempt
   * to change Time Out may continue normally.
   */
  if not v_attempting_check_out then
    return new;
  end if;


  /*
   * ======================================================
   * 3. PARTICIPANT MUST HAVE SUCCESSFUL TIME IN
   * ======================================================
   */
  if new.status::text <> 'present'
     or new.checked_in_at is null
  then
    raise exception using
      errcode = 'P0001',
      message = 'ATTENDANCE_CHECK_OUT_REQUIRES_CHECK_IN',
      detail =
        'The participant must have a successful Time In before Time Out can be recorded.';
  end if;


  /*
   * ======================================================
   * 4. AUTHENTICATED STAFF ONLY
   * ======================================================
   */
  v_user_id := auth.uid();


  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'ATTENDANCE_CHECK_OUT_AUTH_REQUIRED',
      detail =
        'You must be signed in to record participant Time Out.';
  end if;


  select
    p.role::text,
    p.municipality::text
  into
    v_role,
    v_staff_municipality
  from public.profiles p
  where p.id = v_user_id;


  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'ATTENDANCE_CHECK_OUT_PROFILE_NOT_FOUND',
      detail =
        'The authenticated staff profile could not be found.';
  end if;


  if v_role not in (
    'event_staff',
    'municipal_admin'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'ATTENDANCE_CHECK_OUT_UNAUTHORIZED',
      detail =
        'Only authorized event staff or municipal administrators may record Time Out.';
  end if;


  /*
   * ======================================================
   * 5. LOAD EVENT + CHECK-OUT SESSION
   * ======================================================
   */
  select
    em.municipality::text,
    e.status::text,
    e.end_at,

    em.check_out_opened_at,
    em.check_out_closed_at
  into
    v_event_municipality,
    v_event_status,
    v_event_end_at,

    v_check_out_opened_at,
    v_check_out_closed_at
  from public.event_municipalities em
  join public.events e
    on e.id = em.event_id
  where em.id =
    new.event_municipality_id;


  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'ATTENDANCE_CHECK_OUT_EVENT_NOT_FOUND',
      detail =
        'The selected event assignment could not be found.';
  end if;


  /*
   * ======================================================
   * 6. MUNICIPALITY PROTECTION
   * ======================================================
   */
  if lower(
       btrim(
         coalesce(
           v_staff_municipality,
           ''
         )
       )
     )
     <>
     lower(
       btrim(
         coalesce(
           v_event_municipality,
           ''
         )
       )
     )
  then
    raise exception using
      errcode = 'P0001',
      message = 'ATTENDANCE_CHECK_OUT_WRONG_MUNICIPALITY',
      detail =
        'Staff may only record Time Out for participants assigned to their municipality.';
  end if;


  /*
   * ======================================================
   * 7. EVENT STATUS PROTECTION
   * ======================================================
   */
  if v_event_status = 'cancelled' then
    raise exception using
      errcode = 'P0001',
      message = 'ATTENDANCE_CHECK_OUT_EVENT_CANCELLED',
      detail =
        'Time Out is unavailable because the event was cancelled.';
  end if;


  if v_event_status = 'draft' then
    raise exception using
      errcode = 'P0001',
      message = 'ATTENDANCE_CHECK_OUT_EVENT_DRAFT',
      detail =
        'Time Out is unavailable while the event is still a draft.';
  end if;


  /*
   * Completed events are intentionally allowed.
   *
   * Check-Out is expected to happen after the
   * scheduled event end.
   */


  /*
   * ======================================================
   * 8. EVENT END-TIME PROTECTION
   * ======================================================
   *
   * A participant must not receive Time Out before
   * the scheduled event has ended.
   */

  if v_event_end_at is null then
    raise exception using
      errcode = 'P0001',
      message = 'ATTENDANCE_CHECK_OUT_INVALID_EVENT_END',
      detail =
        'The event does not have a valid scheduled end time.';
  end if;


  if now() < v_event_end_at then
    raise exception using
      errcode = 'P0001',
      message = 'ATTENDANCE_CHECK_OUT_EVENT_NOT_ENDED',
      detail =
        'Time Out cannot be recorded before the scheduled event end time.',
      hint =
        'Wait until the event ends before opening Check-Out and recording participant Time Out.';
  end if;


  /*
   * ======================================================
   * 9. STAFF-CONTROLLED CHECK-OUT WINDOW
   * ======================================================
   */
  if v_check_out_opened_at is null then
    raise exception using
      errcode = 'P0001',
      message = 'ATTENDANCE_CHECK_OUT_NOT_OPEN',
      detail =
        'Staff must open the Check-Out session before recording participant Time Out.';
  end if;


  if v_check_out_closed_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'ATTENDANCE_CHECK_OUT_CLOSED',
      detail =
        'The Check-Out session has already been closed.';
  end if;


  /*
   * ======================================================
   * 10. TRUSTED SERVER VALUES
   * ======================================================
   *
   * Client-supplied Time Out timestamp and staff ID
   * are never trusted.
   */
  new.checked_out_at := now();

  new.checked_out_by :=
    v_user_id;


  return new;
end;
$$;


ALTER FUNCTION "public"."protect_attendance_check_out"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_check_in_control_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if (
    new.check_in_opened_at is distinct from old.check_in_opened_at
    or new.check_in_closed_at is distinct from old.check_in_closed_at
    or new.check_in_opened_by is distinct from old.check_in_opened_by
    or new.check_in_closed_by is distinct from old.check_in_closed_by
  )
  and coalesce(
    current_setting(
      'app.pagtipon_check_in_control',
      true
    ),
    ''
  ) <> 'allowed'
  then
    raise exception using
      errcode = 'P0001',
      message = 'CHECK_IN_CONTROL_DIRECT_UPDATE_BLOCKED',
      detail = 'Check-in controls must be changed using the authorized open or close check-in function.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."protect_check_in_control_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_event_schedule_from_venue_conflicts"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  assignment_record record;
begin
  /*
   * A cancelled event no longer occupies its venue.
   */
  if new.status::text = 'cancelled' then
    return new;
  end if;

  /*
   * Check every municipal venue already assigned
   * to this provincial event.
   */
  for assignment_record in
    select
      em.id,
      em.local_venue_id
    from public.event_municipalities em
    where
      em.event_id = new.id
      and em.local_venue_id is not null
  loop
    perform public.assert_no_venue_schedule_conflict(
      assignment_record.id,
      new.id,
      assignment_record.local_venue_id,
      new.start_at,
      new.end_at,
      new.status::text
    );
  end loop;

  return new;
end;
$$;


ALTER FUNCTION "public"."protect_event_schedule_from_venue_conflicts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_inactive_local_venue"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  venue_status text;
  selected_venue_name text;
begin
  -- Allow assignments without a venue yet
  if new.local_venue_id is null then
    return new;
  end if;

  select
    lower(trim(v.status)),
    v.venue_name
  into
    venue_status,
    selected_venue_name
  from public.venues v
  where v.id = new.local_venue_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'Selected venue does not exist.',
      hint = 'Choose a valid municipal venue.';
  end if;

  if venue_status <> 'active' then
    raise exception using
      errcode = 'P0001',
      message = 'Venue unavailable. This venue cannot be assigned to an event.',
      detail = format(
        'Venue: %s. Current status: %s.',
        selected_venue_name,
        venue_status
      ),
      hint = 'Select an active venue before saving.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."protect_inactive_local_venue"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_local_venue_capacity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  selected_venue_name text;
  selected_venue_capacity integer;
  registered_count integer;
begin
  /*
   * No venue selected.
   * Existing preparation rules can handle this.
   */
  if new.local_venue_id is null then
    return new;
  end if;

  /*
   * On UPDATE, only perform this capacity check
   * when the assigned venue actually changes.
   */
  if tg_op = 'UPDATE'
     and old.local_venue_id is not distinct from new.local_venue_id then
    return new;
  end if;

  /*
   * Fetch the newly selected venue.
   */
  select
    v.venue_name,
    v.capacity
  into
    selected_venue_name,
    selected_venue_capacity
  from public.venues v
  where v.id = new.local_venue_id;

  /*
   * Existing FK/inactive venue protections
   * remain responsible for invalid venues.
   */
  if not found then
    return new;
  end if;

  /*
   * Count current confirmed registrations
   * for this municipal event assignment.
   */
  select count(*)::integer
  into registered_count
  from public.rsvps r
  where r.event_municipality_id = new.id
    and lower(
      trim(
        coalesce(r.status::text, '')
      )
    ) = 'registered';

  /*
   * If there are no registrations yet,
   * normal venue assignment can continue.
   */
  if registered_count = 0 then
    return new;
  end if;

  /*
   * A venue with no valid capacity cannot
   * receive an event that already has
   * registered participants.
   */
  if selected_venue_capacity is null
     or selected_venue_capacity <= 0 then
    raise exception using
      errcode = 'P0001',
      message =
        'Venue assignment blocked. The selected venue does not have a valid capacity.',
      detail = format(
        'Venue: %s. Registered participants: %s. Venue capacity: %s.',
        coalesce(
          selected_venue_name,
          'Unknown venue'
        ),
        registered_count,
        coalesce(
          selected_venue_capacity::text,
          'Not set'
        )
      ),
      hint =
        'Select a venue with enough capacity for the currently registered participants.';
  end if;

  /*
   * Prevent assigning a smaller venue
   * than the current registration count.
   */
  if registered_count > selected_venue_capacity then
    raise exception using
      errcode = 'P0001',
      message =
        'Venue assignment blocked. The selected venue is too small for the current registrations.',
      detail = format(
        'Venue: %s. Capacity: %s. Registered participants: %s.',
        coalesce(
          selected_venue_name,
          'Unknown venue'
        ),
        selected_venue_capacity,
        registered_count
      ),
      hint =
        'Select a venue whose capacity is at least equal to the number of registered participants.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."protect_local_venue_capacity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_local_venue_schedule"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  target_start_at timestamptz;
  target_end_at timestamptz;
  target_status text;
begin
  /*
   * If no venue is assigned, there is no venue conflict.
   */
  if new.local_venue_id is null then
    return new;
  end if;

  /*
   * Read the schedule from the parent provincial event.
   */
  select
    e.start_at,
    e.end_at,
    e.status::text
  into
    target_start_at,
    target_end_at,
    target_status
  from public.events e
  where e.id = new.event_id;

  if not found then
    raise exception
      'Unable to validate venue schedule because the event does not exist.';
  end if;

  perform public.assert_no_venue_schedule_conflict(
    new.id,
    new.event_id,
    new.local_venue_id,
    target_start_at,
    target_end_at,
    target_status
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."protect_local_venue_schedule"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_municipal_preparation_lifecycle"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_event_status text;

  v_protected_fields_changed boolean;
  v_only_registration_closed boolean;
  v_cancel_lockdown boolean;
begin
  /*
   * Get the latest lifecycle status directly
   * from the parent provincial event.
   */
  select
    lower(
      trim(
        coalesce(
          e.status::text,
          ''
        )
      )
    )
  into v_event_status
  from public.events e
  where e.id = new.event_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'EVENT_PREPARATION_PARENT_EVENT_NOT_FOUND',
      detail =
        'The provincial event connected to this municipal assignment could not be found.';
  end if;

  /*
   * Published/upcoming events remain editable.
   *
   * Only these terminal/active lifecycle states
   * lock municipal preparation:
   *
   * - ongoing
   * - completed
   * - cancelled
   */
  if v_event_status not in (
    'ongoing',
    'completed',
    'cancelled'
  ) then
    return new;
  end if;

  /*
   * Determine whether any protected municipal
   * preparation field actually changed.
   *
   * This intentionally does NOT include:
   *
   * - check_in_opened_at
   * - check_in_closed_at
   * - check_in_opened_by
   * - check_in_closed_by
   *
   * Those fields already have their own
   * authorized database protection.
   */
  v_protected_fields_changed :=
    new.municipal_status
      is distinct from old.municipal_status

    or new.preparation_status
      is distinct from old.preparation_status

    or new.local_venue_id
      is distinct from old.local_venue_id

    or new.local_instructions
      is distinct from old.local_instructions

    or new.registration_open
      is distinct from old.registration_open

    or new.prepared_by
      is distinct from old.prepared_by;

  /*
   * Nothing related to municipal preparation
   * actually changed.
   */
  if not v_protected_fields_changed then
    return new;
  end if;

  /*
   * SAFE EXCEPTION:
   *
   * Even after an event becomes ongoing,
   * completed, or cancelled, the system is
   * still allowed to CLOSE registration.
   *
   * It may never reopen registration.
   *
   * No other preparation field may change
   * during this exception.
   */
  v_only_registration_closed :=
    old.registration_open is true
    and new.registration_open is false

    and new.municipal_status
      is not distinct from old.municipal_status

    and new.preparation_status
      is not distinct from old.preparation_status

    and new.local_venue_id
      is not distinct from old.local_venue_id

    and new.local_instructions
      is not distinct from old.local_instructions

    and new.prepared_by
      is not distinct from old.prepared_by;

  if v_only_registration_closed then
    return new;
  end if;

  /*
   * CANCEL-SAFE EXCEPTION:
   *
   * Some cancellation workflows may also mark
   * the municipal assignment itself as cancelled.
   *
   * Allow that lockdown operation only when the
   * parent provincial event is already cancelled.
   *
   * Registration must not be opened and no venue,
   * instructions, preparation_status, or prepared_by
   * changes are allowed at the same time.
   */
  v_cancel_lockdown :=
    v_event_status = 'cancelled'

    and lower(
      trim(
        coalesce(
          new.municipal_status::text,
          ''
        )
      )
    ) = 'cancelled'

    and (
      new.registration_open is false
      or new.registration_open is null
    )

    and new.local_venue_id
      is not distinct from old.local_venue_id

    and new.local_instructions
      is not distinct from old.local_instructions

    and new.preparation_status
      is not distinct from old.preparation_status

    and new.prepared_by
      is not distinct from old.prepared_by;

  if v_cancel_lockdown then
    return new;
  end if;

  /*
   * Everything else is blocked.
   */
  raise exception using
    errcode = 'P0001',
    message = 'EVENT_PREPARATION_LOCKED',
    detail = format(
      'Municipal preparation cannot be changed because the provincial event status is %s.',
      v_event_status
    ),
    hint =
      'Municipal preparation may only be changed before the event becomes ongoing, completed, or cancelled.';

  return new;
end;
$$;


ALTER FUNCTION "public"."protect_municipal_preparation_lifecycle"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_profile_authorization_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  actor_role text;
begin
  if auth.uid() is null then
    return new;
  end if;

  select p.role::text
  into actor_role
  from public.profiles p
  where p.id = auth.uid();

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


ALTER FUNCTION "public"."protect_profile_authorization_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_rsvp_venue_capacity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  selected_venue_id uuid;
  selected_venue_name text;
  venue_capacity integer;
  registered_count integer;
begin
  /*
   * Only REGISTERED RSVPs consume
   * venue capacity.
   */
  if lower(
    trim(
      coalesce(new.status::text, '')
    )
  ) <> 'registered' then
    return new;
  end if;

  /*
   * If this is an UPDATE and this RSVP
   * was already registered for the same
   * event assignment, it is not consuming
   * another seat.
   */
  if tg_op = 'UPDATE' then
    if
      lower(
        trim(
          coalesce(old.status::text, '')
        )
      ) = 'registered'
      and old.event_municipality_id =
          new.event_municipality_id
    then
      return new;
    end if;
  end if;

  /*
   * Lock the municipal event assignment.
   *
   * All registration attempts for the
   * same assignment must pass through
   * this lock one at a time.
   */
  select em.local_venue_id
  into selected_venue_id
  from public.event_municipalities em
  where em.id =
        new.event_municipality_id
  for update;

  /*
   * Existing registration/FK protections
   * handle missing assignments.
   */
  if not found then
    return new;
  end if;

  /*
   * No venue assigned yet.
   * Leave that validation to the existing
   * event preparation protections.
   */
  if selected_venue_id is null then
    return new;
  end if;

  /*
   * Get the assigned venue and capacity.
   */
  select
    v.venue_name,
    v.capacity
  into
    selected_venue_name,
    venue_capacity
  from public.venues v
  where v.id = selected_venue_id;

  if not found then
    return new;
  end if;

  /*
   * Registration must not continue when
   * the assigned venue has no valid capacity.
   */
  if
    venue_capacity is null
    or venue_capacity <= 0
  then
    raise exception using
      errcode = 'P0001',
      message =
        'Registration blocked. The assigned venue does not have a valid capacity.',
      detail = format(
        'Venue: %s. Capacity: %s.',
        coalesce(
          selected_venue_name,
          'Unknown venue'
        ),
        coalesce(
          venue_capacity::text,
          'Not set'
        )
      ),
      hint =
        'Ask the municipal administrator to set a valid venue capacity before registration continues.';
  end if;

  /*
   * SECURITY DEFINER is intentional here.
   *
   * The trigger must count ALL registered
   * participants for this municipal event,
   * not only the RSVPs visible through the
   * current participant's RLS policy.
   */
  select count(*)::integer
  into registered_count
  from public.rsvps r
  where
    r.event_municipality_id =
      new.event_municipality_id
    and lower(
      trim(
        coalesce(r.status::text, '')
      )
    ) = 'registered'
    and (
      tg_op <> 'UPDATE'
      or r.id is distinct from new.id
    );

  /*
   * If existing registrations already equal
   * or exceed venue capacity, reject the
   * new registration.
   */
  if registered_count >= venue_capacity then
    raise exception using
      errcode = 'P0001',
      message =
        'Registration blocked. Venue capacity has been reached.',
      detail = format(
        'Venue: %s. Capacity: %s. Registered participants: %s.',
        coalesce(
          selected_venue_name,
          'Unknown venue'
        ),
        venue_capacity,
        registered_count
      ),
      hint =
        'Registration is full for this municipal event assignment.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."protect_rsvp_venue_capacity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_venue_from_unsafe_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  blocking_event_title text;
  blocking_start_at timestamptz;
  blocking_end_at timestamptz;
begin
  /*
   * Block venue deletion when it is still assigned
   * to a non-cancelled municipal event whose schedule
   * has not ended yet.
   *
   * We intentionally use end_at instead of relying
   * only on events.status because event status may
   * temporarily be stale.
   */
  select
    e.title,
    e.start_at,
    e.end_at
  into
    blocking_event_title,
    blocking_start_at,
    blocking_end_at
  from public.event_municipalities em
  join public.events e
    on e.id = em.event_id
  where em.local_venue_id = old.id

    -- Ignore cancelled provincial events
    and lower(
      trim(
        coalesce(e.status::text, '')
      )
    ) <> 'cancelled'

    -- Ignore cancelled municipal assignments
    and lower(
      trim(
        coalesce(em.municipal_status::text, '')
      )
    ) <> 'cancelled'

    -- Future / ongoing / unknown-end schedule
    and (
      e.end_at is null
      or e.end_at > now()
    )

  order by
    e.start_at asc nulls first

  limit 1;

  if found then
    raise exception using
      errcode = 'P0001',

      message =
        'Venue deletion blocked. This venue is assigned to an upcoming or ongoing event.',

      detail = format(
        'Venue: %s. Event: %s. Schedule: %s to %s.',
        coalesce(
          old.venue_name,
          'Unknown venue'
        ),
        coalesce(
          blocking_event_title,
          'Untitled event'
        ),
        coalesce(
          blocking_start_at::text,
          'Start time unavailable'
        ),
        coalesce(
          blocking_end_at::text,
          'End time unavailable'
        )
      ),

      hint =
        'Assign another venue to the event or wait until the event has ended before deleting this venue.';
  end if;

  return old;
end;
$$;


ALTER FUNCTION "public"."protect_venue_from_unsafe_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_rsvp_attendance_code"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $_$
declare
  normalized_code text;
begin
  -- Generate a new code when no code was supplied.
  if new.attendance_code is null
     or btrim(new.attendance_code) = '' then

    new.attendance_code :=
      public.generate_rsvp_attendance_code();

    return new;
  end if;

  -- Convert to uppercase first, then remove separators.
  -- This allows inputs such as:
  -- ptp-7kqm-9x2h
  -- PTP 7KQM 9X2H
  -- 7kqm9x2h
  normalized_code :=
    regexp_replace(
      upper(new.attendance_code),
      '[^A-Z0-9]',
      '',
      'g'
    );

  -- Remove the optional PTP prefix.
  if left(normalized_code, 3) = 'PTP' then
    normalized_code := substr(normalized_code, 4);
  end if;

  if char_length(normalized_code) <> 8
     or normalized_code !~ '^[A-HJ-NP-Z2-9]{8}$' then
    raise exception
      'Invalid attendance code format. Expected PTP-XXXX-XXXX.';
  end if;

  new.attendance_code :=
    'PTP-' ||
    substr(normalized_code, 1, 4) ||
    '-' ||
    substr(normalized_code, 5, 4);

  return new;
end;
$_$;


ALTER FUNCTION "public"."set_rsvp_attendance_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_attendance_from_rsvp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  /*
   * When an RSVP becomes registered,
   * ensure that exactly one pending attendance
   * record exists for that registration.
   */
  if new.status::text = 'registered' then

    insert into public.attendance (
      rsvp_id,
      event_municipality_id,
      user_id
    )
    values (
      new.id,
      new.event_municipality_id,
      new.user_id
    )
    on conflict do nothing;

  /*
   * If a registration is cancelled before
   * successful attendance, remove only its
   * still-pending attendance placeholder.
   *
   * Never delete present or absent history.
   */
  elsif new.status::text = 'cancelled' then

    delete from public.attendance
    where rsvp_id = new.id
      and status::text = 'pending';

  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_attendance_from_rsvp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_event_statuses"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  /*
   * 1. Automatic event lifecycle.
   *
   * draft      = protected
   * cancelled  = protected
   *
   * upcoming -> ongoing -> completed
   */
  update public.events
  set status =
    case
      when end_at <= now()
        then 'completed'

      when start_at <= now()
        and end_at > now()
        then 'ongoing'

      when start_at > now()
        then 'upcoming'

      else status
    end
  where status in (
    'upcoming',
    'ongoing'
  )
  and start_at is not null
  and end_at is not null
  and status is distinct from (
    case
      when end_at <= now()
        then 'completed'

      when start_at <= now()
        and end_at > now()
        then 'ongoing'

      when start_at > now()
        then 'upcoming'

      else status
    end
  );

  /*
   * 2. Automatically close municipal registration
   *    once the provincial event is no longer upcoming.
   */
  update public.event_municipalities as em
  set
    registration_open = false,
    updated_at = now()
  from public.events as e
  where em.event_id = e.id
    and em.registration_open = true
    and e.status in (
      'ongoing',
      'completed',
      'cancelled'
    );
end;
$$;


ALTER FUNCTION "public"."sync_event_statuses"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_event_staff_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  target_staff record;
  assigning_admin record;
  target_event record;
begin
  if tg_op = 'UPDATE' then
    if new.event_municipality_id <> old.event_municipality_id then
      raise exception
        'The municipal event of an existing staff assignment cannot be changed.';
    end if;

    if new.staff_id <> old.staff_id then
      raise exception
        'The Event Staff account of an existing assignment cannot be changed.';
    end if;

    if new.assigned_by <> old.assigned_by then
      raise exception
        'The administrator of an existing assignment cannot be changed.';
    end if;
  end if;

  if tg_op = 'INSERT' and new.status <> 'active' then
    raise exception
      'A new Event Staff assignment must be active.';
  end if;

  select
    em.id,
    em.municipality,
    em.municipal_status
  into target_event
  from public.event_municipalities em
  where em.id = new.event_municipality_id;

  if not found then
    raise exception
      'The municipal event assignment could not be found.';
  end if;

  select
    p.id,
    p.role,
    p.verification_status,
    p.municipality
  into target_staff
  from public.profiles p
  where p.id = new.staff_id;

  if not found then
    raise exception
      'The Event Staff profile could not be found.';
  end if;

  if target_staff.role <> 'event_staff' then
    raise exception
      'Only an Event Staff account can be assigned to an event.';
  end if;

  if lower(trim(coalesce(target_staff.municipality, '')))
    <> lower(trim(coalesce(target_event.municipality, '')))
  then
    raise exception
      'Event Staff must belong to the same municipality as the event.';
  end if;

  select
    p.id,
    p.role,
    p.verification_status,
    p.municipality
  into assigning_admin
  from public.profiles p
  where p.id = new.assigned_by;

  if not found then
    raise exception
      'The assigning administrator profile could not be found.';
  end if;

  if assigning_admin.role <> 'municipal_admin'
    or assigning_admin.verification_status <> 'approved'
  then
    raise exception
      'Only an approved Municipal Administrator can assign Event Staff.';
  end if;

  if lower(trim(coalesce(assigning_admin.municipality, '')))
    <> lower(trim(coalesce(target_event.municipality, '')))
  then
    raise exception
      'The Municipal Administrator can only manage assignments in their municipality.';
  end if;

  if new.status = 'active' then
    if lower(trim(coalesce(target_event.municipal_status, '')))
      <> 'prepared'
    then
      raise exception
        'Event Staff can only be assigned to a prepared municipal event.';
    end if;

    if target_staff.verification_status <> 'approved' then
      raise exception
        'Only an approved Event Staff account can be assigned.';
    end if;

    new.removed_at := null;

    if tg_op = 'UPDATE'
      and old.status = 'removed'
    then
      new.assigned_at := now();
    end if;
  else
    new.removed_at :=
      coalesce(new.removed_at, now());
  end if;

  new.updated_at := now();

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_event_staff_assignment"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rsvp_id" "uuid",
    "event_municipality_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "public"."attendance_status" DEFAULT 'pending'::"public"."attendance_status" NOT NULL,
    "method" "public"."attendance_method",
    "checked_in_at" timestamp with time zone,
    "checked_in_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "checked_out_at" timestamp with time zone,
    "checked_out_by" "uuid"
);


ALTER TABLE "public"."attendance" OWNER TO "postgres";


COMMENT ON COLUMN "public"."attendance"."checked_out_at" IS 'Database-recorded participant check-out/time-out timestamp.';



COMMENT ON COLUMN "public"."attendance"."checked_out_by" IS 'Authenticated staff or municipal administrator who recorded check-out.';



CREATE TABLE IF NOT EXISTS "public"."event_municipalities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "municipality" "text" NOT NULL,
    "municipal_status" "public"."municipal_event_status" DEFAULT 'pending'::"public"."municipal_event_status" NOT NULL,
    "local_venue_id" "uuid",
    "local_instructions" "text",
    "registration_open" boolean DEFAULT false NOT NULL,
    "prepared_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "preparation_status" "text" DEFAULT 'pending'::"text",
    "check_in_opened_at" timestamp with time zone,
    "check_in_closed_at" timestamp with time zone,
    "check_in_opened_by" "uuid",
    "check_in_closed_by" "uuid",
    "check_out_opened_at" timestamp with time zone,
    "check_out_closed_at" timestamp with time zone,
    "check_out_opened_by" "uuid",
    "check_out_closed_by" "uuid",
    CONSTRAINT "event_municipalities_preparation_status_check" CHECK (("preparation_status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'ready'::"text"])))
);


ALTER TABLE "public"."event_municipalities" OWNER TO "postgres";


COMMENT ON COLUMN "public"."event_municipalities"."check_in_opened_at" IS 'Time when event staff opened attendance check-in.';



COMMENT ON COLUMN "public"."event_municipalities"."check_in_closed_at" IS 'Time when event staff closed attendance check-in.';



COMMENT ON COLUMN "public"."event_municipalities"."check_in_opened_by" IS 'Authenticated user who opened attendance check-in.';



COMMENT ON COLUMN "public"."event_municipalities"."check_in_closed_by" IS 'Authenticated user who closed attendance check-in.';



CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone NOT NULL,
    "memo_url" "text",
    "memo_filename" "text",
    "created_by" "uuid",
    "status" "public"."event_status" DEFAULT 'draft'::"public"."event_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "memo_uploaded_at" timestamp with time zone,
    CONSTRAINT "events_end_after_start" CHECK (("end_at" > "start_at"))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rsvps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_municipality_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "municipality" "text" NOT NULL,
    "qr_token" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "status" "public"."rsvp_status" DEFAULT 'registered'::"public"."rsvp_status" NOT NULL,
    "registered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "attendance_code" "text" NOT NULL,
    CONSTRAINT "rsvps_attendance_code_format_check" CHECK (("attendance_code" ~ '^PTP-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'::"text"))
);


ALTER TABLE "public"."rsvps" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."certificate_eligibility" WITH ("security_invoker"='true') AS
 SELECT "a"."id" AS "attendance_id",
    "a"."rsvp_id",
    "r"."user_id",
    "r"."event_municipality_id",
    "em"."event_id",
    "a"."status" AS "attendance_status",
    "a"."checked_in_at",
    "a"."checked_out_at",
    "e"."title" AS "event_title",
    "e"."start_at",
    "e"."end_at",
    "e"."status" AS "event_status",
    (("a"."status" = 'present'::"public"."attendance_status") AND ("a"."checked_in_at" IS NOT NULL) AND ("a"."checked_out_at" IS NOT NULL) AND ("e"."status" <> 'cancelled'::"public"."event_status") AND ("now"() >= "e"."end_at")) AS "certificate_eligible"
   FROM ((("public"."attendance" "a"
     JOIN "public"."rsvps" "r" ON (("r"."id" = "a"."rsvp_id")))
     JOIN "public"."event_municipalities" "em" ON (("em"."id" = "r"."event_municipality_id")))
     JOIN "public"."events" "e" ON (("e"."id" = "em"."event_id")));


ALTER VIEW "public"."certificate_eligibility" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."certificate_serial_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."certificate_serial_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_notification_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_municipality_id" "uuid" NOT NULL,
    "participant_id" "uuid" NOT NULL,
    "notification_type" "text" NOT NULL,
    "notification_key" "text" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "resend_email_id" "text",
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    "provider" "text" DEFAULT 'brevo'::"text" NOT NULL,
    "provider_message_id" "text",
    CONSTRAINT "email_notification_deliveries_notification_type_check" CHECK (("notification_type" = ANY (ARRAY['registration_open'::"text", 'local_instructions_updated'::"text", 'venue_updated'::"text"]))),
    CONSTRAINT "email_notification_deliveries_provider_check" CHECK (("provider" = ANY (ARRAY['resend'::"text", 'brevo'::"text"]))),
    CONSTRAINT "email_notification_deliveries_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."email_notification_deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_certificate_signatories" (
    "event_id" "uuid" NOT NULL,
    "position" smallint NOT NULL,
    "name" "text" NOT NULL,
    "title" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "event_certificate_signatories_name_check" CHECK (("length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "event_certificate_signatories_position_check" CHECK ((("position" >= 1) AND ("position" <= 3))),
    CONSTRAINT "event_certificate_signatories_title_check" CHECK (("length"(TRIM(BOTH FROM "title")) > 0))
);


ALTER TABLE "public"."event_certificate_signatories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_email_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "notification_type" "text" DEFAULT 'event_published'::"text" NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "total_recipients" integer DEFAULT 0 NOT NULL,
    "sent_count" integer DEFAULT 0 NOT NULL,
    "failed_count" integer DEFAULT 0 NOT NULL,
    "failed_messages" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    CONSTRAINT "event_email_deliveries_failed_count_check" CHECK (("failed_count" >= 0)),
    CONSTRAINT "event_email_deliveries_sent_count_check" CHECK (("sent_count" >= 0)),
    CONSTRAINT "event_email_deliveries_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'completed'::"text", 'partial'::"text", 'failed'::"text"]))),
    CONSTRAINT "event_email_deliveries_total_recipients_check" CHECK (("total_recipients" >= 0))
);


ALTER TABLE "public"."event_email_deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_memos" (
    "id" bigint NOT NULL,
    "event_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_path" "text",
    "file_size" bigint,
    "file_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_memos" OWNER TO "postgres";


ALTER TABLE "public"."event_memos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."event_memos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."event_staff_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_municipality_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "assigned_by" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "removed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "event_staff_assignments_removed_at_check" CHECK (((("status" = 'active'::"text") AND ("removed_at" IS NULL)) OR (("status" = 'removed'::"text") AND ("removed_at" IS NOT NULL)))),
    CONSTRAINT "event_staff_assignments_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'removed'::"text"])))
);


ALTER TABLE "public"."event_staff_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_id" "uuid",
    "event_municipality_id" "uuid",
    "type" "public"."notification_type" DEFAULT 'system'::"public"."notification_type" NOT NULL,
    "title" "text" DEFAULT 'Notification'::"text" NOT NULL,
    "message" "text" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dedupe_key" "text"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'participant'::"public"."user_role" NOT NULL,
    "municipality" "text",
    "verification_status" "public"."verification_status" DEFAULT 'approved'::"public"."verification_status" NOT NULL,
    "proof_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "participant_category" "text",
    "participant_category_other" "text",
    CONSTRAINT "profiles_participant_category_check" CHECK ((("participant_category" IS NULL) OR ("participant_category" = ANY (ARRAY['farmer'::"text", 'fisherman'::"text", 'senior_citizen'::"text", '4ps'::"text", 'others'::"text"])))),
    CONSTRAINT "profiles_participant_category_other_check" CHECK (((("participant_category" = 'others'::"text") AND (NULLIF(TRIM(BOTH FROM "participant_category_other"), ''::"text") IS NOT NULL) AND ("char_length"(TRIM(BOTH FROM "participant_category_other")) <= 100)) OR (("participant_category" IS DISTINCT FROM 'others'::"text") AND ("participant_category_other" IS NULL)))),
    CONSTRAINT "profiles_participant_category_role_check" CHECK ((("role" = 'participant'::"public"."user_role") OR (("participant_category" IS NULL) AND ("participant_category_other" IS NULL))))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_municipality_id" "uuid" NOT NULL,
    "submitted_by" "uuid",
    "summary" "text",
    "total_registered" integer DEFAULT 0 NOT NULL,
    "total_present" integer DEFAULT 0 NOT NULL,
    "total_absent" integer DEFAULT 0 NOT NULL,
    "attendance_rate" numeric(5,2) DEFAULT 0 NOT NULL,
    "report_url" "text",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_email_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_staff_assignment_id" "uuid" NOT NULL,
    "event_municipality_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "notification_type" "text" NOT NULL,
    "notification_key" "text" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "provider" "text" DEFAULT 'brevo'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "provider_message_id" "text",
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    CONSTRAINT "staff_email_deliveries_notification_type_check" CHECK (("notification_type" = ANY (ARRAY['event_staff_assigned'::"text", 'event_staff_removed'::"text", 'event_staff_event_updated'::"text"]))),
    CONSTRAINT "staff_email_deliveries_provider_check" CHECK (("provider" = 'brevo'::"text")),
    CONSTRAINT "staff_email_deliveries_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."staff_email_deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."venues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "venue_name" "text" NOT NULL,
    "municipality" "text" NOT NULL,
    "capacity" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    CONSTRAINT "venues_status_check" CHECK (("lower"(TRIM(BOTH FROM "status")) = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."venues" OWNER TO "postgres";


ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_event_municipality_id_user_id_key" UNIQUE ("event_municipality_id", "user_id");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_certificate_number_key" UNIQUE ("certificate_number");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_one_per_attendance" UNIQUE ("attendance_id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_one_per_participant_per_event" UNIQUE ("event_id", "user_id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_notification_deliveries"
    ADD CONSTRAINT "email_notification_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_notification_deliveries"
    ADD CONSTRAINT "email_notification_deliveries_unique" UNIQUE ("event_municipality_id", "participant_id", "notification_type", "notification_key");



ALTER TABLE ONLY "public"."event_certificate_signatories"
    ADD CONSTRAINT "event_certificate_signatories_pkey" PRIMARY KEY ("event_id", "position");



ALTER TABLE ONLY "public"."event_email_deliveries"
    ADD CONSTRAINT "event_email_deliveries_event_id_notification_type_key" UNIQUE ("event_id", "notification_type");



ALTER TABLE ONLY "public"."event_email_deliveries"
    ADD CONSTRAINT "event_email_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_memos"
    ADD CONSTRAINT "event_memos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_municipalities"
    ADD CONSTRAINT "event_municipalities_event_id_municipality_key" UNIQUE ("event_id", "municipality");



ALTER TABLE ONLY "public"."event_municipalities"
    ADD CONSTRAINT "event_municipalities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_staff_assignments"
    ADD CONSTRAINT "event_staff_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_staff_assignments"
    ADD CONSTRAINT "event_staff_assignments_unique" UNIQUE ("event_municipality_id", "staff_id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_event_municipality_id_key" UNIQUE ("event_municipality_id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rsvps"
    ADD CONSTRAINT "rsvps_event_municipality_id_user_id_key" UNIQUE ("event_municipality_id", "user_id");



ALTER TABLE ONLY "public"."rsvps"
    ADD CONSTRAINT "rsvps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rsvps"
    ADD CONSTRAINT "rsvps_qr_token_key" UNIQUE ("qr_token");



ALTER TABLE ONLY "public"."staff_email_deliveries"
    ADD CONSTRAINT "staff_email_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_email_deliveries"
    ADD CONSTRAINT "staff_email_deliveries_unique" UNIQUE ("event_staff_assignment_id", "notification_type", "notification_key");



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "attendance_one_record_per_rsvp_idx" ON "public"."attendance" USING "btree" ("rsvp_id");



CREATE UNIQUE INDEX "attendance_unique_event_user_idx" ON "public"."attendance" USING "btree" ("event_municipality_id", "user_id");



CREATE UNIQUE INDEX "attendance_unique_rsvp_idx" ON "public"."attendance" USING "btree" ("rsvp_id");



CREATE UNIQUE INDEX "certificates_certificate_number_unique" ON "public"."certificates" USING "btree" ("certificate_number");



CREATE UNIQUE INDEX "certificates_one_per_user_per_event" ON "public"."certificates" USING "btree" ("event_id", "user_id");



CREATE INDEX "email_notification_deliveries_event_municipality_idx" ON "public"."email_notification_deliveries" USING "btree" ("event_municipality_id");



CREATE INDEX "email_notification_deliveries_participant_idx" ON "public"."email_notification_deliveries" USING "btree" ("participant_id");



CREATE INDEX "email_notification_deliveries_type_idx" ON "public"."email_notification_deliveries" USING "btree" ("notification_type");



CREATE INDEX "event_memos_event_id_idx" ON "public"."event_memos" USING "btree" ("event_id");



CREATE INDEX "event_staff_assignments_active_staff_idx" ON "public"."event_staff_assignments" USING "btree" ("staff_id", "event_municipality_id") WHERE ("status" = 'active'::"text");



CREATE INDEX "event_staff_assignments_event_municipality_id_idx" ON "public"."event_staff_assignments" USING "btree" ("event_municipality_id");



CREATE INDEX "event_staff_assignments_staff_id_idx" ON "public"."event_staff_assignments" USING "btree" ("staff_id");



CREATE INDEX "notifications_event_id_idx" ON "public"."notifications" USING "btree" ("event_id");



CREATE INDEX "notifications_event_municipality_id_idx" ON "public"."notifications" USING "btree" ("event_municipality_id");



CREATE INDEX "notifications_user_created_at_idx" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "notifications_user_dedupe_key_unique" ON "public"."notifications" USING "btree" ("user_id", "dedupe_key") WHERE ("dedupe_key" IS NOT NULL);



CREATE UNIQUE INDEX "rsvps_attendance_code_unique_idx" ON "public"."rsvps" USING "btree" ("attendance_code");



CREATE INDEX "staff_email_deliveries_assignment_idx" ON "public"."staff_email_deliveries" USING "btree" ("event_staff_assignment_id");



CREATE INDEX "staff_email_deliveries_event_idx" ON "public"."staff_email_deliveries" USING "btree" ("event_municipality_id");



CREATE INDEX "staff_email_deliveries_staff_idx" ON "public"."staff_email_deliveries" USING "btree" ("staff_id");



CREATE INDEX "staff_email_deliveries_status_idx" ON "public"."staff_email_deliveries" USING "btree" ("status");



CREATE UNIQUE INDEX "venues_municipality_normalized_name_unique" ON "public"."venues" USING "btree" ("lower"("btrim"("municipality")), "lower"("regexp_replace"("btrim"("venue_name"), '[[:space:]]+'::"text", ' '::"text", 'g'::"text")));



CREATE OR REPLACE TRIGGER "auto_close_event_check_in_trigger" AFTER UPDATE OF "status" ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."auto_close_event_check_in"();



CREATE OR REPLACE TRIGGER "notify_municipal_admin_on_event_assignment" AFTER INSERT ON "public"."event_municipalities" FOR EACH ROW EXECUTE FUNCTION "public"."notify_municipal_admin_on_event_assignment"();



CREATE OR REPLACE TRIGGER "notify_municipal_admins_on_event_change" AFTER UPDATE OF "title", "description", "start_at", "end_at", "memo_url", "memo_filename", "memo_uploaded_at", "status" ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."notify_municipal_admins_on_event_change"();



CREATE OR REPLACE TRIGGER "notify_municipal_admins_when_event_published" AFTER UPDATE OF "status" ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."notify_municipal_admins_when_event_published"();



CREATE OR REPLACE TRIGGER "notify_participant_on_attendance_result_trigger" AFTER INSERT OR UPDATE OF "status" ON "public"."attendance" FOR EACH ROW EXECUTE FUNCTION "public"."notify_participant_on_attendance_result"();



CREATE OR REPLACE TRIGGER "notify_participant_on_registration_trigger" AFTER INSERT OR UPDATE OF "status" ON "public"."rsvps" FOR EACH ROW EXECUTE FUNCTION "public"."notify_participant_on_registration"();



CREATE OR REPLACE TRIGGER "notify_participants_on_event_change_trigger" AFTER UPDATE OF "title", "description", "start_at", "end_at", "memo_url", "memo_filename", "memo_uploaded_at", "status" ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."notify_participants_on_event_change"();



CREATE OR REPLACE TRIGGER "notify_participants_when_registration_opens_trigger" AFTER INSERT OR UPDATE OF "municipal_status", "registration_open" ON "public"."event_municipalities" FOR EACH ROW EXECUTE FUNCTION "public"."notify_participants_when_registration_opens"();



CREATE OR REPLACE TRIGGER "notify_provincial_preparation_status" AFTER UPDATE ON "public"."event_municipalities" FOR EACH ROW EXECUTE FUNCTION "public"."notify_provincial_on_preparation_update"();



CREATE OR REPLACE TRIGGER "prevent_cancelled_event_rsvp_insert" BEFORE INSERT ON "public"."rsvps" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_cancelled_event_registration"();



CREATE OR REPLACE TRIGGER "prevent_cancelled_event_rsvp_update" BEFORE UPDATE OF "status", "event_municipality_id" ON "public"."rsvps" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_cancelled_event_registration"();



CREATE OR REPLACE TRIGGER "protect_attendance_check_in_trigger" BEFORE INSERT OR UPDATE OF "status", "checked_in_at" ON "public"."attendance" FOR EACH ROW EXECUTE FUNCTION "public"."protect_attendance_check_in"();



CREATE OR REPLACE TRIGGER "protect_attendance_check_out_trigger" BEFORE INSERT OR UPDATE OF "checked_out_at", "checked_out_by" ON "public"."attendance" FOR EACH ROW EXECUTE FUNCTION "public"."protect_attendance_check_out"();



CREATE OR REPLACE TRIGGER "protect_check_in_control_fields_trigger" BEFORE UPDATE OF "check_in_opened_at", "check_in_closed_at", "check_in_opened_by", "check_in_closed_by" ON "public"."event_municipalities" FOR EACH ROW EXECUTE FUNCTION "public"."protect_check_in_control_fields"();



CREATE OR REPLACE TRIGGER "protect_event_schedule_from_venue_conflicts_trigger" BEFORE UPDATE OF "start_at", "end_at", "status" ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."protect_event_schedule_from_venue_conflicts"();



CREATE OR REPLACE TRIGGER "protect_inactive_local_venue_trigger" BEFORE INSERT OR UPDATE OF "local_venue_id" ON "public"."event_municipalities" FOR EACH ROW EXECUTE FUNCTION "public"."protect_inactive_local_venue"();



CREATE OR REPLACE TRIGGER "protect_local_venue_capacity_trigger" BEFORE INSERT OR UPDATE OF "local_venue_id" ON "public"."event_municipalities" FOR EACH ROW EXECUTE FUNCTION "public"."protect_local_venue_capacity"();



CREATE OR REPLACE TRIGGER "protect_local_venue_schedule_trigger" BEFORE INSERT OR UPDATE OF "local_venue_id", "event_id" ON "public"."event_municipalities" FOR EACH ROW EXECUTE FUNCTION "public"."protect_local_venue_schedule"();



CREATE OR REPLACE TRIGGER "protect_municipal_preparation_lifecycle_trigger" BEFORE UPDATE OF "municipal_status", "preparation_status", "local_venue_id", "local_instructions", "registration_open", "prepared_by" ON "public"."event_municipalities" FOR EACH ROW EXECUTE FUNCTION "public"."protect_municipal_preparation_lifecycle"();



CREATE OR REPLACE TRIGGER "protect_profile_authorization_fields_trigger" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_profile_authorization_fields"();



CREATE OR REPLACE TRIGGER "protect_rsvp_venue_capacity_trigger" BEFORE INSERT OR UPDATE OF "event_municipality_id", "status" ON "public"."rsvps" FOR EACH ROW EXECUTE FUNCTION "public"."protect_rsvp_venue_capacity"();



CREATE OR REPLACE TRIGGER "protect_venue_from_unsafe_delete_trigger" BEFORE DELETE ON "public"."venues" FOR EACH ROW EXECUTE FUNCTION "public"."protect_venue_from_unsafe_delete"();



CREATE OR REPLACE TRIGGER "set_rsvp_attendance_code_trigger" BEFORE INSERT OR UPDATE OF "attendance_code" ON "public"."rsvps" FOR EACH ROW EXECUTE FUNCTION "public"."set_rsvp_attendance_code"();



CREATE OR REPLACE TRIGGER "sync_attendance_from_rsvp_trigger" AFTER INSERT OR UPDATE OF "status" ON "public"."rsvps" FOR EACH ROW EXECUTE FUNCTION "public"."sync_attendance_from_rsvp"();



CREATE OR REPLACE TRIGGER "update_attendance_updated_at" BEFORE UPDATE ON "public"."attendance" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_event_municipalities_updated_at" BEFORE UPDATE ON "public"."event_municipalities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_events_updated_at" BEFORE UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reports_updated_at" BEFORE UPDATE ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_venues_updated_at" BEFORE UPDATE ON "public"."venues" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_checked_in_by_fkey" FOREIGN KEY ("checked_in_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_event_municipality_id_fkey" FOREIGN KEY ("event_municipality_id") REFERENCES "public"."event_municipalities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_rsvp_id_fkey" FOREIGN KEY ("rsvp_id") REFERENCES "public"."rsvps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."email_notification_deliveries"
    ADD CONSTRAINT "email_notification_deliveries_event_municipality_id_fkey" FOREIGN KEY ("event_municipality_id") REFERENCES "public"."event_municipalities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_notification_deliveries"
    ADD CONSTRAINT "email_notification_deliveries_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_certificate_signatories"
    ADD CONSTRAINT "event_certificate_signatories_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_email_deliveries"
    ADD CONSTRAINT "event_email_deliveries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_memos"
    ADD CONSTRAINT "event_memos_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_municipalities"
    ADD CONSTRAINT "event_municipalities_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_municipalities"
    ADD CONSTRAINT "event_municipalities_local_venue_id_fkey" FOREIGN KEY ("local_venue_id") REFERENCES "public"."venues"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_municipalities"
    ADD CONSTRAINT "event_municipalities_prepared_by_fkey" FOREIGN KEY ("prepared_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_staff_assignments"
    ADD CONSTRAINT "event_staff_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."event_staff_assignments"
    ADD CONSTRAINT "event_staff_assignments_event_municipality_id_fkey" FOREIGN KEY ("event_municipality_id") REFERENCES "public"."event_municipalities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_staff_assignments"
    ADD CONSTRAINT "event_staff_assignments_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_event_municipality_id_fkey" FOREIGN KEY ("event_municipality_id") REFERENCES "public"."event_municipalities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_event_municipality_id_fkey" FOREIGN KEY ("event_municipality_id") REFERENCES "public"."event_municipalities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rsvps"
    ADD CONSTRAINT "rsvps_event_municipality_id_fkey" FOREIGN KEY ("event_municipality_id") REFERENCES "public"."event_municipalities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rsvps"
    ADD CONSTRAINT "rsvps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_email_deliveries"
    ADD CONSTRAINT "staff_email_deliveries_event_municipality_id_fkey" FOREIGN KEY ("event_municipality_id") REFERENCES "public"."event_municipalities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_email_deliveries"
    ADD CONSTRAINT "staff_email_deliveries_event_staff_assignment_id_fkey" FOREIGN KEY ("event_staff_assignment_id") REFERENCES "public"."event_staff_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_email_deliveries"
    ADD CONSTRAINT "staff_email_deliveries_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



CREATE POLICY "Approved municipal admins can update own events" ON "public"."event_municipalities" FOR UPDATE TO "authenticated" USING (("public"."can_manage_municipal_event"("id") AND ("public"."get_current_user_role"() = 'municipal_admin'::"text"))) WITH CHECK ("public"."is_approved_municipal_admin_for_municipality"("municipality"));



CREATE POLICY "Approved municipal admins can update own profile settings" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("id" = "auth"."uid"()) AND (("role")::"text" = 'municipal_admin'::"text") AND (("verification_status")::"text" = 'approved'::"text"))) WITH CHECK ((("id" = "auth"."uid"()) AND (("role")::"text" = 'municipal_admin'::"text") AND (("verification_status")::"text" = 'approved'::"text")));



CREATE POLICY "Approved provincial admins can view email delivery status" ON "public"."event_email_deliveries" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'provincial_admin'::"public"."user_role") AND ("profiles"."verification_status" = 'approved'::"public"."verification_status")))));



CREATE POLICY "Authenticated users can view certificate signatories" ON "public"."event_certificate_signatories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Delete event memos" ON "public"."event_memos" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "event_memos"."event_id") AND ("events"."created_by" = "auth"."uid"())))));



CREATE POLICY "Event Staff can view own active assignments" ON "public"."event_staff_assignments" FOR SELECT TO "authenticated" USING ((("staff_id" = "auth"."uid"()) AND ("status" = 'active'::"text")));



CREATE POLICY "Insert event memos" ON "public"."event_memos" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "event_memos"."event_id") AND ("events"."created_by" = "auth"."uid"())))));



CREATE POLICY "Municipal Admins can view municipality staff assignments" ON "public"."event_staff_assignments" FOR SELECT TO "authenticated" USING ((("public"."get_current_user_role"() = 'municipal_admin'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."event_municipalities" "em"
  WHERE (("em"."id" = "event_staff_assignments"."event_municipality_id") AND ("lower"(TRIM(BOTH FROM "em"."municipality")) = "lower"(TRIM(BOTH FROM "public"."get_current_user_municipality"()))))))));



CREATE POLICY "Municipal admins can add own municipality venues" ON "public"."venues" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'municipal_admin'::"public"."user_role") AND ("p"."municipality" = "venues"."municipality"))))));



CREATE POLICY "Municipal admins can create venues" ON "public"."venues" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND ("public"."get_current_user_role"() = 'municipal_admin'::"text") AND ("municipality" = "public"."get_current_user_municipality"())));



CREATE POLICY "Municipal admins can delete own municipality venues" ON "public"."venues" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'municipal_admin'::"public"."user_role") AND ("p"."municipality" = "venues"."municipality")))));



CREATE POLICY "Municipal admins can update own municipality venues" ON "public"."venues" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'municipal_admin'::"public"."user_role") AND ("p"."municipality" = "venues"."municipality"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'municipal_admin'::"public"."user_role") AND ("p"."municipality" = "venues"."municipality")))));



CREATE POLICY "Municipal admins can view own municipality venues" ON "public"."venues" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'municipal_admin'::"public"."user_role") AND ("p"."municipality" = "venues"."municipality")))));



CREATE POLICY "Participants can create own rsvps" ON "public"."rsvps" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND ("public"."get_current_user_role"() = 'participant'::"text") AND ("municipality" = "public"."get_current_user_municipality"())));



CREATE POLICY "Participants can update own rsvps" ON "public"."rsvps" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Participants can view own attendance" ON "public"."attendance" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Participants can view own certificates" ON "public"."certificates" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Participants can view own rsvps" ON "public"."rsvps" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Provincial Admins can view staff assignments" ON "public"."event_staff_assignments" FOR SELECT TO "authenticated" USING (("public"."get_current_user_role"() = 'provincial_admin'::"text"));



CREATE POLICY "Provincial admins can approve municipal admins" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("public"."get_current_user_role"() = 'provincial_admin'::"text") AND (("role")::"text" = 'municipal_admin'::"text"))) WITH CHECK ((("public"."get_current_user_role"() = 'provincial_admin'::"text") AND (("role")::"text" = 'municipal_admin'::"text")));



CREATE POLICY "Provincial admins can insert event municipalities" ON "public"."event_municipalities" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_current_user_role"() = 'provincial_admin'::"text"));



CREATE POLICY "Provincial admins can insert events" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND ("public"."get_current_user_role"() = 'provincial_admin'::"text")));



CREATE POLICY "Provincial admins can manage certificate signatories" ON "public"."event_certificate_signatories" TO "authenticated" USING (("public"."get_current_user_role"() = 'provincial_admin'::"text")) WITH CHECK (("public"."get_current_user_role"() = 'provincial_admin'::"text"));



CREATE POLICY "Provincial admins can read all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_provincial_admin"());



CREATE POLICY "Provincial admins can securely update events" ON "public"."events" FOR UPDATE TO "authenticated" USING (("public"."get_current_user_role"() = 'provincial_admin'::"text")) WITH CHECK (("public"."get_current_user_role"() = 'provincial_admin'::"text"));



CREATE POLICY "Provincial admins can view certificates" ON "public"."certificates" FOR SELECT TO "authenticated" USING (("public"."get_current_user_role"() = 'provincial_admin'::"text"));



CREATE POLICY "Provincial admins can view municipal admins" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("public"."get_current_user_role"() = 'provincial_admin'::"text"));



CREATE POLICY "Provincial users can delete own notifications" ON "public"."notifications" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Provincial users can update own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Provincial users can view own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Scoped admins and staff can view rsvps" ON "public"."rsvps" FOR SELECT TO "authenticated" USING ("public"."can_manage_municipal_event"("event_municipality_id"));



CREATE POLICY "Scoped staff and admins can view attendance" ON "public"."attendance" FOR SELECT TO "authenticated" USING ("public"."can_manage_municipal_event"("event_municipality_id"));



CREATE POLICY "Scoped staff can insert attendance" ON "public"."attendance" FOR INSERT TO "authenticated" WITH CHECK ((("public"."get_current_user_role"() = ANY (ARRAY['event_staff'::"text", 'municipal_admin'::"text"])) AND ("checked_in_by" = "auth"."uid"()) AND "public"."can_manage_municipal_event"("event_municipality_id")));



CREATE POLICY "Scoped staff can update attendance" ON "public"."attendance" FOR UPDATE TO "authenticated" USING ((("public"."get_current_user_role"() = ANY (ARRAY['event_staff'::"text", 'municipal_admin'::"text"])) AND "public"."can_manage_municipal_event"("event_municipality_id"))) WITH CHECK ((("public"."get_current_user_role"() = ANY (ARRAY['event_staff'::"text", 'municipal_admin'::"text"])) AND "public"."can_manage_municipal_event"("event_municipality_id")));



CREATE POLICY "Scoped staff can view registered participant profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."can_view_participant_profile"("id"));



CREATE POLICY "Update event memos" ON "public"."event_memos" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "event_memos"."event_id") AND ("events"."created_by" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "event_memos"."event_id") AND ("events"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users can view authorized events" ON "public"."events" FOR SELECT TO "authenticated" USING ((("public"."get_current_user_role"() = 'provincial_admin'::"text") OR ("created_by" = "auth"."uid"()) OR ((("status")::"text" <> 'draft'::"text") AND "public"."can_view_event"("id"))));



CREATE POLICY "Users can view authorized municipal events" ON "public"."event_municipalities" FOR SELECT TO "authenticated" USING ("public"."can_view_event_municipality"("id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can view venues by role" ON "public"."venues" FOR SELECT TO "authenticated" USING ((("public"."get_current_user_role"() = 'provincial_admin'::"text") OR ("municipality" = "public"."get_current_user_municipality"())));



CREATE POLICY "View event memos" ON "public"."event_memos" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "event_memos"."event_id") AND (("events"."created_by" = "auth"."uid"()) OR ("events"."status" = 'published'::"public"."event_status"))))));



ALTER TABLE "public"."attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."certificates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_notification_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_certificate_signatories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_email_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_memos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_municipalities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_staff_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rsvps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_email_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."venues" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."event_email_deliveries";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."assert_no_venue_schedule_conflict"("p_event_municipality_id" "uuid", "p_event_id" "uuid", "p_local_venue_id" "uuid", "p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone, "p_event_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."assert_no_venue_schedule_conflict"("p_event_municipality_id" "uuid", "p_event_id" "uuid", "p_local_venue_id" "uuid", "p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone, "p_event_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assert_no_venue_schedule_conflict"("p_event_municipality_id" "uuid", "p_event_id" "uuid", "p_local_venue_id" "uuid", "p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone, "p_event_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_close_event_check_in"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_close_event_check_in"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_close_event_check_in"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_manage_municipal_event"("p_event_municipality_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_municipal_event"("p_event_municipality_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_municipal_event"("p_event_municipality_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_view_event"("p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_view_event"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view_event"("p_event_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_view_event_municipality"("p_event_municipality_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_view_event_municipality"("p_event_municipality_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view_event_municipality"("p_event_municipality_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_view_participant_profile"("p_profile_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_view_participant_profile"("p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view_participant_profile"("p_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_local_venue_schedule_conflict"("p_event_municipality_id" "uuid", "p_event_id" "uuid", "p_local_venue_id" "uuid", "p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."check_local_venue_schedule_conflict"("p_event_municipality_id" "uuid", "p_event_id" "uuid", "p_local_venue_id" "uuid", "p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_local_venue_schedule_conflict"("p_event_municipality_id" "uuid", "p_event_id" "uuid", "p_local_venue_id" "uuid", "p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."close_event_check_in"("p_event_municipality_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."close_event_check_in"("p_event_municipality_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."close_event_check_in"("p_event_municipality_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."close_event_check_in"("p_event_municipality_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."close_event_check_out"("p_event_municipality_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."close_event_check_out"("p_event_municipality_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."close_event_check_out"("p_event_municipality_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."close_event_check_out"("p_event_municipality_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_municipal_event_reminders"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_municipal_event_reminders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_municipal_event_reminders"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_notification_once"("p_user_id" "uuid", "p_event_id" "uuid", "p_event_municipality_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_dedupe_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_notification_once"("p_user_id" "uuid", "p_event_id" "uuid", "p_event_municipality_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_dedupe_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."event_staff_can_view_event"("p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."event_staff_can_view_event"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."event_staff_can_view_event"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."event_staff_can_view_event"("p_event_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."finalize_ended_event_attendance"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finalize_ended_event_attendance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_rsvp_attendance_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_rsvp_attendance_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_rsvp_attendance_code"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_current_user_municipality"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_current_user_municipality"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_municipality"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_municipality"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_municipal_attendance"("p_event_municipality_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_municipal_attendance"("p_event_municipality_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_municipal_attendance"("p_event_municipality_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_municipal_registrations"("p_event_municipality_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_municipal_registrations"("p_event_municipality_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_municipal_registrations"("p_event_municipality_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_certificate"("p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_certificate"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_certificate"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_certificate"("p_event_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_certificate_events"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_certificate_events"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_certificate_events"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_certificate_events"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_municipality"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_municipality"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_municipality"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_participant_event_capacity_status"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_participant_event_capacity_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_participant_event_capacity_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_participant_event_capacity_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_approved_event_staff_for_municipality"("p_municipality" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_approved_event_staff_for_municipality"("p_municipality" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_approved_event_staff_for_municipality"("p_municipality" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_approved_event_staff_for_municipality"("p_municipality" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_approved_municipal_admin_for_municipality"("p_municipality" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_approved_municipal_admin_for_municipality"("p_municipality" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_approved_municipal_admin_for_municipality"("p_municipality" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_provincial_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_provincial_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_provincial_admin"() TO "service_role";



GRANT ALL ON TABLE "public"."certificates" TO "anon";
GRANT ALL ON TABLE "public"."certificates" TO "authenticated";
GRANT ALL ON TABLE "public"."certificates" TO "service_role";



REVOKE ALL ON FUNCTION "public"."issue_my_certificate"("p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."issue_my_certificate"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."issue_my_certificate"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."issue_my_certificate"("p_event_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."issue_my_event_certificate"("p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."issue_my_event_certificate"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."issue_my_event_certificate"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."issue_my_event_certificate"("p_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_municipal_admin_on_event_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_municipal_admin_on_event_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_municipal_admin_on_event_assignment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_municipal_admins_on_event_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_municipal_admins_on_event_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_municipal_admins_on_event_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_municipal_admins_when_event_published"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_municipal_admins_when_event_published"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_municipal_admins_when_event_published"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_participant_on_attendance_result"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_participant_on_attendance_result"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_participant_on_registration"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_participant_on_registration"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_participants_on_event_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_participants_on_event_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_participants_when_registration_opens"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_participants_when_registration_opens"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_participants_when_registration_opens"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_provincial_on_preparation_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_provincial_on_preparation_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_provincial_on_preparation_update"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."open_event_check_in"("p_event_municipality_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."open_event_check_in"("p_event_municipality_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."open_event_check_in"("p_event_municipality_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."open_event_check_in"("p_event_municipality_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."open_event_check_out"("p_event_municipality_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."open_event_check_out"("p_event_municipality_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."open_event_check_out"("p_event_municipality_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."open_event_check_out"("p_event_municipality_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_cancelled_event_registration"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_cancelled_event_registration"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_cancelled_event_registration"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_attendance_check_out"("p_attendance_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_attendance_check_out"("p_attendance_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_attendance_check_out"("p_attendance_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_attendance_check_out"("p_attendance_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_attendance_check_out_token"("p_event_municipality_id" "uuid", "p_token" "text", "p_method" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_attendance_check_out_token"("p_event_municipality_id" "uuid", "p_token" "text", "p_method" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_attendance_check_out_token"("p_event_municipality_id" "uuid", "p_token" "text", "p_method" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_attendance_check_out_token"("p_event_municipality_id" "uuid", "p_token" "text", "p_method" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_attendance_token"("p_event_municipality_id" "uuid", "p_token" "text", "p_method" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_attendance_token"("p_event_municipality_id" "uuid", "p_token" "text", "p_method" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_attendance_token"("p_event_municipality_id" "uuid", "p_token" "text", "p_method" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_attendance_check_in"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_attendance_check_in"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_attendance_check_in"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_attendance_check_out"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_attendance_check_out"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_attendance_check_out"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_check_in_control_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_check_in_control_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_check_in_control_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_event_schedule_from_venue_conflicts"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_event_schedule_from_venue_conflicts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_event_schedule_from_venue_conflicts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_inactive_local_venue"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_inactive_local_venue"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_inactive_local_venue"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_local_venue_capacity"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_local_venue_capacity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_local_venue_capacity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_local_venue_schedule"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_local_venue_schedule"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_local_venue_schedule"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_municipal_preparation_lifecycle"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_municipal_preparation_lifecycle"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_municipal_preparation_lifecycle"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_profile_authorization_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_profile_authorization_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_profile_authorization_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_rsvp_venue_capacity"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_rsvp_venue_capacity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_rsvp_venue_capacity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_venue_from_unsafe_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_venue_from_unsafe_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_venue_from_unsafe_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_rsvp_attendance_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_rsvp_attendance_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_rsvp_attendance_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_attendance_from_rsvp"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_attendance_from_rsvp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_attendance_from_rsvp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_event_statuses"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_event_statuses"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_event_statuses"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_event_staff_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_event_staff_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_event_staff_assignment"() TO "service_role";
























GRANT ALL ON TABLE "public"."attendance" TO "anon";
GRANT ALL ON TABLE "public"."attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance" TO "service_role";



GRANT ALL ON TABLE "public"."event_municipalities" TO "anon";
GRANT ALL ON TABLE "public"."event_municipalities" TO "authenticated";
GRANT ALL ON TABLE "public"."event_municipalities" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."rsvps" TO "anon";
GRANT ALL ON TABLE "public"."rsvps" TO "authenticated";
GRANT ALL ON TABLE "public"."rsvps" TO "service_role";



GRANT ALL ON TABLE "public"."certificate_eligibility" TO "anon";
GRANT ALL ON TABLE "public"."certificate_eligibility" TO "authenticated";
GRANT ALL ON TABLE "public"."certificate_eligibility" TO "service_role";



GRANT ALL ON SEQUENCE "public"."certificate_serial_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."certificate_serial_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."certificate_serial_seq" TO "service_role";



GRANT ALL ON TABLE "public"."email_notification_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."email_notification_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."email_notification_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."event_certificate_signatories" TO "anon";
GRANT ALL ON TABLE "public"."event_certificate_signatories" TO "authenticated";
GRANT ALL ON TABLE "public"."event_certificate_signatories" TO "service_role";



GRANT ALL ON TABLE "public"."event_email_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."event_email_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."event_email_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."event_memos" TO "anon";
GRANT ALL ON TABLE "public"."event_memos" TO "authenticated";
GRANT ALL ON TABLE "public"."event_memos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."event_memos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."event_memos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."event_memos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."event_staff_assignments" TO "anon";
GRANT ALL ON TABLE "public"."event_staff_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."event_staff_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."staff_email_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."staff_email_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_email_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."venues" TO "anon";
GRANT ALL ON TABLE "public"."venues" TO "authenticated";
GRANT ALL ON TABLE "public"."venues" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Authenticated users can delete official memos"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'official-memos'::text));



  create policy "Authenticated users can upload official memos"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'official-memos'::text));



  create policy "Authenticated users can view official memos"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'official-memos'::text));



  create policy "Owners can delete official memos"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'official-memos'::text) AND (owner_id = ( SELECT (auth.uid())::text AS uid))));
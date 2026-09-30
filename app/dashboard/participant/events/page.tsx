"use client";



import Link from "next/link";

import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";



type EventRow = {

  id: string;

  title: string;

  description: string | null;

  start_at: string | null;

  end_at: string | null;

  memo_url: string | null;

  memo_filename: string | null;

  status: string | null;

  created_at: string;

  audience_type: string | null;

  audience_categories: string[] | null;

  audience_category_other: string | null;

};



type EventCapacityStatus = {

  event_municipality_id: string;

  venue_id: string | null;

  venue_name: string | null;

  venue_capacity: number | null;

  registered_count: number;

  available_slots: number | null;

  is_full: boolean;

};



type OpenEvent = {

  id: string;

  event_id: string;

  municipality: string;

  municipal_status: string | null;

  registration_open: boolean | null;

  local_instructions: string | null;

  created_at: string;

  event: EventRow | null;

  capacity: EventCapacityStatus | null;

};



type RSVP = {

  id: string;

  event_municipality_id: string;

  user_id: string;

  municipality: string;

  status: string | null;

  registered_at: string | null;

};



type EventAssignmentCheck = {

  id: string;

  event_id: string;

  municipality: string;

  municipal_status: string | null;

  registration_open: boolean | null;

};



type EventStatusCheck = {

  id: string;

  title: string;

  status: string | null;

  audience_type: string | null;

  audience_categories: string[] | null;

  audience_category_other: string | null;

};



const REGISTRATION_ALLOWED_EVENT_STATUSES = ["published", "upcoming"];

const EVENTS_PER_PAGE = 5;



function normalizeStatus(value: string | null | undefined) {

  return value?.trim().toLowerCase() ?? "";

}



function normalizeCategory(value: string | null | undefined) {

  return value?.trim().toLowerCase() ?? "";

}



function isAudienceEligible(

  audienceType: string | null | undefined,

  audienceCategories: string[] | null | undefined,

  audienceCategoryOther: string | null | undefined,

  participantCategory: string | null | undefined,

  participantCategoryOther: string | null | undefined,

) {

  const type = audienceType?.trim().toLowerCase();



  if (!type || type === "all") return true;

  if (type !== "categories") return false;



  const participant = normalizeCategory(participantCategory);



  const categoryMatches = Boolean(

    participant &&

      audienceCategories?.some(

        (category) => normalizeCategory(category) === participant,

      ),

  );



  if (!categoryMatches) return false;



  const requiredOther = normalizeCategory(audienceCategoryOther);



  if (!requiredOther || participant !== "others") return true;



  return normalizeCategory(participantCategoryOther) === requiredOther;

}



function getErrorMessage(error: unknown) {

  if (

    typeof error === "object" &&

    error !== null &&

    "message" in error &&

    typeof error.message === "string"

  ) {

    return error.message;

  }



  return "An unexpected registration error occurred.";

}



function getFriendlyRegistrationError(message: string) {

  const normalizedMessage = message.toLowerCase();



  if (

    normalizedMessage.includes("venue capacity has been reached") ||

    normalizedMessage.includes("registration is full")

  ) {

    return "Registration is full. The assigned venue has reached its maximum capacity.";

  }



  if (normalizedMessage.includes("does not have a valid capacity")) {

    return "Registration is temporarily unavailable because the assigned venue does not have a valid capacity.";

  }



  if (

    normalizedMessage.includes("event has been cancelled") ||

    normalizedMessage.includes("cancelled")

  ) {

    return "Registration is no longer allowed because this event has been cancelled.";

  }



  if (

    normalizedMessage.includes("duplicate key") ||

    normalizedMessage.includes("unique constraint") ||

    normalizedMessage.includes("already exists")

  ) {

    return "You are already registered for this event.";

  }



  if (

    normalizedMessage.includes("registration_open") ||

    normalizedMessage.includes("registration is closed")

  ) {

    return "Registration for this event is already closed.";

  }



  if (

    normalizedMessage.includes(

      "not available for your participant category",

    )

  ) {

    return "You are not eligible to register for this event.";

  }



  if (normalizedMessage.includes("row-level security")) {

    return "Registration was rejected. Please refresh the page and check whether the event is still available.";

  }



  return message;

}



function getCapacitySummary(capacity: EventCapacityStatus | null) {

  const venueCapacity = capacity?.venue_capacity ?? null;

  const registeredCount = Math.max(capacity?.registered_count ?? 0, 0);



  const hasConfiguredCapacity =

    typeof venueCapacity === "number" && venueCapacity > 0;



  const calculatedAvailable = hasConfiguredCapacity

    ? Math.max(capacity?.available_slots ?? venueCapacity - registeredCount, 0)

    : null;



  const isFull =

    hasConfiguredCapacity &&

    (capacity?.is_full === true || registeredCount >= venueCapacity);



  return {

    venueName: capacity?.venue_name?.trim() || "Venue to be announced",

    venueCapacity,

    registeredCount,

    availableSlots: calculatedAvailable,

    hasConfiguredCapacity,

    isFull,

  };

}



export default function ParticipantEventsPage() {

  const [userId, setUserId] = useState("");

  const [municipality, setMunicipality] = useState("");

  const [openEvents, setOpenEvents] = useState<OpenEvent[]>([]);

  const [rsvps, setRsvps] = useState<RSVP[]>([]);

  const [loading, setLoading] = useState(true);

  const [registeringId, setRegisteringId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);



  const fetchOpenEvents = useCallback(async (showLoading = true) => {

    if (showLoading) {

      setLoading(true);

    }



    try {

      const {

        data: { user },

        error: userError,

      } = await supabase.auth.getUser();



      if (userError || !user) {

        console.error(userError?.message || "Participant user not found.");

        setUserId("");

        setMunicipality("");

        setOpenEvents([]);

        setRsvps([]);

        return;

      }



      setUserId(user.id);



      const { data: profile, error: profileError } = await supabase

        .from("profiles")

        .select(

          "municipality, participant_category, participant_category_other",

        )

        .eq("id", user.id)

        .maybeSingle();



      if (profileError || !profile?.municipality) {

        console.error(

          profileError?.message || "Participant municipality not found.",

        );

        setMunicipality("");

        setOpenEvents([]);

        setRsvps([]);

        return;

      }



      const participantMunicipality = profile.municipality;

      setMunicipality(participantMunicipality);



      const { data: localEvents, error: localEventsError } = await supabase

        .from("event_municipalities")

        .select(

          `

            id,

            event_id,

            municipality,

            municipal_status,

            registration_open,

            local_instructions,

            created_at

          `,

        )

        .eq("municipality", participantMunicipality)

        .eq("municipal_status", "prepared")

        .eq("registration_open", true)

        .order("created_at", {

          ascending: false,

        });



      if (localEventsError) {

        console.error(localEventsError.message);

        setOpenEvents([]);

        return;

      }



      const { data: rsvpData, error: rsvpError } = await supabase

        .from("rsvps")

        .select(

          `

            id,

            event_municipality_id,

            user_id,

            municipality,

            status,

            registered_at

          `,

        )

        .eq("user_id", user.id);



      const currentRsvps: RSVP[] = rsvpError ? [] : rsvpData || [];



      if (rsvpError) {

        console.error(rsvpError.message);

      }



      setRsvps(currentRsvps);



      if (!localEvents || localEvents.length === 0) {

        setOpenEvents([]);

        return;

      }



      const eventIds = localEvents.map((item) => item.event_id);



      const [eventsResult, capacityResult] = await Promise.all([

        supabase

          .from("events")

          .select(

            `

              id,

              title,

              description,

              start_at,

              end_at,

              memo_url,

              memo_filename,

              status,

              created_at,

              audience_type,

              audience_categories,

              audience_category_other

            `,

          )

          .in("id", eventIds)

          .in("status", REGISTRATION_ALLOWED_EVENT_STATUSES),



        supabase.rpc("get_participant_event_capacity_status"),

      ]);



      if (eventsResult.error) {

        console.error(eventsResult.error.message);

        setOpenEvents([]);

        return;

      }



      let capacityRows: EventCapacityStatus[] = [];



      if (capacityResult.error) {

        console.warn(

          "Participant capacity status unavailable:",

          capacityResult.error.message,

        );

      } else {

        capacityRows = (capacityResult.data || []) as EventCapacityStatus[];

      }



      const capacityByAssignment = new Map(

        capacityRows.map((row) => [String(row.event_municipality_id), row]),

      );



      const mappedEvents: OpenEvent[] = localEvents.map((item) => ({

        ...item,

        event:

          eventsResult.data?.find(

            (event) => String(event.id) === String(item.event_id),

          ) || null,

        capacity: capacityByAssignment.get(String(item.id)) || null,

      }));



      const registeredEventMunicipalityIds = new Set(

        currentRsvps

          .filter((rsvp) => normalizeStatus(rsvp.status) === "registered")

          .map((rsvp) => String(rsvp.event_municipality_id)),

      );



      setOpenEvents(

        mappedEvents.filter((item) => {

          const eventIsValid =

            item.event !== null &&

            normalizeStatus(item.event?.status) !== "cancelled";



          const alreadyRegistered = registeredEventMunicipalityIds.has(

            String(item.id),

          );



          const audienceIsValid = isAudienceEligible(

            item.event?.audience_type,

            item.event?.audience_categories,

            item.event?.audience_category_other,

            profile.participant_category,

            profile.participant_category_other,

          );



          return eventIsValid && audienceIsValid && !alreadyRegistered;

        }),

      );

    } catch (error) {

      console.error("Participant events fetch error:", error);

      setOpenEvents([]);

    } finally {

      if (showLoading) {

        setLoading(false);

      }

    }

  }, []);



  useEffect(() => {

    void fetchOpenEvents(true);



    const refreshSilently = () => {

      void fetchOpenEvents(false);

    };



    const handleVisibilityChange = () => {

      if (document.visibilityState === "visible") {

        refreshSilently();

      }

    };



    const intervalId = window.setInterval(() => {

      if (document.visibilityState === "visible") {

        refreshSilently();

      }

    }, 30000);



    window.addEventListener("focus", refreshSilently);

    document.addEventListener("visibilitychange", handleVisibilityChange);



    return () => {

      window.clearInterval(intervalId);

      window.removeEventListener("focus", refreshSilently);

      document.removeEventListener("visibilitychange", handleVisibilityChange);

    };

  }, [fetchOpenEvents]);



  const openEventIds = useMemo(

    () => openEvents.map((item) => item.id).join("|"),

    [openEvents],

  );



  useEffect(() => {

    setCurrentPage(1);

  }, [openEventIds]);



  const totalPages = Math.max(

    1,

    Math.ceil(openEvents.length / EVENTS_PER_PAGE),

  );



  const paginatedEvents = useMemo(() => {

    const startIndex = (currentPage - 1) * EVENTS_PER_PAGE;

    const endIndex = startIndex + EVENTS_PER_PAGE;



    return openEvents.slice(startIndex, endIndex);

  }, [openEvents, currentPage]);



  const firstVisibleEvent =

    openEvents.length === 0 ? 0 : (currentPage - 1) * EVENTS_PER_PAGE + 1;



  const lastVisibleEvent = Math.min(

    currentPage * EVENTS_PER_PAGE,

    openEvents.length,

  );



  const goToPreviousPage = () => {

    setCurrentPage((page) => Math.max(1, page - 1));

  };



  const goToNextPage = () => {

    setCurrentPage((page) => Math.min(totalPages, page + 1));

  };



  const goToPage = (pageNumber: number) => {

    setCurrentPage(pageNumber);

  };



  const isRegistered = (eventMunicipalityId: string) => {

    return rsvps.some(

      (rsvp) =>

        String(rsvp.event_municipality_id) === String(eventMunicipalityId) &&

        normalizeStatus(rsvp.status) === "registered",

    );

  };



  const handleRegister = async (item: OpenEvent) => {

    if (!userId) {

      alert("User not found. Please log in again.");

      return;

    }



    if (!municipality) {

      alert(

        "Your municipality could not be verified. Please refresh the page.",

      );

      return;

    }



    if (isRegistered(item.id)) {

      alert("You are already registered for this event.");

      return;

    }



    if (getCapacitySummary(item.capacity).isFull) {

      alert(

        "Registration is full. The assigned venue has reached its maximum capacity.",

      );

      await fetchOpenEvents(false);

      return;

    }



    setRegisteringId(item.id);



    try {

      const {

        data: { user },

        error: userError,

      } = await supabase.auth.getUser();



      if (userError || !user) {

        throw new Error("Your login session has expired. Please log in again.");

      }



      if (user.id !== userId) {

        throw new Error(

          "Your account session changed. Please refresh the page before registering.",

        );

      }



      const { data: currentAssignment, error: assignmentError } =

        await supabase

          .from("event_municipalities")

          .select(

            `

              id,

              event_id,

              municipality,

              municipal_status,

              registration_open

            `,

          )

          .eq("id", item.id)

          .maybeSingle<EventAssignmentCheck>();



      if (assignmentError) {

        throw assignmentError;

      }



      if (!currentAssignment) {

        throw new Error("This event assignment is no longer available.");

      }



      if (currentAssignment.municipality !== municipality) {

        throw new Error(

          "You cannot register for an event assigned to another municipality.",

        );

      }



      if (currentAssignment.registration_open !== true) {

        throw new Error("Registration for this event is closed.");

      }



      if (normalizeStatus(currentAssignment.municipal_status) !== "prepared") {

        throw new Error(

          "This event is not yet prepared for participant registration.",

        );

      }



      const { data: currentEvent, error: eventError } = await supabase

        .from("events")

        .select(

          "id, title, status, audience_type, audience_categories, audience_category_other",

        )

        .eq("id", currentAssignment.event_id)

        .maybeSingle<EventStatusCheck>();



      if (eventError) {

        throw eventError;

      }



      if (!currentEvent) {

        throw new Error("This event no longer exists.");

      }



      const { data: currentProfile, error: currentProfileError } =

        await supabase

          .from("profiles")

          .select("participant_category, participant_category_other")

          .eq("id", user.id)

          .maybeSingle();



      if (currentProfileError) {

        throw currentProfileError;

      }



      if (

        !isAudienceEligible(

          currentEvent.audience_type,

          currentEvent.audience_categories,

          currentEvent.audience_category_other,

          currentProfile?.participant_category,

          currentProfile?.participant_category_other,

        )

      ) {

        throw new Error("You are not eligible to register for this event.");

      }



      const currentEventStatus = normalizeStatus(currentEvent.status);



      if (currentEventStatus === "cancelled") {

        throw new Error(

          "Registration is not allowed because this event has been cancelled.",

        );

      }



      if (!REGISTRATION_ALLOWED_EVENT_STATUSES.includes(currentEventStatus)) {

        throw new Error("Registration is no longer available for this event.");

      }



      const { data: existingRsvp, error: existingRsvpError } = await supabase

        .from("rsvps")

        .select("id, status")

        .eq("event_municipality_id", currentAssignment.id)

        .eq("user_id", user.id)

        .eq("status", "registered")

        .limit(1)

        .maybeSingle();



      if (existingRsvpError) {

        throw existingRsvpError;

      }



      if (existingRsvp) {

        await fetchOpenEvents(false);

        throw new Error("You are already registered for this event.");

      }



      const { data: freshCapacityData, error: freshCapacityError } =

        await supabase.rpc("get_participant_event_capacity_status");



      if (freshCapacityError) {

        console.warn(

          "Fresh capacity check unavailable. Database capacity protection will still validate the registration:",

          freshCapacityError.message,

        );

      } else {

        const freshCapacityRows = (freshCapacityData ||

          []) as EventCapacityStatus[];



        const freshCapacity =

          freshCapacityRows.find(

            (row) =>

              String(row.event_municipality_id) ===

              String(currentAssignment.id),

          ) || null;



        if (getCapacitySummary(freshCapacity).isFull) {

          await fetchOpenEvents(false);

          throw new Error(

            "Registration blocked. Venue capacity has been reached.",

          );

        }

      }



      const confirmRegister = window.confirm(

        `Are you sure you want to register for ${

          currentEvent.title || "this event"

        }?`,

      );



      if (!confirmRegister) {

        return;

      }



      const qrToken = [user.id, currentAssignment.id, crypto.randomUUID()].join(

        "-",

      );



      const { error: insertError } = await supabase.from("rsvps").insert({

        event_municipality_id: currentAssignment.id,

        user_id: user.id,

        municipality: currentAssignment.municipality,

        qr_token: qrToken,

        status: "registered",

      });



      if (insertError) {

        throw insertError;

      }



      alert("Registration successful.");

      await fetchOpenEvents(false);

    } catch (error) {

      const message = getErrorMessage(error);

      const friendlyMessage = getFriendlyRegistrationError(message);

      const normalizedFriendlyMessage = friendlyMessage.toLowerCase();



      const expectedValidationError =

        normalizedFriendlyMessage.includes("cancelled") ||

        normalizedFriendlyMessage.includes("closed") ||

        normalizedFriendlyMessage.includes("already registered") ||

        normalizedFriendlyMessage.includes("not eligible") ||

        normalizedFriendlyMessage.includes("not yet prepared") ||

        normalizedFriendlyMessage.includes("no longer available") ||

        normalizedFriendlyMessage.includes("full") ||

        normalizedFriendlyMessage.includes("capacity");



      if (expectedValidationError) {

        console.warn("Registration blocked:", friendlyMessage);

      } else {

        console.error("Participant registration error:", error);

      }



      alert(friendlyMessage);



      if (

        normalizedFriendlyMessage.includes("cancelled") ||

        normalizedFriendlyMessage.includes("closed") ||

        normalizedFriendlyMessage.includes("no longer") ||

        normalizedFriendlyMessage.includes("full") ||

        normalizedFriendlyMessage.includes("capacity")

      ) {

        await fetchOpenEvents(false);

      }

    } finally {

      setRegisteringId(null);

    }

  };



  const formatDateTime = (dateValue: string | null) => {

    if (!dateValue) {

      return "Not set";

    }



    return new Date(dateValue).toLocaleString("en-PH", {

      dateStyle: "medium",

      timeStyle: "short",

    });

  };



  return (

    <main className="p-4 sm:p-6 lg:p-8">

      <div className="mx-auto max-w-7xl space-y-6">

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">

            Participant Events

          </p>



          <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">

            Available Events

          </h1>



          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">

            Browse events currently open for registration in{" "}

            <span className="font-semibold text-slate-900">

              {municipality || "your municipality"}

            </span>

            .

          </p>

        </section>



        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div>

            <h2 className="text-xl font-semibold text-slate-950">

              Open for Registration

            </h2>



            <p className="mt-1 text-sm text-slate-500">

              View the assigned venue and remaining slots before registering for

              an event.

            </p>

          </div>

          <div
            role="note"
            className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3"
          >
            <p className="text-sm leading-6 text-blue-900">
              <span className="font-semibold">After registering:</span> go to
              <span className="font-semibold"> Attendance Pass</span> to view
              your QR code and manual attendance code. On a registered event
              card, select <span className="font-semibold">View Attendance Pass</span>,
              or choose Attendance Pass from the menu.
            </p>
          </div>

          {loading ? (

            <div

              aria-live="polite"

              className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center"

            >

              <div className="mx-auto size-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />



              <p className="mt-3 text-sm font-medium text-slate-600">

                Loading available events...

              </p>

            </div>

          ) : openEvents.length === 0 ? (

            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">

              <p className="font-semibold text-slate-800">

                No available events

              </p>



              <p className="mt-1 text-sm text-slate-500">

                There are no events open for registration in your municipality

                yet.

              </p>

            </div>

          ) : (

            <>

              <div className="mt-5 space-y-4">

                {paginatedEvents.map((item) => {

                  const registered = isRegistered(item.id);

                  const eventStatus = normalizeStatus(item.event?.status);

                  const cancelled = eventStatus === "cancelled";

                  const registrationClosed = item.registration_open !== true;

                  const eventNotReady =

                    normalizeStatus(item.municipal_status) !== "prepared";



                  const capacitySummary = getCapacitySummary(item.capacity);

                  const {

                    venueName,

                    venueCapacity,

                    registeredCount,

                    availableSlots,

                    hasConfiguredCapacity,

                    isFull,

                  } = capacitySummary;



                  const buttonDisabled =

                    cancelled ||

                    registrationClosed ||

                    eventNotReady ||

                    isFull ||

                    registeringId === item.id;



                  let buttonLabel = "Register for Event";



                  if (registeringId === item.id) {

                    buttonLabel = "Checking registration...";

                  } else if (cancelled) {

                    buttonLabel = "Event Cancelled";

                  } else if (registrationClosed) {

                    buttonLabel = "Registration Closed";

                  } else if (eventNotReady) {

                    buttonLabel = "Event Not Ready";

                  } else if (isFull) {

                    buttonLabel = "Registration Full";

                  }



                  return (

                    <article

                      key={item.id}

                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"

                    >

                      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="text-lg font-semibold text-slate-950">

                              {item.event?.title || "Untitled Event"}

                            </h3>



                            {!cancelled &&

                              !registrationClosed &&

                              !eventNotReady &&

                              !isFull && (

                                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">

                                  Open Registration

                                </span>

                              )}



                            {isFull && !cancelled && (

                              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">

                                Full

                              </span>

                            )}



                            {cancelled && (

                              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">

                                Cancelled

                              </span>

                            )}



                            {registered && (

                              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">

                                Registered

                              </span>

                            )}

                          </div>



                          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">

                            {item.event?.description ||

                              "No description provided."}

                          </p>



                          {item.local_instructions && (

                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">

                              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">

                                Local Instructions

                              </p>



                              <p className="mt-1 text-sm leading-6 text-amber-900">

                                {item.local_instructions}

                              </p>

                            </div>

                          )}

                        </div>



                        <div className="grid shrink-0 gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 xl:w-[480px]">

                          <div>

                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">

                              Starts

                            </p>



                            <p className="mt-1 font-medium text-slate-700">

                              {formatDateTime(item.event?.start_at || null)}

                            </p>

                          </div>



                          <div>

                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">

                              Ends

                            </p>



                            <p className="mt-1 font-medium text-slate-700">

                              {formatDateTime(item.event?.end_at || null)}

                            </p>

                          </div>



                          <div className="border-t border-slate-200 pt-3 sm:col-span-2 sm:grid sm:grid-cols-3 sm:gap-3">

                            <div>

                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">

                                Venue

                              </p>



                              <p className="mt-1 font-medium text-slate-700">

                                {venueName}

                              </p>

                            </div>



                            <div className="mt-3 sm:mt-0">

                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">

                                Capacity

                              </p>



                              <p className="mt-1 font-medium text-slate-700">

                                {hasConfiguredCapacity

                                  ? `${registeredCount} / ${venueCapacity} filled`

                                  : "Not available"}

                              </p>

                            </div>



                            <div className="mt-3 sm:mt-0">

                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">

                                Availability

                              </p>



                              <p

                                className={`mt-1 font-semibold ${

                                  isFull ? "text-red-700" : "text-slate-700"

                                }`}

                              >

                                {hasConfiguredCapacity

                                  ? isFull

                                    ? "No slots remaining"

                                    : `${availableSlots} ${

                                        availableSlots === 1 ? "slot" : "slots"

                                      } remaining`

                                  : "Capacity unavailable"}

                              </p>

                            </div>

                          </div>

                        </div>



                        <div className="shrink-0 xl:w-[190px]">

                          {registered ? (

                            <Link

                              href="/dashboard/participant/attendance-pass"

                              className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"

                            >

                              View Attendance Pass

                            </Link>

                          ) : (

                            <button

                              type="button"

                              onClick={() => void handleRegister(item)}

                              disabled={buttonDisabled}

                              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed ${

                                isFull

                                  ? "bg-red-500 disabled:opacity-70"

                                  : "bg-slate-950 hover:bg-slate-800 disabled:opacity-60"

                              }`}

                            >

                              {buttonLabel}

                            </button>

                          )}

                        </div>

                      </div>

                    </article>

                  );

                })}

              </div>



              <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">

                <p className="text-sm text-slate-500">

                  Showing{" "}

                  <span className="font-semibold text-slate-700">

                    {firstVisibleEvent}

                  </span>

                  {" - "}

                  <span className="font-semibold text-slate-700">

                    {lastVisibleEvent}

                  </span>{" "}

                  of{" "}

                  <span className="font-semibold text-slate-700">

                    {openEvents.length}

                  </span>{" "}

                  events

                </p>



                {totalPages > 1 && (

                  <div className="flex flex-wrap items-center gap-2">

                    <button

                      type="button"

                      onClick={goToPreviousPage}

                      disabled={currentPage === 1}

                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"

                    >

                      Previous

                    </button>



                    {Array.from(

                      {

                        length: totalPages,

                      },

                      (_, index) => {

                        const pageNumber = index + 1;



                        return (

                          <button

                            key={pageNumber}

                            type="button"

                            onClick={() => goToPage(pageNumber)}

                            aria-current={

                              currentPage === pageNumber ? "page" : undefined

                            }

                            className={`min-w-10 rounded-lg px-3 py-2 text-sm font-semibold transition ${

                              currentPage === pageNumber

                                ? "bg-slate-950 text-white"

                                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"

                            }`}

                          >

                            {pageNumber}

                          </button>

                        );

                      },

                    )}



                    <button

                      type="button"

                      onClick={goToNextPage}

                      disabled={currentPage === totalPages}

                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"

                    >

                      Next

                    </button>

                  </div>

                )}

              </div>

            </>

          )}

        </section>

      </div>

    </main>

  );

}
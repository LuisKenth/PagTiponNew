"use client";

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Link2,
  RefreshCw,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

import MunicipalDeliveryToast, {
  type MunicipalDeliveryToastData,
} from "../../components/MunicipalDeliveryToast";

type StaffProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  verification_status: string;
  municipality: string | null;
};

type EventDetails = {
  id: string;
  title: string;
  status: string;
  start_at: string | null;
  end_at: string | null;
};

type MunicipalEvent = {
  id: string;
  event_id: string;
  municipality: string;
  municipal_status: string | null;
  preparation_status: string | null;
  local_venue_id: string | null;
  local_instructions: string | null;
  event: EventDetails;
};

type StaffAssignment = {
  id: string;
  event_municipality_id: string;
  staff_id: string;
  assigned_by: string;
  status: "active" | "removed";
  assigned_at: string;
  removed_at: string | null;
  created_at: string;
  updated_at: string;
  staff: StaffProfile | null;
  eventMunicipality: MunicipalEvent | null;
};

type AssignmentsResponse = {
  municipality?: string;
  staff?: StaffProfile[];
  events?: MunicipalEvent[];
  assignments?: StaffAssignment[];

  emailDelivery?: {
    ok: boolean;
    provider: "brevo";
    sent: number;
    failed: number;
    skippedAlreadySent: number;
    skippedInProgress: number;
    recipientEmail: string | null;
    message: string;
    error: string | null;
  };

  message?: string;
  error?: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Schedule unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return data.session.access_token;
}

export default function EventStaffAssignmentsPanel() {
  const [staff, setStaff] = useState<StaffProfile[]>([]);

  const [events, setEvents] = useState<MunicipalEvent[]>([]);

  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);

  const [municipality, setMunicipality] = useState("");

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [pageError, setPageError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [deliveryToast, setDeliveryToast] =
    useState<MunicipalDeliveryToastData | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);

  const [selectedStaffId, setSelectedStaffId] = useState("");

  const [selectedEventMunicipalityId, setSelectedEventMunicipalityId] =
    useState("");

  const [submitting, setSubmitting] = useState(false);

  const [formError, setFormError] = useState("");

  const [removingAssignmentId, setRemovingAssignmentId] = useState<
    string | null
  >(null);

  const approvedStaff = useMemo(
    () => staff.filter((profile) => profile.verification_status === "approved"),
    [staff],
  );

  const activeAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.status === "active"),
    [assignments],
  );

  const availableEvents = useMemo(() => {
    if (!selectedStaffId) {
      return events;
    }

    const assignedEventIds = new Set(
      activeAssignments
        .filter((assignment) => assignment.staff_id === selectedStaffId)
        .map((assignment) => assignment.event_municipality_id),
    );

    return events.filter(
      (municipalEvent) => !assignedEventIds.has(municipalEvent.id),
    );
  }, [activeAssignments, events, selectedStaffId]);

  const closeDeliveryToast = useCallback(() => {
    setDeliveryToast(null);
  }, []);

  const loadAssignments = useCallback(async (initialLoad = false) => {
    if (initialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setPageError("");

    try {
      const accessToken = await getAccessToken();

      const response = await fetch("/api/municipal/event-staff/assignments", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      const result = (await response.json()) as AssignmentsResponse;

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to load Event Staff assignments.",
        );
      }

      setStaff(result.staff ?? []);
      setEvents(result.events ?? []);
      setAssignments(result.assignments ?? []);
      setMunicipality(result.municipality ?? "");
    } catch (error) {
      console.error("Load Event Staff assignments error:", error);

      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load Event Staff assignments.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAssignments(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadAssignments]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage("");
    }, 6000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [successMessage]);

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) {
        setDialogOpen(false);
        setFormError("");
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", handleEscape);
    };
  }, [dialogOpen, submitting]);

  function openDialog() {
    setSelectedStaffId("");
    setSelectedEventMunicipalityId("");
    setFormError("");
    setDialogOpen(true);
  }

  function closeDialog() {
    if (submitting) {
      return;
    }

    setDialogOpen(false);
    setFormError("");
  }

  async function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");
    setDeliveryToast(null);

    if (!selectedStaffId) {
      setFormError("Please select an approved Event Staff account.");
      return;
    }

    if (!selectedEventMunicipalityId) {
      setFormError("Please select a prepared event.");
      return;
    }

    try {
      setSubmitting(true);

      const accessToken = await getAccessToken();

      const response = await fetch("/api/municipal/event-staff/assignments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId: selectedStaffId,

          eventMunicipalityId: selectedEventMunicipalityId,
        }),
      });

      const result = (await response.json()) as AssignmentsResponse;

      if (!response.ok) {
        throw new Error(result.error || "Unable to assign Event Staff.");
      }

      setDialogOpen(false);
      setSelectedStaffId("");
      setSelectedEventMunicipalityId("");

      setSuccessMessage(result.message || "Event Staff assigned successfully.");

      const delivery = result.emailDelivery;

      if (delivery?.sent && delivery.sent > 0) {
        setDeliveryToast({
          id: `${Date.now()}`,
          variant: "success",
          title: "Assignment email sent",
          message: delivery.recipientEmail
            ? `The Event Staff assignment email was sent to ${delivery.recipientEmail}.`
            : "The Event Staff assignment email was sent successfully.",
        });
      } else if (
        delivery?.skippedAlreadySent &&
        delivery.skippedAlreadySent > 0
      ) {
        setDeliveryToast({
          id: `${Date.now()}`,
          variant: "success",
          title: "Staff already notified",
          message:
            "The assignment was saved. A duplicate email was prevented because this staff member was already notified for this assignment cycle.",
        });
      } else if (
        delivery?.skippedInProgress &&
        delivery.skippedInProgress > 0
      ) {
        setDeliveryToast({
          id: `${Date.now()}`,
          variant: "warning",
          title: "Email delivery in progress",
          message:
            "The assignment was saved. Another request is already processing the staff email.",
        });
      } else {
        setDeliveryToast({
          id: `${Date.now()}`,
          variant: "warning",
          title: "Assignment saved, email not sent",
          message:
            delivery?.error ||
            delivery?.message ||
            "The Event Staff assignment was saved, but its email delivery could not be confirmed.",
        });
      }

      await loadAssignments(false);
    } catch (error) {
      console.error("Assign Event Staff error:", error);

      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to assign Event Staff.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(assignment: StaffAssignment) {
    const staffName =
      assignment.staff?.full_name ||
      assignment.staff?.email ||
      "this Event Staff member";

    const eventTitle =
      assignment.eventMunicipality?.event.title || "this event";

    const confirmed = window.confirm(`Remove ${staffName} from ${eventTitle}?`);

    if (!confirmed) {
      return;
    }

    setPageError("");
    setSuccessMessage("");
    setRemovingAssignmentId(assignment.id);

    try {
      const accessToken = await getAccessToken();

      const response = await fetch("/api/municipal/event-staff/assignments", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignmentId: assignment.id,
          action: "remove",
        }),
      });

      const result = (await response.json()) as AssignmentsResponse;

      if (!response.ok) {
        throw new Error(result.error || "Unable to remove the assignment.");
      }

      setSuccessMessage(result.message || "Assignment removed successfully.");

      await loadAssignments(false);
    } catch (error) {
      console.error("Remove Event Staff assignment error:", error);

      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to remove the assignment.",
      );
    } finally {
      setRemovingAssignmentId(null);
    }
  }

  return (
    <section className="space-y-4">
      <MunicipalDeliveryToast
        toast={deliveryToast}
        onClose={closeDeliveryToast}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Link2 className="h-4 w-4" />
            Event Access
          </div>

          <h2 className="text-xl font-bold text-slate-950">
            Event Staff Assignments
          </h2>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Manage which prepared events each approved staff member should
            access in {municipality || "your municipality"}.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void loadAssignments(false)}
            disabled={loading || refreshing || submitting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={openDialog}
            disabled={
              loading || approvedStaff.length === 0 || events.length === 0
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            Assign to Event
          </button>
        </div>
      </div>

      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

          <span>{successMessage}</span>
        </div>
      )}

      {pageError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div className="flex-1">
            <p>{pageError}</p>

            <button
              type="button"
              onClick={() => void loadAssignments(false)}
              className="mt-2 font-bold underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="text-lg font-bold text-slate-950">
              Active Event Assignments
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              These records will restrict Event Staff Dashboard access.
            </p>
          </div>

          <div className="flex gap-2 text-xs font-bold">
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
              {activeAssignments.length} Active
            </span>

            <span className="rounded-full bg-violet-50 px-3 py-1.5 text-violet-700">
              {events.length} Prepared Events
            </span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5 sm:p-6">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : activeAssignments.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Link2 className="h-8 w-8" />
            </div>

            <h3 className="mt-4 text-lg font-bold text-slate-900">
              No active assignments
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Assign an approved Event Staff account to a prepared event.
            </p>

            {approvedStaff.length > 0 && events.length > 0 && (
              <button
                type="button"
                onClick={openDialog}
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                <UserPlus className="h-4 w-4" />
                Assign Event Staff
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeAssignments.map((assignment) => {
              const eventDetails = assignment.eventMunicipality?.event;

              const removing = removingAssignmentId === assignment.id;

              return (
                <article
                  key={assignment.id}
                  className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        Active
                      </span>

                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Event Assignment
                      </span>
                    </div>

                    <h4 className="mt-3 text-base font-bold text-slate-950">
                      {eventDetails?.title || "Untitled Event"}
                    </h4>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {assignment.staff?.full_name || "Unnamed Staff"}
                    </p>

                    <p className="text-sm text-slate-500">
                      {assignment.staff?.email || "No email address"}
                    </p>

                    <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-500">
                      <CalendarDays className="h-4 w-4" />

                      {formatDateTime(eventDetails?.start_at)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleRemove(assignment)}
                    disabled={removingAssignmentId !== null}
                    className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {removing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}

                    {removing ? "Removing..." : "Remove Assignment"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {dialogOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-event-staff-title"
        >
          <button
            type="button"
            aria-label="Close assignment dialog"
            onClick={closeDialog}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          <div className="relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2
                  id="assign-event-staff-title"
                  className="text-xl font-bold text-slate-950"
                >
                  Assign Event Staff
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Select an approved staff member and prepared event.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                disabled={submitting}
                aria-label="Close dialog"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssign} className="space-y-5 p-5 sm:p-6">
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="assignment-staff"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Event Staff
                </label>

                <select
                  id="assignment-staff"
                  value={selectedStaffId}
                  onChange={(event) => {
                    setSelectedStaffId(event.target.value);

                    setSelectedEventMunicipalityId("");
                  }}
                  disabled={submitting}
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-700 focus:ring-4 focus:ring-slate-100 disabled:bg-slate-100"
                >
                  <option value="">Select approved Event Staff</option>

                  {approvedStaff.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name || "Unnamed Staff"}

                      {profile.email ? ` — ${profile.email}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="assignment-event"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Prepared Event
                </label>

                <select
                  id="assignment-event"
                  value={selectedEventMunicipalityId}
                  onChange={(event) =>
                    setSelectedEventMunicipalityId(event.target.value)
                  }
                  disabled={submitting || !selectedStaffId}
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-700 focus:ring-4 focus:ring-slate-100 disabled:bg-slate-100"
                >
                  <option value="">
                    {selectedStaffId
                      ? "Select prepared event"
                      : "Select Event Staff first"}
                  </option>

                  {availableEvents.map((municipalEvent) => (
                    <option key={municipalEvent.id} value={municipalEvent.id}>
                      {municipalEvent.event.title} —{" "}
                      {formatDateTime(municipalEvent.event.start_at)}
                    </option>
                  ))}
                </select>

                {selectedStaffId && availableEvents.length === 0 && (
                  <p className="mt-2 text-xs font-medium text-amber-700">
                    This staff member is already assigned to every available
                    event.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
                This assignment will control the staff member&apos;s event
                access in the attendance dashboard. An assignment email will
                also be sent to the staff member.
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={submitting}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !selectedStaffId ||
                    !selectedEventMunicipalityId
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Assign Staff
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, ChevronDown, RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

type EventDetails = {
  id: string;
  title: string;
  status: string;
  end_at: string | null;
};

type EventRow = {
  id: string;
  municipality: string;
  check_out_deadline_at: string | null;
  events: EventDetails | EventDetails[] | null;
};

type DeadlineEvent = {
  id: string;
  title: string;
  endAt: string;
  overrideAt: string | null;
};

type ExtensionAudit = {
  id: string;
  event_municipality_id: string;
  old_deadline_at: string;
  new_deadline_at: string;
  reason: string;
  created_at: string;
};

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function formatPhilippineTime(value: string | number): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Invalid schedule";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function currentDeadlineMillis(event: DeadlineEvent): number {
  const end = new Date(event.endAt).getTime();
  const override = event.overrideAt ? new Date(event.overrideAt).getTime() : NaN;
  return Number.isFinite(override) ? override : end + TWO_HOURS_MS;
}

export default function CheckOutDeadlineExtensionPanel() {
  const [expanded, setExpanded] = useState(false);
  const [events, setEvents] = useState<DeadlineEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<ExtensionAudit[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Please sign in again.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("municipality, role, verification_status")
        .eq("id", authData.user.id)
        .single();
      if (profileError || !profile || profile.role !== "municipal_admin" ||
          profile.verification_status !== "approved" || !profile.municipality) {
        throw new Error("Only approved Municipal Admins can extend Check-Out.");
      }

      const { data, error: eventError } = await supabase
        .from("event_municipalities")
        .select("id, municipality, check_out_deadline_at, events(id, title, status, end_at)")
        .eq("municipality", profile.municipality);
      if (eventError) throw eventError;

      const normalized = ((data ?? []) as unknown as EventRow[])
        .map((row): DeadlineEvent | null => {
          const event = Array.isArray(row.events) ? row.events[0] : row.events;
          if (!event?.end_at || ["draft", "cancelled"].includes(event.status)) return null;
          if (!Number.isFinite(new Date(event.end_at).getTime())) return null;
          return {
            id: row.id,
            title: event.title,
            endAt: event.end_at,
            overrideAt: row.check_out_deadline_at,
          };
        })
        .filter((event): event is DeadlineEvent => event !== null)
        .sort((a, b) => new Date(b.endAt).getTime() - new Date(a.endAt).getTime());

      setEvents(normalized);
      setSelectedEventId((previous) =>
        normalized.some((event) => event.id === previous) ? previous : "",
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load events.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (eventMunicipalityId: string) => {
    if (!eventMunicipalityId) {
      setHistory([]);
      return;
    }
    const { data, error: auditError } = await supabase
      .from("attendance_check_out_deadline_audit")
      .select("id, event_municipality_id, old_deadline_at, new_deadline_at, reason, created_at")
      .eq("event_municipality_id", eventMunicipalityId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (auditError) {
      setHistory([]);
      setError(auditError.message);
      return;
    }
    setHistory((data ?? []) as ExtensionAudit[]);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    void loadEvents();
  }, [expanded, loadEvents]);

  useEffect(() => {
    if (!expanded) return;
    void loadHistory(selectedEventId);
  }, [expanded, selectedEventId, loadHistory]);

  async function extendDeadline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!selectedEvent) return setError("Select an event first.");

    // datetime-local is entered as Philippine local time (UTC+08:00).
    const dateTime = new Date(`${newDeadline}+08:00`);
    const proposedMillis = dateTime.getTime();
    const eventEndMillis = new Date(selectedEvent.endAt).getTime();
    if (!newDeadline || !Number.isFinite(proposedMillis)) {
      return setError("Enter a valid Philippine date and time.");
    }
    if (proposedMillis <= Date.now() || proposedMillis <= currentDeadlineMillis(selectedEvent) ||
        proposedMillis > eventEndMillis + ONE_DAY_MS) {
      return setError("The new deadline must be later than the current deadline, in the future, and within 24 hours of event end.");
    }
    if (reason.trim().length < 10 || reason.trim().length > 500) {
      return setError("Enter a reason between 10 and 500 characters.");
    }

    setSubmitting(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("extend_event_check_out_deadline", {
        p_event_municipality_id: selectedEvent.id,
        p_new_deadline_at: dateTime.toISOString(),
        p_reason: reason.trim(),
      });
      if (rpcError) throw rpcError;
      if (!data || typeof data !== "object" || (data as { success?: boolean }).success !== true) {
        throw new Error("The extension was not confirmed by the database.");
      }
      setSuccess("Check-Out deadline extended. The reason has been saved in the audit log.");
      setNewDeadline("");
      setReason("");
      await loadEvents();
      await loadHistory(selectedEvent.id);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to extend the deadline.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <CalendarClock className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-bold text-slate-900">Check-Out Deadline Extension</span>
            <span className="mt-1 block text-sm text-slate-500">Municipal Admin only · Reason and audit required</span>
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-slate-200 p-5 sm:p-6">
          <p className="text-sm leading-6 text-slate-600">
            Check-Out normally closes two hours after an event ends. Extend the deadline only for delays or technical issues. All times below are Philippine time.
          </p>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}

          <form className="space-y-4" onSubmit={(event) => void extendDeadline(event)}>
            <label className="block text-sm font-semibold text-slate-700">
              Event
              <select
                value={selectedEventId}
                onChange={(event) => { setSelectedEventId(event.target.value); setNewDeadline(""); setSuccess(""); }}
                disabled={loading || submitting}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">Select a municipal event</option>
                {events.map((event) => (
                  <option value={event.id} key={event.id}>{event.title} — {formatPhilippineTime(event.endAt)}</option>
                ))}
              </select>
            </label>

            {selectedEvent && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <p><span className="font-semibold">Event ends:</span> {formatPhilippineTime(selectedEvent.endAt)}</p>
                <p className="mt-1"><span className="font-semibold">Current Check-Out deadline:</span> {formatPhilippineTime(currentDeadlineMillis(selectedEvent))}</p>
                <p className="mt-1 text-xs text-slate-500">Maximum extension: {formatPhilippineTime(new Date(selectedEvent.endAt).getTime() + ONE_DAY_MS)}</p>
              </div>
            )}

            <label className="block text-sm font-semibold text-slate-700">
              New Check-Out deadline (Philippine time)
              <input
                type="datetime-local"
                value={newDeadline}
                onChange={(event) => setNewDeadline(event.target.value)}
                disabled={!selectedEvent || submitting}
                required
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Reason for extension
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={!selectedEvent || submitting}
                minLength={10}
                maxLength={500}
                rows={3}
                required
                placeholder="Example: QR scanner was temporarily unavailable during dismissal."
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">{reason.trim().length}/500 characters · 10 minimum</span>
            </label>

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => void loadEvents()} disabled={loading || submitting}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
              <button type="submit" disabled={!selectedEvent || !newDeadline || reason.trim().length < 10 || submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                <ShieldCheck className="h-4 w-4" /> {submitting ? "Saving..." : "Approve Extension"}
              </button>
            </div>
          </form>

          {selectedEvent && (
            <div className="border-t border-slate-200 pt-4">
              <h3 className="font-semibold text-slate-900">Recent Extension History</h3>
              {history.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No recorded extensions for this event.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {history.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                      <p className="font-semibold text-slate-800">{formatPhilippineTime(item.old_deadline_at)} → {formatPhilippineTime(item.new_deadline_at)}</p>
                      <p className="mt-1 text-slate-600">{item.reason}</p>
                      <p className="mt-1 text-xs text-slate-400">Recorded {formatPhilippineTime(item.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

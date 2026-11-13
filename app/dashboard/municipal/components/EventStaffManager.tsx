"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, LoaderCircle, Search } from "lucide-react";
import { useLiveData } from "@/app/components/live/BackgroundDataSync";
import {
  emptyStaffData,
  formatStaffDate,
  notifyStaffChanged,
  readStaffData,
  schedulesOverlap,
  staffButton,
  staffPrimaryButton,
  staffRequest,
  type Assignment,
  type StaffData,
} from "./eventStaffData";

type Props = {
  assignmentId?: string;
  eventId?: string;
  wizard?: boolean;
  onClose: () => void;
  onBack?: () => void;
  onComplete?: (count: number, warning: string) => void;
  onBusyChange?: (busy: boolean) => void;
};

/** Shared by the preparation wizard and the event-list Manage Staff dialog. */
export default function EventStaffManager({
  assignmentId,
  eventId,
  wizard = false,
  onClose,
  onBack,
  onComplete,
  onBusyChange,
}: Props) {
  const [data, setData] = useState<StaffData>(emptyStaffData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const mounted = useRef(false);
  const generation = useRef(0);
  const mutation = useRef(false);
  const load = useCallback(async (silent = false) => {
    const ticket = ++generation.current;
    if (!silent) setLoading(true);
    try {
      const next = await readStaffData();
      if (mounted.current && ticket === generation.current) {
        setData(next);
        setError("");
      }
      return next;
    } catch (e) {
      if (mounted.current && ticket === generation.current)
        setError(e instanceof Error ? e.message : "Unable to load staff.");
      return null;
    } finally {
      if (mounted.current && ticket === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
      generation.current++;
    };
  }, [load, assignmentId, eventId]);
  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);
  useLiveData({
    onUpdate: () => load(true),
    disabled: loading || busy,
    pauseWhileEditing: false,
  });

  const matched = data.events.find((e) =>
    assignmentId ? e.id === assignmentId : e.event_id === eventId,
  );
  const active = data.assignments.filter(
    (a) => a.status === "active" && a.event_municipality_id === matched?.id,
  );
  const available = data.staff.filter(
    (s) =>
      s.verification_status === "approved" &&
      !active.some((a) => a.staff_id === s.id),
  );
  const selectedIds = chosen.filter((id) => available.some((s) => s.id === id));
  const filtered = available.filter((s) =>
    `${s.full_name || ""} ${s.email || ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const conflictsFor = (staffId: string, snapshot = data) => {
    const event = snapshot.events.find((e) =>
      assignmentId ? e.id === assignmentId : e.event_id === eventId,
    );
    return event
      ? snapshot.scheduleAssignments.filter(
          (a) =>
            a.staffId === staffId &&
            a.assignmentId !== event.id &&
            schedulesOverlap(
              event.event.start_at,
              event.event.end_at,
              a.start,
              a.end,
            ),
        )
      : [];
  };
  const conflicts = selectedIds.flatMap((id) =>
    conflictsFor(id).map((c) => ({ ...c, staffId: id })),
  );
  // The acknowledgment belongs to the exact selected staff + conflicting schedules.
  const conflictKey = conflicts
    .map((c) => `${c.staffId}:${c.assignmentId}:${c.start}:${c.end}`)
    .sort()
    .join("|");
  useEffect(() => {
    setConfirmed(false);
  }, [conflictKey]);

  async function assign() {
    if (
      mutation.current ||
      !matched ||
      !selectedIds.length ||
      (conflicts.length > 0 && !confirmed)
    )
      return;
    mutation.current = true;
    setBusy(true);
    setNotice("");
    let saved = 0;
    let allSaved = false;
    let emailWarning = "";
    try {
      // Recheck immediately before mutation; do not silently accept a newly discovered conflict.
      const latest = await readStaffData();
      const current = latest.events.find((e) => e.id === matched.id);
      if (!current)
        throw new Error(
          "This event is no longer available for staff assignment. Review its status.",
        );
      const newConflicts = selectedIds
        .flatMap((id) =>
          conflictsFor(id, latest).map(
            (c) => `${id}:${c.assignmentId}:${c.start}:${c.end}`,
          ),
        )
        .sort()
        .join("|");
      if (newConflicts !== conflictKey) {
        setData(latest);
        setConfirmed(false);
        throw new Error(
          "Staff schedules changed. Review the updated conflicts before assigning.",
        );
      }
      const alreadyActive = latest.assignments.filter(
        (a) => a.status === "active" && a.event_municipality_id === current.id,
      );
      const targets = selectedIds.filter(
        (id) => !alreadyActive.some((a) => a.staff_id === id),
      );
      if (!targets.length) {
        setData(latest);
        setChosen([]);
        throw new Error(
          "These staff members are already assigned. Review the current list.",
        );
      }
      for (const staffId of targets) {
        const staff = latest.staff.find((s) => s.id === staffId);
        if (staff?.verification_status !== "approved")
          throw new Error(
            "A selected staff account is no longer active. Review the list.",
          );
        const result = await staffRequest("POST", {
          staffId,
          eventMunicipalityId: current.id,
        });
        saved++;
        const delivery = result.emailDelivery;
        if (!delivery?.sent && !delivery?.skippedAlreadySent)
          emailWarning =
            "Some staff emails were not confirmed. Assignments were saved; check delivery before retrying.";
      }
      setChosen([]);
      allSaved = true;
      setNotice(
        `${saved} staff assignment${saved === 1 ? "" : "s"} saved. ${emailWarning || "Staff notification processed."}`,
      );
    } catch (e) {
      setNotice(
        `${saved ? `${saved} assignment(s) saved. ` : ""}${e instanceof Error ? e.message : "Unable to assign staff."}`,
      );
    } finally {
      const fresh = await load();
      notifyStaffChanged();
      mutation.current = false;
      setBusy(false);
      if (allSaved && fresh && mounted.current && onComplete) {
        const count = fresh.assignments.filter(
          (a) =>
            a.status === "active" && a.event_municipality_id === matched.id,
        ).length;
        if (count > 0) onComplete(count, emailWarning);
      }
    }
  }
  async function remove(assignment: Assignment) {
    if (
      mutation.current ||
      !window.confirm(
        `Remove ${assignment.staff?.full_name || "this staff member"} from this event?`,
      )
    )
      return;
    mutation.current = true;
    setBusy(true);
    setNotice("");
    try {
      await staffRequest("PATCH", {
        assignmentId: assignment.id,
        action: "remove",
      });
      setNotice("Assignment removed.");
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Unable to remove assignment.",
      );
    } finally {
      await load();
      notifyStaffChanged();
      mutation.current = false;
      setBusy(false);
    }
  }
  const blocked = busy || loading || Boolean(error);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5"
        aria-busy={busy}
      >
        {wizard && (
          <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
            <Check className="mr-1 inline h-4 w-4" />
            Preparation saved. Choose who will manage Time-in and Time-out.
          </p>
        )}
        {loading && (
          <p role="status" className="flex gap-2 text-sm text-slate-600">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading staff…
          </p>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
            <button
              type="button"
              className={`${staffButton} mt-2`}
              disabled={busy}
              onClick={() => void load()}
            >
              Try again
            </button>
          </div>
        )}
        {!loading &&
          !error &&
          (matched ? (
            <>
              <div className="text-xs leading-5 text-slate-600">
                {formatStaffDate(matched.event.start_at)} –{" "}
                {formatStaffDate(matched.event.end_at)} (PH)
              </div>
              <section aria-labelledby="assigned-staff-heading">
                <h3
                  id="assigned-staff-heading"
                  className="mb-2 text-sm font-bold"
                >
                  Assigned staff ({active.length})
                </h3>
                {!active.length && (
                  <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                    No staff assigned yet. You can do this later from the event
                    list.
                  </p>
                )}
                <div className="space-y-2">
                  {active.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
                    >
                      <div className="min-w-0 break-words text-sm font-semibold">
                        {a.staff?.full_name || "Event Staff"}
                        <span className="block text-xs font-normal text-slate-500">
                          {a.staff?.email}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={`${staffButton} text-red-700`}
                        disabled={busy}
                        onClick={() => void remove(a)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </section>
              <section aria-labelledby="choose-staff-heading">
                <h3
                  id="choose-staff-heading"
                  className="mb-2 text-sm font-bold"
                >
                  Choose staff
                </h3>
                <label className="relative block">
                  <span className="sr-only">Search staff by name or email</span>
                  <Search
                    aria-hidden="true"
                    className="absolute left-3 top-3 h-5 w-5 text-slate-400"
                  />
                  <input
                    type="search"
                    className="min-h-11 w-full rounded-xl border py-2 pl-10 pr-3 text-base sm:text-sm"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search staff name or email"
                    disabled={busy}
                  />
                </label>
                <div className="mt-3 space-y-2">
                  {filtered.map((s) => (
                    <label
                      key={s.id}
                      className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 ${selectedIds.includes(s.id) ? "border-indigo-400 bg-indigo-50" : "border-slate-200"}`}
                    >
                      <input
                        className="mt-1 h-5 w-5 shrink-0 accent-indigo-600"
                        type="checkbox"
                        disabled={busy}
                        checked={selectedIds.includes(s.id)}
                        onChange={(e) =>
                          setChosen((ids) =>
                            e.target.checked
                              ? [...ids, s.id]
                              : ids.filter((id) => id !== s.id),
                          )
                        }
                      />
                      <span className="min-w-0 break-words text-sm font-semibold">
                        {s.full_name || "Unnamed staff"}
                        <span className="block text-xs font-normal text-slate-500">
                          {s.email}
                        </span>
                        {conflictsFor(s.id).map((c) => (
                          <span
                            key={c.assignmentId}
                            className="mt-2 block rounded-lg bg-amber-50 p-2 text-xs font-normal text-amber-900"
                          >
                            <AlertTriangle
                              className="mr-1 inline h-4 w-4"
                              aria-hidden="true"
                            />
                            Schedule conflict: {c.title}
                            <br />
                            {formatStaffDate(c.start)} –{" "}
                            {formatStaffDate(c.end)} (PH)
                          </span>
                        ))}
                      </span>
                    </label>
                  ))}
                </div>
                {!filtered.length && (
                  <p className="mt-3 text-sm text-slate-600">
                    {available.length
                      ? "No staff match your search."
                      : "No additional approved staff available."}
                  </p>
                )}
                {active.length > 0 && (
                  <Link
                    className="mt-3 flex min-h-11 items-center text-sm font-semibold text-indigo-700 underline"
                    href={`/dashboard/municipal/attendance/${encodeURIComponent(matched.id)}`}
                    onClick={(e) => {
                      if (busy) e.preventDefault();
                      else onClose();
                    }}
                  >
                    View Attendance Monitoring
                  </Link>
                )}
                <Link
                  className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700 underline"
                  href="/dashboard/municipal/event-staff"
                  onClick={(e) => {
                    if (busy) e.preventDefault();
                    else onClose();
                  }}
                >
                  Manage staff accounts
                </Link>
              </section>
              {conflicts.length > 0 && (
                <label className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0 accent-amber-700"
                    checked={confirmed}
                    disabled={busy}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  <span>
                    I reviewed the overlapping schedules and want to continue
                    assigning these staff.
                  </span>
                </label>
              )}
            </>
          ) : (
            <p
              role="status"
              className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
            >
              Staff assignment is unavailable. Confirm that the event is
              upcoming, Ready, and has a venue. Ongoing, completed or cancelled
              events cannot receive new assignments.
            </p>
          ))}
        {notice && (
          <p
            role="status"
            className="whitespace-pre-line rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900"
          >
            {notice}
          </p>
        )}
      </div>
      <footer className="shrink-0 border-t bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {onBack ? (
            <button
              type="button"
              className={staffButton}
              onClick={onBack}
              disabled={busy}
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              className={staffButton}
              disabled={busy}
              onClick={onClose}
            >
              Close
            </button>
          )}
          <div className="flex flex-wrap gap-2">
            {wizard && !active.length && (
              <button
                type="button"
                className={staffButton}
                disabled={blocked}
                onClick={() => onComplete?.(0, "")}
              >
                Do This Later
              </button>
            )}
            {selectedIds.length > 0 ? (
              <button
                type="button"
                className={staffPrimaryButton}
                disabled={
                  blocked || !matched || (conflicts.length > 0 && !confirmed)
                }
                onClick={() => void assign()}
              >
                {busy ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  `Assign Staff (${selectedIds.length})`
                )}
              </button>
            ) : wizard && active.length > 0 ? (
              <button
                type="button"
                className={staffPrimaryButton}
                disabled={blocked}
                onClick={() => onComplete?.(active.length, "")}
              >
                Finish
              </button>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  );
}

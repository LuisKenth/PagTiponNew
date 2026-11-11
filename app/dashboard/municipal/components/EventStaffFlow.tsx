"use client";
import { useLiveData } from "@/app/components/live/BackgroundDataSync";

import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Staff = {
  id: string;
  full_name: string | null;
  email: string | null;
  verification_status: string;
};
type Assignment = {
  id: string;
  event_municipality_id: string;
  staff_id: string;
  status: string;
  staff: Staff | null;
};
type Event = {
  id: string;
  event_id: string;
  local_venue_id: string | null;
  event: { title: string; start_at: string | null; end_at: string | null };
};
type ScheduleAssignment = {
  staffId: string;
  assignmentId: string;
  title: string;
  start: string | null;
  end: string | null;
};
type Data = {
  scheduleAssignments: ScheduleAssignment[];
  staff: Staff[];
  events: Event[];
  assignments: Assignment[];
};
type Request = {
  assignmentId?: string;
  eventId?: string;
  title: string;
  prepared?: boolean;
  prompt?: boolean;
};
const Flow = createContext<{
  data: Data;
  loading: boolean;
  error: string;
  open: (r: Request) => void;
} | null>(null);
const empty: Data = {
  scheduleAssignments: [],
  staff: [],
  events: [],
  assignments: [],
};
const button =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50";
const date = (v: string | null) =>
  v
    ? new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(v))
    : "Not scheduled";
export function schedulesOverlap(
  start: string | null,
  end: string | null,
  otherStart: string | null,
  otherEnd: string | null,
) {
  const values = [start, end, otherStart, otherEnd].map((v) =>
    Date.parse(v || ""),
  );
  return (
    values.every(Number.isFinite) &&
    values[0] < values[1] &&
    values[2] < values[3] &&
    values[0] < values[3] &&
    values[2] < values[1]
  );
}
export function offerEventStaff(request: Request) {
  window.dispatchEvent(
    new CustomEvent("pagtipon:staff-next-step", { detail: request }),
  );
}
export function EventStaffFlowProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [request, setRequest] = useState<Request | null>(null);
  const [prompt, setPrompt] = useState(false);
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [venue, setVenue] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const { data: s, error: e } = await supabase.auth.getSession();
      if (e || !s.session) throw new Error("Please sign in again.");
      const response = await fetch("/api/municipal/event-staff/assignments", {
        headers: { Authorization: `Bearer ${s.session.access_token}` },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to load staff assignments.");
      const next = {
        scheduleAssignments: result.scheduleAssignments || [],
        staff: result.staff || [],
        events: result.events || [],
        assignments: result.assignments || [],
      };
      setData(next);
      return next as Data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load assignments.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  useLiveData({
    onUpdate: () => load(true),
    disabled: loading || busy,
    pauseWhileEditing: false,
  });
  const open = useCallback(
    (r: Request) => {
      previousFocus.current = document.activeElement as HTMLElement;
      setRequest(r);
      setPrompt(Boolean(r.prompt));
      setQuery("");
      setChosen([]);
      setNotice("");
      void load();
    },
    [load],
  );
  useEffect(() => {
    void load();
    const handler = (e: globalThis.Event) =>
      open((e as CustomEvent<Request>).detail);
    window.addEventListener("pagtipon:staff-next-step", handler);
    return () =>
      window.removeEventListener("pagtipon:staff-next-step", handler);
  }, [load, open]);
  useEffect(() => {
    if (!request) return;
    dialog.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      previousFocus.current?.focus();
    };
  }, [request]);
  const matched =
    request &&
    data.events.find((e) =>
      request.assignmentId
        ? e.id === request.assignmentId
        : e.event_id === request.eventId,
    );
  const assignmentId = matched?.id || request?.assignmentId;
  const active = data.assignments.filter(
    (a) => a.status === "active" && a.event_municipality_id === assignmentId,
  );
  const available = data.staff.filter(
    (s) =>
      s.verification_status === "approved" &&
      !active.some((a) => a.staff_id === s.id),
  );
  const conflictsFor = (staffId: string) =>
    matched
      ? data.scheduleAssignments.filter(
          (a) =>
            a.staffId === staffId &&
            a.assignmentId !== matched.id &&
            schedulesOverlap(
              matched.event.start_at,
              matched.event.end_at,
              a.start,
              a.end,
            ),
        )
      : [];
  useEffect(() => {
    setVenue("");
    if (!matched?.local_venue_id) return;
    let cancelled = false;
    void supabase
      .from("venues")
      .select("venue_name")
      .eq("id", matched.local_venue_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setVenue(data?.venue_name || "Assigned venue");
      });
    return () => {
      cancelled = true;
    };
  }, [matched?.local_venue_id]);
  function close() {
    if (busy) return;
    dialog.current?.close();
    setRequest(null);
  }
  async function mutate(method: "POST" | "PATCH", body: object) {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) throw new Error("Please sign in again.");
    const response = await fetch("/api/municipal/event-staff/assignments", {
      method,
      headers: {
        Authorization: `Bearer ${s.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Unable to update assignment.");
    return result;
  }
  async function save() {
    if (busy || !matched || !chosen.length) return;
    const conflicts = chosen.flatMap((id) =>
      conflictsFor(id).map(
        (c) =>
          `${data.staff.find((s) => s.id === id)?.full_name || "Staff"}: ${c.title} (${date(c.start)} – ${date(c.end)})`,
      ),
    );
    if (
      conflicts.length &&
      !window.confirm(
        `Schedule conflict:\n\n${conflicts.join("\n")}\n\nThese assignments overlap this event. Continue assigning anyway?`,
      )
    )
      return;
    setBusy(true);
    setNotice("");
    let saved = 0;
    const warnings: string[] = [];
    try {
      for (const staffId of chosen) {
        const result = await mutate("POST", {
          staffId,
          eventMunicipalityId: matched.id,
        });
        saved++;
        const d = result.emailDelivery;
        if (!d?.sent && !d?.skippedAlreadySent)
          warnings.push(d?.message || "Email delivery could not be confirmed.");
      }
      setChosen([]);
      setNotice(
        `${saved} staff assignment${saved === 1 ? "" : "s"} saved.${warnings.length ? " Some assignment emails were not confirmed. Check Event Staff notifications before retrying." : " Staff notification processed."}`,
      );
    } catch (e) {
      setNotice(
        `${saved ? `${saved} assignment(s) saved. ` : ""}${e instanceof Error ? e.message : "Unable to assign staff."}`,
      );
    } finally {
      await load();
      setBusy(false);
    }
  }
  async function remove(a: Assignment) {
    if (
      busy ||
      !window.confirm(
        `Remove ${a.staff?.full_name || "this staff member"} from this event?`,
      )
    )
      return;
    setBusy(true);
    setNotice("");
    try {
      await mutate("PATCH", { assignmentId: a.id, action: "remove" });
      setNotice("Assignment removed.");
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Unable to remove assignment.",
      );
    } finally {
      await load();
      setBusy(false);
    }
  }
  return (
    <Flow.Provider value={{ data, loading, error, open }}>
      {children}
      <dialog
        aria-labelledby="event-staff-flow-title"
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl bg-white p-0 shadow-xl backdrop:bg-slate-950/50"
      >
        {request && (
          <>
            <header className="sticky top-0 z-10 border-b bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                    {prompt ? "Preparation saved · Next step" : "Event staff"}
                  </p>
                  <h2
                    id="event-staff-flow-title"
                    className="mt-1 text-xl font-bold"
                  >
                    {prompt ? "Assign Event Staff Next" : "Manage Event Staff"}
                  </h2>
                  <p className="mt-2 break-words font-semibold text-slate-800">
                    {request.title}
                  </p>
                </div>
                <button
                  className={button}
                  onClick={close}
                  disabled={busy}
                  aria-label="Close staff assignment dialog"
                >
                  Close
                </button>
              </div>
            </header>
            <div className="space-y-4 p-5">
              {prompt ? (
                <>
                  <p className="text-sm text-slate-600">
                    Your event preparation has been saved. Assign staff to
                    manage participant Time-in and Time-out.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      className={`${button} !bg-indigo-600 !text-white`}
                      onClick={() => setPrompt(false)}
                    >
                      Assign Event Staff
                    </button>
                    <button className={button} onClick={close}>
                      Later
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {loading && <p role="status">Loading staff assignments…</p>}
                  {error && (
                    <div
                      role="alert"
                      className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
                    >
                      {error}
                      <button
                        className={`${button} ml-2`}
                        onClick={() => void load()}
                      >
                        Try again
                      </button>
                    </div>
                  )}
                  {!loading && !error && (
                    <>
                      {matched ? (
                        <>
                          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                            <p>
                              {date(matched.event.start_at)} –{" "}
                              {date(matched.event.end_at)}
                            </p>
                            <p className="mt-1">
                              Venue: {venue || "Loading assigned venue…"}
                            </p>
                          </div>
                          <h3 className="font-bold">
                            Assigned staff ({active.length})
                          </h3>
                          {active.length === 0 && (
                            <p className="text-sm text-amber-700">
                              No staff assigned yet.
                            </p>
                          )}
                          {active.map((a) => (
                            <div
                              key={a.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
                            >
                              <span className="min-w-0 break-words text-sm">
                                {a.staff?.full_name || "Event Staff"}
                                <span className="block text-xs text-slate-500">
                                  {a.staff?.email}
                                </span>
                              </span>
                              <button
                                className={`${button} !text-red-700`}
                                disabled={busy}
                                onClick={() => void remove(a)}
                              >
                                Remove Assignment
                              </button>
                            </div>
                          ))}
                          <h3 className="font-bold">Add staff</h3>
                          <p className="text-xs text-slate-600">
                            Overlapping active assignments show a schedule
                            warning. You will be asked to confirm before saving
                            a conflicting selection.
                          </p>
                          <input
                            className="min-h-11 w-full rounded-xl border px-3 text-sm"
                            type="search"
                            aria-label="Search staff"
                            placeholder="Search staff name or email"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                          />
                          <div className="max-h-60 space-y-2 overflow-y-auto overscroll-contain">
                            {available
                              .filter((s) =>
                                `${s.full_name} ${s.email}`
                                  .toLowerCase()
                                  .includes(query.toLowerCase().trim()),
                              )
                              .map((s) => (
                                <label
                                  key={s.id}
                                  className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3"
                                >
                                  <input
                                    type="checkbox"
                                    disabled={busy}
                                    checked={chosen.includes(s.id)}
                                    onChange={(e) =>
                                      setChosen((ids) =>
                                        e.target.checked
                                          ? [...ids, s.id]
                                          : ids.filter((id) => id !== s.id),
                                      )
                                    }
                                  />
                                  <span className="min-w-0 break-words text-sm">
                                    {s.full_name || "Unnamed Staff"}
                                    <span className="block text-xs text-slate-500">
                                      {s.email}
                                    </span>
                                    {conflictsFor(s.id).map((c) => (
                                      <span
                                        key={c.assignmentId}
                                        className="mt-2 block rounded-lg bg-amber-50 p-2 text-xs text-amber-900"
                                      >
                                        Schedule conflict: {c.title}
                                        <br />
                                        {date(c.start)} – {date(c.end)} (PH)
                                      </span>
                                    ))}
                                  </span>
                                </label>
                              ))}
                          </div>
                          {!available.length && (
                            <p className="text-sm text-slate-600">
                              No available approved staff. Staff may already be
                              assigned or need account activation.
                            </p>
                          )}
                          <div className="flex flex-wrap gap-3">
                            <button
                              disabled={busy || !chosen.length}
                              className={`${button} !bg-indigo-600 !text-white`}
                              onClick={() => void save()}
                            >
                              {busy
                                ? "Saving…"
                                : `Assign Selected Staff (${chosen.length})`}
                            </button>
                            <Link
                              className={button}
                              href="/dashboard/municipal/event-staff"
                              onClick={close}
                            >
                              {available.length
                                ? "Manage Staff Accounts"
                                : "Create / Manage Staff Account"}
                            </Link>
                          </div>
                          {active.length > 0 && (
                            <Link
                              className={`${button} w-full`}
                              href={`/dashboard/municipal/attendance/${encodeURIComponent(matched.id)}`}
                              onClick={close}
                            >
                              View Attendance Monitoring
                            </Link>
                          )}
                        </>
                      ) : (
                        <p
                          role="status"
                          className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
                        >
                          This event is not available for staff assignment. Save
                          its preparation as Ready with a venue first. Completed
                          or cancelled events cannot receive new assignments.
                        </p>
                      )}
                    </>
                  )}
                  {notice && (
                    <p
                      role="status"
                      className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900"
                    >
                      {notice}
                    </p>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </dialog>
    </Flow.Provider>
  );
}
export default function EventStaffAction({
  assignmentId,
  eventId,
  title,
  ready,
}: {
  assignmentId?: string;
  eventId?: string;
  title: string;
  ready: boolean;
}) {
  const flow = useContext(Flow);
  if (!flow) return null;
  const matched = flow.data.events.find((e) =>
    assignmentId ? e.id === assignmentId : e.event_id === eventId,
  );
  const count = flow.data.assignments.filter(
    (a) =>
      a.status === "active" &&
      a.event_municipality_id === (assignmentId || matched?.id),
  ).length;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-500">
        {!ready
          ? "Prepare event first"
          : flow.loading
            ? "Checking staff…"
            : flow.error
              ? "Staff count unavailable"
              : count
                ? `${count} staff assigned`
                : "No staff assigned"}
      </span>
      <button
        type="button"
        disabled={!ready}
        className="inline-flex min-h-9 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 disabled:opacity-50"
        onClick={() => flow.open({ assignmentId, eventId, title })}
      >
        {count ? "Manage Staff" : "Assign Staff"}
      </button>
    </div>
  );
}

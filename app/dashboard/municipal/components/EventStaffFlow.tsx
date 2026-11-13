"use client";

import { useLiveData } from "@/app/components/live/BackgroundDataSync";
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  createContext,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import EventStaffManager from "./EventStaffManager";
import {
  emptyStaffData,
  readStaffData,
  staffButton,
  staffPrimaryButton,
  type StaffData,
} from "./eventStaffData";
export { schedulesOverlap } from "./eventStaffData";

type Request = {
  assignmentId?: string;
  eventId?: string;
  title: string;
  prepared?: boolean;
  prompt?: boolean;
};
const Flow = createContext<{
  data: StaffData;
  loading: boolean;
  error: string;
  open: (request: Request) => void;
} | null>(null);
export function offerEventStaff(request: Request) {
  window.dispatchEvent(
    new CustomEvent("pagtipon:staff-next-step", { detail: request }),
  );
}
export function EventStaffFlowProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(emptyStaffData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [request, setRequest] = useState<Request | null>(null);
  const [prompt, setPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const mounted = useRef(false);
  const generation = useRef(0);
  const load = useCallback(async (silent = false) => {
    const ticket = ++generation.current;
    if (!silent) setLoading(true);
    try {
      const next = await readStaffData();
      if (mounted.current && generation.current === ticket) {
        setData(next);
        setError("");
      }
    } catch (e) {
      if (mounted.current && generation.current === ticket)
        setError(
          e instanceof Error ? e.message : "Unable to load staff counts.",
        );
    } finally {
      if (mounted.current && generation.current === ticket) setLoading(false);
    }
  }, []);
  const open = useCallback(
    (next: Request) => {
      previousFocus.current = document.activeElement as HTMLElement;
      setRequest(next);
      setPrompt(Boolean(next.prompt));
      void load(true);
    },
    [load],
  );
  useEffect(() => {
    mounted.current = true;
    void load();
    const offer = (event: globalThis.Event) =>
      open((event as CustomEvent<Request>).detail);
    const changed = () => void load(true);
    window.addEventListener("pagtipon:staff-next-step", offer);
    window.addEventListener("pagtipon:staff-assignments-changed", changed);
    return () => {
      mounted.current = false;
      generation.current++;
      window.removeEventListener("pagtipon:staff-next-step", offer);
      window.removeEventListener("pagtipon:staff-assignments-changed", changed);
    };
  }, [load, open]);
  useLiveData({
    onUpdate: () => load(true),
    disabled: loading || busy,
    pauseWhileEditing: false,
  });
  useEffect(() => {
    if (!request) return;
    dialog.current?.showModal();
    const body = document.body.style.overflow,
      html = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      dialog.current?.close();
      document.body.style.overflow = body;
      document.documentElement.style.overflow = html;
      previousFocus.current?.isConnected && previousFocus.current.focus();
    };
  }, [request]);
  function close() {
    if (!busy) {
      dialog.current?.close();
      setRequest(null);
    }
  }
  return (
    <Flow.Provider value={{ data, loading, error, open }}>
      {children}
      <dialog
        ref={dialog}
        aria-labelledby="event-staff-flow-title"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        className="m-auto h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col overflow-hidden border-0 bg-white p-0 shadow-2xl open:flex sm:h-auto sm:max-h-[90dvh] sm:w-[calc(100%_-_2rem)] sm:max-w-2xl sm:rounded-2xl backdrop:bg-slate-950/55"
      >
        {request && (
          <>
            <header className="flex shrink-0 items-start justify-between gap-3 border-b p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-indigo-600">
                  {prompt ? "Preparation saved" : "Event staff"}
                </p>
                <h2
                  id="event-staff-flow-title"
                  className="mt-1 text-xl font-bold"
                >
                  {prompt ? "Assign Event Staff Next" : "Manage Event Staff"}
                </h2>
                <p className="mt-1 break-words text-sm text-slate-600">
                  {request.title}
                </p>
              </div>
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
                onClick={close}
                disabled={busy}
                aria-label="Close staff assignment"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            {prompt ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto p-5 text-sm text-slate-600">
                  Preparation is saved. Assign staff to manage participant
                  Time-in and Time-out.
                </div>
                <footer className="flex shrink-0 justify-end gap-2 border-t p-4">
                  <button type="button" className={staffButton} onClick={close}>
                    Later
                  </button>
                  <button
                    type="button"
                    className={staffPrimaryButton}
                    onClick={() => setPrompt(false)}
                  >
                    Assign Staff
                  </button>
                </footer>
              </>
            ) : (
              <EventStaffManager
                key={request.assignmentId || request.eventId}
                assignmentId={request.assignmentId}
                eventId={request.eventId}
                onClose={close}
                onBusyChange={setBusy}
              />
            )}
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
  presentation = "inline",
  beforeOpen,
  statusOnly = false,
}: {
  assignmentId?: string;
  eventId?: string;
  title: string;
  ready: boolean;
  presentation?: "inline" | "panel";
  beforeOpen?: () => void;
  statusOnly?: boolean;
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
  if (statusOnly) {
    // The schedule snapshot also includes ongoing assignments, which are not
    // included among events eligible for a new assignment.
    const scheduleCount = new Set(
      flow.data.scheduleAssignments
        .filter((a) => a.assignmentId === (assignmentId || matched?.id))
        .map((a) => a.staffId),
    ).size;
    const assignedCount = Math.max(count, scheduleCount);
    return (
      <span
        className={`text-xs ${assignedCount ? "text-emerald-700" : "text-slate-500"}`}
      >
        {flow.loading
          ? "Checking staff…"
          : flow.error
            ? "Staff count unavailable"
            : assignedCount
              ? `${assignedCount} staff assigned`
              : "No assigned staff"}
      </span>
    );
  }
  return (
    <div
      className={
        presentation === "panel"
          ? "flex flex-col-reverse gap-2"
          : "flex flex-wrap items-center gap-2"
      }
    >
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
        className={
          presentation === "panel"
            ? "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            : "inline-flex min-h-9 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 disabled:opacity-50"
        }
        onClick={() => {
          beforeOpen?.();
          flow.open({ assignmentId, eventId, title });
        }}
      >
        {count ? "Manage Staff" : "Assign Staff"}
      </button>
    </div>
  );
}

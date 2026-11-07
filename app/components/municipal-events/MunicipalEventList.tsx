"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EventPreparationDialog from "@/app/dashboard/municipal/components/EventPreparationDialog";
import MunicipalEventTable from "@/app/dashboard/municipal/components/MunicipalEventTable";
import type { ReceivedEvent } from "@/app/dashboard/municipal/types/municipalDashboard";
import ReceivedEventCard from "@/app/dashboard/municipal/components/ReceivedEventCard";
import type { MunicipalVenue } from "@/app/dashboard/municipal/types/municipalDashboard";
import { ArrowRight, CalendarDays, RefreshCw, Search, UserRoundPlus } from "lucide-react";
import ProvincialPageHeader, {
  provincialHeaderButton,
  provincialHeaderPrimaryButton,
} from "@/app/dashboard/provincial/components/ProvincialPageHeader";
import VenueLocationButton from "@/app/components/VenueLocationButton";
import { municipalEventRequest, phDate } from "@/lib/municipal-events/client";
import type { MunicipalEvent } from "@/lib/municipal-events/types";
import { MUNICIPALITIES } from "@/lib/municipalities";
function toReceivedEvent(e: MunicipalEvent): ReceivedEvent {
  return {
    id: e.event_municipalities[0]?.id || e.id,
    event_id: e.id,
    municipality: e.owner_municipality,
    municipal_status: ["ready", "prepared"].includes(
      e.event_municipalities[0]?.municipal_status,
    )
      ? "prepared"
      : e.event_municipalities[0]?.municipal_status === "preparing"
        ? "preparing"
        : "pending",
    local_venue_id: e.event_municipalities[0]?.local_venue_id || null,
    local_instructions: e.event_municipalities[0]?.local_instructions || null,
    registration_open: e.event_municipalities[0]?.registration_open || false,
    registered_participants: 0,
    created_at: null,
    event: { ...e, event_origin: "municipal", created_at: null },
  };
}
export default function MunicipalEventList({
  monitor = false,
}: {
  monitor?: boolean;
}) {
  const router = useRouter();
  const [preparationId, setPreparationId] = useState<string | null>(null);
  const [venues, setVenues] = useState<MunicipalVenue[]>([]);
  const [events, setEvents] = useState<MunicipalEvent[]>([]),
    [municipality, setMunicipality] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [town, setTown] = useState("all"),
    [page, setPage] = useState(1);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await municipalEventRequest(
        monitor ? "/api/provincial/municipal-events" : "/api/municipal/events",
      );
      setEvents(result.events);
      setVenues(result.venues ?? []);
      setMunicipality(result.municipality || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load events.");
    } finally {
      setLoading(false);
    }
  }, [monitor]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          e.title.toLowerCase().includes(search.trim().toLowerCase()) &&
          (status === "all" || e.status === status) &&
          (town === "all" || e.owner_municipality === town),
      ),
    [events, search, status, town],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10)),
    current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * 10, current * 10);
  async function cancel(event: MunicipalEvent) {
    if (
      busy ||
      !window.confirm(
        `Cancel "${event.title}"? Registration will close. This cannot be undone.`,
      )
    )
      return;
    setBusy(event.id);
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.set("id", event.id);
      form.set("expected", event.updated_at);
      form.set("payload", JSON.stringify({ action: "cancelled" }));
      await municipalEventRequest("/api/municipal/events", {
        method: "POST",
        body: form,
      });
      setMessage("Event cancelled successfully.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to cancel event.");
    } finally {
      setBusy(null);
    }
  }
  async function deleteDraft(event: MunicipalEvent) {
    if (busy || !window.confirm(`Permanently delete "${event.title}"?`)) return;
    setBusy(event.id);
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.set("id", event.id);
      form.set("expected", event.updated_at);
      form.set("payload", JSON.stringify({ action: "deleted" }));
      await municipalEventRequest("/api/municipal/events", {
        method: "POST",
        body: form,
      });
      setMessage("Draft deleted.");
      await load();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to delete draft.",
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="space-y-6">
      {preparationId && !monitor && (
        <EventPreparationDialog
          assignmentId={preparationId}
          onClose={() => setPreparationId(null)}
          onUpdated={() => void load()}
        />
      )}
      <ProvincialPageHeader
        icon={<CalendarDays size={22} />}
        eyebrow={
          monitor ? "Municipal event monitoring" : "Municipal event management"
        }
        title="Municipal Events"
        description={
          monitor
            ? "View published municipal events across Antique. This page is read-only."
            : `Manage events created for ${municipality || "your municipality"}. Provincial assignments remain in Provincial Events.`
        }
        actions={
          <>
            <button
              type="button"
              className={provincialHeaderButton}
              disabled={loading}
              onClick={() => void load()}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            {!monitor && (
              <Link
                href="/dashboard/municipal/events/create"
                className={provincialHeaderPrimaryButton}
              >
                Create Event
              </Link>
            )}
          </>
        }
      />
      {/* Attendance setup reminder - Municipal Admin view only */}
      {!monitor && (
        <section
          aria-labelledby="event-staff-next-step"
          className="flex flex-col gap-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <UserRoundPlus className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="event-staff-next-step"
                className="text-base font-bold text-slate-900"
              >
                Next Step: Assign Event Staff
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                After publishing a municipal event, go to Event Staff and assign
                at least one active staff member to that specific event. Event
                Staff will manage participant Time In and Time Out through QR
                scanning or manual attendance codes.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/municipal/event-staff"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Assign Event Staff
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-emerald-900"
        >
          {message}
        </p>
      )}
      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-medium" htmlFor="local-event-search">
          Search event title
          <div className="relative mt-2">
            <Search
              aria-hidden="true"
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="local-event-search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3"
              placeholder="Type an event title…"
            />
          </div>
        </label>
        <label className="text-sm font-medium" htmlFor="local-event-status">
          Status
          <select
            id="local-event-status"
            className="mt-2 w-full rounded-xl border border-slate-300 p-3"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {[
              "all",
              ...(!monitor ? ["draft"] : []),
              "published",
              "upcoming",
              "ongoing",
              "completed",
              "cancelled",
            ].map((s) => (
              <option key={s} value={s}>
                {s === "all"
                  ? "All statuses"
                  : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>
        {monitor && (
          <label className="text-sm font-medium" htmlFor="local-event-town">
            Municipality
            <select
              id="local-event-town"
              className="mt-2 w-full rounded-xl border border-slate-300 p-3"
              value={town}
              onChange={(e) => {
                setTown(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All municipalities</option>
              {MUNICIPALITIES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        )}
      </section>
      {loading ? (
        <p role="status">Loading municipal events…</p>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border bg-white p-10 text-center text-slate-600">
          No municipal events found.
        </p>
      ) : (
        <div className="space-y-4">
          {!monitor ? (
            <MunicipalEventTable
              items={visible.map(toReceivedEvent)}
              renderActions={(item) => {
                const event = visible.find(
                  (event) => event.id === item.event_id,
                );
                if (!event) return null;

                if (["published", "upcoming", "ongoing"].includes(event.status)) {
                  return (
                    <Link
                      href="/dashboard/municipal/event-staff"
                      title={`Go to Event Staff and assign staff to ${event.title}`}
                      className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      Assign Staff
                    </Link>
                  );
                }

                if (event.status !== "draft") return null;

                return (
                  <>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
                      onClick={() =>
                        router.push(
                          `/dashboard/municipal/events/create?id=${encodeURIComponent(event.id)}`,
                        )
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700"
                      onClick={() => void deleteDraft(event)}
                    >
                      Delete
                    </button>
                  </>
                );
              }}
              renderDetails={(item, close) => {
                const e = visible.find((event) => event.id === item.event_id);
                if (!e) return null;
                return (
                  <ReceivedEventCard
                    key={e.id}
                    item={toReceivedEvent(e)}
                    venues={venues}
                    showParticipantCount={false}
                    onPrepare={() => {
                      close();
                      if (e.status === "draft")
                        router.push(
                          `/dashboard/municipal/events/create?id=${e.id}`,
                        );
                      else if (e.event_municipalities[0]?.id)
                        setPreparationId(e.event_municipalities[0].id);
                    }}
                    extraActions={
                      <>
                        {["published", "upcoming", "ongoing"].includes(
                          e.status,
                        ) && (
                          <Link
                            href="/dashboard/municipal/event-staff"
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            <UserRoundPlus className="h-4 w-4" />
                            Assign / Manage Event Staff
                          </Link>
                        )}
                        {["draft", "published", "upcoming"].includes(
                          e.status,
                        ) && (
                          <button
                            type="button"
                            disabled={Boolean(busy)}
                            onClick={() => void cancel(e)}
                            className="rounded-xl border border-red-200 bg-white p-3 font-semibold text-red-700 disabled:opacity-50"
                          >
                            {busy === e.id ? "Cancelling…" : "Cancel Event"}
                          </button>
                        )}
                      </>
                    }
                  />
                );
              }}
            />
          ) : (
            visible.map((e) => (
              <article
                key={e.id}
                className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                      Municipal event · {e.owner_municipality}
                    </p>
                    <h2 className="mt-2 break-words text-xl font-bold">
                      {e.title}
                    </h2>
                  </div>
                  <span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-sm capitalize">
                    {e.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  {phDate(e.start_at)}
                  {e.end_at ? ` – ${phDate(e.end_at)}` : ""} · PH
                </p>
                <details>
                  <summary className="cursor-pointer font-medium text-indigo-700">
                    View event details
                  </summary>
                  <div className="mt-3 space-y-3 text-sm text-slate-600">
                    <p className="whitespace-pre-wrap break-words">
                      {e.description || "No description yet."}
                    </p>
                    <p>
                      Audience:{" "}
                      {e.audience_type === "all"
                        ? "Open to all"
                        : e.audience_type === "categories"
                          ? e.audience_categories.join(", ")
                          : "Not selected"}
                      {e.audience_category_other
                        ? ` · ${e.audience_category_other}`
                        : ""}
                    </p>
                    <p className="whitespace-pre-wrap">
                      Local instructions:{" "}
                      {e.event_municipalities[0]?.local_instructions || "None"}
                    </p>
                    <p>
                      Registration:{" "}
                      {e.event_municipalities[0]?.registration_open
                        ? "Open"
                        : "Closed"}
                    </p>
                    {e.memo_url && (
                      <a
                        href={e.memo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-indigo-700 underline"
                      >
                        {e.memo_filename || "Approval document"}
                      </a>
                    )}
                    {e.municipal_approval_recorded_at && (
                      <p>
                        Municipal approval confirmation recorded:{" "}
                        {phDate(e.municipal_approval_recorded_at)}
                      </p>
                    )}
                    {e.event_municipalities[0]?.local_venue_id && (
                      <VenueLocationButton
                        venueId={e.event_municipalities[0].local_venue_id}
                        label="View venue map & photos"
                      />
                    )}
                  </div>
                </details>
                {!monitor && (
                  <div className="flex flex-wrap gap-3">
                    {e.status === "draft" && (
                      <Link
                        href={`/dashboard/municipal/events/create?id=${e.id}`}
                        className="rounded-xl border border-indigo-200 px-4 py-2 font-semibold text-indigo-700"
                      >
                        Continue Draft
                      </Link>
                    )}
                    {["published", "upcoming"].includes(e.status) && (
                      <Link
                        href="/dashboard/municipal/preparations"
                        className="rounded-xl border border-slate-300 px-4 py-2 font-semibold"
                      >
                        Event Preparation
                      </Link>
                    )}
                    {["draft", "published", "upcoming"].includes(e.status) && (
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => void cancel(e)}
                        className="rounded-xl border border-red-200 px-4 py-2 font-semibold text-red-700 disabled:opacity-50"
                      >
                        {busy === e.id ? "Cancelling…" : "Cancel Event"}
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <span>
          Showing {filtered.length ? (current - 1) * 10 + 1 : 0}–
          {Math.min(current * 10, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={current <= 1}
            onClick={() => setPage(current - 1)}
            className="rounded-xl border bg-white px-3 py-2 disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            {current} / {pages}
          </span>
          <button
            type="button"
            disabled={current >= pages}
            onClick={() => setPage(current + 1)}
            className="rounded-xl border bg-white px-3 py-2 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

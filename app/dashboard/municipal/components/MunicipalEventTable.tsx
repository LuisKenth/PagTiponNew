"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import EventsTable from "../../provincial/events/components/EventsTable";
import type { EventWithMunicipalities } from "../../provincial/events/types";
import type { ReceivedEvent } from "../types/municipalDashboard";

const noop = () => {};

export default function MunicipalEventTable({
  items,
  renderDetails,
  renderActions,
}: {
  items: ReceivedEvent[];
  renderActions?: (item: ReceivedEvent) => ReactNode;
  renderDetails: (item: ReceivedEvent, close: () => void) => ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  useEffect(() => {
    const tick = () => setCurrentTime(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
  const selected = items.find((item) => item.id === selectedId);
  const events: EventWithMunicipalities[] = items.map((item) => ({
    id: item.id,
    title: item.event?.title ?? null,
    description: item.event?.description ?? null,
    start_at: item.event?.start_at ?? null,
    end_at: item.event?.end_at ?? null,
    memo_url: item.event?.memo_url ?? null,
    memo_filename: item.event?.memo_filename ?? null,
    status: item.event?.status ?? null,
    created_at: item.created_at,
    updated_at: null,
    municipalities: item.municipality
      ? [
          {
            id: item.id,
            event_id: item.event_id,
            municipality: item.municipality,
            preparation_status:
              item.municipal_status === "prepared"
                ? "ready"
                : item.municipal_status,
          },
        ]
      : [],
  }));
  return (
    <>
      <EventsTable
        events={events}
        loading={false}
        currentTime={currentTime}
        isFiltered={false}
        deletingId={null}
        publishingId={null}
        cancellingId={null}
        onDelete={noop}
        onPublish={noop}
        onCancel={noop}
        onClearFilters={noop}
        extraActions={
          renderActions
            ? (event) => {
                const item = items.find((item) => item.id === event.id);
                return item && renderActions(item);
              }
            : undefined
        }
        onView={(event) => {
          setSelectedId(event.id);
          dialog.current?.showModal();
        }}
      />
      <dialog
        ref={dialog}
        aria-label="Event details"
        onClose={() => setSelectedId(null)}
        className="m-auto max-h-[90dvh] w-[min(94vw,1050px)] max-w-none overflow-y-auto rounded-2xl bg-white p-4 shadow-xl backdrop:bg-slate-950/50 sm:p-6"
      >
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
            onClick={() => dialog.current?.close()}
          >
            Close
          </button>
        </div>
        {selected && renderDetails(selected, () => dialog.current?.close())}
      </dialog>
    </>
  );
}

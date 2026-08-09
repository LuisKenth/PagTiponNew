"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  QrCode,
  Search,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";

import type {
  MunicipalRegistration,
} from "../types/municipalRegistrations";

import {
  formatRegistrationDate,
  isCancelledRegistration,
  normalizeValue,
} from "../utils/municipalRegistrationsUtils";

type RegistrationEventGroup = {
  eventMunicipalityId: string;
  eventTitle: string;
  registrations: MunicipalRegistration[];
  registrationCount: number;
  qrReadyCount: number;
  isCancelled: boolean;
};

type RegistrationsTableProps = {
  eventGroups: RegistrationEventGroup[];
  loading: boolean;
  errorMessage: string | null;
};

function formatParticipantCategory(
  category: string | null,
) {
  const normalized = String(
    category ?? "",
  )
    .trim()
    .toLowerCase();

  if (!normalized) {
    return "Not specified";
  }

  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

export default function RegistrationsTable({
  eventGroups,
  loading,
  errorMessage,
}: RegistrationsTableProps) {
  const [
    expandedEventIds,
    setExpandedEventIds,
  ] = useState<Set<string>>(
    new Set(),
  );

  /*
   * Automatically expand the event when only
   * one event matches the current filters.
   */
  useEffect(() => {
    setExpandedEventIds(
      (previousIds) => {
        const visibleEventIds =
          new Set(
            eventGroups.map(
              (group) =>
                group.eventMunicipalityId,
            ),
          );

        const nextIds = new Set(
          Array.from(
            previousIds,
          ).filter((eventId) =>
            visibleEventIds.has(
              eventId,
            ),
          ),
        );

        if (eventGroups.length === 1) {
          nextIds.add(
            eventGroups[0]
              .eventMunicipalityId,
          );
        }

        return nextIds;
      },
    );
  }, [eventGroups]);

  function toggleEvent(
    eventMunicipalityId: string,
  ) {
    setExpandedEventIds(
      (previousIds) => {
        const nextIds = new Set(
          previousIds,
        );

        if (
          nextIds.has(
            eventMunicipalityId,
          )
        ) {
          nextIds.delete(
            eventMunicipalityId,
          );
        } else {
          nextIds.add(
            eventMunicipalityId,
          );
        }

        return nextIds;
      },
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 p-5 sm:p-6">
        {[1, 2, 3].map(
          (item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-xl bg-slate-100"
            />
          ),
        )}
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-5 sm:p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {errorMessage}
        </div>
      </div>
    );
  }

  if (eventGroups.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
        <Search className="h-10 w-10 text-slate-300" />

        <h3 className="mt-4 text-base font-bold text-slate-900">
          No registrations found
        </h3>

        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          No participant registrations
          match the selected event and
          filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-slate-50/60 p-4 sm:p-5">
      {eventGroups.map(
        (eventGroup) => {
          const expanded =
            expandedEventIds.has(
              eventGroup.eventMunicipalityId,
            );

          return (
            <section
              key={
                eventGroup.eventMunicipalityId
              }
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${eventGroup.isCancelled
                ? "border-red-200"
                : "border-slate-200"
                }`}
            >
              {/* Event group heading */}
              <button
                type="button"
                onClick={() =>
                  toggleEvent(
                    eventGroup.eventMunicipalityId,
                  )
                }
                aria-expanded={expanded}
                className={`flex w-full flex-col gap-4 p-4 text-left transition sm:flex-row sm:items-center sm:justify-between sm:p-5 ${eventGroup.isCancelled
                  ? "bg-red-50/70 hover:bg-red-50"
                  : "bg-white hover:bg-slate-50"
                  }`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${eventGroup.isCancelled
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-950 text-white"
                      }`}
                  >
                    <CalendarDays className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                      Provincial Event
                    </p>

                    <h3
                      className={`mt-1 text-base font-bold sm:text-lg ${eventGroup.isCancelled
                        ? "text-red-950"
                        : "text-slate-950"
                        }`}
                    >
                      {
                        eventGroup.eventTitle
                      }
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${eventGroup.isCancelled
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                          }`}
                      >
                        {eventGroup.isCancelled
                          ? "Cancelled Event"
                          : "Active Event"}
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        <UsersRound className="h-3.5 w-3.5" />

                        {
                          eventGroup.registrationCount
                        }{" "}
                        {eventGroup.registrationCount ===
                          1
                          ? "registration"
                          : "registrations"}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${eventGroup.isCancelled
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                          }`}
                      >
                        <QrCode className="h-3.5 w-3.5" />

                        {
                          eventGroup.qrReadyCount
                        }{" "}
                        QR ready
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className={`flex shrink-0 items-center justify-center gap-2 self-stretch rounded-xl border px-3 py-2 text-sm font-semibold sm:self-auto ${eventGroup.isCancelled
                    ? "border-red-200 bg-white text-red-700"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                >
                  {expanded
                    ? "Hide participants"
                    : "View participants"}

                  {expanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </button>

              {/* Participant records */}
              {expanded && (
                <div className="border-t border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-[1050px] w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            Participant
                          </th>

                          <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            Participant Category
                          </th>

                          <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            Status
                          </th>

                          <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            Registered
                          </th>

                          <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            QR
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-200 bg-white">
                        {eventGroup.registrations.map(
                          (
                            registration,
                          ) => {
                            const cancelled =
                              eventGroup.isCancelled ||
                              isCancelledRegistration(
                                registration,
                              );

                            const registered =
                              normalizeValue(
                                registration.rsvp_status,
                              ) ===
                              "registered";

                            const qrActive =
                              registration.qr_available &&
                              !cancelled;

                            return (
                              <tr
                                key={
                                  registration.rsvp_id
                                }
                                className={
                                  cancelled
                                    ? "bg-red-50/30"
                                    : "hover:bg-slate-50"
                                }
                              >
                                <td className="px-5 py-4 align-top">
                                  <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                      <UserRound className="h-4 w-4" />
                                    </div>

                                    <div className="min-w-0">
                                      <p className="font-semibold text-slate-900">
                                        {
                                          registration.participant_name
                                        }
                                      </p>

                                      <p className="mt-0.5 text-sm text-slate-500">
                                        {
                                          registration.participant_email
                                        }
                                      </p>

                                      {registration.participant_municipality && (
                                        <p className="mt-0.5 text-xs text-slate-400">
                                          {
                                            registration.participant_municipality
                                          }
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                <td className="px-5 py-4 align-top">
                                  {registration.participant_category ? (
                                    <div>
                                      <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                                        {formatParticipantCategory(
                                          registration.participant_category,
                                        )}
                                      </span>

                                      {normalizeValue(
                                        registration.participant_category,
                                      ) === "others" &&
                                        registration.participant_category_other && (
                                          <p className="mt-1.5 max-w-[200px] text-xs leading-5 text-slate-500">
                                            {
                                              registration.participant_category_other
                                            }
                                          </p>
                                        )}
                                    </div>
                                  ) : (
                                    <span className="text-sm text-slate-400">
                                      Not specified
                                    </span>
                                  )}
                                </td>

                                <td className="px-5 py-4 align-top">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${cancelled
                                      ? "bg-red-100 text-red-700"
                                      : registered
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-amber-100 text-amber-700"
                                      }`}
                                  >
                                    {cancelled
                                      ? "Cancelled"
                                      : registered
                                        ? "Registered"
                                        : "Pending"}
                                  </span>
                                </td>

                                <td className="whitespace-nowrap px-5 py-4 align-top text-sm text-slate-600">
                                  {formatRegistrationDate(
                                    registration.registered_at,
                                  )}
                                </td>

                                <td className="px-5 py-4 align-top">
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cancelled
                                      ? "bg-red-100 text-red-700"
                                      : qrActive
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-slate-100 text-slate-500"
                                      }`}
                                  >
                                    {cancelled ? (
                                      <XCircle className="h-3.5 w-3.5" />
                                    ) : qrActive ? (
                                      <QrCode className="h-3.5 w-3.5" />
                                    ) : (
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    )}

                                    {cancelled
                                      ? "Inactive"
                                      : qrActive
                                        ? "Generated"
                                        : "Missing"}
                                  </span>
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          );
        },
      )}
    </div>
  );
}
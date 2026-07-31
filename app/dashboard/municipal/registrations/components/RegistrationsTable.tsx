import {
  CheckCircle2,
  QrCode,
  Search,
  UserRound,
} from "lucide-react";

import type {
  MunicipalRegistration,
} from "../types/municipalRegistrations";

import {
  formatRegistrationDate,
  isCancelledRegistration,
  normalizeValue,
} from "../utils/municipalRegistrationsUtils";

type RegistrationsTableProps = {
  registrations:
    MunicipalRegistration[];
  loading: boolean;
  errorMessage: string | null;
};

export default function RegistrationsTable({
  registrations,
  loading,
  errorMessage,
}: RegistrationsTableProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-5 sm:p-6">
        {[1, 2, 3, 4].map(
          (item) => (
            <div
              key={item}
              className="h-16 animate-pulse rounded-xl bg-slate-100"
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

  if (registrations.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
        <Search className="h-10 w-10 text-slate-300" />

        <h3 className="mt-4 text-base font-bold text-slate-900">
          No registrations found
        </h3>

        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          No participant registrations match
          the selected event and filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              Participant
            </th>

            <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              Event
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
          {registrations.map(
            (registration) => {
              const cancelled =
                isCancelledRegistration(
                  registration,
                );

              const registered =
                normalizeValue(
                  registration.rsvp_status,
                ) === "registered";

              return (
                <tr
                  key={
                    registration.rsvp_id
                  }
                  className={
                    cancelled
                      ? "bg-red-50/40"
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
                    <p
                      className={`font-semibold ${
                        cancelled
                          ? "text-red-900"
                          : "text-slate-800"
                      }`}
                    >
                      {
                        registration.event_title
                      }
                    </p>

                    {cancelled && (
                      <p className="mt-1 text-xs font-semibold text-red-600">
                        Cancelled event
                      </p>
                    )}
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        registered
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {registered
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
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        registration.qr_available
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {registration.qr_available ? (
                        <QrCode className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}

                      {registration.qr_available
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
  );
}

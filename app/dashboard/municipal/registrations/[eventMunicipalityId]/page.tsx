"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  Download,
  Search,
  UsersRound,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

import RegistrationsPagination from "../components/RegistrationsPagination";

import type {
  MunicipalRegistration,
} from "../types/municipalRegistrations";

import {
  formatRegistrationDate,
  isCancelledRegistration,
  normalizeValue,
} from "../utils/municipalRegistrationsUtils";

import {
  exportRegistrationsCsv,
} from "../utils/exportRegistrationsCsv";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function EventParticipantsPage() {
  const params = useParams<{
    eventMunicipalityId: string;
  }>();

  const eventMunicipalityId =
    params.eventMunicipalityId;

  const [registrations, setRegistrations] =
    useState<MunicipalRegistration[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let isMounted = true;

    async function loadParticipants() {
      setLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase.rpc(
        "get_municipal_registrations",
        {
          p_event_municipality_id:
            eventMunicipalityId,
        },
      );

      if (!isMounted) {
        return;
      }

      if (error) {
        setRegistrations([]);
        setErrorMessage(error.message);
      } else {
        setRegistrations(
          (data ?? []) as MunicipalRegistration[],
        );
      }

      setLoading(false);
    }

    if (eventMunicipalityId) {
      void loadParticipants();
    }

    return () => {
      isMounted = false;
    };
  }, [eventMunicipalityId]);

  const filteredRegistrations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return registrations;
    }

    return registrations.filter((registration) => {
      const searchableText = [
        registration.participant_name,
        registration.participant_email,
        registration.participant_municipality,
        registration.participant_category,
        registration.participant_category_other,
      ]
        .map((value) => String(value ?? ""))
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [registrations, searchTerm]);

  const totalItems = filteredRegistrations.length;

  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / pageSize),
  );

  const paginatedRegistrations = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredRegistrations.slice(
      startIndex,
      startIndex + pageSize,
    );
  }, [
    currentPage,
    filteredRegistrations,
    pageSize,
  ]);

  const firstVisibleItem =
    totalItems === 0
      ? 0
      : (currentPage - 1) * pageSize + 1;

  const lastVisibleItem = Math.min(
    currentPage * pageSize,
    totalItems,
  );

  const eventTitle =
    registrations[0]?.event_title ??
    "Event Participants";

  const qrReadyCount = registrations.filter(
    (registration) =>
      registration.qr_available &&
      !isCancelledRegistration(registration),
  ).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  useEffect(() => {
    setCurrentPage((previousPage) =>
      Math.min(previousPage, totalPages),
    );
  }, [totalPages]);

  function handleExport() {
    exportRegistrationsCsv({
      registrations: filteredRegistrations,
      eventTitle,
    });
  }

  function handlePageSizeChange(value: number) {
    setPageSize(value);
    setCurrentPage(1);
  }

  function goToPreviousPage() {
    setCurrentPage((previousPage) =>
      Math.max(1, previousPage - 1),
    );
  }

  function goToNextPage() {
    setCurrentPage((previousPage) =>
      Math.min(totalPages, previousPage + 1),
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/municipal/registrations"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Registrations
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
              <UsersRound className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                Event Participants
              </p>

              <h1 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">
                {eventTitle}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {registrations.length}{" "}
                {registrations.length === 1
                  ? "registration"
                  : "registrations"}
                {" · "}
                {qrReadyCount} QR ready
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={
              loading || filteredRegistrations.length === 0
            }
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        <div className="mt-5">
          <label
            htmlFor="participant-search"
            className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
          >
            Search Participants
          </label>

          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              id="participant-search"
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search name, email, municipality, or category"
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : errorMessage ? (
          <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : totalItems === 0 ? (
          <div className="p-10 text-center">
            <h2 className="font-bold text-slate-900">
              {registrations.length === 0
                ? "No participants registered"
                : "No matching participants"}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {registrations.length === 0
                ? "Registrations for this event will appear here."
                : "Try another search term."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Participant
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Category
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

              <tbody className="divide-y divide-slate-200">
                {paginatedRegistrations.map(
                  (registration) => {
                    const cancelled =
                      isCancelledRegistration(registration);

                    const isRegistered =
                      normalizeValue(
                        registration.rsvp_status,
                      ) === "registered";

                    const qrActive =
                      registration.qr_available &&
                      !cancelled;

                    return (
                      <tr
                        key={registration.rsvp_id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {registration.participant_name}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {registration.participant_email}
                          </p>
                          {registration.participant_municipality && (
                            <p className="mt-0.5 text-xs text-slate-400">
                              {registration.participant_municipality}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {registration.participant_category ? (
                            <>
                              <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                                {registration.participant_category
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, (character) =>
                                    character.toUpperCase(),
                                  )}
                              </span>

                              {normalizeValue(
                                registration.participant_category,
                              ) === "others" &&
                                registration.participant_category_other && (
                                  <p className="mt-1.5 text-xs text-slate-500">
                                    {registration.participant_category_other}
                                  </p>
                                )}
                            </>
                          ) : (
                            <span className="text-sm text-slate-400">
                              Not specified
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              cancelled
                                ? "bg-red-100 text-red-700"
                                : isRegistered
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {cancelled
                              ? "Cancelled"
                              : isRegistered
                                ? "Registered"
                                : "Pending"}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {formatRegistrationDate(
                            registration.registered_at,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              cancelled
                                ? "bg-red-100 text-red-700"
                                : qrActive
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-500"
                            }`}
                          >
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
        )}

        {!loading && !errorMessage && totalItems > 0 && (
          <RegistrationsPagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            firstVisibleItem={firstVisibleItem}
            lastVisibleItem={lastVisibleItem}
            onPageSizeChange={handlePageSizeChange}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
          />
        )}
      </section>
    </div>
  );
}
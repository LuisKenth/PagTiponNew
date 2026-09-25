"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Award,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type CertificateEvent = {
  event_id: string;
  event_title: string;
  event_start_at: string;
  event_end_at: string;

  attendance_id: string;

  checked_in_at: string;
  checked_out_at: string;

  certificate_id: string | null;
  certificate_number: string | null;
  issued_at: string | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

/*
 * Safely reads Supabase/PostgREST error messages.
 *
 * Supabase errors are not always instances of Error,
 * so we cannot rely only on:
 *
 * err instanceof Error
 */
function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return "";
}

function getErrorHint(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "hint" in error
  ) {
    const hint = (error as { hint?: unknown }).hint;

    if (typeof hint === "string") {
      return hint;
    }
  }

  return "";
}

/*
 * Detects the database protection that prevents
 * certificate issuance when Signatory 1 has not
 * yet been configured by the Provincial Admin.
 */
function isMissingSignatoryError(error: unknown) {
  const errorText = [
    getErrorMessage(error),
    getErrorHint(error),
  ]
    .join(" ")
    .toLowerCase();

  return (
    errorText.includes("signatory") &&
    (
      errorText.includes("not been configured") ||
      errorText.includes("configure signatory")
    )
  );
}

export default function ParticipantCertificatesPage() {
  const router = useRouter();

  const [events, setEvents] = useState<CertificateEvent[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [openingEventId, setOpeningEventId] = useState<
    string | null
  >(null);

  /*
   * General page/data loading errors.
   */
  const [error, setError] = useState<string | null>(null);

  /*
   * Participant-friendly certificate availability warning.
   *
   * This is intentionally separate from `error`
   * so a missing signatory does not look like
   * a system failure to the participant.
   */
  const [
    certificateWarning,
    setCertificateWarning,
  ] = useState<string | null>(null);

  const fetchCertificates = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);

        /*
         * Manual refresh gives the participant
         * a clean certificate state.
         */
        setCertificateWarning(null);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        const {
          data,
          error: rpcError,
        } = await supabase.rpc(
          "get_my_certificate_events",
        );

        if (rpcError) {
          throw rpcError;
        }

        setEvents(
          (data ?? []) as CertificateEvent[],
        );
      } catch (err) {
        console.error(
          "Certificate events error:",
          err,
        );

        const message = getErrorMessage(err);

        setError(
          message ||
            "Unable to load certificates.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router],
  );

  useEffect(() => {
    void fetchCertificates();
  }, [fetchCertificates]);

  async function handleViewCertificate(
    eventId: string,
  ) {
    if (openingEventId) {
      return;
    }

    setOpeningEventId(eventId);

    /*
     * Clear previous messages before a new attempt.
     */
    setError(null);
    setCertificateWarning(null);

    try {
      /*
       * The database performs the real eligibility
       * validation here.
       *
       * We do NOT modify attendance.
       */
      const {
        error: issueError,
      } = await supabase.rpc(
        "issue_my_certificate",
        {
          p_event_id: eventId,
        },
      );

      if (issueError) {
        throw issueError;
      }

      /*
       * Certificate issuance succeeded.
       * Open the actual certificate page.
       */
      router.push(
        `/dashboard/participant/certificates/${eventId}`,
      );
    } catch (err) {
      /*
       * Keep the real technical error available
       * for development/debugging.
       */
      console.error(
        "Certificate issue error:",
        err,
      );

      /*
       * Missing certificate signatory is not shown
       * to the participant as a technical/database
       * error.
       */
      if (isMissingSignatoryError(err)) {
        setCertificateWarning(
          "Your certificate is not yet available because the event certificate signatory has not been configured by the Provincial Admin. Please check again later.",
        );

        return;
      }

      /*
       * Any unexpected certificate issuance error
       * receives a safe participant-friendly message.
       */
      setError(
        "Unable to open your certificate right now. Please try again.",
      );
    } finally {
      setOpeningEventId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Award className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Certificates
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                View and download your Certificate of
                Participation for completed events where
                both Check-In and Check-Out were recorded.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={refreshing}
            onClick={() =>
              void fetchCertificates(true)
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>
      </section>

      {/* ELIGIBILITY INFORMATION */}
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <div className="flex gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

          <div>
            <p className="text-sm font-semibold text-emerald-900">
              Certificate eligibility
            </p>

            <p className="mt-1 text-sm leading-6 text-emerald-800">
              Certificates become available only
              after the event is completed and your
              attendance has both a recorded
              Check-In and Check-Out.
            </p>
          </div>
        </div>
      </section>

      {/* CERTIFICATE AVAILABILITY WARNING */}
      {certificateWarning && (
        <section
          role="alert"
          aria-live="polite"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

            <div>
              <p className="text-sm font-semibold text-amber-900">
                Certificate Not Yet Available
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                {certificateWarning}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* GENERAL ERROR */}
      {error && (
        <section
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4"
        >
          <p className="text-sm font-semibold text-red-800">
            Unable to process certificate
          </p>

          <p className="mt-1 text-sm leading-6 text-red-700">
            {error}
          </p>
        </section>
      )}

      {/* LOADING */}
      {loading ? (
        <section className="flex min-h-[280px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-slate-500" />

            <p className="text-sm text-slate-500">
              Loading eligible certificates...
            </p>
          </div>
        </section>
      ) : events.length === 0 ? (
        /* EMPTY STATE */
        <section className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Award className="h-7 w-7 text-slate-500" />
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            No certificates available yet
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            Your eligible certificates will appear
            here after an event has ended and your
            complete attendance has been recorded.
          </p>
        </section>
      ) : (
        /* CERTIFICATE CARDS */
        <section className="grid gap-4">
          {events.map((event) => {
            const isOpening =
              openingEventId === event.event_id;

            const alreadyIssued =
              Boolean(event.certificate_id);

            return (
              <article
                key={event.event_id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    {/* EVENT INFORMATION */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />

                          Eligible
                        </span>

                        {alreadyIssued && (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            Certificate Issued
                          </span>
                        )}
                      </div>

                      <h2 className="mt-3 text-lg font-bold text-slate-900 sm:text-xl">
                        {event.event_title}
                      </h2>

                      <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                        {/* EVENT DATE */}
                        <div className="flex items-start gap-2">
                          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                          <div>
                            <p className="font-medium text-slate-800">
                              Event Date
                            </p>

                            <p>
                              {formatDate(
                                event.event_start_at,
                              )}
                            </p>
                          </div>
                        </div>

                        {/* ATTENDANCE */}
                        <div className="flex items-start gap-2">
                          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                          <div>
                            <p className="font-medium text-slate-800">
                              Attendance
                            </p>

                            <p>
                              {formatTime(
                                event.checked_in_at,
                              )}

                              {" – "}

                              {formatTime(
                                event.checked_out_at,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* CERTIFICATE NUMBER */}
                      {event.certificate_number && (
                        <div className="mt-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Certificate Number
                          </p>

                          <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                            {
                              event.certificate_number
                            }
                          </p>
                        </div>
                      )}
                    </div>

                    {/* VIEW CERTIFICATE */}
                    <div className="shrink-0">
                      <button
                        type="button"
                        disabled={
                          Boolean(openingEventId)
                        }
                        onClick={() =>
                          void handleViewCertificate(
                            event.event_id,
                          )
                        }
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
                      >
                        {isOpening ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}

                        {isOpening
                          ? "Opening..."
                          : "View Certificate"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
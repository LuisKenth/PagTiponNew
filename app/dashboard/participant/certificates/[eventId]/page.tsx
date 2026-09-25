"use client";

import { ArrowLeft, Award, Download, Loader2, Printer } from "lucide-react";

import { useCallback, useEffect, useRef, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type CertificateSignatory = {
  position: number;
  name: string;
  title: string;
};

type CertificateData = {
  certificate_id: string;
  certificate_number: string;
  issued_at: string;

  participant_name: string;

  event_id: string;
  event_title: string;

  event_start_at: string;
  event_end_at: string;

  checked_in_at: string;
  checked_out_at: string;

  signatories: CertificateSignatory[];
};

function formatEventDate(startValue: string, endValue: string) {
  const start = new Date(startValue);
  const end = new Date(endValue);

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  const formatter = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });

  if (sameDay) {
    return formatter.format(start);
  }

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export default function ParticipantCertificatePage() {
  const router = useRouter();

  const params = useParams<{
    eventId: string;
  }>();

  const certificateRef = useRef<HTMLDivElement | null>(null);

  const [certificate, setCertificate] = useState<CertificateData | null>(null);

  const [loading, setLoading] = useState(true);

  const [downloading, setDownloading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const eventId = params.eventId;

  const loadCertificate = useCallback(async () => {
    if (!eventId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      /*
       * Make sure certificate exists.
       *
       * If already issued, the RPC returns
       * the existing certificate.
       */
      const { error: issueError } = await supabase.rpc("issue_my_certificate", {
        p_event_id: eventId,
      });

      if (issueError) {
        throw issueError;
      }

      /*
       * Get full certificate information.
       */
      const { data, error: certificateError } = await supabase.rpc(
        "get_my_certificate",
        {
          p_event_id: eventId,
        },
      );

      if (certificateError) {
        throw certificateError;
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (!result) {
        throw new Error("Certificate could not be found.");
      }

      setCertificate(result as CertificateData);
    } catch (err) {
      console.error("Certificate loading error:", err);

      setError(
        err instanceof Error ? err.message : "Unable to load certificate.",
      );
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadCertificate();
  }, [loadCertificate]);

  function handlePrint() {
    window.print();
  }

  async function handleDownloadPdf() {
    if (!certificateRef.current || !certificate) {
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      const html2canvasModule = await import("html2canvas-pro");

      const jsPdfModule = await import("jspdf");

      const html2canvas = html2canvasModule.default;

      const { jsPDF } = jsPdfModule;

      const element = certificateRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const image = canvas.toDataURL("image/png", 1.0);

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();

      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 8;

      const availableWidth = pageWidth - margin * 2;

      const availableHeight = pageHeight - margin * 2;

      const imageRatio = canvas.width / canvas.height;

      let renderWidth = availableWidth;

      let renderHeight = renderWidth / imageRatio;

      if (renderHeight > availableHeight) {
        renderHeight = availableHeight;

        renderWidth = renderHeight * imageRatio;
      }

      const x = (pageWidth - renderWidth) / 2;

      const y = (pageHeight - renderHeight) / 2;

      pdf.addImage(image, "PNG", x, y, renderWidth, renderHeight);

      const safeNumber = certificate.certificate_number.replace(
        /[^a-zA-Z0-9-_]/g,
        "-",
      );

      pdf.save(`PagTipon-Certificate-${safeNumber}.pdf`);
    } catch (err) {
      console.error("Certificate PDF error:", err);

      setError("Unable to download the certificate PDF.");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />

          <p className="text-sm text-slate-500">Loading certificate...</p>
        </div>
      </div>
    );
  }

  if (error && !certificate) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => router.push("/dashboard/participant/certificates")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Certificates
        </button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="font-bold text-red-900">Certificate unavailable</h1>

          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return null;
  }

  const eventDate = formatEventDate(
    certificate.event_start_at,
    certificate.event_end_at,
  );

  const signatories = Array.isArray(certificate.signatories)
    ? certificate.signatories
    : [];

  return (
    <>
      {/*
       * Print rules:
       *
       * The sidebar/header are hidden during print
       * and only the certificate itself is shown.
       */}
      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 0;
        }

        @media print {
          html,
          body {
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: white !important;
          }

          body * {
            visibility: hidden !important;
          }

          #certificate-print-area,
          #certificate-print-area * {
            visibility: visible !important;
          }

          #certificate-print-area {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;

            width: 297mm !important;
            height: 210mm !important;

            min-width: 0 !important;
            max-width: none !important;

            min-height: 0 !important;
            max-height: 210mm !important;

            margin: 0 !important;
            padding: 5mm !important;

            box-sizing: border-box !important;
            overflow: hidden !important;

            aspect-ratio: auto !important;

            box-shadow: none !important;
            transform: none !important;

            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="space-y-5 pb-10">
        {/* Top bar */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push("/dashboard/participant/certificates")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Certificates
            </button>

            <h1 className="mt-3 text-xl font-bold text-slate-950 sm:text-2xl">
              Certificate of Participation
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {certificate.event_title}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>

            <button
              type="button"
              disabled={downloading}
              onClick={() => void handleDownloadPdf()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}

              {downloading ? "Preparing PDF..." : "Download PDF"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {/* Certificate viewer */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 p-4 sm:p-6">
          <div
            ref={certificateRef}
            id="certificate-print-area"
            className="relative mx-auto aspect-[1.414/1] min-w-[900px] max-w-[1120px] overflow-hidden bg-[#fffdf7] p-5 shadow-xl"
          >
            {/* Outer frame */}
            <div className="relative h-full border-[6px] border-slate-900 p-2">
              {/* Inner frame */}
              <div className="relative flex h-full flex-col border-2 border-amber-700 px-16 py-10 text-center">
                {/* Corner decoration */}
                <div className="absolute left-4 top-4 h-16 w-16 border-l-2 border-t-2 border-amber-700" />

                <div className="absolute right-4 top-4 h-16 w-16 border-r-2 border-t-2 border-amber-700" />

                <div className="absolute bottom-4 left-4 h-16 w-16 border-b-2 border-l-2 border-amber-700" />

                <div className="absolute bottom-4 right-4 h-16 w-16 border-b-2 border-r-2 border-amber-700" />

                {/* Header */}
                <div>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-900">
                    <Award className="h-9 w-9 text-slate-900" />
                  </div>

                  <p className="mt-4 text-sm font-bold uppercase tracking-[0.35em] text-slate-700">
                    PagTipon
                  </p>

                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                    Provincial-to-Municipal Event Management and Attendance
                    Processing System
                  </p>

                  <h2 className="mt-7 font-serif text-4xl font-bold uppercase tracking-[0.09em] text-slate-950">
                    Certificate of Participation
                  </h2>
                </div>

                {/* Certificate body */}
                <div className="flex flex-1 flex-col justify-center py-5">
                  <p className="font-serif text-lg italic text-slate-600">
                    This certificate is proudly presented to
                  </p>

                  <h1 className="mx-auto mt-5 max-w-4xl border-b border-slate-400 px-8 pb-2 font-serif text-4xl font-bold uppercase tracking-wide text-slate-950">
                    {certificate.participant_name}
                  </h1>

                  <p className="mx-auto mt-6 max-w-3xl font-serif text-lg leading-8 text-slate-700">
                    for successfully participating in
                  </p>

                  <h3 className="mt-2 font-serif text-2xl font-bold uppercase tracking-wide text-slate-950">
                    {certificate.event_title}
                  </h3>

                  <p className="mt-4 font-serif text-lg leading-8 text-slate-700">
                    held on{" "}
                    <span className="font-semibold text-slate-900">
                      {eventDate}
                    </span>
                  </p>
                </div>

                {/* Signatories */}
                <div
                  className={`mx-auto grid w-full max-w-4xl gap-12 ${
                    signatories.length >= 3
                      ? "grid-cols-3"
                      : signatories.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-1"
                  }`}
                >
                  {signatories.length > 0 ? (
                    signatories.map((signatory) => (
                      <div key={signatory.position} className="text-center">
                        <div className="mx-auto mb-2 h-px w-56 bg-slate-700" />

                        <p className="font-serif text-base font-bold uppercase text-slate-900">
                          {signatory.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-600">
                          {signatory.title}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="mx-auto w-64 text-center">
                      <div className="mb-2 h-px bg-slate-700" />

                      <p className="font-serif text-sm font-semibold uppercase text-slate-600">
                        Authorized Signatory
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Signatory not yet configured
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-8 flex items-end justify-between border-t border-slate-200 pt-4 text-left">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                      Certificate Number
                    </p>

                    <p className="mt-1 font-mono text-xs font-bold text-slate-900">
                      {certificate.certificate_number}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">
                      Issued by PagTipon
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-700">
                      Certificate of Participation
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

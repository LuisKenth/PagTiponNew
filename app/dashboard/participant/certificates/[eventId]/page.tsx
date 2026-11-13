"use client";
import { useLiveData } from "@/app/components/live/BackgroundDataSync";

import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";

import { useCallback, useEffect, useRef, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import CertificateDocument from "./CertificateDocument";

type CertificateSignatory = {
  position: number;
  name: string;
  title: string;
};

type CertificateData = {
  issuer_name?: string;
  municipality?: string;
  event_origin?: string;
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

  const loadCertificate = useCallback(
    async (silent = false) => {
      if (!eventId) {
        return;
      }

      if (!silent) setLoading(true);
      setError(null);

      try {
        const { data, error: certificateError } = await supabase.rpc(
          "get_my_certificate_details",
          {
            p_event_id: eventId,
          },
        );

        if (certificateError) {
          throw certificateError;
        }

        const result = Array.isArray(data) ? data[0] : data;

        if (!result) {
          throw new Error(
            "Your certificate is awaiting automatic generation. The event must be completed with signatories configured and eligible attendance recorded.",
          );
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
    },
    [eventId],
  );

  useLiveData({
    onUpdate: () => loadCertificate(true),
    disabled: loading || downloading,
  });
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

      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fffefa",
        windowWidth: 1400,
        width: 1120,
        height: 792,
      });

      const image = canvas.toDataURL("image/png", 1.0);

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();

      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 0;

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
          onClick={() =>
            router.push("/dashboard/participant/my-events?tab=certificates")
          }
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
            padding: 0 !important;

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
              onClick={() =>
                router.push("/dashboard/participant/my-events?tab=certificates")
              }
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

        <p className="text-sm text-slate-500">
          A4 landscape preview. On smaller screens, scroll sideways to view the
          full certificate.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 p-4 sm:p-6">
          <CertificateDocument
            certificate={certificate}
            documentRef={certificateRef}
          />
        </div>
      </div>
    </>
  );
}

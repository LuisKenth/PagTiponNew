"use client";

import { useState } from "react";
import { FileDown, LoaderCircle } from "lucide-react";
import type { MunicipalReportEvent } from "../types/municipalReports";
import {
  downloadMunicipalParticipationPdf,
  type ParticipationPdfFilters,
} from "../utils/downloadMunicipalParticipationPdf";

type Props = {
  events: MunicipalReportEvent[];
  municipality: string | null;
  filters: ParticipationPdfFilters;
  loading?: boolean;
};

export default function MunicipalParticipationPdfButton({
  events,
  municipality,
  filters,
  loading = false,
}: Props) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDownload() {
    if (exporting || loading || !events.length || !municipality) return;
    setError(null);
    setExporting(true);
    try {
      await downloadMunicipalParticipationPdf({
        events,
        municipality,
        filters,
      });
    } catch (reason) {
      console.error("Municipal Participation PDF error:", reason);
      setError(reason instanceof Error ? reason.message : "Unable to generate PDF report.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={() => void onDownload()}
        disabled={loading || exporting || events.length === 0 || !municipality}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {exporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        {exporting ? "Preparing PDF..." : "Download PDF"}
      </button>
      {error && <p role="alert" className="max-w-xs text-right text-xs text-rose-700">{error}</p>}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, TriangleAlert } from "lucide-react";

import MunicipalityAdminSection from "./components/MunicipalityAdminSection";
import MunicipalityDetailHeader from "./components/MunicipalityDetailHeader";
import MunicipalityDetailLoading from "./components/MunicipalityDetailLoading";
import MunicipalityEventsList from "./components/MunicipalityEventsList";
import MunicipalityEventSummary from "./components/MunicipalityEventSummary";
import useMunicipalityDetails from "./hooks/useMunicipalityDetails";

export default function MunicipalityDetailsPage() {
  const params = useParams<{
    municipality: string;
  }>();

  const municipalitySlug =
    typeof params.municipality === "string"
      ? decodeURIComponent(params.municipality)
      : "";

  const {
    data,
    loading,
    errorMessage,
    municipalityName,
  } = useMunicipalityDetails(municipalitySlug);

  if (loading) {
    return (
      <div className="space-y-6">
        <MunicipalityDetailLoading />
      </div>
    );
  }

  if (errorMessage || !data || !municipalityName) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <TriangleAlert size={26} />
        </div>

        <h1 className="mt-4 text-xl font-bold text-slate-900">
          Municipality unavailable
        </h1>

        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
          {errorMessage ||
            "The requested municipality could not be found."}
        </p>

        <Link
          href="/dashboard/provincial/municipalities"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <ArrowLeft size={16} />
          Back to Municipalities
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MunicipalityDetailHeader
        municipalityName={data.municipalityName}
      />

      <MunicipalityEventSummary events={data.events} />

      <MunicipalityAdminSection admins={data.admins} />

      <MunicipalityEventsList events={data.events} />
    </div>
  );
}
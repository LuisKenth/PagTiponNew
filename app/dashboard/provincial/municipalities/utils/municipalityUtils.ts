import type {
  MunicipalityStatus,
  MunicipalAdmin,
} from "../types/municipality";

export function normalizeMunicipality(value: string | null) {
  return (value || "").trim().toLowerCase();
}

export function toMunicipalitySlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDate(value: string | null) {
  if (!value) return "Unknown date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function getMunicipalityStatusLabel(
  status: MunicipalityStatus
) {
  if (status === "approved") return "Admin Assigned";
  if (status === "pending") return "Pending Admin";

  return "No Admin";
}

export function getMunicipalityStatusClass(
  status: MunicipalityStatus
) {
  if (status === "approved") {
    return "bg-green-50 text-green-700 ring-green-600/20";
  }

  if (status === "pending") {
    return "bg-amber-50 text-amber-700 ring-amber-600/20";
  }

  return "bg-slate-100 text-slate-600 ring-slate-500/20";
}

export function getMunicipalityCardClass(
  status: MunicipalityStatus
) {
  if (status === "approved") {
    return "border-green-200 bg-green-50/30";
  }

  if (status === "pending") {
    return "border-amber-200 bg-amber-50/30";
  }

  return "border-slate-200 bg-white";
}

export function getDisplayAdmin(
  approvedAdmins: MunicipalAdmin[],
  pendingAdmins: MunicipalAdmin[]
) {
  return approvedAdmins[0] || pendingAdmins[0] || null;
}
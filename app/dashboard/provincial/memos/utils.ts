export function formatDate(value: string | null) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function getStatusClass(status: string | null) {
  switch (status?.toLowerCase()) {
    case "published":
      return "bg-blue-50 text-blue-700 ring-blue-600/10";

    case "draft":
      return "bg-slate-100 text-slate-600 ring-slate-500/10";

    case "upcoming":
      return "bg-indigo-50 text-indigo-700 ring-indigo-600/10";

    case "ongoing":
      return "bg-green-50 text-green-700 ring-green-600/10";

    case "completed":
      return "bg-slate-100 text-slate-600 ring-slate-500/10";

    case "cancelled":
      return "bg-red-50 text-red-700 ring-red-600/10";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-500/10";
  }
}

export function getStatusLabel(status: string | null) {
  if (!status) {
    return "No status";
  }

  switch (status.toLowerCase()) {
    case "published":
      return "Published";

    case "draft":
      return "Draft";

    case "upcoming":
      return "Upcoming";

    case "ongoing":
      return "Ongoing";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}
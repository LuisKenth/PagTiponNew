export function formatDate(value: string | null) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No date";
  }

  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function getStatusClass(status: string | null) {
  switch ((status || "").trim().toLowerCase()) {
    case "published":
      return "bg-blue-50 text-blue-700";
    case "ongoing":
      return "bg-green-50 text-green-700";
    case "completed":
      return "bg-slate-100 text-slate-700";
    case "cancelled":
      return "bg-red-50 text-red-700";
    case "draft":
      return "bg-amber-50 text-amber-700";
    case "upcoming":
      return "bg-indigo-50 text-indigo-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function getRateClass(rate: number) {
  if (rate >= 80) {
    return "bg-green-50 text-green-700";
  }

  if (rate >= 50) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-red-50 text-red-700";
}

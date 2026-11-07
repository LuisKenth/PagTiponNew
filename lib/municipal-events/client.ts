import { supabase } from "@/lib/supabase";
export async function municipalEventRequest(
  url: string,
  options: RequestInit = {},
) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token)
    throw new Error(
      "Your login could not be verified. Check your connection and try again.",
    );
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${data.session.access_token}`,
    },
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Event request failed. Try again.");
  return result;
}
export function phDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Manila",
      }).format(new Date(value))
    : "Not scheduled";
}
export function phInput(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
export function phISO(value: string) {
  if (!value) return null;
  const date = new Date(value + ":00+08:00");
  if (Number.isNaN(date.getTime()))
    throw new Error("Choose a valid Philippine date and time.");
  return date.toISOString();
}

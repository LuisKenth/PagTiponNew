import { redirect } from "next/navigation";

// Legacy route: scanner now lives directly on the Event Control page.
export default function LegacyParticipantCheckInPage() {
  redirect("/dashboard/staff/event-control#attendance-workspace");
}

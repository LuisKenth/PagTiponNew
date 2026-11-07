import { redirect } from "next/navigation";

// Attendance summary is on the dashboard and Attendance Records page.
export default function LegacyAttendanceOverviewPage() {
  redirect("/dashboard/staff/attendance-records");
}

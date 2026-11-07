"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Registrations from "../registrations/page";
import AttendancePass from "../attendance-pass/page";
import AttendanceHistory from "../attendance-history/page";
import Certificates from "../certificates/page";

function MyEventsContent() {
  const params = useSearchParams();
  const requested = params.get("tab");
  const tab = ["pass", "history", "certificates"].includes(requested || "") ? requested : "events";
  const tabs = [{id:"events",label:"My Events"},{id:"history",label:"Attendance"},{id:"certificates",label:"Certificates"}];
  return <div>
    <div className="px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      {tab === "pass" ? <Link href="/dashboard/participant/my-events" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">← Back to My Events</Link> :
        <nav aria-label="My event records" className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-white p-1">
          {tabs.map(item=><Link key={item.id} href={"/dashboard/participant/my-events?tab="+item.id} aria-current={tab===item.id ? "page" : undefined} className={`flex min-h-12 items-center justify-center rounded-xl px-2 text-center text-sm font-semibold ${tab===item.id ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}>{item.label}</Link>)}
        </nav>}
    </div>
    {tab === "pass" ? <AttendancePass /> : tab === "history" ? <AttendanceHistory /> : tab === "certificates" ? <Certificates /> : <Registrations />}
  </div>;
}
export default function MyEventsPage() { return <Suspense fallback={<p role="status" className="p-6 text-slate-600">Loading your events…</p>}><MyEventsContent /></Suspense>; }

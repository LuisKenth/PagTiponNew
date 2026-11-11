"use client";

import { useMemo } from "react";
import { ArrowUpRight, CalendarDays, ScanLine, UsersRound } from "lucide-react";
import { phDay, type ParticipantReportRow } from "../simpleReportData";

const isAttended = (row: ParticipantReportRow) =>
  row.status === "Present" || row.status === "Late";

type TrendRow = { month: string; label: string; registered: number; attended: number };

function monthLabel(month: string) {
  const [year, number] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", { month: "short", year: "numeric" })
    .format(new Date(Date.UTC(year, number - 1, 1)));
}

export default function EngagementInsights({
  participants,
  eventStarts,
}: {
  participants: ParticipantReportRow[];
  eventStarts: Record<string, string | null>;
}) {
  const insights = useMemo(() => {
    const byPerson = new Map<string, Set<string>>();
    let qr = 0;
    let manual = 0;
    let unclassified = 0;
    const months = new Map<string, TrendRow>();

    for (const participant of participants) {
      if (isAttended(participant)) {
        const events = byPerson.get(participant.userId) ?? new Set<string>();
        events.add(participant.eventId);
        byPerson.set(participant.userId, events);
        if (participant.method === "qr") qr++;
        else if (participant.method === "manual") manual++;
        else unclassified++;
      }

      // Engagement by event start month, not registration timestamp.
      const day = phDay(eventStarts[participant.eventId] ?? null);
      if (!day) continue;
      const month = day.slice(0, 7);
      const item = months.get(month) ?? { month, label: monthLabel(month), registered: 0, attended: 0 };
      item.registered++;
      if (isAttended(participant)) item.attended++;
      months.set(month, item);
    }
    return {
      returning: Array.from(byPerson.values()).filter((events) => events.size >= 2).length,
      uniqueAttendees: byPerson.size,
      qr,
      manual,
      unclassified,
      trend: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
    };
  }, [participants, eventStarts]);

  const methodTotal = insights.qr + insights.manual;
  const percentage = (value: number) => methodTotal ? Math.round(value / methodTotal * 100) : null;
  const maxTrend = Math.max(1, ...insights.trend.map((item) => Math.max(item.registered, item.attended)));

  return (
    <section className="space-y-4" aria-label="Participant engagement patterns">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Returning Participants", value: insights.returning.toString(), note: "Unique participants who attended 2+ different events", Icon: UsersRound },
          { label: "Unique Attendees", value: insights.uniqueAttendees.toString(), note: "Distinct participants with Present or Late records", Icon: ArrowUpRight },
          { label: "QR Check-In", value: percentage(insights.qr) === null ? "—" : `${percentage(insights.qr)}%`, note: `${insights.qr} of ${methodTotal} classified check-ins`, Icon: ScanLine },
          { label: "Manual Check-In", value: percentage(insights.manual) === null ? "—" : `${percentage(insights.manual)}%`, note: `${insights.manual} of ${methodTotal} classified check-ins`, Icon: CalendarDays },
        ].map(({ label, value, note, Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Icon className="h-4 w-4 text-indigo-600" aria-hidden="true" />{label}
            </div>
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">Check-In Method Breakdown</h3>
          <p className="mt-1 text-xs text-slate-500">QR versus manual methods among attended records with a known method.</p>
          <div className="mt-5 space-y-5">
            {[
              { name: "QR Scan", count: insights.qr, color: "bg-indigo-600" },
              { name: "Manual Entry", count: insights.manual, color: "bg-emerald-500" },
            ].map((item) => (
              <div key={item.name}>
                <div className="mb-2 flex justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-700">{item.name}</span>
                  <span className="tabular-nums text-slate-600">{item.count} · {percentage(item.count) === null ? "—" : `${percentage(item.count)}%`}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${item.name}: ${item.count} check-ins`}>
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${percentage(item.count) ?? 0}%` }} />
                </div>
              </div>
            ))}
          </div>
          {insights.unclassified > 0 && <p className="mt-4 text-xs text-amber-700">{insights.unclassified} attended records have an unknown check-in method and are excluded from the method percentages.</p>}
          {methodTotal === 0 && <p className="mt-4 text-xs text-slate-500">No classified check-ins for the selected filters.</p>}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">Monthly Engagement Trend</h3>
          <p className="mt-1 text-xs text-slate-500">Registrations and attendance grouped by event start month (PH).</p>
          {insights.trend.length ? (
            <div className="mt-4 max-h-72 space-y-4 overflow-y-auto pr-2">
              <div className="flex gap-4 text-xs text-slate-600">
                <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-indigo-600" /> Registered</span>
                <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Attended</span>
              </div>
              {insights.trend.map((item) => (
                <div key={item.month} className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-3">
                  <span className="text-xs font-medium text-slate-600">{item.label}</span>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2"><div className="h-3 rounded-r bg-indigo-600" style={{ width: `${item.registered / maxTrend * 100}%`, minWidth: item.registered ? 4 : 0 }}/><span className="text-xs tabular-nums text-slate-600">{item.registered}</span></div>
                    <div className="flex items-center gap-2"><div className="h-3 rounded-r bg-emerald-500" style={{ width: `${item.attended / maxTrend * 100}%`, minWidth: item.attended ? 4 : 0 }}/><span className="text-xs tabular-nums text-slate-600">{item.attended}</span></div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="mt-5 text-sm text-slate-500">No dated events in the selected filters.</p>}
        </div>
      </div>
      <p className="text-xs leading-5 text-slate-500">Statistics respect the active event, municipality, date, category, and participant filters. Returning participants are counted by distinct user ID and distinct events. QR/Manual percentages use recorded method values only.</p>
    </section>
  );
}

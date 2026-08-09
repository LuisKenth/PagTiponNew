import {
    CheckCircle2,
    UserRound,
    UsersRound,
    XCircle,
} from "lucide-react";

import type {
    ParticipantCategoryBreakdownItem,
} from "../hooks/useProvincialReports";

type ParticipantCategoryBreakdownProps = {
    items: ParticipantCategoryBreakdownItem[];
    loading: boolean;
};

export default function ParticipantCategoryBreakdown({
    items,
    loading,
}: ParticipantCategoryBreakdownProps) {
    const totalRegistrations = items.reduce(
        (total, item) => total + item.registrations,
        0
    );

    if (loading) {
        return (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="animate-pulse">
                    <div className="h-5 w-64 rounded bg-slate-200" />
                    <div className="mt-2 h-4 w-80 max-w-full rounded bg-slate-100" />

                    <div className="mt-5 space-y-3">
                        {[1, 2, 3].map((item) => (
                            <div
                                key={item}
                                className="h-16 rounded-xl bg-slate-100"
                            />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:break-inside-avoid print:shadow-none">
            {/* Header */}
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <UsersRound className="h-5 w-5" />
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                            Participant Category Breakdown
                        </h2>

                        <p className="mt-0.5 text-sm text-slate-500">
                            Registration and attendance distribution by
                            participant category.
                        </p>
                    </div>
                </div>

                <div className="flex w-fit items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <UsersRound className="h-4 w-4 text-slate-400" />

                    <span className="text-xs font-medium text-slate-500">
                        Total Registrations
                    </span>

                    <span className="text-sm font-semibold text-slate-900">
                        {totalRegistrations}
                    </span>
                </div>
            </div>

            {/* Empty */}
            {items.length === 0 ? (
                <div className="px-5 py-8 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                        <UserRound className="h-5 w-5 text-slate-400" />
                    </div>

                    <p className="mt-3 text-sm font-semibold text-slate-700">
                        No participant category data available
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                        Matching registrations will appear here.
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {items.map((item) => (
                        <div
                            key={item.key}
                            className="px-5 py-4 transition-colors hover:bg-slate-50/60"
                        >
                            <div className="grid gap-4 lg:grid-cols-[minmax(260px,1.7fr)_repeat(4,minmax(95px,0.6fr))] lg:items-center">
                                {/* Category */}
                                <div className="min-w-0">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                            <UserRound className="h-4 w-4" />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-900">
                                                {item.label}
                                            </p>

                                            <p className="mt-0.5 text-xs text-slate-500">
                                                {item.percentage}% of all registrations
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-indigo-500"
                                            style={{
                                                width: `${Math.min(
                                                    item.percentage,
                                                    100
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Registrations */}
                                <div className="text-center">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                        Registrations
                                    </p>

                                    <p className="mt-1 text-base font-semibold text-slate-900">
                                        {item.registrations}
                                    </p>
                                </div>

                                {/* Present */}
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />

                                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                            Present
                                        </p>
                                    </div>

                                    <p className="mt-1 text-base font-semibold text-emerald-700">
                                        {item.present}
                                    </p>
                                </div>

                                {/* Absent */}
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <XCircle className="h-3.5 w-3.5 text-red-500" />

                                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                            Absent
                                        </p>
                                    </div>

                                    <p className="mt-1 text-base font-semibold text-red-700">
                                        {item.absent}
                                    </p>
                                </div>

                                {/* Attendance */}
                                <div className="text-center">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                        Attendance
                                    </p>

                                    <div className="mt-1">
                                        <span
                                            className={`inline-flex min-w-14 justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${item.attendanceRate >= 75
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : item.attendanceRate >= 50
                                                        ? "bg-amber-50 text-amber-700"
                                                        : "bg-red-50 text-red-700"
                                                }`}
                                        >
                                            {item.attendanceRate}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
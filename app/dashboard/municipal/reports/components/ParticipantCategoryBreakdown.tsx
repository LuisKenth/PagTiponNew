"use client";

import {
    Tag,
    UsersRound,
} from "lucide-react";

import type {
    MunicipalParticipantCategoryBreakdownItem,
} from "../types/municipalReports";

type ParticipantCategoryBreakdownProps = {
    data: MunicipalParticipantCategoryBreakdownItem[];
    loading?: boolean;
    errorMessage?: string | null;
};

function formatPercentage(
    value: number,
) {
    if (!Number.isFinite(value)) {
        return "0.0%";
    }

    return `${value.toFixed(1)}%`;
}

export default function ParticipantCategoryBreakdown({
    data,
    loading = false,
    errorMessage = null,
}: ParticipantCategoryBreakdownProps) {
    const totalParticipants =
        data.reduce(
            (total, item) =>
                total + item.count,
            0,
        );

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Header */}
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <UsersRound className="h-5 w-5" />
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            Participant Category Breakdown
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Distribution of registered
                            participants based on the
                            current report filters.
                        </p>
                    </div>
                </div>

                {!loading &&
                    !errorMessage && (
                        <div className="flex items-center gap-2">
                            <span className="inline-flex min-h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600">
                                {data.length}{" "}
                                {data.length === 1
                                    ? "category"
                                    : "categories"}
                            </span>

                            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">
                                <UsersRound className="h-3.5 w-3.5 text-slate-400" />

                                {totalParticipants}{" "}
                                {totalParticipants === 1
                                    ? "participant"
                                    : "participants"}
                            </span>
                        </div>
                    )}
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6">
                {loading ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {[1, 2, 3, 4].map(
                            (item) => (
                                <div
                                    key={item}
                                    className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-2">
                                            <div className="h-4 w-32 rounded bg-slate-200" />

                                            <div className="h-3 w-44 rounded bg-slate-100" />
                                        </div>

                                        <div className="h-9 w-12 rounded-lg bg-slate-200" />
                                    </div>

                                    <div className="mt-5 h-2 rounded-full bg-slate-100" />
                                </div>
                            ),
                        )}
                    </div>
                ) : errorMessage ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6">
                        <p className="text-sm font-bold text-red-800">
                            Participant category
                            data unavailable
                        </p>

                        <p className="mt-1 text-sm leading-6 text-red-600">
                            Participant category data
                            could not be displayed because
                            the report failed to load.
                        </p>
                    </div>
                ) : data.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm">
                            <UsersRound className="h-5 w-5" />
                        </div>

                        <p className="mt-4 text-sm font-bold text-slate-800">
                            No participant category data
                        </p>

                        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                            No registered participants
                            match the current report
                            filters.
                        </p>
                    </div>
                ) : (
                    <div
                        className={
                            data.length === 1
                                ? "mx-auto grid w-full max-w-3xl gap-4"
                                : "grid gap-4 lg:grid-cols-2"
                        }
                    >
                        {data.map((item) => {
                            const safePercentage =
                                Math.min(
                                    100,
                                    Math.max(
                                        0,
                                        item.percentage,
                                    ),
                                );

                            return (
                                <article
                                    key={item.value}
                                    className="group rounded-2xl border border-slate-200 bg-white p-5 transition duration-150 hover:border-slate-300 hover:shadow-sm"
                                >
                                    {/* Category heading */}
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                                <Tag className="h-4 w-4" />
                                            </div>

                                            <div className="min-w-0">
                                                <p className="truncate font-bold text-slate-900">
                                                    {item.label}
                                                </p>

                                                <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                                                    {formatPercentage(
                                                        item.percentage,
                                                    )}{" "}
                                                    of registered
                                                    participants
                                                </p>
                                            </div>
                                        </div>

                                        <div className="shrink-0 text-right">
                                            <p className="text-2xl font-black leading-none text-slate-900">
                                                {item.count}
                                            </p>

                                            <p className="mt-1 text-xs font-medium text-slate-500">
                                                {item.count === 1
                                                    ? "participant"
                                                    : "participants"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Progress */}
                                    <div className="mt-5">
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                                Share
                                            </span>

                                            <span className="text-xs font-bold text-slate-600">
                                                {formatPercentage(
                                                    item.percentage,
                                                )}
                                            </span>
                                        </div>

                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full bg-slate-800 transition-all duration-300"
                                                style={{
                                                    width: `${safePercentage}%`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Others details */}
                                    {item.value ===
                                        "others" &&
                                        item.details.length >
                                        0 && (
                                            <div className="mt-5 border-t border-slate-200 pt-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        Specified Categories
                                                    </p>

                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                                                        {
                                                            item.details
                                                                .length
                                                        }{" "}
                                                        {item.details
                                                            .length === 1
                                                            ? "type"
                                                            : "types"}
                                                    </span>
                                                </div>

                                                <div className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
                                                    {item.details.map(
                                                        (detail) => (
                                                            <div
                                                                key={
                                                                    detail.label
                                                                }
                                                                className="flex items-center justify-between gap-4 bg-slate-50 px-3.5 py-3 transition hover:bg-slate-100"
                                                            >
                                                                <span className="min-w-0 truncate text-sm font-semibold text-slate-700">
                                                                    {
                                                                        detail.label
                                                                    }
                                                                </span>

                                                                <span className="inline-flex min-w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700">
                                                                    {
                                                                        detail.count
                                                                    }
                                                                </span>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
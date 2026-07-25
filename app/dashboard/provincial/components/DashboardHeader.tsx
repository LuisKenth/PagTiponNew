"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Profile } from "../../../types";

type DashboardHeaderProps = {
  profile: Profile | null;
};

export default function DashboardHeader({
  profile,
}: DashboardHeaderProps) {
  const [greeting, setGreeting] = useState("Welcome back");
  const [todayLabel, setTodayLabel] = useState("");

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();

    if (hour < 12) {
      setGreeting("Good morning");
    } else if (hour < 18) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }

    setTodayLabel(
      new Intl.DateTimeFormat("en-PH", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
      }).format(now)
    );
  }, []);

  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 shadow-sm">
      <div className="p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                Provincial Admin
              </span>

              {todayLabel && (
                <span className="text-xs text-slate-400">
                  {todayLabel}
                </span>
              )}
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white md:text-3xl">
              {greeting}
              {profile?.full_name ? `, ${profile.full_name}` : ""}.
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Monitor provincial events, municipality preparation,
              participant registrations, official memos, and attendance
              across the province.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/provincial/events/create"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              <span className="text-lg leading-none">+</span>
              Create Event
            </Link>

            <Link
              href="/dashboard/provincial/events"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Manage Events
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

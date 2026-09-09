import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Users,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/pagtipon-bg.png')",
        }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-slate-950/45" />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/45 to-slate-950/20" />

      {/* Decorative glow */}
      <div className="absolute -left-40 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="flex items-center gap-3 text-white"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 shadow-lg backdrop-blur-md">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xl font-bold tracking-tight">PagTipon</p>
              <p className="hidden text-xs text-slate-300 sm:block">
                Event Management System
              </p>
            </div>
          </Link>

          <Link
            href="/login"
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20"
          >
            Sign In
          </Link>
        </header>

        {/* Hero */}
        <section className="mx-auto flex w-full max-w-7xl flex-1 items-center px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
          <div className="grid w-full items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            {/* Left Content */}
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-slate-200 backdrop-blur-md sm:text-sm">
                <MapPin className="h-4 w-4 text-emerald-400" />
                Province of Antique
              </div>

              <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
                Bringing communities
                <span className="block text-emerald-400">
                  together.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                PagTipon is a provincial-to-municipal event management and
                attendance processing system designed to simplify event
                coordination, registration, and attendance monitoring across
                Antique.
              </p>

              {/* CTA Buttons */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400"
                >
                  Login to PagTipon
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
                >
                  Create Account
                </Link>
              </div>

              {/* Mini Features */}
              <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    <CalendarDays className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-white">
                      Events
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Organized planning
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
                    <Users className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-white">
                      Participants
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Easy registration
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
                    <MapPin className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-white">
                      Municipalities
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Connected province-wide
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card */}
            <div className="hidden justify-end lg:flex">
              <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
                <div className="mb-7">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-950/30">
                    <CalendarDays className="h-7 w-7" />
                  </div>

                  <h2 className="text-2xl font-bold text-white">
                    One system.
                    <br />
                    Better coordination.
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Manage provincial events, municipal preparation,
                    participant registration, and attendance through a single
                    centralized platform.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/20 p-4">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <p className="text-sm text-slate-200">
                      Provincial event coordination
                    </p>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/20 p-4">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <p className="text-sm text-slate-200">
                      Municipal event preparation
                    </p>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/20 p-4">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <p className="text-sm text-slate-200">
                      QR-based attendance processing
                    </p>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/20 p-4">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <p className="text-sm text-slate-200">
                      Registration and reporting
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative border-t border-white/10">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-5 py-5 text-center text-xs text-slate-400 sm:flex-row sm:px-8 sm:text-left lg:px-10">
            <p>
              © {new Date().getFullYear()} PagTipon. All rights reserved.
            </p>

            <p>
              Provincial-to-Municipal Event Management System
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
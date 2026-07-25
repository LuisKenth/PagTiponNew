import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">PagTipon</h1>

        <p className="mt-3 text-sm text-slate-600">
          Provincial-to-Municipal Event Management and Attendance Processing
          System
        </p>

        <div className="mt-8 space-y-3">
          <Link
            href="/login"
            className="block w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white"
          >
            Login
          </Link>

          <Link
            href="/signup"
            className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
          >
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}
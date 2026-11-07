"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  ShieldUser,
  UserRoundCog,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSuperAccount } from "./SuperContext";
const links = [
  { href: "/dashboard/super", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/super/admins", label: "Provincial Admins", icon: Users },
  { href: "/dashboard/super/audit-logs", label: "Audit Logs", icon: Activity },
  {
    href: "/dashboard/super/settings",
    label: "My Account & Security",
    icon: UserRoundCog,
  },
];
export default function SuperSidebar() {
  const pathname = usePathname();
  const { profile } = useSuperAccount();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const d = drawer.current;
    if (!d) return;
    d.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      d.close();
      document.body.style.overflow = previous;
    };
  }, [open]);
  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      window.alert("Unable to sign out. Please try again.");
      setSigningOut(false);
      return;
    }
    window.location.replace("/login");
  }
  const content = (mobile = false) => (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-24 shrink-0 items-center gap-3 border-b border-slate-100 px-6">
        <span className="rounded-2xl bg-indigo-600 p-3 text-white shadow-sm">
          <ShieldUser className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xl font-bold tracking-tight text-slate-950">
            PagTipon
          </p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Super Admin Portal
          </p>
        </div>
        {mobile && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="ml-auto rounded-lg p-2 text-slate-400"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav
        aria-label={
          mobile ? "Mobile Super Admin navigation" : "Super Admin navigation"
        }
        className="min-h-0 flex-1 overflow-y-auto px-4 py-7"
      >
        <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          Administration
        </p>
        <ul className="space-y-2">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-indigo-500 ${active ? "bg-indigo-600 text-white shadow-sm shadow-indigo-100" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${active ? "text-white" : "text-slate-400"}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">{label}</span>
                  <ChevronRight
                    className={`h-4 w-4 ${active ? "text-indigo-200" : "text-slate-300"}`}
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="shrink-0 border-t border-slate-100 p-4">
        <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
            <ShieldCheck className="h-4 w-4" />
            Protected workspace
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Administrator account access and recovery.
          </p>
          <Link
            href="/dashboard/super/settings"
            onClick={() => setOpen(false)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600"
          >
            Account security
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mb-4 flex items-center gap-3 px-1">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
            {profile.full_name?.charAt(0).toUpperCase() || "S"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {profile.full_name || "Super Admin"}
            </p>
            <p className="truncate text-xs text-slate-400">{profile.email}</p>
          </div>
        </div>
        <button
          disabled={signingOut}
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50/50 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Signing out…" : "Sign Out"}
        </button>
      </div>
    </div>
  );
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 lg:block">
        {content()}
      </aside>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm lg:hidden">
        <Link
          href="/dashboard/super"
          className="inline-flex items-center gap-2 font-bold text-slate-950"
        >
          <ShieldUser className="h-6 w-6 text-indigo-600" />
          PagTipon{" "}
          <span className="ml-1 text-xs font-normal text-slate-400">
            Super Admin
          </span>
        </Link>
        <button
          type="button"
          aria-label="Open navigation"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="rounded-xl border border-slate-200 p-2.5"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>
      <dialog
        ref={drawer}
        aria-label="Super Admin menu"
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => {
          if (e.target !== e.currentTarget) return;
          const b = e.currentTarget.getBoundingClientRect();
          if (e.clientX > b.right) setOpen(false);
        }}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-80 max-w-[88vw] overflow-hidden border-0 bg-white p-0 shadow-xl backdrop:bg-slate-950/50"
      >
        {content(true)}
      </dialog>
    </>
  );
}

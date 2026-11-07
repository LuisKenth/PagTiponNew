"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Profile from "../profile/page";
import Verification from "../verification/page";
function AccountContent() {
  const verification = useSearchParams().get("tab") === "verification";
  return <div><nav aria-label="My account" className="mx-4 mt-4 grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white p-1 sm:mx-6 lg:mx-8">
    {[{label:"My Profile",active:!verification,href:"/dashboard/participant/account"},{label:"Verification",active:verification,href:"/dashboard/participant/account?tab=verification"}].map(item=><Link key={item.href} href={item.href} aria-current={item.active ? "page" : undefined} className={`flex min-h-12 items-center justify-center rounded-xl px-3 text-sm font-semibold ${item.active ? "bg-slate-950 text-white" : "text-slate-600"}`}>{item.label}</Link>)}
  </nav>{verification ? <Verification /> : <Profile />}</div>;
}
export default function AccountPage() {return <Suspense fallback={<p role="status" className="p-6">Loading your account…</p>}><AccountContent /></Suspense>;}

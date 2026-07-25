"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type MunicipalAdmin = {
  id: string;
  full_name: string | null;
  email: string | null;
  municipality: string | null;
  verification_status: "pending" | "approved" | "rejected" | null;
  created_at: string | null;
};

type TabType = "admins" | "pending";

function formatDate(value: string | null) {
  if (!value) return "Unknown date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ProvincialMunicipalitiesPage() {
  const [admins, setAdmins] = useState<MunicipalAdmin[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("admins");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchMunicipalAdmins = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        id,
        full_name,
        email,
        municipality,
        verification_status,
        created_at
      `
      )
      .eq("role", "municipal_admin")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Municipal admin fetch error:", error.message);
      alert(`Unable to load municipal admins: ${error.message}`);
      setAdmins([]);
      setLoading(false);
      return;
    }

    setAdmins((data || []) as MunicipalAdmin[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchMunicipalAdmins();
  }, []);

  const approvedAdmins = admins.filter(
    (admin) => admin.verification_status === "approved"
  );

  const pendingAdmins = admins.filter(
    (admin) => admin.verification_status === "pending"
  );

  const handleApprove = async (admin: MunicipalAdmin) => {
    const confirmed = window.confirm(
      `Approve ${admin.full_name || "this municipal admin"}${
        admin.municipality ? ` for ${admin.municipality}` : ""
      }?`
    );

    if (!confirmed) return;

    setProcessingId(admin.id);

    const { error } = await supabase
      .from("profiles")
      .update({
        verification_status: "approved",
      })
      .eq("id", admin.id)
      .eq("role", "municipal_admin");

    if (error) {
      console.error("Approval error:", error.message);
      alert(`Failed to approve account: ${error.message}`);
      setProcessingId(null);
      return;
    }

    setAdmins((currentAdmins) =>
      currentAdmins.map((item) =>
        item.id === admin.id
          ? {
              ...item,
              verification_status: "approved",
            }
          : item
      )
    );

    setProcessingId(null);

    alert(
      `${admin.full_name || "Municipal admin"} has been approved successfully.`
    );
  };

  const handleReject = async (admin: MunicipalAdmin) => {
    const confirmed = window.confirm(
      `Reject the application of ${
        admin.full_name || "this municipal admin"
      }?`
    );

    if (!confirmed) return;

    setProcessingId(admin.id);

    const { error } = await supabase
      .from("profiles")
      .update({
        verification_status: "rejected",
      })
      .eq("id", admin.id)
      .eq("role", "municipal_admin");

    if (error) {
      console.error("Rejection error:", error.message);
      alert(`Failed to reject account: ${error.message}`);
      setProcessingId(null);
      return;
    }

    setAdmins((currentAdmins) =>
      currentAdmins.map((item) =>
        item.id === admin.id
          ? {
              ...item,
              verification_status: "rejected",
            }
          : item
      )
    );

    setProcessingId(null);

    alert(
      `${admin.full_name || "Municipal admin"}'s application has been rejected.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-slate-500">
          Provincial Admin
        </p>

        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Municipalities
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage municipal administrators and review pending account
          applications.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Approved Municipal Admins
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {approvedAdmins.length}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Active municipal administrator accounts
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-amber-300 hover:bg-amber-50/30"
        >
          <p className="text-sm font-medium text-slate-500">
            Pending Approvals
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {pendingAdmins.length}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Municipal accounts awaiting review
          </p>
        </button>
      </div>

      {/* Main Card */}
      <div className="rounded-2xl bg-white shadow-sm">
        {/* Tabs */}
        <div className="border-b border-slate-200 px-6 pt-6">
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("admins")}
              className={`border-b-2 pb-4 text-sm font-semibold transition ${
                activeTab === "admins"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              Municipal Admins
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                {approvedAdmins.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`border-b-2 pb-4 text-sm font-semibold transition ${
                activeTab === "pending"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              Pending Approvals

              {pendingAdmins.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                  {pendingAdmins.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Loading municipal administrators...
            </div>
          ) : activeTab === "admins" ? (
            <>
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-900">
                  Municipal Administrators
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Approved municipal administrator accounts.
                </p>
              </div>

              {approvedAdmins.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
                  <p className="font-medium text-slate-900">
                    No approved municipal administrators
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Approved accounts will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b text-xs uppercase text-slate-500">
                        <th className="py-3 pr-4">Administrator</th>
                        <th className="py-3 pr-4">Municipality</th>
                        <th className="py-3 pr-4">Email</th>
                        <th className="py-3 pr-4">Status</th>
                        <th className="py-3">Registered</th>
                      </tr>
                    </thead>

                    <tbody>
                      {approvedAdmins.map((admin) => (
                        <tr
                          key={admin.id}
                          className="border-b last:border-b-0"
                        >
                          <td className="py-4 pr-4 font-semibold text-slate-900">
                            {admin.full_name || "Unnamed Admin"}
                          </td>

                          <td className="py-4 pr-4 text-slate-600">
                            {admin.municipality || "Not assigned"}
                          </td>

                          <td className="py-4 pr-4 text-slate-600">
                            {admin.email || "No email"}
                          </td>

                          <td className="py-4 pr-4">
                            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                              Approved
                            </span>
                          </td>

                          <td className="py-4 text-slate-500">
                            {formatDate(admin.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-900">
                  Pending Municipal Admin Approvals
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Review municipal administrator applications before granting
                  access.
                </p>
              </div>

              {pendingAdmins.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-xl">
                    ✓
                  </div>

                  <p className="mt-3 font-semibold text-slate-900">
                    No pending approvals
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    All municipal administrator applications have been
                    reviewed.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingAdmins.map((admin) => (
                    <div
                      key={admin.id}
                      className="rounded-xl border border-slate-200 p-5"
                    >
                      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-900">
                              {admin.full_name || "Unnamed Admin"}
                            </h3>

                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                              Pending
                            </span>
                          </div>

                          <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                            <p>
                              <span className="font-medium text-slate-800">
                                Municipality:
                              </span>{" "}
                              {admin.municipality || "Not assigned"}
                            </p>

                            <p>
                              <span className="font-medium text-slate-800">
                                Email:
                              </span>{" "}
                              {admin.email || "No email"}
                            </p>

                            <p>
                              <span className="font-medium text-slate-800">
                                Registered:
                              </span>{" "}
                              {formatDate(admin.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => handleReject(admin)}
                            disabled={processingId === admin.id}
                            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {processingId === admin.id
                              ? "Processing..."
                              : "Reject"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApprove(admin)}
                            disabled={processingId === admin.id}
                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {processingId === admin.id
                              ? "Processing..."
                              : "Approve"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
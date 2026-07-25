"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Venue = {
  id: string;
  venue_name: string;
  municipality: string;
  capacity: number | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Profile = {
  role: string;
  municipality: string | null;
};

export default function MunicipalVenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueName, setVenueName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [municipality, setMunicipality] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchVenues = async () => {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("You must be logged in first.");
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, municipality")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile) {
      setMessage(profileError?.message || "Profile not found.");
      setLoading(false);
      return;
    }

    if (profile.role !== "municipal_admin") {
      setMessage("Only municipal admins can manage venues.");
      setLoading(false);
      return;
    }

    if (!profile.municipality) {
      setMessage("Your account has no assigned municipality.");
      setLoading(false);
      return;
    }

    setMunicipality(profile.municipality);

    const { data, error } = await supabase
      .from("venues")
      .select("*")
      .eq("municipality", profile.municipality)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setVenues([]);
    } else {
      setVenues(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const resetForm = () => {
    setVenueName("");
    setCapacity("");
    setEditingVenue(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");

    const cleanVenueName = venueName.trim();
    const capacityNumber = Number(capacity);

    if (!cleanVenueName) {
      setMessage("Please enter a venue name.");
      return;
    }

    if (!capacity || Number.isNaN(capacityNumber) || capacityNumber <= 0) {
      setMessage("Please enter a valid capacity.");
      return;
    }

    if (!municipality || !userId) {
      setMessage("Municipality or user account is missing.");
      return;
    }

    setSaving(true);

    if (editingVenue) {
      const { error } = await supabase
        .from("venues")
        .update({
          venue_name: cleanVenueName,
          capacity: capacityNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingVenue.id);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }

      setMessage("Venue updated successfully.");
    } else {
      const { error } = await supabase.from("venues").insert({
        venue_name: cleanVenueName,
        municipality,
        capacity: capacityNumber,
        created_by: userId,
      });

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }

      setMessage("Venue added successfully.");
    }

    resetForm();
    await fetchVenues();
    setSaving(false);
  };

  const handleEdit = (venue: Venue) => {
    setEditingVenue(venue);
    setVenueName(venue.venue_name);
    setCapacity(String(venue.capacity || ""));
    setMessage("");
  };

  const handleDelete = async (venue: Venue) => {
    const confirmDelete = window.confirm(
      `Delete "${venue.venue_name}" from the venue list?`
    );

    if (!confirmDelete) return;

    setMessage("");

    const { error } = await supabase
      .from("venues")
      .delete()
      .eq("id", venue.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Venue deleted successfully.");
    await fetchVenues();
  };

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Municipal Admin
            </p>
            <h1 className="text-2xl font-bold text-slate-900">
              Manage Venues
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Add, edit, and remove venues for{" "}
              <span className="font-semibold text-slate-700">
                {municipality || "your municipality"}
              </span>
              .
            </p>
          </div>

          <Link
            href="/dashboard/municipal"
            className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Dashboard
          </Link>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            {editingVenue ? "Edit Venue" : "Add New Venue"}
          </h2>

          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Venue Name
              </label>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Example: Municipal Gymnasium"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Capacity
              </label>
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Example: 300"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div className="flex gap-3 md:col-span-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingVenue
                    ? "Update Venue"
                    : "Add Venue"}
              </button>

              {editingVenue && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          {message && (
            <p className="mt-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
              {message}
            </p>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Venue List
              </h2>
              <p className="text-sm text-slate-500">
                These venues will be used later for venue conflict detection.
              </p>
            </div>

            <p className="text-sm font-medium text-slate-500">
              Total: {venues.length}
            </p>
          </div>

          {loading ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Loading venues...
            </div>
          ) : venues.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center">
              <p className="font-medium text-slate-700">No venues yet.</p>
              <p className="mt-1 text-sm text-slate-500">
                Add your first venue above.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Venue Name</th>
                      <th className="px-4 py-3 font-medium">Municipality</th>
                      <th className="px-4 py-3 font-medium">Capacity</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {venues.map((venue) => (
                      <tr
                        key={venue.id}
                        className="border-t border-slate-200 text-slate-700"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {venue.venue_name}
                        </td>
                        <td className="px-4 py-3">{venue.municipality}</td>
                        <td className="px-4 py-3">
                          {venue.capacity?.toLocaleString() || "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(venue)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(venue)}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
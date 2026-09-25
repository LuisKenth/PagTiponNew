"use client";

import {
  Award,
  Loader2,
  Save,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

type Signatory = {
  position: number;
  name: string;
  title: string;
};

type Props = {
  eventId: string;
};

const emptySignatories: Signatory[] = [
  {
    position: 1,
    name: "",
    title: "",
  },
  {
    position: 2,
    name: "",
    title: "",
  },
  {
    position: 3,
    name: "",
    title: "",
  },
];

export default function CertificateSignatoriesCard({
  eventId,
}: Props) {
  const [signatories, setSignatories] =
    useState<Signatory[]>(emptySignatories);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  /*
   * LOAD CURRENT SIGNATORIES
   */
  const loadSignatories =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const {
          data,
          error: fetchError,
        } = await supabase
          .from(
            "event_certificate_signatories",
          )
          .select(
            "position, name, title",
          )
          .eq("event_id", eventId)
          .order("position", {
            ascending: true,
          });

        if (fetchError) {
          throw fetchError;
        }

        const merged =
          emptySignatories.map(
            (defaultItem) => {
              const existing =
                data?.find(
                  (item) =>
                    item.position ===
                    defaultItem.position,
                );

              return existing
                ? {
                    position:
                      existing.position,
                    name:
                      existing.name ?? "",
                    title:
                      existing.title ?? "",
                  }
                : {
                    ...defaultItem,
                  };
            },
          );

        setSignatories(merged);
      } catch (err) {
        console.error(
          "Signatories load error:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load certificate signatories.",
        );
      } finally {
        setLoading(false);
      }
    }, [eventId]);

  useEffect(() => {
    void loadSignatories();
  }, [loadSignatories]);

  /*
   * UPDATE LOCAL INPUT VALUE
   */
  function updateSignatory(
    position: number,
    field: "name" | "title",
    value: string,
  ) {
    setSignatories((current) =>
      current.map((item) =>
        item.position === position
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );

    setSuccess(null);
    setError(null);
  }

  /*
   * SAVE SIGNATORIES
   *
   * RULES:
   * Signatory 1 = REQUIRED
   * Signatory 2 = OPTIONAL
   * Signatory 3 = OPTIONAL
   *
   * Optional signatories must still have
   * both Name + Designation if used.
   */
  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      /*
       * Signatory 1 is required.
       */
      const firstSignatory =
        signatories.find(
          (item) =>
            item.position === 1,
        );

      if (
        !firstSignatory?.name.trim() ||
        !firstSignatory?.title.trim()
      ) {
        throw new Error(
          "Signatory 1 is required. Please provide both the name and designation.",
        );
      }

      /*
       * Signatory 2 and 3 are optional.
       *
       * However, if one field is filled,
       * both fields must be completed.
       */
      for (const item of signatories) {
        const hasName =
          item.name.trim().length > 0;

        const hasTitle =
          item.title.trim().length > 0;

        if (hasName !== hasTitle) {
          throw new Error(
            `Signatory ${item.position}: Please provide both the name and designation.`,
          );
        }
      }

      /*
       * Only save completely filled
       * signatory records.
       */
      const activeSignatories =
        signatories.filter(
          (item) =>
            item.name.trim() &&
            item.title.trim(),
        );

      if (
        activeSignatories.length > 0
      ) {
        const {
          error: upsertError,
        } = await supabase
          .from(
            "event_certificate_signatories",
          )
          .upsert(
            activeSignatories.map(
              (item) => ({
                event_id: eventId,
                position:
                  item.position,
                name:
                  item.name.trim(),
                title:
                  item.title.trim(),
                updated_at:
                  new Date().toISOString(),
              }),
            ),
            {
              onConflict:
                "event_id,position",
            },
          );

        if (upsertError) {
          throw upsertError;
        }
      }

      /*
       * If Signatory 2 or 3 previously
       * existed but was cleared,
       * remove it from the database.
       *
       * Signatory 1 cannot reach this
       * state because validation above
       * requires it.
       */
      const emptyPositions =
        signatories
          .filter(
            (item) =>
              !item.name.trim() &&
              !item.title.trim(),
          )
          .map(
            (item) =>
              item.position,
          );

      if (
        emptyPositions.length > 0
      ) {
        const {
          error: deleteError,
        } = await supabase
          .from(
            "event_certificate_signatories",
          )
          .delete()
          .eq(
            "event_id",
            eventId,
          )
          .in(
            "position",
            emptyPositions,
          );

        if (deleteError) {
          throw deleteError;
        }
      }

      await loadSignatories();

      setSuccess(
        "Certificate signatories saved successfully.",
      );
    } catch (err) {
      console.error(
        "Signatories save error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save certificate signatories.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* HEADER */}
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Award className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Certificate Signatories
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Configure the officials whose
              names will appear on the
              Certificate of Participation.
              Signatory 1 is required, while
              Signatories 2 and 3 are optional.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {/* ERROR */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : (
          <>
            {signatories.map(
              (signatory) => {
                const isRequired =
                  signatory.position === 1;

                return (
                  <div
                    key={
                      signatory.position
                    }
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        Signatory{" "}
                        {
                          signatory.position
                        }
                      </h3>

                      {isRequired ? (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                          Required
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Optional
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {/* NAME */}
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Name

                          {isRequired && (
                            <span className="ml-1 text-red-500">
                              *
                            </span>
                          )}
                        </label>

                        <input
                          type="text"
                          value={
                            signatory.name
                          }
                          onChange={(e) =>
                            updateSignatory(
                              signatory.position,
                              "name",
                              e.target.value,
                            )
                          }
                          placeholder={
                            isRequired
                              ? "Enter signatory name"
                              : "Optional"
                          }
                          className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        />
                      </div>

                      {/* DESIGNATION */}
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Designation

                          {isRequired && (
                            <span className="ml-1 text-red-500">
                              *
                            </span>
                          )}
                        </label>

                        <input
                          type="text"
                          value={
                            signatory.title
                          }
                          onChange={(e) =>
                            updateSignatory(
                              signatory.position,
                              "title",
                              e.target.value,
                            )
                          }
                          placeholder={
                            isRequired
                              ? "Enter designation"
                              : "Optional"
                          }
                          className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                );
              },
            )}

            {/* SAVE */}
            <div className="flex justify-end border-t border-slate-200 pt-5">
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void handleSave()
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}

                {saving
                  ? "Saving..."
                  : "Save Signatories"}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
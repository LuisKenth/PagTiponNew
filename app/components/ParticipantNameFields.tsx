"use client";
import { useState } from "react";
import {
  normalizeName,
  validateParticipantName,
  SUFFIX_OPTIONS,
  type ParticipantName,
  type NameField,
} from "@/lib/participantName";
export default function ParticipantNameFields({
  value,
  onChange,
  disabled = false,
  showErrors = false,
}: {
  value: ParticipantName;
  onChange: (field: NameField, value: string) => void;
  disabled?: boolean;
  showErrors?: boolean;
}) {
  const [touched, setTouched] = useState<Partial<Record<NameField, boolean>>>(
    {},
  );
  const [otherSelected, setOtherSelected] = useState(false);
  const errors = validateParticipantName(value);
  const other =
    otherSelected ||
    Boolean(
      value.suffix && !SUFFIX_OPTIONS.some((option) => option === value.suffix),
    );
  const inputClass =
    "mt-2 h-11 w-full rounded-xl border bg-white px-3.5 text-sm font-normal text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50";
  const error = (field: NameField) =>
    Boolean((touched[field] || showErrors) && errors[field]);
  const blur = (field: NameField) => {
    onChange(field, normalizeName(value[field]));
    setTouched((t) => ({ ...t, [field]: true }));
  };
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["first_name", "First Name", "given-name"],
            ["middle_name", "Middle Name", "additional-name"],
            ["last_name", "Last Name", "family-name"],
          ] as const
        ).map(([field, label, autoComplete]) => (
          <div key={field}>
            <label
              htmlFor={`participant-${field}`}
              className="block text-sm font-medium text-slate-700"
            >
              {label}
              {field === "middle_name" ? (
                <span className="font-normal text-slate-500"> (optional)</span>
              ) : (
                <span className="text-red-600"> *</span>
              )}
            </label>
            <input
              id={`participant-${field}`}
              name={field}
              value={value[field]}
              autoComplete={autoComplete}
              required={field !== "middle_name"}
              disabled={disabled}
              onChange={(e) => onChange(field, e.target.value)}
              onBlur={() => blur(field)}
              aria-invalid={error(field)}
              aria-describedby={
                error(field)
                  ? `participant-${field}-error`
                  : "participant-name-help"
              }
              className={`${inputClass} ${error(field) ? "border-red-500" : "border-slate-300"}`}
            />
            {error(field) && (
              <p
                id={`participant-${field}-error`}
                role="alert"
                className="mt-1.5 text-xs text-red-700"
              >
                {errors[field]}
              </p>
            )}
          </div>
        ))}
        <div>
          <label
            htmlFor="participant-suffix"
            className="block text-sm font-medium text-slate-700"
          >
            Suffix{" "}
            <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <select
            id="participant-suffix"
            value={other ? "other" : value.suffix}
            disabled={disabled}
            onChange={(e) => {
              setOtherSelected(e.target.value === "other");
              onChange(
                "suffix",
                e.target.value === "other" ? "" : e.target.value,
              );
            }}
            onBlur={() => setTouched((t) => ({ ...t, suffix: true }))}
            aria-invalid={error("suffix")}
            aria-describedby={
              error("suffix") ? "participant-suffix-error" : undefined
            }
            className={`${inputClass} ${error("suffix") ? "border-red-500" : "border-slate-300"}`}
          >
            <option value="">None</option>
            {SUFFIX_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
            <option value="other">Other</option>
          </select>
          {other && (
            <>
              <label
                htmlFor="participant-custom-suffix"
                className="mt-2 block text-xs text-slate-600"
              >
                Other suffix (leave blank if none)
              </label>
              <input
                id="participant-custom-suffix"
                value={value.suffix}
                autoComplete="honorific-suffix"
                disabled={disabled}
                onChange={(e) => onChange("suffix", e.target.value)}
                onBlur={() => blur("suffix")}
                placeholder="Enter your suffix"
                aria-invalid={error("suffix")}
                aria-describedby={
                  error("suffix") ? "participant-suffix-error" : undefined
                }
                className={`${inputClass} ${error("suffix") ? "border-red-500" : "border-slate-300"}`}
              />
            </>
          )}
          {error("suffix") && (
            <p
              id="participant-suffix-error"
              role="alert"
              className="mt-1.5 text-xs text-red-700"
            >
              {errors.suffix}
            </p>
          )}
        </div>
      </div>
      <p
        id="participant-name-help"
        className="mt-2 text-xs leading-5 text-slate-500"
      >
        Use your name as it appears on your documents. Letters, spaces,
        apostrophes, and hyphens are accepted. Up to 100 characters per name; 20
        for a suffix.
      </p>
    </div>
  );
}

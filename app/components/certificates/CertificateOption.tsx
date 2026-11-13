"use client";
export default function CertificateOption({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5">
      <input
        type="checkbox"
        checked={enabled}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-indigo-600"
      />
      <span>
        <span className="block font-semibold text-slate-950">
          Issue participation certificates
        </span>
        <span className="mt-1 block text-sm text-slate-600">
          Optional for this event. The event organizer configures signatories.
          After the event is completed, the system automatically generates
          certificates for eligible participants.
        </span>
        <span className="mt-2 block text-xs text-slate-500">
          Eligibility: Present or Late attendance with both Time-in and Time-out.
          Participants receive an in-app notice when issued.
        </span>
      </span>
    </label>
  );
}

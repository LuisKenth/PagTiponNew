"use client";

import { useEffect } from "react";

import {
  CheckCircle2,
  MailCheck,
  TriangleAlert,
  X,
} from "lucide-react";

export type MunicipalDeliveryToastData = {
  id: string;
  variant: "success" | "warning";
  title: string;
  message: string;
};

type MunicipalDeliveryToastProps = {
  toast: MunicipalDeliveryToastData | null;
  onClose: () => void;
};

export default function MunicipalDeliveryToast({
  toast,
  onClose,
}: MunicipalDeliveryToastProps) {
  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      onClose();
    }, 9000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast, onClose]);

  if (!toast) {
    return null;
  }

  const isWarning =
    toast.variant === "warning";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-md"
    >
      <div
        className={`relative overflow-hidden rounded-2xl border bg-white shadow-2xl ${
          isWarning
            ? "border-amber-300"
            : "border-emerald-300"
        }`}
      >
        <div
          className={`h-1 w-full ${
            isWarning
              ? "bg-amber-500"
              : "bg-emerald-500"
          }`}
        />

        <div className="flex items-start gap-3 p-4 pr-12 sm:p-5 sm:pr-14">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isWarning
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {isWarning ? (
              <TriangleAlert className="h-5 w-5" />
            ) : (
              <MailCheck className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {!isWarning && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              )}

              <h2
                className={`text-sm font-bold ${
                  isWarning
                    ? "text-amber-950"
                    : "text-emerald-950"
                }`}
              >
                {toast.title}
              </h2>
            </div>

            <p
              className={`mt-1 whitespace-pre-line text-sm leading-6 ${
                isWarning
                  ? "text-amber-800"
                  : "text-emerald-800"
              }`}
            >
              {toast.message}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close delivery notification"
          className={`absolute right-7 top-8 flex h-8 w-8 items-center justify-center rounded-lg transition ${
            isWarning
              ? "text-amber-600 hover:bg-amber-100 hover:text-amber-800"
              : "text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800"
          }`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
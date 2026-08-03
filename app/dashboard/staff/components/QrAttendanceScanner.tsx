"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  LoaderCircle,
  ScanLine,
  ShieldAlert,
  Square,
} from "lucide-react";
import type { Html5Qrcode } from "html5-qrcode";

import type { DashboardMessage as DashboardMessageType } from "../types";
import DashboardMessage from "./DashboardMessage";

type QrAttendanceScannerProps = {
  eventKey: string;
  canUseAttendanceTools: boolean;
  blockedMessage: string;
  message: DashboardMessageType | null;
  onProcessToken: (
    token: string,
    method: "qr" | "manual"
  ) => Promise<boolean>;
  onShowMessage: (
    text: string,
    tone?: DashboardMessageType["tone"]
  ) => void;
};

export default function QrAttendanceScanner({
  eventKey,
  canUseAttendanceTools,
  blockedMessage,
  message,
  onProcessToken,
  onShowMessage,
}: QrAttendanceScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanningLockRef = useRef(false);

  const [scannerStarted, setScannerStarted] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [scannerError, setScannerError] = useState("");

  const stopScanner = async (showStoppedMessage = true) => {
    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {}

        try {
          await scannerRef.current.clear();
        } catch {}

        scannerRef.current = null;
      }

      setScannerStarted(false);
      scanningLockRef.current = false;

      if (showStoppedMessage) {
        onShowMessage("Scanner stopped.", "info");
      }
    } catch {
      setScannerStarted(false);
      scannerRef.current = null;
      scanningLockRef.current = false;
    }
  };

  useEffect(() => {
    if (!canUseAttendanceTools && scannerStarted) {
      void stopScanner(false);
    }
  }, [canUseAttendanceTools, scannerStarted]);

  useEffect(() => {
    if (scannerStarted) {
      void stopScanner(false);
    }
  }, [eventKey]);

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;

      scannerRef.current = null;
      scanningLockRef.current = false;

      if (!scanner) return;

      void (async () => {
        try {
          await scanner.stop();
        } catch {}

        try {
          await scanner.clear();
        } catch {}
      })();
    };
  }, []);

  const startScanner = async () => {
    if (scannerStarted || cameraLoading) return;

    if (!canUseAttendanceTools) {
      onShowMessage(blockedMessage, "error");
      return;
    }

    setCameraLoading(true);
    setScannerError("");
    onShowMessage("Starting camera...", "info");

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {}

        try {
          await scannerRef.current.clear();
        } catch {}
      }

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      const cameras = await Html5Qrcode.getCameras();

      if (!cameras || cameras.length === 0) {
        throw new Error("No camera found. Please allow camera permission.");
      }

      const backCamera = cameras.find((camera) =>
        /back|rear|environment/i.test(camera.label)
      );

      const selectedCameraId = backCamera?.id || cameras[0].id;

      await scanner.start(
        selectedCameraId,
        {
          fps: 10,
          qrbox: {
            width: 260,
            height: 260,
          },
          aspectRatio: 1.7777778,
        },
        async (decodedText: string) => {
          if (scanningLockRef.current) return;

          scanningLockRef.current = true;
          onShowMessage("QR code detected. Processing...", "info");

          await onProcessToken(decodedText.trim(), "qr");

          window.setTimeout(() => {
            scanningLockRef.current = false;
          }, 2500);
        },
        () => {}
      );

      setScannerStarted(true);

      onShowMessage(
        "Scanner is running. Point the camera at the participant QR code.",
        "success"
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to start scanner.";

      setScannerError(errorMessage);
    } finally {
      setCameraLoading(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Scanner heading */}
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <ScanLine className="h-5 w-5" aria-hidden="true" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                QR Attendance Scanner
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Scan the participant QR code after attendance check-in has been
                opened for the selected event.
              </p>
            </div>
          </div>

          <ScannerStatus
            scannerStarted={scannerStarted}
            cameraLoading={cameraLoading}
            canUseAttendanceTools={canUseAttendanceTools}
          />
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {/* Scanner controls */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void startScanner()}
            disabled={
              scannerStarted || cameraLoading || !canUseAttendanceTools
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cameraLoading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : scannerStarted ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Camera className="h-4 w-4" />
            )}

            {cameraLoading
              ? "Starting Camera..."
              : scannerStarted
                ? "Scanner Running"
                : "Start Scanner"}
          </button>

          {scannerStarted && (
            <button
              type="button"
              onClick={() => void stopScanner()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
            >
              <Square className="h-4 w-4" />
              Stop Scanner
            </button>
          )}
        </div>

        {/* Blocked notice */}
        {!canUseAttendanceTools && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

            <div>
              <p className="text-sm font-semibold">Scanner unavailable</p>
              <p className="mt-1 text-sm leading-6">
                {blockedMessage ||
                  "Select an event and open attendance check-in to enable QR scanning."}
              </p>
            </div>
          </div>
        )}

        {/* Camera preview */}
        <div className="relative mt-5 overflow-hidden rounded-2xl border border-slate-300 bg-slate-950 shadow-inner">
          <div
            id="qr-reader"
            className="min-h-[320px] w-full sm:min-h-[380px] [&_img]:hidden [&_video]:!h-[320px] [&_video]:!w-full [&_video]:!object-cover sm:[&_video]:!h-[380px]"
          />

          {!scannerStarted && !cameraLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/10">
                {canUseAttendanceTools ? (
                  <Camera className="h-9 w-9 text-slate-200" />
                ) : (
                  <CameraOff className="h-9 w-9 text-slate-400" />
                )}
              </div>

              <p className="mt-4 text-sm font-semibold">
                Camera preview will appear here
              </p>

              <p className="mt-2 max-w-sm text-xs leading-5 text-slate-300">
                {canUseAttendanceTools
                  ? "Select Start Scanner, allow camera access, and position the participant QR code inside the guide."
                  : "The camera remains disabled until attendance tools are available for the selected event."}
              </p>
            </div>
          )}

          {cameraLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-white">
              <LoaderCircle className="h-8 w-8 animate-spin" />

              <p className="mt-3 text-sm font-semibold">Opening camera...</p>

              <p className="mt-1 text-xs text-slate-300">
                Allow camera permission when prompted.
              </p>
            </div>
          )}

          {scannerStarted && (
            <>
              <div className="pointer-events-none absolute inset-0 bg-black/15" />

              <div className="pointer-events-none absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-emerald-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.38)] sm:h-64 sm:w-64">
                <div className="scanner-line absolute left-3 right-3 h-0.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />

                <div className="absolute -left-1 -top-1 h-9 w-9 rounded-tl-2xl border-l-4 border-t-4 border-emerald-300" />

                <div className="absolute -right-1 -top-1 h-9 w-9 rounded-tr-2xl border-r-4 border-t-4 border-emerald-300" />

                <div className="absolute -bottom-1 -left-1 h-9 w-9 rounded-bl-2xl border-b-4 border-l-4 border-emerald-300" />

                <div className="absolute -bottom-1 -right-1 h-9 w-9 rounded-br-2xl border-b-4 border-r-4 border-emerald-300" />
              </div>

              <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm">
                <ScanLine className="h-4 w-4 text-emerald-300" />
                Align QR code inside the box
              </div>
            </>
          )}
        </div>

        {/* Scanner error */}
        {scannerError && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900"
          >
            <CameraOff className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />

            <div>
              <p className="text-sm font-semibold">Unable to start camera</p>
              <p className="mt-1 text-sm leading-6">{scannerError}</p>
            </div>
          </div>
        )}

        {/* Attendance processing message */}
        {message && (
          <div className="mt-4">
            <DashboardMessage message={message} />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes scanner-line {
          0% {
            top: 12px;
          }

          50% {
            top: calc(100% - 14px);
          }

          100% {
            top: 12px;
          }
        }

        .scanner-line {
          animation: scanner-line 2s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .scanner-line {
            animation: none;
            top: 50%;
          }
        }
      `}</style>
    </section>
  );
}

type ScannerStatusProps = {
  scannerStarted: boolean;
  cameraLoading: boolean;
  canUseAttendanceTools: boolean;
};

function ScannerStatus({
  scannerStarted,
  cameraLoading,
  canUseAttendanceTools,
}: ScannerStatusProps) {
  if (cameraLoading) {
    return (
      <div className="flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        Starting
      </div>
    );
  }

  if (scannerStarted) {
    return (
      <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Active
      </div>
    );
  }

  if (!canUseAttendanceTools) {
    return (
      <div className="flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
        <CameraOff className="h-3.5 w-3.5" />
        Disabled
      </div>
    );
  }

  return (
    <div className="flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
      <span className="h-2 w-2 rounded-full bg-slate-400" />
      Ready
    </div>
  );
}
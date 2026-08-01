"use client";

import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import DashboardMessage from "./DashboardMessage";
import type { DashboardMessage as DashboardMessageType } from "../types";

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
        } catch { }

        try {
          await scannerRef.current.clear();
        } catch { }

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
        } catch { }

        try {
          await scanner.clear();
        } catch { }
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
        } catch { }

        try {
          await scannerRef.current.clear();
        } catch { }
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
          qrbox: { width: 260, height: 260 },
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
        () => { }
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
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        QR Attendance Scanner
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Open check-in first, then align the participant QR code inside the
        scanning box.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void startScanner()}
          disabled={scannerStarted || cameraLoading || !canUseAttendanceTools}
          className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cameraLoading
            ? "Starting..."
            : scannerStarted
              ? "Scanner Started"
              : "Start Scanner"}
        </button>

        {scannerStarted && (
          <button
            type="button"
            onClick={() => void stopScanner()}
            className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Stop Scanner
          </button>
        )}
      </div>

      <div className="relative mt-5 overflow-hidden rounded-2xl border border-slate-300 bg-slate-950">
        <div
          id="qr-reader"
          className="min-h-[340px] w-full [&_video]:!h-[340px] [&_video]:!w-full [&_video]:!object-cover"
        />

        {!scannerStarted && !cameraLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-center text-white">
            <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-3xl">
              📷
            </div>
            <p className="text-sm font-medium">Camera preview will appear here</p>
            <p className="mt-1 max-w-xs px-4 text-xs text-slate-300">
              {canUseAttendanceTools
                ? "Click Start Scanner to begin scanning."
                : "Select an event and open check-in to enable the camera."}
            </p>
          </div>
        )}

        {cameraLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-sm font-medium text-white">
            Opening camera...
          </div>
        )}

        {scannerStarted && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-black/20" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-green-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
              <div className="scanner-line absolute left-3 right-3 h-1 rounded-full bg-green-400 shadow-lg shadow-green-400/70" />
              <div className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-green-300" />
              <div className="absolute -right-1 -top-1 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-green-300" />
              <div className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-green-300" />
              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-green-300" />
            </div>
            <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-xs font-medium text-white">
              Align QR code inside the box
            </div>
          </>
        )}
      </div>

      {scannerError && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700">
          {scannerError}
        </div>
      )}

      <div className="mt-4">
        <DashboardMessage message={message} />
      </div>

      <style jsx>{`
        @keyframes scanner-line {
          0% {
            top: 12px;
          }
          50% {
            top: 238px;
          }
          100% {
            top: 12px;
          }
        }

        .scanner-line {
          animation: scanner-line 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

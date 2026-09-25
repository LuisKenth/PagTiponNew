"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Camera,
  CameraOff,
  CheckCircle2,
  LogIn,
  LogOut,
  LoaderCircle,
  ScanLine,
  ShieldAlert,
  Square,
} from "lucide-react";

import type { Html5Qrcode } from "html5-qrcode";

import type {
  AttendanceActionMode,
  DashboardMessage as DashboardMessageType,
} from "../types";

import DashboardMessage from "./DashboardMessage";

type QrAttendanceScannerProps = {
  eventKey: string;

  attendanceMode: AttendanceActionMode;

  canUseAttendanceTools: boolean;

  blockedMessage: string;

  message: DashboardMessageType | null;

  onProcessToken: (
    token: string,
    method: "qr" | "manual",
  ) => Promise<boolean>;

  onShowMessage: (
    text: string,
    tone?: DashboardMessageType["tone"],
  ) => void;
};

/*
 * Safely stop and remove an html5-qrcode scanner.
 *
 * stop() may throw when the scanner has not fully
 * started yet, so both operations are protected.
 */
async function safelyDestroyScanner(
  scanner: Html5Qrcode,
) {
  try {
    await scanner.stop();
  } catch {
    /*
     * Scanner may already be stopped or may not
     * have reached the running state yet.
     */
  }

  try {
    await scanner.clear();
  } catch {
    /*
     * Ignore cleanup errors.
     */
  }
}

function isAbortError(
  error: unknown,
) {
  return (
    error instanceof DOMException &&
    error.name === "AbortError"
  );
}

export default function QrAttendanceScanner({
  eventKey,
  attendanceMode,
  canUseAttendanceTools,
  blockedMessage,
  message,
  onProcessToken,
  onShowMessage,
}: QrAttendanceScannerProps) {
  /*
   * =====================================================
   * SCANNER REFERENCES
   * =====================================================
   */

  const scannerRef =
    useRef<Html5Qrcode | null>(
      null,
    );

  const scanningLockRef =
    useRef(false);

  /*
   * True while scanner.start() is still resolving.
   *
   * This prevents stop() from interrupting
   * video.play() while the camera is starting.
   */
  const startingRef =
    useRef(false);

  /*
   * Used to cancel an old start request when:
   *
   * - event changes
   * - attendance mode changes
   * - scanner becomes unavailable
   * - component unmounts
   */
  const startAttemptRef =
    useRef(0);

  const stopRequestedRef =
    useRef(false);

  const mountedRef =
    useRef(true);

  const scanUnlockTimerRef =
    useRef<number | null>(
      null,
    );

  /*
   * Track the previous event and attendance mode.
   *
   * IMPORTANT:
   * We stop the scanner only when the actual
   * event/mode changes — not merely because
   * scannerStarted changed.
   */
  const previousEventKeyRef =
    useRef(eventKey);

  const previousAttendanceModeRef =
    useRef(attendanceMode);

  /*
   * =====================================================
   * STATE
   * =====================================================
   */

  const [
    scannerStarted,
    setScannerStarted,
  ] = useState(false);

  const [
    cameraLoading,
    setCameraLoading,
  ] = useState(false);

  const [
    scannerError,
    setScannerError,
  ] = useState("");

  const isCheckInMode =
    attendanceMode === "check_in";

  const operationLabel =
    isCheckInMode
      ? "Check In"
      : "Check Out";

  const operationVerb =
    isCheckInMode
      ? "check in"
      : "check out";

  /*
   * =====================================================
   * CLEAR SCAN LOCK TIMER
   * =====================================================
   */

  const clearScanUnlockTimer =
    useCallback(() => {
      if (
        scanUnlockTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          scanUnlockTimerRef.current,
        );

        scanUnlockTimerRef.current =
          null;
      }
    }, []);

  /*
   * =====================================================
   * STOP SCANNER
   * =====================================================
   */

  const stopScanner =
    useCallback(
      async (
        showStoppedMessage = true,
      ) => {
        /*
         * Invalidate any previous start attempt.
         */
        startAttemptRef.current += 1;

        stopRequestedRef.current =
          true;

        scanningLockRef.current =
          false;

        clearScanUnlockTimer();

        /*
         * If scanner.start() is currently waiting for
         * the browser camera/video to become ready,
         * DO NOT call stop() yet.
         *
         * Calling stop() during that period causes:
         *
         * AbortError:
         * The play() request was interrupted because
         * the media was removed from the document.
         *
         * startScanner() will notice that this start
         * request was cancelled and clean it up after
         * scanner.start() settles.
         */
        if (startingRef.current) {
          if (mountedRef.current) {
            setScannerStarted(
              false,
            );
          }

          return;
        }

        const scanner =
          scannerRef.current;

        scannerRef.current =
          null;

        if (scanner) {
          await safelyDestroyScanner(
            scanner,
          );
        }

        stopRequestedRef.current =
          false;

        if (
          !mountedRef.current
        ) {
          return;
        }

        setScannerStarted(
          false,
        );

        if (
          showStoppedMessage
        ) {
          onShowMessage(
            "Scanner stopped.",
            "info",
          );
        }
      },
      [
        clearScanUnlockTimer,
        onShowMessage,
      ],
    );

  /*
   * =====================================================
   * ATTENDANCE AVAILABILITY CHANGE
   * =====================================================
   *
   * If Event Control closes the currently active
   * Check-In / Check-Out session, automatically
   * stop the scanner.
   */

  useEffect(() => {
    if (
      !canUseAttendanceTools
    ) {
      void stopScanner(
        false,
      );
    }
  }, [
    canUseAttendanceTools,
    stopScanner,
  ]);

  /*
   * =====================================================
   * EVENT CHANGE
   * =====================================================
   *
   * IMPORTANT:
   * This effect reacts to an actual eventKey change.
   *
   * It does NOT depend on scannerStarted, which was
   * the cause of the previous immediate scanner stop.
   */

  useEffect(() => {
    if (
      previousEventKeyRef.current ===
      eventKey
    ) {
      return;
    }

    previousEventKeyRef.current =
      eventKey;

    setScannerError("");

    void stopScanner(
      false,
    );
  }, [
    eventKey,
    stopScanner,
  ]);

  /*
   * =====================================================
   * ATTENDANCE MODE CHANGE
   * =====================================================
   *
   * Moving from Check In -> Check Out or vice versa
   * must stop the old scanner session.
   *
   * Again, this runs only when attendanceMode itself
   * changes.
   */

  useEffect(() => {
    if (
      previousAttendanceModeRef.current ===
      attendanceMode
    ) {
      return;
    }

    previousAttendanceModeRef.current =
      attendanceMode;

    setScannerError("");

    void stopScanner(
      false,
    );
  }, [
    attendanceMode,
    stopScanner,
  ]);

  /*
   * =====================================================
   * UNMOUNT CLEANUP
   * =====================================================
   */

  useEffect(() => {
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;

      /*
       * Cancel a pending start attempt.
       */
      startAttemptRef.current +=
        1;

      stopRequestedRef.current =
        true;

      scanningLockRef.current =
        false;

      if (
        scanUnlockTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          scanUnlockTimerRef.current,
        );

        scanUnlockTimerRef.current =
          null;
      }

      const scanner =
        scannerRef.current;

      scannerRef.current =
        null;

      /*
       * Do not call stop() while scanner.start()
       * is still resolving.
       *
       * The pending start flow will clean itself
       * after it notices the cancelled attempt.
       */
      if (
        scanner &&
        !startingRef.current
      ) {
        void safelyDestroyScanner(
          scanner,
        );
      }
    };
  }, []);

  /*
   * =====================================================
   * START SCANNER
   * =====================================================
   */

  const startScanner =
    async () => {
      if (
        scannerStarted ||
        cameraLoading ||
        startingRef.current
      ) {
        return;
      }

      if (
        !canUseAttendanceTools
      ) {
        onShowMessage(
          blockedMessage,
          "error",
        );

        return;
      }

      /*
       * Each start gets its own ID.
       *
       * If another stop/event/mode action increments
       * startAttemptRef, this attempt becomes stale.
       */
      const attemptId =
        startAttemptRef.current +
        1;

      startAttemptRef.current =
        attemptId;

      stopRequestedRef.current =
        false;

      startingRef.current =
        true;

      setCameraLoading(
        true,
      );

      setScannerError("");

      onShowMessage(
        `Starting camera for ${operationLabel.toLowerCase()}...`,
        "info",
      );

      let scanner:
        | Html5Qrcode
        | null = null;

      /*
       * Helper to determine whether this start
       * request has been cancelled.
       */
      const startWasCancelled =
        () => {
          return (
            !mountedRef.current ||
            stopRequestedRef.current ||
            attemptId !==
              startAttemptRef.current
          );
        };

      try {
        const {
          Html5Qrcode,
        } = await import(
          "html5-qrcode"
        );

        /*
         * User may have changed event/mode while
         * the module was loading.
         */
        if (
          startWasCancelled()
        ) {
          return;
        }

        /*
         * Clean an old completed scanner instance,
         * if one still exists.
         */
        const existingScanner =
          scannerRef.current;

        if (
          existingScanner
        ) {
          scannerRef.current =
            null;

          await safelyDestroyScanner(
            existingScanner,
          );
        }

        if (
          startWasCancelled()
        ) {
          return;
        }

        scanner =
          new Html5Qrcode(
            "qr-reader",
          );

        scannerRef.current =
          scanner;

        /*
         * Request available cameras.
         */
        const cameras =
          await Html5Qrcode.getCameras();

        if (
          startWasCancelled()
        ) {
          if (
            scannerRef.current ===
            scanner
          ) {
            scannerRef.current =
              null;
          }

          /*
           * Scanner has not started yet, so clear
           * its DOM without forcing stop().
           */
          try {
            await scanner.clear();
          } catch {}

          return;
        }

        if (
          !cameras ||
          cameras.length === 0
        ) {
          throw new Error(
            "No camera found. Please allow camera permission.",
          );
        }

        /*
         * Prefer rear/environment camera when
         * available.
         */
        const backCamera =
          cameras.find(
            (camera) =>
              /back|rear|environment/i.test(
                camera.label,
              ),
          );

        const selectedCameraId =
          backCamera?.id ||
          cameras[0].id;

        /*
         * =================================================
         * START HTML5 QR SCANNER
         * =================================================
         */

        await scanner.start(
          selectedCameraId,
          {
            fps: 10,

            qrbox: {
              width: 260,
              height: 260,
            },

            aspectRatio:
              1.7777778,
          },

          async (
            decodedText: string,
          ) => {
            /*
             * Prevent the same QR image from
             * firing repeatedly.
             */
            if (
              scanningLockRef.current
            ) {
              return;
            }

            scanningLockRef.current =
              true;

            onShowMessage(
              `QR code detected. Processing ${operationLabel.toLowerCase()}...`,
              "info",
            );

            try {
              await onProcessToken(
                decodedText.trim(),
                "qr",
              );
            } finally {
              clearScanUnlockTimer();

              scanUnlockTimerRef.current =
                window.setTimeout(
                  () => {
                    scanningLockRef.current =
                      false;

                    scanUnlockTimerRef.current =
                      null;
                  },
                  2500,
                );
            }
          },

          /*
           * QR parse failures are expected while
           * the camera is searching for a code,
           * so they do not need to be displayed.
           */
          () => {},
        );

        /*
         * A stop/mode/event change may have occurred
         * while scanner.start() was resolving.
         *
         * Now that start() has safely finished,
         * we can stop it without interrupting
         * video.play().
         */
        if (
          startWasCancelled()
        ) {
          if (
            scannerRef.current ===
            scanner
          ) {
            scannerRef.current =
              null;
          }

          await safelyDestroyScanner(
            scanner,
          );

          return;
        }

        if (
          !mountedRef.current
        ) {
          return;
        }

        setScannerStarted(
          true,
        );

        onShowMessage(
          `Scanner is running in ${operationLabel} mode. Point the camera at the participant QR code.`,
          "success",
        );
      } catch (error) {
        /*
         * AbortError is a browser media lifecycle
         * cancellation. It should not be presented
         * as a fatal camera failure.
         */
        if (
          isAbortError(error)
        ) {
          if (
            mountedRef.current
          ) {
            setScannerError(
              "",
            );
          }

          return;
        }

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unable to start scanner.";

        if (
          mountedRef.current
        ) {
          setScannerStarted(
            false,
          );

          setScannerError(
            errorMessage,
          );

          onShowMessage(
            errorMessage,
            "error",
          );
        }

        /*
         * If scanner.start() failed, remove the
         * failed instance from our ref.
         */
        if (
          scanner &&
          scannerRef.current ===
            scanner
        ) {
          scannerRef.current =
            null;

          try {
            await scanner.clear();
          } catch {}
        }
      } finally {
        startingRef.current =
          false;

        /*
         * If stopScanner() was requested while
         * scanner.start() was pending, finish that
         * cleanup now that startup has settled.
         */
        if (
          stopRequestedRef.current
        ) {
          const activeScanner =
            scannerRef.current;

          scannerRef.current =
            null;

          if (
            activeScanner
          ) {
            await safelyDestroyScanner(
              activeScanner,
            );
          }

          stopRequestedRef.current =
            false;

          scanningLockRef.current =
            false;

          if (
            mountedRef.current
          ) {
            setScannerStarted(
              false,
            );
          }
        }

        if (
          mountedRef.current
        ) {
          setCameraLoading(
            false,
          );
        }
      }
    };

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Scanner heading */}
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                isCheckInMode
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-blue-50 text-blue-700"
              }`}
            >
              {isCheckInMode ? (
                <LogIn
                  className="h-5 w-5"
                  aria-hidden="true"
                />
              ) : (
                <LogOut
                  className="h-5 w-5"
                  aria-hidden="true"
                />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  QR Attendance Scanner
                </h2>

                <OperationBadge
                  mode={
                    attendanceMode
                  }
                />
              </div>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                {isCheckInMode
                  ? "Scan the participant QR code to record Time In. Attendance check-in must be open for the selected event."
                  : "Scan the same participant QR code to record Time Out. Only participants with a successful Time In can be checked out."}
              </p>
            </div>
          </div>

          <ScannerStatus
            scannerStarted={
              scannerStarted
            }
            cameraLoading={
              cameraLoading
            }
            canUseAttendanceTools={
              canUseAttendanceTools
            }
          />
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {/* Current operation */}
        <div
          className={`mb-5 flex items-start gap-3 rounded-xl border p-4 ${
            isCheckInMode
              ? "border-emerald-200 bg-emerald-50"
              : "border-blue-200 bg-blue-50"
          }`}
        >
          {isCheckInMode ? (
            <LogIn className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <LogOut className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          )}

          <div>
            <p
              className={`text-sm font-semibold ${
                isCheckInMode
                  ? "text-emerald-900"
                  : "text-blue-900"
              }`}
            >
              {operationLabel} Mode
            </p>

            <p
              className={`mt-1 text-sm leading-6 ${
                isCheckInMode
                  ? "text-emerald-700"
                  : "text-blue-700"
              }`}
            >
              {isCheckInMode
                ? "The next valid QR scan will record the participant's Time In."
                : "The next valid QR scan will record the participant's Time Out."}
            </p>
          </div>
        </div>

        {/* Scanner controls */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() =>
              void startScanner()
            }
            disabled={
              scannerStarted ||
              cameraLoading ||
              !canUseAttendanceTools
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
                ? `${operationLabel} Scanner Running`
                : `Start ${operationLabel} Scanner`}
          </button>

          {scannerStarted && (
            <button
              type="button"
              onClick={() =>
                void stopScanner()
              }
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
              <p className="text-sm font-semibold">
                {operationLabel} scanner
                unavailable
              </p>

              <p className="mt-1 text-sm leading-6">
                {blockedMessage ||
                  (isCheckInMode
                    ? "Select an event and open attendance check-in to enable QR scanning."
                    : "Select an eligible event to enable participant check-out.")}
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

          {!scannerStarted &&
            !cameraLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/10">
                  {canUseAttendanceTools ? (
                    <Camera className="h-9 w-9 text-slate-200" />
                  ) : (
                    <CameraOff className="h-9 w-9 text-slate-400" />
                  )}
                </div>

                <p className="mt-4 text-sm font-semibold">
                  {operationLabel} camera
                  preview
                </p>

                <p className="mt-2 max-w-sm text-xs leading-5 text-slate-300">
                  {canUseAttendanceTools
                    ? `Select Start ${operationLabel} Scanner, allow camera access, and position the participant QR code inside the guide.`
                    : `${operationLabel} scanning is currently unavailable for the selected event.`}
                </p>
              </div>
            )}

          {cameraLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-white">
              <LoaderCircle className="h-8 w-8 animate-spin" />

              <p className="mt-3 text-sm font-semibold">
                Opening camera...
              </p>

              <p className="mt-1 text-xs text-slate-300">
                Allow camera permission
                when prompted.
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

                Scan QR to{" "}
                {operationVerb}
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
              <p className="text-sm font-semibold">
                Unable to start camera
              </p>

              <p className="mt-1 text-sm leading-6">
                {scannerError}
              </p>
            </div>
          </div>
        )}

        {/* Attendance message */}
        {message && (
          <div className="mt-4">
            <DashboardMessage
              message={message}
            />
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
          animation: scanner-line 2s
            ease-in-out infinite;
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

/*
 * =========================================================
 * SCANNER STATUS
 * =========================================================
 */

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

  if (
    !canUseAttendanceTools
  ) {
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

/*
 * =========================================================
 * OPERATION BADGE
 * =========================================================
 */

type OperationBadgeProps = {
  mode: AttendanceActionMode;
};

function OperationBadge({
  mode,
}: OperationBadgeProps) {
  if (
    mode === "check_out"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
        <LogOut className="h-3.5 w-3.5" />

        Check Out
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      <LogIn className="h-3.5 w-3.5" />

      Check In
    </span>
  );
}
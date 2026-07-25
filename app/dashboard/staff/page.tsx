"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type RSVP = {
    id: string;
    event_municipality_id: string;
    user_id: string;
    municipality: string;
    qr_token: string | null;
    status: string | null;
    registered_at: string | null;
};

type AttendanceRecord = {
    id: string;
    rsvp_id: string;
    event_municipality_id: string;
    user_id: string;
    status: string | null;
    method: string | null;
    checked_in_at: string | null;
    checked_in_by: string | null;
};

export default function StaffDashboardPage() {
    const scannerRef = useRef<any>(null);
    const scanningLockRef = useRef(false);

    const [staffId, setStaffId] = useState("");
    const [municipality, setMunicipality] = useState("");
    const [manualQrToken, setManualQrToken] = useState("");
    const [message, setMessage] = useState("");
    const [attendanceRecords, setAttendanceRecords] = useState<
        AttendanceRecord[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [scannerStarted, setScannerStarted] = useState(false);
    const [cameraLoading, setCameraLoading] = useState(false);
    const [scannerError, setScannerError] = useState("");

    useEffect(() => {
        fetchStaffData();

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(() => { });
            }
        };
    }, []);

    const fetchStaffData = async () => {
        setLoading(true);

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error(userError?.message);
            setLoading(false);
            return;
        }

        setStaffId(user.id);

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("municipality")
            .eq("id", user.id)
            .single();

        if (profileError || !profile?.municipality) {
            console.error(profileError?.message);
            setLoading(false);
            return;
        }

        setMunicipality(profile.municipality);

        await fetchAttendanceRecords();
        setLoading(false);
    };

    const fetchAttendanceRecords = async () => {
        const { data, error } = await supabase
            .from("attendance")
            .select(
                "id, rsvp_id, event_municipality_id, user_id, status, method, checked_in_at, checked_in_by"
            )
            .order("checked_in_at", { ascending: false });

        if (error) {
            console.error(error.message);
            setAttendanceRecords([]);
            return;
        }

        setAttendanceRecords(data || []);
    };

    const startScanner = async () => {
        if (scannerStarted || cameraLoading) return;

        setCameraLoading(true);
        setScannerError("");
        setMessage("Starting camera...");

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
                    qrbox: {
                        width: 260,
                        height: 260,
                    },
                    aspectRatio: 1.7777778,
                },
                async (decodedText: string) => {
                    if (scanningLockRef.current) return;

                    scanningLockRef.current = true;
                    setMessage("QR code detected. Processing...");

                    await processQrToken(decodedText);

                    setTimeout(() => {
                        scanningLockRef.current = false;
                    }, 2500);
                },
                () => { }
            );

            setScannerStarted(true);
            setMessage("Scanner is running. Point the camera at the QR code.");
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unable to start scanner.";

            setScannerError(message);
            setMessage("");
        } finally {
            setCameraLoading(false);
        }
    };

    const stopScanner = async () => {
        try {
            if (scannerRef.current) {
                await scannerRef.current.stop();
                await scannerRef.current.clear();
                scannerRef.current = null;
            }

            setScannerStarted(false);
            setMessage("Scanner stopped.");
        } catch {
            setScannerStarted(false);
            scannerRef.current = null;
        }
    };

    const processQrToken = async (qrToken: string) => {
        setMessage("Checking QR code...");

        const { data: rsvp, error: rsvpError } = await supabase
            .from("rsvps")
            .select(
                "id, event_municipality_id, user_id, municipality, qr_token, status, registered_at"
            )
            .eq("qr_token", qrToken)
            .eq("status", "registered")
            .single();

        if (rsvpError || !rsvp) {
            setMessage("Invalid QR code or participant is not registered.");
            return;
        }

        if (rsvp.municipality !== municipality) {
            setMessage("This QR code is not for your municipality.");
            return;
        }

        const { data: existingAttendance, error: existingError } = await supabase
            .from("attendance")
            .select(
                "id, rsvp_id, event_municipality_id, user_id, status, method, checked_in_at, checked_in_by"
            )
            .eq("rsvp_id", rsvp.id)
            .maybeSingle();

        if (existingError) {
            setMessage(existingError.message);
            return;
        }

        if (existingAttendance) {
            if (existingAttendance.status === "present") {
                setMessage("Participant is already marked as present.");
                return;
            }

            const { error: updateError } = await supabase
                .from("attendance")
                .update({
                    status: "present",
                    method: "qr",
                    checked_in_at: new Date().toISOString(),
                    checked_in_by: staffId,
                })
                .eq("id", existingAttendance.id);

            if (updateError) {
                setMessage(updateError.message);
                return;
            }

            setMessage("Attendance updated. Participant is now present.");
            await fetchAttendanceRecords();
            return;
        }

        const { error: insertError } = await supabase.from("attendance").insert({
            rsvp_id: rsvp.id,
            event_municipality_id: rsvp.event_municipality_id,
            user_id: rsvp.user_id,
            status: "present",
            method: "qr",
            checked_in_at: new Date().toISOString(),
            checked_in_by: staffId,
        });

        if (insertError) {
            setMessage(insertError.message);
            return;
        }

        setMessage("Attendance recorded successfully. Participant is present.");
        await fetchAttendanceRecords();
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!manualQrToken.trim()) {
            alert("Please enter QR token.");
            return;
        }

        await processQrToken(manualQrToken.trim());
        setManualQrToken("");
    };

    const formatDateTime = (dateValue: string | null) => {
        if (!dateValue) return "Not set";

        return new Date(dateValue).toLocaleString("en-PH", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    };

    return (
        <main className="min-h-screen bg-slate-100 p-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <h1 className="text-2xl font-bold text-slate-900">
                        Staff Dashboard
                    </h1>

                    <p className="mt-2 text-sm text-slate-600">
                        Scan participant QR codes and record attendance for{" "}
                        <span className="font-semibold text-slate-900">
                            {municipality || "your municipality"}
                        </span>
                        .
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-slate-500">Total Scanned</p>
                        <h2 className="mt-2 text-2xl font-bold text-slate-900">
                            {attendanceRecords.length}
                        </h2>
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-slate-500">Present</p>
                        <h2 className="mt-2 text-2xl font-bold text-slate-900">
                            {
                                attendanceRecords.filter(
                                    (record) => record.status === "present"
                                ).length
                            }
                        </h2>
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-slate-500">Method</p>
                        <h2 className="mt-2 text-2xl font-bold text-slate-900">QR</h2>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl bg-white p-6 shadow-sm">
  <h2 className="text-xl font-semibold text-slate-900">
    QR Attendance Scanner
  </h2>

  <p className="mt-2 text-sm text-slate-500">
    Start the scanner and align the participant QR code inside the green box.
  </p>

  <div className="mt-4 flex flex-wrap gap-3">
    <button
      type="button"
      onClick={startScanner}
      disabled={scannerStarted || cameraLoading}
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
        onClick={stopScanner}
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
        <p className="mt-1 text-xs text-slate-300">
          Click Start Scanner to begin scanning.
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

  {message && (
    <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm font-medium text-slate-700">
      {message}
    </div>
  )}

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

                    <div className="rounded-2xl bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-semibold text-slate-900">
                            Manual QR Token Entry
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            Use this if camera scanning is not available.
                        </p>

                        <form onSubmit={handleManualSubmit} className="mt-4 space-y-4">
                            <textarea
                                value={manualQrToken}
                                onChange={(e) => setManualQrToken(e.target.value)}
                                placeholder="Paste QR token here"
                                rows={5}
                                className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                            />

                            <button
                                type="submit"
                                className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
                            >
                                Submit QR Token
                            </button>
                        </form>
                    </div>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-slate-900">
                        Recent Attendance Records
                    </h2>

                    {loading ? (
                        <p className="mt-4 text-sm text-slate-500">
                            Loading attendance records...
                        </p>
                    ) : attendanceRecords.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">
                            No attendance records yet.
                        </p>
                    ) : (
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b text-sm text-slate-500">
                                        <th className="py-3 pr-4">User ID</th>
                                        <th className="py-3 pr-4">Status</th>
                                        <th className="py-3 pr-4">Method</th>
                                        <th className="py-3 pr-4">Checked In At</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {attendanceRecords.map((record) => (
                                        <tr key={record.id} className="border-b text-sm">
                                            <td className="py-3 pr-4 text-slate-600">
                                                {record.user_id}
                                            </td>

                                            <td className="py-3 pr-4">
                                                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                                                    {record.status}
                                                </span>
                                            </td>

                                            <td className="py-3 pr-4 text-slate-600">
                                                {record.method}
                                            </td>

                                            <td className="py-3 pr-4 text-slate-600">
                                                {formatDateTime(record.checked_in_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
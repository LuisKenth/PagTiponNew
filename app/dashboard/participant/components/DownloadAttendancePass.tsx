"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import QRCode from "qrcode";

type Props = {
  qrToken: string;
  participantName: string;
  eventTitle: string;
  schedule: string;
  venue: string;
  municipality: string;
  manualCode: string | null;
};

/** Export the existing registration token; downloading never creates or changes a pass. */
export async function createAttendancePassPng(pass: Props): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const width = 960;
  canvas.width = width;
  // Measure wrapped text before allocating the final canvas height.
  const measure = canvas.getContext("2d");
  if (!measure) throw new Error("Image download is unavailable in this browser.");
  function lines(text: string, size: number, bold = false): string[] {
    measure!.font = `${bold ? "700" : "400"} ${size}px Arial`;
    const output: string[] = [];
    let line = "";
    for (const char of text.replace(/\s+/g, " ").trim()) {
      if (line && measure!.measureText(line + char).width > width - 112) {
        output.push(line.trim());
        line = "";
      }
      line += char;
    }
    if (line) output.push(line.trim());
    return output.length ? output : ["—"];
  }
  const sections = [
    {text: pass.eventTitle, size: 36, bold: true},
    {text: pass.participantName || "Participant", size: 30, bold: true},
    {text: pass.schedule, size: 25, bold: false},
    {text: `${pass.venue} · ${pass.municipality}`, size: 25, bold: false},
  ].map(section => ({...section, lines: lines(section.text, section.size, section.bold)}));
  const codeLines = lines(pass.manualCode || "Not available", 34, true);
  const detailsHeight = sections.reduce((height, section) => height + section.lines.length * (section.size + 12) + 18, 0);
  canvas.height = 130 + detailsHeight + 640 + 150 + codeLines.length * 48 + 100;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare your attendance pass.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillStyle = "#0f172a";
  context.font = "700 30px Arial";
  context.fillText("PagTipon · Attendance Pass", width / 2, 42);
  let y = 112;
  for (const section of sections) {
    context.font = `${section.bold ? "700" : "400"} ${section.size}px Arial`;
    for (const line of section.lines) {
      context.fillText(line, width / 2, y);
      y += section.size + 12;
    }
    y += 18;
  }
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, pass.qrToken, {
    width: 640,
    margin: 4,
    errorCorrectionLevel: "M",
    color: {dark: "#000000", light: "#ffffff"},
  });
  context.imageSmoothingEnabled = false;
  context.drawImage(qrCanvas, (width - 640) / 2, y, 640, 640);
  y += 660;
  context.font = "400 25px Arial";
  context.fillText("Manual attendance code", width / 2, y);
  y += 42;
  context.font = "700 34px monospace";
  // Monospace can be wider than Arial: cap rendered line width without clipping.
  for (const line of codeLines) {
    context.fillText(line, width / 2, y, width - 112);
    y += 48;
  }
  y += 24;
  context.font = "400 24px Arial";
  context.fillText("Show the same code for Time-in and Time-out.", width / 2, y);
  context.fillText("Keep this pass private. Event attendance rules still apply.", width / 2, y + 36);
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error("Unable to create the PNG. Please try again."));
  }, "image/png"));
}

export default function DownloadAttendancePass(props: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  async function download() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const blob = await createAttendancePassPng(props);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const eventName = props.eventTitle.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "event";
      link.href = url;
      link.download = `PagTipon-${eventName}-QR-Pass.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setMessage("Download started. Check your Downloads or Files app.");
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Unable to download. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return <div className="mx-auto mt-3 w-full max-w-sm">
    <button type="button" disabled={busy} onClick={() => void download()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
      {busy ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Download className="size-5" aria-hidden="true" />}
      {busy ? "Preparing download…" : "Download QR Code"}
    </button>
    {message && <p role={failed ? "alert" : "status"} className={`mt-2 text-center text-xs leading-5 ${failed ? "text-red-700" : "text-emerald-700"}`}>{message}</p>}
  </div>;
}

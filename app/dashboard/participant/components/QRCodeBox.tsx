"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type QRCodeBoxProps = {
  qrToken: string;
};

export default function QRCodeBox({ qrToken }: QRCodeBoxProps) {
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    const generateQR = async () => {
      const url = await QRCode.toDataURL(qrToken, {
        width: 220,
        margin: 2,
      });

      setQrUrl(url);
    };

    generateQR();
  }, [qrToken]);

  if (!qrUrl) {
    return (
      <div className="mt-4 rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">
        Generating QR code...
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-center">
      <p className="mb-3 text-sm font-medium text-slate-700">
        Your Attendance QR Code
      </p>

      <img
        src={qrUrl}
        alt="Attendance QR Code"
        className="mx-auto h-44 w-44"
      />

      <p className="mt-3 break-all text-xs text-slate-400">{qrToken}</p>
    </div>
  );
}
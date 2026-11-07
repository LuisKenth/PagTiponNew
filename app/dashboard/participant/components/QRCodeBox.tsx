"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type QRCodeBoxProps = {
    qrToken: string;
};

export default function QRCodeBox({
    qrToken,
}: QRCodeBoxProps) {
    const [qrUrl, setQrUrl] = useState("");
    const [qrError, setQrError] = useState("");

    useEffect(() => {
        let active = true;

        const generateQR = async () => {
            setQrUrl("");
            setQrError("");

            try {
                const url =
                    await QRCode.toDataURL(
                        qrToken,
                        {
                            width: 220,
                            margin: 2,
                            errorCorrectionLevel:
                                "M",
                        },
                    );

                if (active) {
                    setQrUrl(url);
                }
            } catch (error) {
                console.error(
                    "QR code generation error:",
                    error,
                );

                if (active) {
                    setQrError(
                        "Unable to generate the QR code.",
                    );
                }
            }
        };

        void generateQR();

        return () => {
            active = false;
        };
    }, [qrToken]);

    if (qrError) {
        return (
            <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-center"
            >
                <p className="text-sm font-semibold text-red-800">
                    QR Code Unavailable
                </p>

                <p className="mt-1 text-xs leading-5 text-red-600">
                    {qrError} You may use your manual
                    attendance code instead.
                </p>
            </div>
        );
    }

    if (!qrUrl) {
        return (
            <div
                aria-live="polite"
                className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center"
            >
                <div className="mx-auto size-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

                <p className="mt-3 text-sm font-medium text-slate-600">
                    Generating QR code...
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm sm:p-5">
            <div>
                <p className="text-sm font-semibold text-slate-900">
                    Your Attendance QR Code
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                    Show this code to Event Staff for
                    Time-in and Time-out.
                </p>
            </div>

            <div className="mx-auto mt-3 flex w-fit max-w-full items-center justify-center rounded-xl border border-slate-200 bg-white p-2 sm:mt-4 sm:p-3">
                <img
                    src={qrUrl}
                    alt="Participant attendance QR code"
                    className="block aspect-square h-auto w-44 max-w-full"
                />
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
                Keep this attendance pass private. It
                is assigned specifically to your
                registration.
            </p>
        </div>
    );
}
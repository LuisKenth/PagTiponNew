"use client";
import { useEffect, useRef, type CSSProperties, type Ref } from "react";

export type CertificatePresentation = {
  participant_name: string;
  event_title: string;
  event_start_at: string;
  event_end_at: string;
  issued_at: string;
  issuer_name?: string;
  municipality?: string;
  event_origin?: string;
  certificate_number: string;
  signatories: { position: number; name: string; title: string }[];
};
const navy = "#10203e";
const gold = "#a38229";
const serif = 'Georgia, "Times New Roman", serif';
const day = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "long",
  day: "numeric",
});
export function certificateEventDate(start: string, end: string) {
  const a = day.format(new Date(start));
  const b = day.format(new Date(end));
  return a === b ? a : `${a} – ${b}`;
}
const wrap: CSSProperties = { overflowWrap: "anywhere", minWidth: 0 };

export default function CertificateDocument({
  certificate,
  documentRef,
}: {
  certificate: CertificatePresentation;
  documentRef?: Ref<HTMLDivElement>;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    // Fit unusually long saved names/titles inside their allotted regions.
    // This runs against real browser font metrics, including before PDF export.
    void document.fonts.ready.then(() => {
      if (cancelled || !rootRef.current) return;
      const root = rootRef.current;
      for (const region of root.querySelectorAll<HTMLElement>(
        "main, section > div",
      )) {
        for (let pass = 0; pass < 18; pass++) {
          const limit =
            region.tagName === "MAIN"
              ? region.clientHeight
              : root.querySelector("footer")!.getBoundingClientRect().top -
                region.getBoundingClientRect().top -
                8;
          if (region.scrollHeight <= limit + 1) break;
          for (const text of region.querySelectorAll<HTMLElement>(
            "p, h2, h3",
          )) {
            const size = parseFloat(getComputedStyle(text).fontSize);
            text.style.fontSize = `${Math.max(9, size * 0.94)}px`;
          }
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [certificate]);
  const signatories = [...(certificate.signatories || [])]
    .filter((s) => s.name?.trim() && s.title?.trim())
    .sort((a, b) => a.position - b.position)
    .slice(0, 3);
  const name = certificate.participant_name;
  const event = certificate.event_title;
  const nameSize = name.length > 90 ? 27 : name.length > 50 ? 34 : 46;
  const eventSize = event.length > 140 ? 18 : event.length > 75 ? 22 : 27;
  const issuer =
    certificate.issuer_name ||
    (certificate.event_origin === "municipal" && certificate.municipality
      ? `Municipality of ${certificate.municipality}`
      : "Province of Antique");

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        if (typeof documentRef === "function") documentRef(node);
        else if (documentRef) documentRef.current = node;
      }}
      id="certificate-print-area"
      aria-label={`Certificate of Participation for ${name}`}
      style={{
        position: "relative",
        width: 1120,
        height: 792,
        flexShrink: 0,
        margin: "0 auto",
        boxSizing: "border-box",
        background: "#fffefa",
        color: navy,
        fontFamily: serif,
      }}
    >
      <div
        aria-hidden="true"
        style={{ position: "absolute", inset: 12, border: `3px solid ${navy}` }}
      />
      <div
        aria-hidden="true"
        style={{ position: "absolute", inset: 21, border: `1px solid ${gold}` }}
      />
      {[
        { left: 21, top: 21 },
        { right: 21, top: 21 },
        { left: 21, bottom: 21 },
        { right: 21, bottom: 21 },
      ].map((corner, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            position: "absolute",
            ...corner,
            width: 17,
            height: 17,
            border: `2px solid ${gold}`,
            background: "#fffefa",
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          inset: "39px 58px 34px",
          display: "grid",
          gridTemplateRows: "107px 64px minmax(0,1fr) 148px 25px",
          rowGap: 10,
          textAlign: "center",
        }}
      >
        <header
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <svg
            aria-hidden="true"
            width="65"
            height="49"
            viewBox="0 0 100 75"
            fill="none"
          >
            <circle cx="50" cy="10" r="9" fill={navy} />
            <circle cx="20" cy="22" r="8" fill={gold} />
            <circle cx="80" cy="22" r="8" fill={gold} />
            <path d="M29 53C29 23 71 23 71 53" stroke={navy} strokeWidth="10" />
            <path
              d="M7 55C7 32 35 32 45 51M93 55C93 32 65 32 55 51"
              stroke={gold}
              strokeWidth="9"
            />
            <path d="M50 72C29 71 17 61 16 48C35 47 48 57 50 72Z" fill={navy} />
            <path d="M50 72C71 71 83 61 84 48C65 47 52 57 50 72Z" fill={gold} />
          </svg>
          <p style={{ margin: 0, fontSize: 19, fontStyle: "italic" }}>
            Republic of the Philippines
          </p>
          <p
            style={{
              ...wrap,
              margin: 0,
              fontSize: 25,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              lineHeight: 1.1,
            }}
          >
            {issuer}
          </p>
        </header>
        <h1
          style={{
            margin: 0,
            alignSelf: "center",
            fontSize: 36,
            lineHeight: 1.1,
            fontWeight: 700,
            letterSpacing: "0.015em",
          }}
        >
          CERTIFICATE OF PARTICIPATION
        </h1>
        <main
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            minHeight: 0,
          }}
        >
          <p style={{ margin: 0, fontSize: 20 }}>
            This certificate is presented to
          </p>
          <h2
            style={{
              ...wrap,
              margin: 0,
              width: "92%",
              paddingBottom: 7,
              borderBottom: `1px solid ${gold}`,
              fontSize: nameSize,
              lineHeight: 1.08,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {name}
          </h2>
          <p style={{ margin: 0, fontSize: 19 }}>
            for actively participating in
          </p>
          <h3
            style={{
              ...wrap,
              margin: 0,
              width: "96%",
              fontSize: eventSize,
              lineHeight: 1.15,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {event}
          </h3>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.25 }}>
            held on{" "}
            {certificateEventDate(
              certificate.event_start_at,
              certificate.event_end_at,
            )}
            .
          </p>
          <p style={{ margin: 0, fontSize: 17, fontStyle: "italic" }}>
            Issued on {day.format(new Date(certificate.issued_at))}.
          </p>
        </main>
        <section
          aria-label="Certificate signatories"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.max(1, signatories.length)}, minmax(0, 1fr))`,
            gap: 32,
            alignItems: "start",
            paddingTop: 35,
          }}
        >
          {signatories.length ? (
            signatories.map((s) => (
              <div
                key={s.position}
                style={{
                  ...wrap,
                  width: "100%",
                  maxWidth: signatories.length === 1 ? 330 : 410,
                  justifySelf: "center",
                }}
              >
                <div
                  style={{ borderTop: `1px solid ${navy}`, marginBottom: 9 }}
                />
                <p
                  style={{
                    margin: 0,
                    fontSize:
                      s.name.length > 75 ? 13 : s.name.length > 40 ? 15 : 18,
                    lineHeight: 1.18,
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {s.name}
                </p>
                <p
                  style={{
                    margin: "5px 0 0",
                    fontSize: s.title.length > 90 ? 11 : 13,
                    lineHeight: 1.2,
                  }}
                >
                  {s.title}
                </p>
              </div>
            ))
          ) : (
            <p style={{ margin: 0, fontSize: 14 }}>
              Signatory details unavailable
            </p>
          )}
        </section>
        <footer
          style={{
            display: "flex",
            alignItems: "end",
            justifyContent: "space-between",
            gap: 20,
            fontSize: 12,
            textAlign: "left",
          }}
        >
          <span style={{ ...wrap }}>
            Certificate No. <strong>{certificate.certificate_number}</strong>
          </span>
          <span style={{ fontStyle: "italic", whiteSpace: "nowrap" }}>
            Generated through PagTipon
          </span>
        </footer>
      </div>
    </div>
  );
}

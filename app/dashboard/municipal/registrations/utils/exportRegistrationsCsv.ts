import type {
  MunicipalRegistration,
} from "../types/municipalRegistrations";

import {
  formatRegistrationDate,
} from "./municipalRegistrationsUtils";

function escapeCsvValue(
  value: string | number | boolean | null | undefined,
) {
  const text = String(value ?? "");

  return `"${text.replace(/"/g, '""')}"`;
}

function sanitizeFilename(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type ExportRegistrationsOptions = {
  registrations: MunicipalRegistration[];
  eventTitle?: string | null;
};

export function exportRegistrationsCsv({
  registrations,
  eventTitle,
}: ExportRegistrationsOptions) {
  if (registrations.length === 0) {
    alert(
      "There are no registration records to export.",
    );

    return;
  }

  const headers = [
    "Participant Name",
    "Email",
    "Municipality",
    "Event",
    "Registration Status",
    "Registered At",
    "QR Status",
    "Event Status",
  ];

  const rows = registrations.map(
    (registration) => [
      registration.participant_name,
      registration.participant_email,
      registration.participant_municipality ??
        "",
      registration.event_title,
      registration.rsvp_status ??
        "Unknown",
      formatRegistrationDate(
        registration.registered_at,
      ),
      registration.qr_available
        ? "Generated"
        : "Missing",
      registration.event_status ??
        "Unknown",
    ],
  );

  const csvContent = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) =>
      row.map(escapeCsvValue).join(","),
    ),
  ].join("\r\n");

  /*
   * UTF-8 BOM helps Microsoft Excel display
   * names and special characters correctly.
   */
  const csvBlob = new Blob(
    ["\uFEFF", csvContent],
    {
      type: "text/csv;charset=utf-8;",
    },
  );

  const downloadUrl =
    URL.createObjectURL(csvBlob);

  const dateStamp = new Date()
    .toISOString()
    .slice(0, 10);

  const eventName = eventTitle
    ? sanitizeFilename(eventTitle)
    : "all-events";

  const link =
    document.createElement("a");

  link.href = downloadUrl;
  link.download =
    `municipal-registrations-${eventName}-${dateStamp}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(downloadUrl);
}
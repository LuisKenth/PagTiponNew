import type {
  AttendanceEventOption,
  AttendanceMethodFilter,
  AttendanceStatus,
  AttendanceStatusFilter,
  AttendanceSummary,
  MunicipalAttendanceRecord,
} from "../types/municipalAttendance";

type FilterAttendanceRecordsOptions = {
  records: MunicipalAttendanceRecord[];
  searchTerm: string;
  selectedEventId: string;
  statusFilter: AttendanceStatusFilter;
  methodFilter: AttendanceMethodFilter;
};

export function buildAttendanceEventOptions(
  records: MunicipalAttendanceRecord[],
): AttendanceEventOption[] {
  const eventMap = new Map<
    string,
    AttendanceEventOption
  >();

  for (const record of records) {
    if (
      eventMap.has(
        record.event_municipality_id,
      )
    ) {
      continue;
    }

    eventMap.set(
      record.event_municipality_id,
      {
        event_municipality_id:
          record.event_municipality_id,
        event_id: record.event_id,
        event_title: record.event_title,
        event_status: record.event_status,
        event_start_date:
          record.event_start_date,
        event_end_date:
          record.event_end_date,
        municipal_status:
          record.municipal_status,
        registration_open:
          record.registration_open,
      },
    );
  }

  return Array.from(
    eventMap.values(),
  ).sort((firstEvent, secondEvent) => {
    const firstTime =
      firstEvent.event_start_date
        ? new Date(
            firstEvent.event_start_date,
          ).getTime()
        : 0;

    const secondTime =
      secondEvent.event_start_date
        ? new Date(
            secondEvent.event_start_date,
          ).getTime()
        : 0;

    return secondTime - firstTime;
  });
}

export function filterAttendanceRecords({
  records,
  searchTerm,
  selectedEventId,
  statusFilter,
  methodFilter,
}: FilterAttendanceRecordsOptions) {
  const normalizedSearch =
    searchTerm.trim().toLowerCase();

  return records.filter((record) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      record.participant_name
        .toLowerCase()
        .includes(normalizedSearch) ||
      record.participant_email
        .toLowerCase()
        .includes(normalizedSearch) ||
      record.event_title
        .toLowerCase()
        .includes(normalizedSearch) ||
      (
        record.participant_municipality ??
        ""
      )
        .toLowerCase()
        .includes(normalizedSearch);

    const matchesEvent =
      selectedEventId === "all" ||
      record.event_municipality_id ===
        selectedEventId;

    const matchesStatus =
      statusFilter === "all" ||
      record.attendance_status ===
        statusFilter;

    const matchesMethod =
      methodFilter === "all" ||
      (methodFilter ===
      "not_checked_in"
        ? record.attendance_method ===
            null
        : record.attendance_method ===
          methodFilter);

    return (
      matchesSearch &&
      matchesEvent &&
      matchesStatus &&
      matchesMethod
    );
  });
}

export function calculateAttendanceSummary(
  records: MunicipalAttendanceRecord[],
): AttendanceSummary {
  return records.reduce<AttendanceSummary>(
    (summary, record) => {
      summary.total += 1;

      switch (
        record.attendance_status
      ) {
        case "present":
          summary.present += 1;
          break;

        case "late":
          summary.late += 1;
          break;

        case "absent":
          summary.absent += 1;
          break;

        default:
          summary.pending += 1;
      }

      if (
        record.attendance_method ===
        "qr"
      ) {
        summary.qrCheckIns += 1;
      }

      if (
        record.attendance_method ===
        "manual"
      ) {
        summary.manualCheckIns += 1;
      }

      return summary;
    },
    {
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
      pending: 0,
      qrCheckIns: 0,
      manualCheckIns: 0,
    },
  );
}

export function formatAttendanceDate(
  value: string | null,
) {
  if (!value) {
    return "Not checked in";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

export function formatEventSchedule(
  startDate: string | null,
  endDate: string | null,
) {
  if (!startDate) {
    return "Schedule unavailable";
  }

  const start = new Date(startDate);

  if (Number.isNaN(start.getTime())) {
    return "Schedule unavailable";
  }

  const startText =
    new Intl.DateTimeFormat("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(start);

  if (!endDate) {
    return startText;
  }

  const end = new Date(endDate);

  if (Number.isNaN(end.getTime())) {
    return startText;
  }

  const endText =
    new Intl.DateTimeFormat("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(end);

  return `${startText} – ${endText}`;
}

export function getAttendanceStatusLabel(
  status: AttendanceStatus,
) {
  switch (status) {
    case "present":
      return "Present";

    case "late":
      return "Late";

    case "absent":
      return "Absent";

    default:
      return "Pending";
  }
}

export function getAttendanceMethodLabel(
  method:
    | MunicipalAttendanceRecord["attendance_method"]
    | null,
) {
  switch (method) {
    case "qr":
      return "QR Scan";

    case "manual":
      return "Manual";

    default:
      return "Not Checked In";
  }
}

import type { ReceivedEvent } from "../../types/municipalDashboard";

import type {
  RegistrationFilter,
  SortOption,
  StatusFilter,
} from "../types/municipalEvents";

export function normalizeValue(
  value: string | null | undefined,
) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function isCancelledEvent(
  item: ReceivedEvent,
) {
  const municipalStatus =
    normalizeValue(
      item.municipal_status,
    );

  const provincialStatus =
    normalizeValue(
      item.event?.status,
    );

  return (
    municipalStatus === "cancelled" ||
    provincialStatus === "cancelled"
  );
}

export function isRegistrationOpen(
  item: ReceivedEvent,
) {
  return (
    !isCancelledEvent(item) &&
    item.registration_open === true
  );
}

function getDateValue(
  value: string | null | undefined,
) {
  if (!value) {
    return null;
  }

  const parsedDate =
    new Date(value).getTime();

  return Number.isNaN(parsedDate)
    ? null
    : parsedDate;
}

type FilterAndSortEventsOptions = {
  events: ReceivedEvent[];
  searchTerm: string;
  statusFilter: StatusFilter;
  registrationFilter: RegistrationFilter;
  sortOption: SortOption;
};

export function filterAndSortEvents({
  events,
  searchTerm,
  statusFilter,
  registrationFilter,
  sortOption,
}: FilterAndSortEventsOptions) {
  const normalizedSearch =
    normalizeValue(searchTerm);

  const matchingEvents =
    events.filter((item) => {
      const cancelled =
        isCancelledEvent(item);

      const registrationIsOpen =
        isRegistrationOpen(item);

      const searchableText = [
        item.event?.title,
        item.event?.description,
        item.event?.memo_filename,
        item.local_instructions,
        item.municipality,
      ]
        .map(normalizeValue)
        .join(" ");

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(
          normalizedSearch,
        );

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter ===
              "cancelled"
            ? cancelled
            : !cancelled &&
              normalizeValue(
                item.municipal_status,
              ) === statusFilter;

      const matchesRegistration =
        registrationFilter === "all"
          ? true
          : registrationFilter ===
              "open"
            ? registrationIsOpen
            : !registrationIsOpen;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRegistration
      );
    });

  return [...matchingEvents].sort(
    (firstItem, secondItem) => {
      if (
        sortOption ===
        "newest_received"
      ) {
        return (
          (getDateValue(
            secondItem.created_at,
          ) ?? 0) -
          (getDateValue(
            firstItem.created_at,
          ) ?? 0)
        );
      }

      if (
        sortOption ===
        "oldest_received"
      ) {
        return (
          (getDateValue(
            firstItem.created_at,
          ) ?? 0) -
          (getDateValue(
            secondItem.created_at,
          ) ?? 0)
        );
      }

      if (
        sortOption ===
        "schedule_soonest"
      ) {
        return (
          (getDateValue(
            firstItem.event?.start_at,
          ) ??
            Number.MAX_SAFE_INTEGER) -
          (getDateValue(
            secondItem.event?.start_at,
          ) ??
            Number.MAX_SAFE_INTEGER)
        );
      }

      if (
        sortOption ===
        "schedule_latest"
      ) {
        return (
          (getDateValue(
            secondItem.event?.start_at,
          ) ?? 0) -
          (getDateValue(
            firstItem.event?.start_at,
          ) ?? 0)
        );
      }

      return (
        firstItem.event?.title ??
        "Untitled Event"
      ).localeCompare(
        secondItem.event?.title ??
          "Untitled Event",
        undefined,
        {
          sensitivity: "base",
        },
      );
    },
  );
}

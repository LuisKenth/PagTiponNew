import type { ReceivedEvent } from "../../types/municipalDashboard";

import {
  normalizePreparationStatus,
} from "../../utils/municipalDashboardUtils";

import type {
  EventStatusFilter,
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

/*
 * REGISTRATION AVAILABILITY
 *
 * Registration is considered open only when:
 *
 * 1. The event is not cancelled.
 * 2. The provincial event is still upcoming.
 * 3. Municipal preparation is already Prepared.
 * 4. registration_open is explicitly true.
 *
 * Ongoing, completed, cancelled, unknown,
 * and non-prepared events are treated as closed.
 */
export function isRegistrationOpen(
  item: ReceivedEvent,
) {
  if (isCancelledEvent(item)) {
    return false;
  }

  const provincialStatus =
    normalizeValue(
      item.event?.status,
    );

  const preparationStatus =
    normalizePreparationStatus(
      item.municipal_status,
    );

  return (
    provincialStatus === "upcoming" &&
    preparationStatus === "prepared" &&
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
  eventStatusFilter: EventStatusFilter;
  registrationFilter: RegistrationFilter;
  sortOption: SortOption;
};

export function filterAndSortEvents({
  events,
  searchTerm,
  statusFilter,
  eventStatusFilter,
  registrationFilter,
  sortOption,
}: FilterAndSortEventsOptions) {
  const normalizedSearch =
    normalizeValue(searchTerm);

  const matchingEvents =
    events.filter((item) => {
      const registrationIsOpen =
        isRegistrationOpen(item);

      const preparationStatus =
        normalizeValue(
          normalizePreparationStatus(
            item.municipal_status,
          ),
        );

      const eventStatus =
        normalizeValue(
          item.event?.status,
        );

      const searchableText = [
        item.event?.title,
        item.event?.description,
        item.event?.memo_filename,
        item.local_instructions,
        item.municipality,
        preparationStatus,
        eventStatus,
      ]
        .map(normalizeValue)
        .join(" ");

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(
          normalizedSearch,
        );

      const matchesPreparationStatus =
        statusFilter === "all"
          ? true
          : preparationStatus ===
            statusFilter;

      const matchesEventStatus =
        eventStatusFilter === "all"
          ? true
          : eventStatus ===
            eventStatusFilter;

      const matchesRegistration =
        registrationFilter === "all"
          ? true
          : registrationFilter ===
              "open"
            ? registrationIsOpen
            : !registrationIsOpen;

      return (
        matchesSearch &&
        matchesPreparationStatus &&
        matchesEventStatus &&
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
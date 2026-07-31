import type {
  MunicipalRegistration,
  RegistrationEventOption,
  RegistrationStatusFilter,
} from "../types/municipalRegistrations";

export function normalizeValue(
  value: string | null | undefined,
) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function formatRegistrationDate(
  value: string | null,
) {
  if (!value) {
    return "Not available";
  }

  const parsedDate = new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return "Invalid date";
  }

  return parsedDate.toLocaleString(
    "en-PH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );
}

export function isCancelledRegistration(
  registration: MunicipalRegistration,
) {
  return (
    normalizeValue(
      registration.event_status,
    ) === "cancelled" ||
    normalizeValue(
      registration.municipal_status,
    ) === "cancelled"
  );
}

export function buildEventOptions(
  registrations: MunicipalRegistration[],
) {
  const optionMap =
    new Map<
      string,
      RegistrationEventOption
    >();

  for (const registration of registrations) {
    const assignmentId =
      String(
        registration.event_municipality_id,
      );

    const existingOption =
      optionMap.get(assignmentId);

    if (existingOption) {
      existingOption.registration_count += 1;
      continue;
    }

    optionMap.set(assignmentId, {
      event_municipality_id:
        assignmentId,
      event_id: String(
        registration.event_id,
      ),
      event_title:
        registration.event_title ||
        "Untitled Event",
      event_status:
        registration.event_status,
      municipal_status:
        registration.municipal_status,
      registration_open:
        registration.registration_open,
      registration_count: 1,
    });
  }

  return Array.from(
    optionMap.values(),
  ).sort((firstOption, secondOption) =>
    firstOption.event_title.localeCompare(
      secondOption.event_title,
      undefined,
      {
        sensitivity: "base",
      },
    ),
  );
}

type FilterRegistrationsOptions = {
  registrations: MunicipalRegistration[];
  searchTerm: string;
  selectedEventId: string;
  statusFilter: RegistrationStatusFilter;
};

export function filterRegistrations({
  registrations,
  searchTerm,
  selectedEventId,
  statusFilter,
}: FilterRegistrationsOptions) {
  const normalizedSearch =
    normalizeValue(searchTerm);

  return registrations.filter(
    (registration) => {
      const matchesEvent =
        selectedEventId === "all" ||
        registration.event_municipality_id ===
          selectedEventId;

      const matchesStatus =
        statusFilter === "all" ||
        normalizeValue(
          registration.rsvp_status,
        ) === statusFilter;

      const searchableText = [
        registration.participant_name,
        registration.participant_email,
        registration.event_title,
        registration.participant_municipality,
      ]
        .map(normalizeValue)
        .join(" ");

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(
          normalizedSearch,
        );

      return (
        matchesEvent &&
        matchesStatus &&
        matchesSearch
      );
    },
  );
}

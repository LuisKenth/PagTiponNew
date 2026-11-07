export type ParticipantName = {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
};
export type NameField = keyof ParticipantName;
export type NameErrors = Partial<Record<NameField, string>>;
export const NAME_MAX_LENGTH = 100;
export const SUFFIX_MAX_LENGTH = 20;
export const SUFFIX_OPTIONS = ["Jr.", "Sr.", "II", "III", "IV", "V"] as const;
const namePattern = /^\p{L}[\p{L}\p{M}]*(?:[ '’ʼ-]\p{L}[\p{L}\p{M}]*)*$/u;
export function normalizeName(value: string) {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}
export function normalizeParticipantName(
  value: ParticipantName,
): ParticipantName {
  return {
    first_name: normalizeName(value.first_name),
    middle_name: normalizeName(value.middle_name),
    last_name: normalizeName(value.last_name),
    suffix: normalizeName(value.suffix),
  };
}
export function validateParticipantName(value: ParticipantName): NameErrors {
  const names = normalizeParticipantName(value),
    errors: NameErrors = {};
  for (const field of [
    "first_name",
    "middle_name",
    "last_name",
    "suffix",
  ] as const) {
    const text = names[field],
      label = {
        first_name: "First name",
        middle_name: "Middle name",
        last_name: "Last name",
        suffix: "Suffix",
      }[field];
    if (!text) {
      if (field === "first_name" || field === "last_name")
        errors[field] = `${label} is required.`;
      continue;
    }
    const max = field === "suffix" ? SUFFIX_MAX_LENGTH : NAME_MAX_LENGTH;
    if (Array.from(text).length > max) {
      errors[field] = `${label} must not exceed ${max} characters.`;
      continue;
    }
    const candidate = field === "suffix" ? text.replace(/\.$/u, "") : text;
    if (!namePattern.test(candidate))
      errors[field] =
        field === "suffix"
          ? "Enter a valid suffix using letters; a final period is allowed (e.g. Jr.)."
          : "Use letters, spaces, apostrophes, or hyphens between name parts. Numbers, emojis, and other symbols are not allowed.";
  }
  return errors;
}
export function participantFullName(value: ParticipantName) {
  return Object.values(normalizeParticipantName(value))
    .filter(Boolean)
    .join(" ");
}

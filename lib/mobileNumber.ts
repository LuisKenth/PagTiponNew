/** Philippine mobile format only; this does not verify ownership or SMS delivery. */
export function normalizeMobileNumber(value: string): string | null {
  if (value.length > 64) return null;
  const compact = value.trim().replace(/[ ()-]/g, "");
  if (/^09[0-9]{9}$/.test(compact)) return `+63${compact.slice(1)}`;
  if (/^639[0-9]{9}$/.test(compact)) return `+${compact}`;
  return /^\+639[0-9]{9}$/.test(compact) ? compact : null;
}
export const MOBILE_NUMBER_MESSAGE =
  "Enter a valid Philippine mobile number, such as 09171234567 or +639171234567.";

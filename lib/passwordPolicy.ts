export const PASSWORD_POLICY_MESSAGE =
  "Password must be 8–16 characters and include an uppercase letter, a lowercase letter, a number, and a special character.";

export function isStrongPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 16 &&
    /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) &&
    /[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/.test(value);
}

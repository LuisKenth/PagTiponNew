"use client";
import { accessDeadline, invalidAuthSession } from "@/lib/access/errors";
import { supabase } from "@/lib/supabase";
export class SuperApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function superRequest<T>(
  path: string,
  body?: Record<string, unknown>,
  method = "POST",
  signal?: AbortSignal,
): Promise<T> {
  const {
    data: { session },
    error,
  } = await accessDeadline(supabase.auth.getSession());
  if (error || !session) {
    if (invalidAuthSession(error)) {
      window.location.replace("/login");
      throw new SuperApiError("Please sign in again.", 401);
    }
    throw new SuperApiError("Unable to connect. Please try again.", 503);
  }
  let response: Response;
  try {
    response = await fetch(path, {
      method: body ? method : "GET",
      cache: "no-store",
      signal,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new SuperApiError(
      body
        ? "The request could not be confirmed. Refresh records before retrying."
        : "Unable to connect. Please try again.",
      503,
    );
  }
  const result = await response
    .json()
    .catch(() => ({
      error:
        "Unable to read the server response. Refresh records before retrying.",
    }));
  if (response.ok && result.error) throw new SuperApiError(result.error, 502);
  if (!response.ok) {
    if (response.status === 401) window.location.replace("/login");
    if (
      response.status === 403 &&
      String(result.error).includes("Authenticator verification")
    )
      window.location.replace("/super-admin-security");
    throw new SuperApiError(
      result.error || "Unable to complete this request.",
      response.status,
    );
  }
  return result as T;
}
export function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

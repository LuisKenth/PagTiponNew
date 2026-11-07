export class AccessProblem extends Error {
  constructor(
    public kind: "retry" | "denied" | "redirect",
    message: string,
    public destination?: string,
  ) {
    super(message);
  }
}
export function invalidAuthSession(
  error: { status?: number; name?: string } | null,
) {
  return (
    !error ||
    error.name === "AuthSessionMissingError" ||
    (typeof error.status === "number" &&
      error.status >= 400 &&
      error.status < 500 &&
      ![408, 429].includes(error.status))
  );
}
// Read/access checks only. Never automatically repeat a mutating request.
export async function accessDeadline<T>(
  request: PromiseLike<T>,
  controller?: AbortController,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(request),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          controller?.abort();
          reject(
            new AccessProblem(
              "retry",
              "The access check timed out. Please try again.",
            ),
          );
        }, 15000);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

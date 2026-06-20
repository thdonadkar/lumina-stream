/**
 * UserError — error type whose message IS intended for the end user.
 *
 * The global `sanitizeServerErrors` function middleware lets `UserError`
 * pass through unchanged but rewrites any other error to a generic
 * "Something went wrong. Please try again." message (full detail still
 * logged server-side).
 *
 * Use UserError for validation failures, business-rule violations, "not
 * found" / "forbidden" UX messages, etc. Use plain Error (or let providers
 * throw) for infrastructure failures that the user should not see verbatim.
 */
export class UserError extends Error {
  readonly isUserError = true as const;
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

export function isUserError(err: unknown): err is UserError {
  return (
    err instanceof UserError ||
    (typeof err === "object" &&
      err !== null &&
      (err as { isUserError?: boolean }).isUserError === true)
  );
}

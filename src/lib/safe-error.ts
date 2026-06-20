/**
 * safeError — wraps a server-function handler so internal errors are logged
 * server-side but never leak provider/SQL/stack details to the client.
 *
 * Usage:
 *   export const placeOrder = createServerFn({ method: "POST" })
 *     .middleware([requireSupabaseAuth])
 *     .inputValidator(...)
 *     .handler(safeError("placeOrder", async ({ data, context }) => { ... }))
 *
 * Errors thrown from the handler are caught:
 *   - the full error is console.error'd with the operation name
 *   - the client receives a generic message tied to the operation
 *   - errors whose message starts with "PUBLIC:" are passed through (minus
 *     the prefix) for cases where you DO want to show the user (e.g.
 *     "Insufficient stock", "Invalid coupon code")
 *
 * Throw redirect()/notFound() BEFORE the handler body if you need TanStack
 * navigation semantics — those are re-thrown unchanged.
 */
export function safeError<Args, R>(
  op: string,
  fn: (args: Args) => Promise<R>,
): (args: Args) => Promise<R> {
  return async (args: Args) => {
    try {
      return await fn(args);
    } catch (err: unknown) {
      // Re-throw TanStack control-flow errors (redirect/notFound) untouched.
      if (err && typeof err === "object" && ("isRedirect" in err || "router" in err || "statusCode" in err && (err as { statusCode?: number }).statusCode === 404)) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      // Log full detail server-side (Worker logs).
      console.error(`[server-fn:${op}] failed:`, err);

      // Explicit user-facing message
      if (message.startsWith("PUBLIC:")) {
        throw new Error(message.slice("PUBLIC:".length).trim());
      }

      // Generic fallback. Don't include op name in case it leaks internals.
      throw new Error("Something went wrong. Please try again.");
    }
  };
}

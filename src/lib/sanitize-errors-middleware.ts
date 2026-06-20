import { createMiddleware } from "@tanstack/react-start";

/**
 * Sanitizes errors thrown by every createServerFn handler so SQL/provider/
 * stack detail never leaks to the client.
 *
 * Pass-through:
 *   - HTTP Response objects (e.g. `throw new Response("Unauthorized", { status: 401 })`)
 *   - TanStack control-flow (redirect / notFound) — they carry `isRedirect` or `statusCode`
 *   - Errors whose message starts with "PUBLIC:" — the prefix is stripped and
 *     the rest is shown to the user (use this for intentional UX messages like
 *     "Insufficient stock" or "Invalid coupon")
 *
 * Everything else:
 *   - Full error logged server-side with the function name
 *   - Generic "Something went wrong. Please try again." returned to the client
 */
export const sanitizeServerErrors = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    try {
      return await next();
    } catch (err: unknown) {
      // Pass through raw Response (auth/rate-limit/redirects)
      if (err instanceof Response) throw err;

      // Pass through TanStack router control-flow
      if (
        err &&
        typeof err === "object" &&
        ("isRedirect" in err ||
          "isNotFound" in err ||
          ("statusCode" in err && typeof (err as { statusCode?: number }).statusCode === "number"))
      ) {
        throw err;
      }

      const message = err instanceof Error ? err.message : String(err);
      console.error("[server-fn] failed:", err);

      if (message.startsWith("PUBLIC:")) {
        throw new Error(message.slice("PUBLIC:".length).trim());
      }

      throw new Error("Something went wrong. Please try again.");
    }
  },
);

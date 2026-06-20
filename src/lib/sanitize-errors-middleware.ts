import { createMiddleware } from "@tanstack/react-start";
import { isUserError } from "./user-error";

/**
 * Sanitizes errors thrown by every createServerFn handler so SQL/provider/
 * stack detail never leaks to the client.
 *
 * Pass-through:
 *   - HTTP Response objects (e.g. `throw new Response("Unauthorized", { status: 401 })`)
 *   - TanStack control-flow (redirect / notFound)
 *   - UserError — message is intended for the user, see lib/user-error.ts
 *
 * Everything else:
 *   - Full error logged server-side with the function name
 *   - Generic "Something went wrong. Please try again." returned to client
 */
export const sanitizeServerErrors = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    try {
      return await next();
    } catch (err: unknown) {
      if (err instanceof Response) throw err;
      if (
        err &&
        typeof err === "object" &&
        ("isRedirect" in err ||
          "isNotFound" in err ||
          ("statusCode" in err &&
            typeof (err as { statusCode?: number }).statusCode === "number"))
      ) {
        throw err;
      }
      if (isUserError(err)) throw err;

      console.error("[server-fn] failed:", err);
      throw new Error("Something went wrong. Please try again.");
    }
  },
);

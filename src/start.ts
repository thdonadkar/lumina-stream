import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { sanitizeServerErrors } from "@/lib/sanitize-errors-middleware";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Defence-in-depth response headers applied to every server response.
const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  const res = (result as any)?.response as Response | undefined;
  if (res && res.headers) {
    const set = (k: string, v: string) => {
      if (!res.headers.has(k)) res.headers.set(k, v);
    };
    set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    set("X-Content-Type-Options", "nosniff");
    set("X-Frame-Options", "DENY");
    set("Referrer-Policy", "strict-origin-when-cross-origin");
    set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
    set("Cross-Origin-Opener-Policy", "same-origin");
  }
  return result;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [sanitizeServerErrors, attachSupabaseAuth],
  requestMiddleware: [securityHeadersMiddleware, errorMiddleware],
}));

import { createFileRoute } from "@tanstack/react-router";

// Lightweight liveness probe for load balancers, PM2, and uptime monitors.
// Does NOT touch the database — keep it cheap so health checks never page on
// transient Supabase blips. Returns 200 with a JSON status body.
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: () =>
        new Response(
          JSON.stringify({
            status: "ok",
            uptime: typeof process !== "undefined" && process.uptime ? process.uptime() : null,
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "cache-control": "no-store",
            },
          },
        ),
    },
  },
});

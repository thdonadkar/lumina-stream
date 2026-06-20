import { createFileRoute } from "@tanstack/react-router";

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}

// Razorpay webhook. Configure this URL in the Razorpay dashboard with the
// secret stored in RAZORPAY_WEBHOOK_SECRET. We must verify the signature on
// the RAW request body before trusting any field.
export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
          console.error("[razorpay-webhook] missing secret");
          return new Response("misconfigured", { status: 500 });
        }
        const signature = request.headers.get("x-razorpay-signature") ?? "";
        const raw = await request.text();
        const expected = await hmacHex(secret, raw);
        if (!signature || !timingSafeEqualHex(expected, signature)) {
          return new Response("invalid signature", { status: 401 });
        }

        let payload: any;
        try { payload = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }

        const event = payload?.event as string | undefined;
        const payment = payload?.payload?.payment?.entity;
        if (!event || !payment) return new Response("ignored", { status: 200 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Find the local order via the Razorpay order_id we stored at create time,
        // or via the note we attached when creating the order.
        const localOrderId = payment.notes?.local_order_id as string | undefined;
        const rzpOrderId = payment.order_id as string | undefined;

        const filter = supabaseAdmin.from("payments").select("id, order_id").eq("provider", "razorpay");
        const { data: paymentRow } = rzpOrderId
          ? await filter.eq("provider_order_id", rzpOrderId).maybeSingle()
          : await filter.eq("order_id", localOrderId ?? "").maybeSingle();

        if (!paymentRow) {
          console.error("[razorpay-webhook] no matching payment row", { rzpOrderId, localOrderId });
          // Return 200 so Razorpay doesn't retry forever on orphans.
          return new Response("no-match", { status: 200 });
        }

        if (event === "payment.captured") {
          await supabaseAdmin
            .from("payments")
            .update({
              status: "captured",
              provider_payment_id: payment.id,
              method: payment.method ?? null,
              raw_response: payload,
            })
            .eq("id", paymentRow.id);
          await supabaseAdmin
            .from("orders")
            .update({ payment_status: "paid" as never, status: "confirmed" as never })
            .eq("id", paymentRow.order_id);
        } else if (event === "payment.failed") {
          await supabaseAdmin
            .from("payments")
            .update({
              status: "failed",
              provider_payment_id: payment.id,
              method: payment.method ?? null,
              raw_response: payload,
            })
            .eq("id", paymentRow.id);
          await supabaseAdmin
            .from("orders")
            .update({ payment_status: "failed" as never })
            .eq("id", paymentRow.order_id);
        } else if (event === "refund.processed" || event === "refund.created") {
          await supabaseAdmin
            .from("orders")
            .update({ payment_status: "refunded" as never })
            .eq("id", paymentRow.order_id);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});

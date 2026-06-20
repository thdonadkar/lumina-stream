import { createServerFn } from "@tanstack/react-start";
import { UserError } from "@/lib/user-error";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Razorpay REST helpers. We talk to Razorpay over HTTPS — no SDK needed,
// which keeps this Worker-runtime safe (no node-only crypto/native deps).

const RZP_BASE = "https://api.razorpay.com/v1";

function rzpAuthHeader() {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret) throw new UserError("Razorpay keys not configured");
  // btoa is available in the Worker runtime.
  return "Basic " + btoa(`${key}:${secret}`);
}

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
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

/**
 * Create a Razorpay order for a previously-placed local order. Returns the
 * public params needed to open Razorpay Checkout on the client.
 *
 * Idempotent: if a `created`/`pending` payment row already exists, we reuse it.
 */
export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string }) => {
    if (!d?.order_id || typeof d.order_id !== "string") throw new UserError("Invalid order_id");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Owner check + amount truth comes from the DB, not the client.
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select("id, user_id, total, payment_status, status")
      .eq("id", data.order_id)
      .maybeSingle();
    if (oErr) throw oErr;
    if (!order) throw new UserError("Order not found");
    if (order.user_id !== userId) throw new UserError("Forbidden");
    if (order.payment_status === "paid") throw new UserError("Order already paid");

    // Reuse an existing pending payment to keep this idempotent across retries.
    const { data: existing } = await supabase
      .from("payments")
      .select("id, provider_order_id, amount, currency, status")
      .eq("order_id", order.id)
      .eq("provider", "razorpay")
      .in("status", ["created", "pending"])
      .maybeSingle();

    let rzpOrderId: string | null = (existing as any)?.provider_order_id ?? null;

    if (!rzpOrderId) {
      const res = await fetch(`${RZP_BASE}/orders`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: rzpAuthHeader(),
        },
        body: JSON.stringify({
          amount: Math.round(Number(order.total) * 100), // paise
          currency: "INR",
          receipt: order.id.slice(0, 40),
          notes: { local_order_id: order.id },
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("[razorpay] create order failed", res.status, body);
        throw new UserError("Could not initiate payment. Please try again.");
      }
      const json = (await res.json()) as { id: string; amount: number; currency: string };
      rzpOrderId = json.id;

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("payments").insert({
        order_id: order.id,
        provider: "razorpay",
        provider_order_id: rzpOrderId,
        amount: order.total,
        currency: "INR",
        status: "created",
      });
    }

    return {
      key_id: process.env.RAZORPAY_KEY_ID!,
      amount: Math.round(Number(order.total) * 100),
      currency: "INR",
      razorpay_order_id: rzpOrderId!,
      local_order_id: order.id,
    };
  });

/**
 * Verify the signature returned by Razorpay Checkout. On success, mark the
 * payment and the order as paid. The webhook handler is the source of truth,
 * but this gives the buyer instant feedback in the success screen.
 */
export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    order_id: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    for (const k of ["order_id", "razorpay_order_id", "razorpay_payment_id", "razorpay_signature"] as const) {
      if (!d?.[k] || typeof d[k] !== "string") throw new UserError("Invalid payload");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: order } = await supabase
      .from("orders")
      .select("id, user_id, total, payment_status")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order) throw new UserError("Order not found");
    if (order.user_id !== userId) throw new UserError("Forbidden");

    const expected = await hmacHex(
      process.env.RAZORPAY_KEY_SECRET!,
      `${data.razorpay_order_id}|${data.razorpay_payment_id}`,
    );
    if (!timingSafeEqualHex(expected, data.razorpay_signature)) {
      console.error("[razorpay] signature mismatch", { order_id: order.id });
      throw new UserError("Payment verification failed");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("payments")
      .update({
        status: "captured",
        provider_payment_id: data.razorpay_payment_id,
      })
      .eq("order_id", order.id)
      .eq("provider_order_id", data.razorpay_order_id);

    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "paid" as never, status: "confirmed" as never })
      .eq("id", order.id);

    return { ok: true as const };
  });

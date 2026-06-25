import { createServerFn } from "@tanstack/react-start";
import { UserError } from "@/lib/user-error";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Fan-out notifications to all sellers whose products appear in an order.
// Uses the admin client to bypass RLS on the notifications table.
async function notifySellersOfOrder(
  orderId: string,
  payload: { type: "order" | "system" | "offer"; title: string; body: string; link: string },
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("products:product_id(seller_id)")
      .eq("order_id", orderId);
    const sellers = new Set<string>();
    for (const row of (items ?? []) as any[]) {
      const sid = row?.products?.seller_id;
      if (sid) sellers.add(sid);
    }
    if (sellers.size === 0) return;
    await supabaseAdmin.from("notifications").insert(
      Array.from(sellers).map((sid) => ({ user_id: sid, ...payload })),
    );
  } catch {
    // best-effort; never fail the parent operation
  }
}

async function notifyAdminsOfOrder(payload: { type: "order" | "system" | "offer"; title: string; body: string; link: string }) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: admins } = await supabaseAdmin
      .from("user_roles").select("user_id").eq("role", "admin");
    if (!admins?.length) return;
    await supabaseAdmin.from("notifications").insert(
      admins.map((a: any) => ({ user_id: a.user_id, ...payload })),
    );
  } catch {}
}

// Auto-create a support ticket scoped to an order. Used when a customer
// cancels or requests a return so the seller and admin always have a thread.
async function autoCreateOrderTicket(opts: {
  orderId: string;
  userId: string;
  subject: string;
  body: string;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Find a single seller for the order (first product's seller) to scope the ticket
    const { data: itemRow } = await supabaseAdmin
      .from("order_items")
      .select("products:product_id(seller_id)")
      .eq("order_id", opts.orderId)
      .limit(1)
      .maybeSingle();
    const sellerId = (itemRow as any)?.products?.seller_id ?? null;

    const { data: ticket, error } = await supabaseAdmin
      .from("support_tickets")
      .insert({
        user_id: opts.userId,
        order_id: opts.orderId,
        seller_id: sellerId,
        subject: opts.subject.slice(0, 200),
        status: "open",
      } as never)

      .select("id")
      .single();
    if (error || !ticket) return;

    await supabaseAdmin.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      sender_id: opts.userId,
      body: opts.body.slice(0, 4000),
    });
  } catch {
    // best-effort
  }
}




type CartLine = {
  product_id: string | null;
  title: string;
  image: string | null;
  unit_price: number; // client hint only — server overrides from DB
  qty: number;
};

type PlaceOrderInput = {
  items: CartLine[];
  address_id: string | null;
  shipping: number;
  coupon_code?: string | null;
  notes?: string | null;
  payment_method?: "razorpay" | "cod";
};

function validateOrderInput(d: PlaceOrderInput): PlaceOrderInput {
  if (!Array.isArray(d.items) || d.items.length === 0) throw new UserError("Cart is empty");
  if (d.items.length > 50) throw new UserError("Too many items");
  if (typeof d.shipping !== "number" || !Number.isFinite(d.shipping) || d.shipping < 0)
    throw new UserError("Invalid shipping");
  for (const it of d.items) {
    if (!it.title || typeof it.title !== "string" || it.title.length > 200)
      throw new UserError("Invalid cart item title");
    if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > 100)
      throw new UserError("Invalid quantity");
    if (typeof it.unit_price !== "number" || !Number.isFinite(it.unit_price) || it.unit_price < 0)
      throw new UserError("Invalid unit price");
    if (it.product_id !== null && typeof it.product_id !== "string")
      throw new UserError("Invalid product id");
  }
  if (d.payment_method && d.payment_method !== "razorpay" && d.payment_method !== "cod")
    throw new UserError("Invalid payment method");
  return d;
}


export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; subtotal: number }) => {
    if (!d.code || typeof d.subtotal !== "number") throw new UserError("Invalid input");
    return { code: d.code.trim().toUpperCase(), subtotal: d.subtotal };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", data.code)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    if (!coupon) return { ok: false as const, reason: "Coupon not found" };
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
      return { ok: false as const, reason: "Coupon expired" };
    if (Number(coupon.min_order) > data.subtotal)
      return { ok: false as const, reason: `Minimum order ₹${coupon.min_order}` };

    if (coupon.max_uses_per_user) {
      const { count } = await supabase
        .from("coupon_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("coupon_id", coupon.id)
        .eq("user_id", userId);
      if ((count ?? 0) >= coupon.max_uses_per_user)
        return { ok: false as const, reason: "Coupon usage limit reached" };
    }

    let discount = 0;
    let freeShipping = false;
    if (coupon.type === "percent") discount = Math.round((data.subtotal * Number(coupon.value)) / 100);
    else if (coupon.type === "flat") discount = Math.min(Number(coupon.value), data.subtotal);
    else if (coupon.type === "free_shipping") freeShipping = true;

    return {
      ok: true as const,
      coupon_id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      discount,
      freeShipping,
    };
  });

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateOrderInput)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // SECURITY: never trust client unit_price. Re-fetch from DB and rebuild line items.
    const productIds = data.items
      .map((i) => i.product_id)
      .filter((v): v is string => typeof v === "string" && v.length > 0);

    type ProductRow = { id: string; price: number; status: string; stock: number; title: string; images: string[] | null };
    const productMap = new Map<string, ProductRow>();
    if (productIds.length > 0) {
      const { data: products, error: pErr } = await supabase
        .from("products")
        .select("id, price, status, stock, title, images")
        .in("id", productIds);
      if (pErr) throw pErr;
      for (const p of (products ?? []) as any[]) productMap.set(p.id, p as ProductRow);
    }

    const safeItems = data.items.map((i) => {
      if (!i.product_id) {
        // Allow free-form items (e.g. legacy demo cart) but cap unit_price defensively.
        const price = Math.max(0, Math.min(10_000_000, Math.round(Number(i.unit_price))));
        return { product_id: null as string | null, title: i.title, image: i.image, unit_price: price, qty: i.qty };
      }
      const p = productMap.get(i.product_id);
      if (!p) throw new UserError(`Product unavailable: ${i.product_id}`);
      if (p.status !== "active") throw new UserError(`Product not available for purchase: ${p.title}`);
      if ((p.stock ?? 0) < i.qty) throw new UserError(`Insufficient stock for ${p.title}`);
      return {
        product_id: p.id,
        title: p.title,
        image: p.images?.[0] ?? i.image,
        unit_price: Math.max(0, Math.round(Number(p.price))), // SERVER TRUTH
        qty: i.qty,
      };
    });

    const subtotal = safeItems.reduce((s, i) => s + i.unit_price * i.qty, 0);

    let discount = 0;
    let couponId: string | null = null;
    let shipping = Math.max(0, Math.round(data.shipping));
    if (data.coupon_code) {
      const { data: c } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", data.coupon_code)
        .eq("is_active", true)
        .maybeSingle();
      if (c) {
        if (c.type === "percent") discount = Math.round((subtotal * Number(c.value)) / 100);
        else if (c.type === "flat") discount = Math.min(Number(c.value), subtotal);
        else if (c.type === "free_shipping") shipping = 0;
        couponId = c.id;
      }
    }

    discount = Math.max(0, Math.min(discount, subtotal));
    const tax = Math.round((subtotal - discount) * 0.18);
    const total = Math.max(0, subtotal - discount) + shipping + tax;

    const paymentMethod = data.payment_method ?? "cod";
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        address_id: data.address_id,
        subtotal,
        discount,
        shipping,
        tax,
        total,
        coupon_code: data.coupon_code ?? null,
        notes: data.notes ?? null,
        status: "pending",
        payment_method: paymentMethod as never,
        payment_status: "pending" as never,
      })
      .select()
      .single();
    if (orderErr) throw orderErr;


    const { error: itemsErr } = await supabase.from("order_items").insert(
      safeItems.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        title: i.title,
        image: i.image,
        unit_price: i.unit_price,
        qty: i.qty,
      })),
    );
    if (itemsErr) throw itemsErr;

    // Atomically decrement stock for every real product line. If any single
    // decrement fails (race / oversold), roll back the order and surface the error.
    for (const i of safeItems) {
      if (!i.product_id) continue;
      const { error: stockErr } = await (supabase as any).rpc("decrement_stock", {
        p_product_id: i.product_id,
        p_qty: i.qty,
      });
      if (stockErr) {
        // Compensating cleanup so we don't leave a ghost order with unfunded stock.
        await supabase.from("order_items").delete().eq("order_id", order.id);
        await supabase.from("orders").delete().eq("id", order.id);
        throw new Error(`Could not reserve stock: ${stockErr.message}`);
      }
    }

    if (couponId) {
      await supabase.from("coupon_redemptions").insert({
        coupon_id: couponId,
        user_id: userId,
        order_id: order.id,
      });
    }

    await (await import("@/integrations/supabase/client.server")).supabaseAdmin.from("notifications").insert({
      user_id: userId,
      type: "order",
      title: "Order placed",
      body: `Your order #${order.id.slice(0, 8)} for ₹${total} is confirmed.`,
      link: `/orders/${order.id}`,
    });

    // Fan-out: notify each seller of a new order containing their products
    await notifySellersOfOrder(order.id, {
      type: "order",
      title: "New order received",
      body: `New order #${order.id.slice(0, 8)} contains your products. Worth ₹${total}.`,
      link: `/seller/orders`,
    });

    return { id: order.id, total };
  });


export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const getOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .select("*, order_items(*), addresses(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    return order;
  });

export const listAllOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new UserError("Forbidden");
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  });

// RLS already filters orders so a seller only sees orders containing their products.
export const listSellerOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // AuthZ: only an admin or a seller whose product is in the order may change status.
    const { data: existing } = await supabase
      .from("orders").select("user_id, payment_method, payment_status, status").eq("id", data.id).maybeSingle();
    if (!existing) throw new UserError("Order not found");

    const [{ data: isAdmin }, { data: isSeller }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("is_order_seller", { _user_id: userId, _order_id: data.id }),
    ]);
    if (!isAdmin && !isSeller) throw new UserError("Forbidden");

    // Guard invalid transitions
    const terminal = ["cancelled", "returned", "refunded"];
    if (terminal.includes(existing.status))
      throw new UserError(`Order is ${existing.status} and cannot change status`);

    const updates: Record<string, unknown> = { status: data.status };
    // COD: collecting cash at delivery flips payment_status to paid
    if (data.status === "delivered"
        && (existing as any).payment_method === "cod"
        && (existing as any).payment_status === "pending") {
      updates.payment_status = "paid";
    }

    const { data: order, error } = await supabase
      .from("orders")
      .update(updates as never)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw error;
    await (await import("@/integrations/supabase/client.server")).supabaseAdmin.from("notifications").insert({
      user_id: order.user_id,
      type: "order",
      title: `Order ${data.status.replace(/_/g, " ")}`,
      body: `Your order #${order.id.slice(0, 8)} is now ${data.status.replace(/_/g, " ")}.`,
      link: `/orders/${order.id}`,
    });
    return order;
  });


const RETURN_REASONS = new Set([
  "damaged",
  "wrong_item",
  "not_as_described",
  "defective",
  "no_longer_needed",
  "other",
]);

export const requestReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    reason: string;
    description?: string;
    order_item_id?: string | null;
    photos?: string[];
  }) => {
    if (!d?.id) throw new UserError("Missing order id");
    if (!d.reason || !RETURN_REASONS.has(d.reason)) throw new UserError("Pick a valid reason");
    if (d.description && d.description.length > 1000) throw new UserError("Description too long");
    const photos = Array.isArray(d.photos) ? d.photos.slice(0, 6).filter((p) => typeof p === "string" && p.length < 500) : [];
    return { ...d, photos };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("orders").select("status, user_id, payment_status, payment_method").eq("id", data.id).maybeSingle();
    if (!existing) throw new UserError("Order not found");
    if (existing.user_id !== userId) throw new UserError("Forbidden");
    if (existing.status !== "delivered") throw new UserError("Only delivered orders can be returned");

    // Write the structured return request (used by the new admin returns UI)…
    const { error: rrErr } = await (supabase as any)
      .from("return_requests")
      .insert({
        order_id: data.id,
        order_item_id: data.order_item_id ?? null,
        user_id: userId,
        reason: data.reason,
        description: data.description ?? null,
        photos: data.photos ?? [],
        status: "pending",
      });
    if (rrErr) throw rrErr;

    // …and keep the existing order-level fields in sync for legacy screens.
    // Only mark a refund as pending when money was actually collected.
    const moneyCollected = (existing as any).payment_status === "paid";
    const summary = `${data.reason}${data.description ? `: ${data.description}` : ""}`.slice(0, 500);
    const { data: order, error } = await (supabase as any)
      .from("orders")
      .update({
        status: "return_requested",
        return_reason: summary,
        refund_status: moneyCollected ? "pending" : "none",
      })
      .eq("id", data.id).select().single();
    if (error) throw error;

    await (await import("@/integrations/supabase/client.server")).supabaseAdmin.from("notifications").insert({
      user_id: order.user_id, type: "order",
      title: "Return requested",
      body: `Your return for order #${order.id.slice(0, 8)} is being reviewed.`,
      link: `/orders/${order.id}`,
    });
    await notifyAdminsOfOrder({
      type: "order",
      title: "Return requested",
      body: `A return was requested on order #${order.id.slice(0, 8)}.`,
      link: `/admin/returns`,
    });
    await notifySellersOfOrder(order.id, {
      type: "order",
      title: "Return requested",
      body: `A buyer requested a return on order #${order.id.slice(0, 8)}.`,
      link: `/seller/orders`,
    });
    return order;
  });



export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("orders").select("status, user_id, payment_method, payment_status").eq("id", data.id).maybeSingle();
    if (!existing) throw new UserError("Order not found");
    if (existing.user_id !== userId) throw new UserError("Forbidden");
    if (!["pending", "confirmed"].includes(existing.status))
      throw new UserError("This order can no longer be cancelled");

    // Payment & refund logic:
    //   * Money already collected (paid) → refund must be issued → refund_status = pending.
    //   * No money collected → no refund record. Mark payment_status as not_applicable
    //     so we stop showing "PAYMENT: PENDING" on a cancelled order.
    const wasPaid = (existing as any).payment_status === "paid";
    const updates: Record<string, unknown> = { status: "cancelled" };
    if (wasPaid) {
      updates.refund_status = "pending";
    } else {
      updates.payment_status = "not_applicable";
      updates.refund_status = "none";
    }

    const { data: order, error } = await supabase
      .from("orders").update(updates as never).eq("id", data.id).select().single();
    if (error) throw error;

    // Return reserved stock to inventory (best-effort; do not fail the cancel).
    const { data: items } = await supabase
      .from("order_items").select("product_id, qty").eq("order_id", data.id);
    for (const it of (items ?? []) as any[]) {
      if (!it.product_id) continue;
      await (supabase as any).rpc("increment_stock", { p_product_id: it.product_id, p_qty: it.qty });
    }
    await (await import("@/integrations/supabase/client.server")).supabaseAdmin.from("notifications").insert({
      user_id: order.user_id, type: "order",
      title: "Order cancelled",
      body: `Your order #${order.id.slice(0, 8)} has been cancelled.`,
      link: `/orders/${order.id}`,
    });
    return order;
  });

async function assertAdmin(ctx: any) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId, _role: "admin",
  });
  if (!isAdmin) throw new UserError("Forbidden");
}

export const listReturnRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await (context.supabase as any)
      .from("orders")
      .select("*, order_items(*)")
      .in("status", ["return_requested", "returned"])
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const approveReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: order, error } = await (context.supabase as any)
      .from("orders")
      .update({ status: "returned", refund_status: "approved" })
      .eq("id", data.id).select().single();
    if (error) throw error;
    await (await import("@/integrations/supabase/client.server")).supabaseAdmin.from("notifications").insert({
      user_id: order.user_id, type: "order",
      title: "Return approved",
      body: `Your return for #${order.id.slice(0, 8)} has been approved. Refund in progress.`,
      link: `/orders/${order.id}`,
    });
    return order;
  });

export const rejectReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; reason?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: order, error } = await (context.supabase as any)
      .from("orders")
      .update({ status: "delivered", refund_status: "rejected" })
      .eq("id", data.id).select().single();
    if (error) throw error;
    await (await import("@/integrations/supabase/client.server")).supabaseAdmin.from("notifications").insert({
      user_id: order.user_id, type: "order",
      title: "Return rejected",
      body: `Your return for #${order.id.slice(0, 8)} was not approved.${data.reason ? " Reason: " + data.reason : ""}`,
      link: `/orders/${order.id}`,
    });
    return order;
  });

export const markRefunded = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; amount?: number }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    // If there's a captured Razorpay payment, issue an actual refund.
    const { data: payment } = await (context.supabase as any)
      .from("payments")
      .select("provider, provider_payment_id, amount, status")
      .eq("order_id", data.id)
      .eq("provider", "razorpay")
      .eq("status", "captured")
      .maybeSingle();

    if (payment?.provider_payment_id) {
      const key = process.env.RAZORPAY_KEY_ID;
      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (key && secret) {
        const refundAmount = Math.round(Number(data.amount ?? payment.amount) * 100);
        const res = await fetch(`https://api.razorpay.com/v1/payments/${payment.provider_payment_id}/refund`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: "Basic " + btoa(`${key}:${secret}`),
          },
          body: JSON.stringify({ amount: refundAmount, speed: "normal" }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          console.error("[razorpay] refund failed", res.status, body);
          throw new UserError("Refund failed at payment gateway");
        }
      }
    }

    const { data: order, error } = await (context.supabase as any)
      .from("orders")
      .update({ refund_status: "refunded", refund_amount: data.amount ?? null, payment_status: "refunded" })
      .eq("id", data.id).select().single();
    if (error) throw error;
    await (await import("@/integrations/supabase/client.server")).supabaseAdmin.from("notifications").insert({
      user_id: order.user_id, type: "order",
      title: "Refund processed",
      body: `₹${data.amount ?? order.total} has been refunded for order #${order.id.slice(0, 8)}.`,
      link: `/orders/${order.id}`,
    });
    return order;
  });


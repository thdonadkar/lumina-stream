import { createServerFn } from "@tanstack/react-start";
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

async function notifyAdminsOfOrder(payload: { type: string; title: string; body: string; link: string }) {
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


type CartLine = {
  product_id: string | null;
  title: string;
  image: string | null;
  unit_price: number;
  qty: number;
};

type PlaceOrderInput = {
  items: CartLine[];
  address_id: string | null;
  shipping: number;
  coupon_code?: string | null;
  notes?: string | null;
};

function validateOrderInput(d: PlaceOrderInput): PlaceOrderInput {
  if (!Array.isArray(d.items) || d.items.length === 0) throw new Error("Cart is empty");
  for (const it of d.items) {
    if (!it.title || typeof it.unit_price !== "number" || it.qty < 1)
      throw new Error("Invalid cart item");
  }
  return d;
}

export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; subtotal: number }) => {
    if (!d.code || typeof d.subtotal !== "number") throw new Error("Invalid input");
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
    const subtotal = data.items.reduce((s, i) => s + i.unit_price * i.qty, 0);

    let discount = 0;
    let couponId: string | null = null;
    let shipping = data.shipping;
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

    const tax = Math.round((subtotal - discount) * 0.18);
    const total = Math.max(0, subtotal - discount) + shipping + tax;

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
      })
      .select()
      .single();
    if (orderErr) throw orderErr;

    const { error: itemsErr } = await supabase.from("order_items").insert(
      data.items.map((i) => ({
        order_id: order.id,
        product_id: null,
        title: i.title,
        image: i.image,
        unit_price: i.unit_price,
        qty: i.qty,
      })),
    );
    if (itemsErr) throw itemsErr;

    if (couponId) {
      await supabase.from("coupon_redemptions").insert({
        coupon_id: couponId,
        user_id: userId,
        order_id: order.id,
      });
    }

    await supabase.from("notifications").insert({
      user_id: userId,
      type: "order",
      title: "Order placed",
      body: `Your order #${order.id.slice(0, 8)} for ₹${total} is confirmed.`,
      link: `/orders/${order.id}`,
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
    if (!isAdmin) throw new Error("Forbidden");
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
    const { supabase } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .update({ status: data.status as never })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw error;
    await supabase.from("notifications").insert({
      user_id: order.user_id,
      type: "order",
      title: `Order ${data.status.replace(/_/g, " ")}`,
      body: `Your order #${order.id.slice(0, 8)} is now ${data.status.replace(/_/g, " ")}.`,
      link: `/orders/${order.id}`,
    });
    return order;
  });

export const requestReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; reason: string }) => {
    if (!d.reason?.trim() || d.reason.length > 500) throw new Error("Reason required (max 500 chars)");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("orders").select("status, user_id").eq("id", data.id).maybeSingle();
    if (!existing) throw new Error("Order not found");
    if (existing.user_id !== userId) throw new Error("Forbidden");
    if (existing.status !== "delivered") throw new Error("Only delivered orders can be returned");
    const { data: order, error } = await (supabase as any)
      .from("orders")
      .update({
        status: "return_requested",
        return_reason: data.reason,
        refund_status: "pending",
      })
      .eq("id", data.id).select().single();
    if (error) throw error;
    await supabase.from("notifications").insert({
      user_id: order.user_id, type: "order",
      title: "Return requested",
      body: `Your return for order #${order.id.slice(0, 8)} is being reviewed.`,
      link: `/orders/${order.id}`,
    });
    return order;
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("orders").select("status, user_id").eq("id", data.id).maybeSingle();
    if (!existing) throw new Error("Order not found");
    if (existing.user_id !== userId) throw new Error("Forbidden");
    if (!["pending", "confirmed"].includes(existing.status))
      throw new Error("This order can no longer be cancelled");
    const { data: order, error } = await supabase
      .from("orders").update({ status: "cancelled" as never }).eq("id", data.id).select().single();
    if (error) throw error;
    await supabase.from("notifications").insert({
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
  if (!isAdmin) throw new Error("Forbidden");
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
    await context.supabase.from("notifications").insert({
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
    await context.supabase.from("notifications").insert({
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
    const { data: order, error } = await (context.supabase as any)
      .from("orders")
      .update({ refund_status: "refunded", refund_amount: data.amount ?? null })
      .eq("id", data.id).select().single();
    if (error) throw error;
    await context.supabase.from("notifications").insert({
      user_id: order.user_id, type: "order",
      title: "Refund processed",
      body: `₹${data.amount ?? order.total} has been refunded for order #${order.id.slice(0, 8)}.`,
      link: `/orders/${order.id}`,
    });
    return order;
  });


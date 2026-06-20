import { createServerFn } from "@tanstack/react-start";
import { UserError } from "@/lib/user-error";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Use the service-role client so RLS can't hide the order→product→seller chain. */
async function resolveSellerForOrder(orderId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("order_items")
    .select("product_id, products:product_id(seller_id)")
    .eq("order_id", orderId)
    .limit(1)
    .maybeSingle();
  const products = (data as any)?.products;
  return products?.seller_id ?? null;
}

/** Returns true if `userId` owns any product in the given order. */
async function userIsSellerOfOrder(orderId: string, userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("order_items")
    .select("product_id, products:product_id(seller_id)")
    .eq("order_id", orderId);
  return (data ?? []).some((row: any) => row?.products?.seller_id === userId);
}

async function listAdminIds(): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
  return (data ?? []).map((r: any) => r.user_id);
}

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subject: string; message: string; orderId?: string | null }) => {
    if (!d.subject?.trim() || d.subject.length > 200) throw new UserError("Subject required (max 200 chars)");
    if (!d.message?.trim() || d.message.length > 4000) throw new UserError("Message required (max 4000 chars)");
    return { subject: d.subject.trim(), message: d.message.trim(), orderId: d.orderId || null };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let sellerId: string | null = null;
    if (data.orderId) sellerId = await resolveSellerForOrder(data.orderId);

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: userId,
        subject: data.subject,
        message: data.message,
        status: "open",
        order_id: data.orderId,
        seller_id: sellerId,
      })
      .select()
      .single();
    if (error) throw error;

    await supabase.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      sender_id: userId,
      is_admin: false,
      sender_role: "user",
      body: data.message,
    });

    // Notify user (confirmation) + seller (if any) + all admins
    const notifs: any[] = [
      {
        user_id: userId,
        type: "system",
        title: "Support ticket opened",
        body: `We received your request: ${data.subject}`,
        link: `/support`,
      },
    ];
    if (sellerId && sellerId !== userId) {
      notifs.push({
        user_id: sellerId,
        type: "system",
        title: "New support ticket",
        body: `A customer opened a ticket about an order: ${data.subject}`,
        link: `/seller/support`,
      });
    }
    // Admins are NOT notified for routine ticket activity — they monitor /admin/support directly.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("notifications").insert(notifs);
    return ticket;
  });

async function decorateTickets(supabase: any, tickets: any[], role: "user" | "seller" | "admin") {
  if (!tickets.length) return [];
  const ids = tickets.map((t) => t.id);
  const userIds = Array.from(new Set(tickets.map((t) => t.user_id).filter(Boolean)));

  // Pull last message per ticket (one query, sorted desc, then dedupe)
  const { data: msgs } = await supabase
    .from("support_ticket_messages")
    .select("ticket_id, body, sender_role, is_admin, created_at")
    .in("ticket_id", ids)
    .order("created_at", { ascending: false });
  const lastByTicket: Record<string, any> = {};
  for (const m of msgs ?? []) {
    if (!lastByTicket[m.ticket_id]) lastByTicket[m.ticket_id] = m;
  }

  let nameMap: Record<string, string> = {};
  if (userIds.length) {
    const { data: profs } = await supabase
      .from("profiles").select("id, display_name").in("id", userIds);
    nameMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.display_name]));
  }

  return tickets.map((t) => {
    const last = lastByTicket[t.id] ?? null;
    const readKey =
      role === "user" ? t.last_read_user_at
      : role === "seller" ? t.last_read_seller_at
      : t.last_read_admin_at;
    let unread = false;
    if (last) {
      const incoming =
        role === "user" ? last.sender_role !== "user"
        : role === "seller" ? last.sender_role !== "seller"
        : last.sender_role !== "admin";
      const readTs = readKey ? new Date(readKey).getTime() : 0;
      unread = incoming && new Date(last.created_at).getTime() > readTs;
    }
    const preview = last
      ? { body: (last.body ?? "").slice(0, 120), sender_role: last.sender_role, created_at: last.created_at }
      : null;
    return {
      ...t,
      profiles: { display_name: nameMap[t.user_id] ?? null },
      last_message: preview,
      unread,
    };
  });
}

export const listMyTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return decorateTickets(context.supabase, data ?? [], "user");
  });

export const listSellerTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("support_tickets")
      .select("*")
      .eq("seller_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return decorateTickets(context.supabase, data ?? [], "seller");
  });

export const listAllTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new UserError("Forbidden");
    const { data, error } = await context.supabase
      .from("support_tickets")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return decorateTickets(context.supabase, data ?? [], "admin");
  });

export const markTicketRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: ticket } = await supabase
      .from("support_tickets").select("user_id, seller_id").eq("id", data.id).maybeSingle();
    if (!ticket) throw new UserError("Ticket not found");
    const now = new Date().toISOString();
    const patch: any = {};
    if (isAdmin) patch.last_read_admin_at = now;
    else if (ticket.seller_id === userId) patch.last_read_seller_at = now;
    else if (ticket.user_id === userId) patch.last_read_user_at = now;
    else throw new UserError("Forbidden");
    const { error } = await supabase.from("support_tickets").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const getTicketThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: ticket, error: tErr } = await context.supabase
      .from("support_tickets")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!ticket) return null;
    const { data: msgs, error: mErr } = await context.supabase
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", data.id)
      .order("created_at", { ascending: true });
    if (mErr) throw mErr;

    // Fetch ticket attachments and sign URLs so they render inline in the thread.
    const { data: atts } = await context.supabase
      .from("support_ticket_attachments")
      .select("*")
      .eq("ticket_id", data.id)
      .order("created_at", { ascending: true });
    const signedAtts = await Promise.all(
      (atts ?? []).map(async (a: any) => {
        const { data: s } = await context.supabase
          .storage.from("support-attachments")
          .createSignedUrl(a.storage_path, 60 * 60);
        return { ...a, url: s?.signedUrl ?? null };
      }),
    );
    return { ticket, messages: msgs ?? [], attachments: signedAtts };
  });

export const replyToTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; body: string }) => {
    if (!d.body?.trim() || d.body.length > 4000) throw new UserError("Message required");
    return { id: d.id, body: d.body.trim() };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: ticket, error: tErr } = await supabase
      .from("support_tickets")
      .select("user_id, seller_id, subject, order_id")
      .eq("id", data.id)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!ticket) throw new UserError("Ticket not found");

    // Resilient role detection: if seller_id is missing on the ticket but the
    // caller actually owns a product in the linked order, treat them as seller.
    let effectiveSellerId = ticket.seller_id as string | null;
    if (!effectiveSellerId && ticket.order_id) {
      effectiveSellerId = await resolveSellerForOrder(ticket.order_id);
      if (effectiveSellerId) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("support_tickets").update({ seller_id: effectiveSellerId }).eq("id", data.id);
      }
    }

    let role: "user" | "seller" | "admin" = "user";
    if (isAdmin) role = "admin";
    else if (effectiveSellerId === userId) role = "seller";
    else if (ticket.user_id === userId) role = "user";
    else if (ticket.order_id && await userIsSellerOfOrder(ticket.order_id, userId)) role = "seller";
    else throw new UserError("Forbidden");

    await supabase.from("support_ticket_messages").insert({
      ticket_id: data.id,
      sender_id: userId,
      is_admin: role === "admin",
      sender_role: role,
      body: data.body,
    });

    const patch: { updated_at: string; status?: "in_progress" } = { updated_at: new Date().toISOString() };
    if (role !== "user") patch.status = "in_progress";
    await supabase.from("support_tickets").update(patch).eq("id", data.id);

    // Notify the OTHER party only (customer ↔ seller). Admins are not bell-spammed
    // for routine replies — they monitor /admin/support directly.
    const recipients = new Set<string>();
    if (ticket.user_id && ticket.user_id !== userId) recipients.add(ticket.user_id);
    if (effectiveSellerId && effectiveSellerId !== userId) recipients.add(effectiveSellerId);

    if (recipients.size) {
      const senderLabel = role === "admin" ? "Support agent" : role === "seller" ? "Seller" : "Customer";
      const rows = Array.from(recipients).map((uid) => {
        const isSellerRecipient = uid === effectiveSellerId;
        const link = isSellerRecipient ? "/seller/support" : "/support";
        return {
          user_id: uid,
          type: "system" as const,
          title: `${senderLabel} replied`,
          body: `New message on ticket "${ticket.subject}".`,
          link,
        };
      });
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("notifications").insert(rows);
    }
    return { ok: true };
  });

export const setTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "open" | "in_progress" | "resolved" | "closed" }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: existing } = await supabase
      .from("support_tickets")
      .select("user_id, seller_id, subject")
      .eq("id", data.id)
      .maybeSingle();
    if (!existing) throw new UserError("Ticket not found");
    const isSeller = existing.seller_id === userId;
    if (!isAdmin && !isSeller) throw new UserError("Forbidden");

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .update({ status: data.status })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw error;
    if (ticket.user_id && ticket.user_id !== userId) {
      await supabase.from("notifications").insert({
        user_id: ticket.user_id,
        type: "system",
        title: `Ticket ${data.status.replace("_", " ")}`,
        body: `Your ticket "${ticket.subject}" is now ${data.status.replace("_", " ")}.`,
        link: `/support`,
      });
    }
    return ticket;
  });

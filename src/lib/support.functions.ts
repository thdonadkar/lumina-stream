import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function resolveSellerForOrder(supabase: any, orderId: string): Promise<string | null> {
  const { data } = await supabase
    .from("order_items")
    .select("product_id, products:product_id(seller_id)")
    .eq("order_id", orderId)
    .limit(1)
    .maybeSingle();
  return data?.products?.seller_id ?? null;
}

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subject: string; message: string; orderId?: string | null }) => {
    if (!d.subject?.trim() || d.subject.length > 200) throw new Error("Subject required (max 200 chars)");
    if (!d.message?.trim() || d.message.length > 4000) throw new Error("Message required (max 4000 chars)");
    return { subject: d.subject.trim(), message: d.message.trim(), orderId: d.orderId || null };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let sellerId: string | null = null;
    if (data.orderId) sellerId = await resolveSellerForOrder(supabase, data.orderId);

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

    // Notify user (confirmation) + seller (if any)
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
    await supabase.from("notifications").insert(notifs);
    return ticket;
  });

export const listMyTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const listSellerTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("support_tickets")
      .select("*, profiles:user_id(display_name)")
      .eq("seller_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  });

export const listAllTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("support_tickets")
      .select("*, profiles:user_id(display_name)")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
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
    return { ticket, messages: msgs ?? [] };
  });

export const replyToTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; body: string }) => {
    if (!d.body?.trim() || d.body.length > 4000) throw new Error("Message required");
    return { id: d.id, body: d.body.trim() };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: ticket, error: tErr } = await supabase
      .from("support_tickets")
      .select("user_id, seller_id, subject")
      .eq("id", data.id)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!ticket) throw new Error("Ticket not found");

    let role: "user" | "seller" | "admin" = "user";
    if (isAdmin) role = "admin";
    else if (ticket.seller_id === userId) role = "seller";
    else if (ticket.user_id === userId) role = "user";
    else throw new Error("Forbidden");

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

    // Notify the other parties
    const recipients = new Set<string>();
    if (ticket.user_id && ticket.user_id !== userId) recipients.add(ticket.user_id);
    if (ticket.seller_id && ticket.seller_id !== userId) recipients.add(ticket.seller_id);
    if (recipients.size) {
      const senderLabel = role === "admin" ? "Support agent" : role === "seller" ? "Seller" : "Customer";
      await supabase.from("notifications").insert(
        Array.from(recipients).map((uid) => ({
          user_id: uid,
          type: "system",
          title: `${senderLabel} replied`,
          body: `New message on ticket "${ticket.subject}".`,
          link: role === "seller" || (role === "admin" && uid === ticket.seller_id) ? "/seller/support" : "/support",
        })),
      );
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
    if (!existing) throw new Error("Ticket not found");
    const isSeller = existing.seller_id === userId;
    if (!isAdmin && !isSeller) throw new Error("Forbidden");

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

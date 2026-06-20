import { createServerFn } from "@tanstack/react-start";
import { UserError } from "@/lib/user-error";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Records an attachment row after the client has uploaded the file directly
 * to the private `support-attachments` bucket. RLS on storage.objects already
 * enforces that the uploader is a participant on the ticket.
 */
export const recordTicketAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    ticketId: string;
    messageId?: string | null;
    storagePath: string;
    fileName: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
  }) => {
    if (!d.ticketId) throw new UserError("Ticket required");
    if (!d.storagePath) throw new UserError("Path required");
    if (!d.fileName) throw new UserError("File name required");
    if (d.sizeBytes && d.sizeBytes > 10 * 1024 * 1024) throw new UserError("Max file size is 10 MB");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("support_ticket_attachments")
      .insert({
        ticket_id: data.ticketId,
        message_id: data.messageId ?? null,
        uploader_id: userId,
        storage_path: data.storagePath,
        file_name: data.fileName,
        mime_type: data.mimeType ?? null,
        size_bytes: data.sizeBytes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const listTicketAttachments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ticketId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("support_ticket_attachments")
      .select("*")
      .eq("ticket_id", data.ticketId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    // Sign URLs (1 hour) so participants can preview/download.
    const signed = await Promise.all(
      (rows ?? []).map(async (r: any) => {
        const { data: s } = await context.supabase
          .storage.from("support-attachments")
          .createSignedUrl(r.storage_path, 60 * 60);
        return { ...r, url: s?.signedUrl ?? null };
      }),
    );
    return signed;
  });

export const deleteTicketAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("support_ticket_attachments").select("storage_path").eq("id", data.id).maybeSingle();
    if (row?.storage_path) {
      await context.supabase.storage.from("support-attachments").remove([row.storage_path]);
    }
    const { error } = await context.supabase
      .from("support_ticket_attachments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

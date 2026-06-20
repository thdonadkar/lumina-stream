import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to realtime INSERTs on support_ticket_messages for one ticket.
 * Calls `onInsert` whenever a new message arrives. Cleans up on unmount /
 * ticket change.
 */
export function useTicketRealtime(ticketId: string | null, onInsert: (row: any) => void) {
  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`support-thread:${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_ticket_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => onInsert(payload.new),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, onInsert]);
}

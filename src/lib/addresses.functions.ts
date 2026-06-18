import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AddressInput = {
  id?: string;
  label?: string | null;
  recipient: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postal_code: string;
  country?: string;
  is_default?: boolean;
};

function validate(d: AddressInput): AddressInput {
  if (!d.recipient?.trim()) throw new Error("Recipient required");
  if (!d.line1?.trim()) throw new Error("Address line required");
  if (!d.city?.trim()) throw new Error("City required");
  if (!d.postal_code?.trim()) throw new Error("Postal code required");
  return d;
}

export const listAddresses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const saveAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      user_id: userId,
      label: data.label ?? null,
      recipient: data.recipient,
      phone: data.phone ?? null,
      line1: data.line1,
      line2: data.line2 ?? null,
      city: data.city,
      state: data.state ?? null,
      postal_code: data.postal_code,
      country: data.country ?? "IN",
      is_default: !!data.is_default,
    };

    if (data.is_default) {
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
    }

    if (data.id) {
      const { data: row, error } = await supabase
        .from("addresses")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw error;
      return row;
    }
    const { data: row, error } = await supabase
      .from("addresses")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const deleteAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("addresses").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

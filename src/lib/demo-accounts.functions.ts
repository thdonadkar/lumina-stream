import { createServerFn } from "@tanstack/react-start";

// Allowlisted demo accounts. The server fn idempotently creates them
// (auto-confirmed) and ensures the role grant. Hardcoded — cannot escalate
// arbitrary users.
const DEMO = [
  { email: "admin@demo.com", password: "Admin123", name: "Demo Admin", role: "admin" as const },
  { email: "seller@demo.com", password: "Seller123", name: "Demo Seller", role: "seller" as const },
  { email: "user@demo.com", password: "User123", name: "Demo User", role: "user" as const },
];

export const ensureDemoAccounts = createServerFn({ method: "POST" }).handler(async () => {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_ACCOUNTS !== "true") {
    throw new Error("Demo accounts are disabled in production");
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw new Error(listErr.message);
  const byEmail = new Map(list.users.map((u) => [u.email?.toLowerCase(), u]));

  for (const u of DEMO) {
    let id = byEmail.get(u.email)?.id;
    if (!id) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { display_name: u.name },
      });
      if (error) {
        // race: a parallel call already created it
        const refetch = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        id = refetch.data.users.find((x) => x.email?.toLowerCase() === u.email)?.id;
        if (!id) throw new Error(error.message);
      } else {
        id = data.user?.id;
      }
    } else {
      // Ensure password matches the documented demo password.
      await supabaseAdmin.auth.admin.updateUserById(id, { password: u.password });
    }
    if (!id) continue;
    // Grant role (handle_new_user already inserts 'user'; we add seller/admin too).
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: id, role: u.role }, { onConflict: "user_id,role" });
  }

  return { ok: true };
});

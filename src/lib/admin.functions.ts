import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: any) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/* ============== PRODUCTS (admin moderation) ============== */

export const listAllProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data, error } = await db
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  });

export const setProductStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "active" | "rejected" | "pending" | "draft" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { error } = await db.from("products").update({ status: data.status }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteProductAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { error } = await db.from("products").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* ============== CATEGORIES ============== */

export const listCategoriesAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { data, error } = await db.from("categories").select("*").order("sort_order").order("name");
  if (error) throw error;
  return data ?? [];
});

export const createCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; slug?: string }) => {
    const name = d.name?.trim();
    if (!name) throw new Error("Name required");
    return { name, slug: d.slug?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data: row, error } = await db
      .from("categories")
      .insert({ name: data.name, slug: data.slug, is_active: true })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const updateCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name?: string; is_active?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const patch: any = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    const { error } = await db.from("categories").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { error } = await db.from("categories").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* ============== USERS ============== */

export const listUsersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      db.from("profiles").select("id, display_name, phone, is_blocked, created_at").order("created_at", { ascending: false }).limit(500),
      db.from("user_roles").select("user_id, role"),
    ]);
    if (pErr) throw pErr;
    if (rErr) throw rErr;
    const roleMap: Record<string, string[]> = {};
    for (const r of roles ?? []) {
      (roleMap[r.user_id] ||= []).push(r.role);
    }
    // best-effort emails via auth admin
    const emailMap: Record<string, string> = {};
    try {
      const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
      for (const u of list?.users ?? []) emailMap[u.id] = u.email ?? "";
    } catch {}
    return (profiles ?? []).map((p: any) => ({
      ...p,
      email: emailMap[p.id] ?? null,
      roles: roleMap[p.id] ?? ["user"],
    }));
  });

export const setUserBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; blocked: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id === context.userId) throw new Error("You cannot block yourself");
    const db = await admin();
    const { error } = await db.from("profiles").update({ is_blocked: data.blocked }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; role: "user" | "seller" | "admin"; grant: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    if (data.grant) {
      const { error } = await db.from("user_roles").upsert(
        { user_id: data.id, role: data.role },
        { onConflict: "user_id,role" },
      );
      if (error) throw error;
    } else {
      if (data.role === "admin" && data.id === context.userId) {
        throw new Error("You cannot revoke your own admin role");
      }
      const { error } = await db.from("user_roles").delete().eq("user_id", data.id).eq("role", data.role);
      if (error) throw error;
    }
    return { ok: true };
  });

/* ============== SELLERS ============== */

export const listSellersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data: sellerRoles, error } = await db.from("user_roles").select("user_id").eq("role", "seller");
    if (error) throw error;
    const ids = (sellerRoles ?? []).map((r: any) => r.user_id);
    if (ids.length === 0) return [];
    const [{ data: profiles }, { data: products }] = await Promise.all([
      db.from("profiles").select("id, display_name, created_at, is_blocked").in("id", ids),
      db.from("products").select("seller_id, status").in("seller_id", ids),
    ]);
    const stats: Record<string, { total: number; active: number; pending: number }> = {};
    for (const p of products ?? []) {
      const s = (stats[p.seller_id] ||= { total: 0, active: 0, pending: 0 });
      s.total += 1;
      if (p.status === "active") s.active += 1;
      if (p.status === "pending") s.pending += 1;
    }
    return (profiles ?? []).map((p: any) => ({
      ...p,
      products_total: stats[p.id]?.total ?? 0,
      products_active: stats[p.id]?.active ?? 0,
      products_pending: stats[p.id]?.pending ?? 0,
    }));
  });

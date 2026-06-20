import { createFileRoute } from "@tanstack/react-router";
import { Ban, CheckCircle2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGate } from "@/components/RoleGate";
import { AdminNav } from "./admin.dashboard";
import { listUsersAdmin, setUserBlocked, setUserRole } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: () => (
    <RoleGate role="admin">
      <Page />
    </RoleGate>
  ),
});

function Page() {
  const qc = useQueryClient();
  const list = useServerFn(listUsersAdmin);
  const block = useServerFn(setUserBlocked);
  const setRole = useServerFn(setUserRole);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => list(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const blockMut = useMutation({
    mutationFn: (v: { id: string; blocked: boolean }) => block({ data: v }),
    onSuccess: (_d, v) => { invalidate(); toast.success(v.blocked ? "Blocked" : "Unblocked"); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const roleMut = useMutation({
    mutationFn: (v: { id: string; role: "seller" | "admin"; grant: boolean }) =>
      setRole({ data: v }),
    onSuccess: () => { invalidate(); toast.success("Roles updated"); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold tracking-tighter mb-6">User management</h1>

      <div className="glass-strong rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-white/5">
              <th className="text-left p-4">User</th>
              <th className="text-left p-4 hidden sm:table-cell">Roles</th>
              <th className="text-left p-4">Status</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="p-4 text-muted-foreground">Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="p-4 text-muted-foreground">No users.</td></tr>
            ) : users.map((u: any) => {
              const isSeller = u.roles.includes("seller");
              const isAdmin = u.roles.includes("admin");
              return (
                <tr key={u.id} className="border-b border-white/5">
                  <td className="p-4">
                    <p className="font-medium">{u.display_name ?? "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground">{u.email ?? u.id.slice(0, 8)}</p>
                  </td>
                  <td className="p-4 hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r: string) => (
                        <span key={r} className="px-2 py-0.5 rounded-full glass text-[10px] uppercase font-mono">{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-mono ring-1 ${
                      u.is_blocked ? "text-rose-400 ring-rose-400/30" : "text-cyan ring-cyan/30"
                    }`}>
                      {u.is_blocked ? "blocked" : "active"}
                    </span>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => roleMut.mutate({ id: u.id, role: "seller", grant: !isSeller })}
                      className="px-3 py-1 rounded-full text-xs font-bold glass hover:glass-strong mr-1"
                    >
                      {isSeller ? "Revoke seller" : "Make seller"}
                    </button>
                    <button
                      onClick={() => roleMut.mutate({ id: u.id, role: "admin", grant: !isAdmin })}
                      className="px-3 py-1 rounded-full text-xs font-bold glass hover:glass-strong mr-1"
                    >
                      {isAdmin ? "Revoke admin" : "Make admin"}
                    </button>
                    <button
                      onClick={() => blockMut.mutate({ id: u.id, blocked: !u.is_blocked })}
                      className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                        u.is_blocked ? "bg-aurora animate-aurora text-background" : "glass hover:glass-strong"
                      }`}
                    >
                      {u.is_blocked ? <><CheckCircle2 className="size-3" /> Unblock</> : <><Ban className="size-3" /> Block</>}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AdminNav />
    </div>
  );
}

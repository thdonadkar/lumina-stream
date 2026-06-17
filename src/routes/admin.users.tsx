import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Ban, CheckCircle2 } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { AdminNav } from "./admin.dashboard";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: () => (
    <RoleGate role="admin">
      <Page />
    </RoleGate>
  ),
});

const MOCK = [
  { id: "u_001", name: "Alex Morris", email: "alex@neural.app", role: "user", blocked: false },
  { id: "u_002", name: "Priya Shah", email: "priya@neural.app", role: "seller", blocked: false },
  { id: "u_003", name: "Hiro Tanaka", email: "hiro@neural.app", role: "user", blocked: true },
  { id: "u_004", name: "Nour Khalil", email: "nour@neural.app", role: "admin", blocked: false },
];

function Page() {
  const [users, setUsers] = useState(MOCK);
  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold tracking-tighter mb-6">User management</h1>

      <div className="glass-strong rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-white/5">
              <th className="text-left p-4">User</th>
              <th className="text-left p-4 hidden sm:table-cell">Role</th>
              <th className="text-left p-4">Status</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5">
                <td className="p-4">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td className="p-4 hidden sm:table-cell">
                  <span className="px-2 py-0.5 rounded-full glass text-[10px] uppercase font-mono">{u.role}</span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-mono ring-1 ${
                    u.blocked ? "text-rose-400 ring-rose-400/30" : "text-cyan ring-cyan/30"
                  }`}>
                    {u.blocked ? "blocked" : "active"}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => {
                      setUsers((cur) => cur.map((x) => (x.id === u.id ? { ...x, blocked: !x.blocked } : x)));
                      toast.success(u.blocked ? "Unblocked" : "Blocked");
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                      u.blocked ? "bg-aurora animate-aurora text-background" : "glass hover:glass-strong"
                    }`}
                  >
                    {u.blocked ? <><CheckCircle2 className="size-3" /> Unblock</> : <><Ban className="size-3" /> Block</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminNav />
    </div>
  );
}

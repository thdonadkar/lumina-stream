import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/RoleGate";
import { AdminNav } from "./admin.dashboard";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({ meta: [{ title: "Orders — Admin" }] }),
  component: () => (
    <RoleGate role="admin">
      <Page />
    </RoleGate>
  ),
});

const MOCK = [
  { id: "ORD-4821", user: "alex@neural.app", total: 2499, status: "pending" },
  { id: "ORD-4822", user: "priya@neural.app", total: 820, status: "shipped" },
  { id: "ORD-4823", user: "hiro@neural.app", total: 499, status: "delivered" },
  { id: "ORD-4824", user: "nour@neural.app", total: 390, status: "packed" },
  { id: "ORD-4825", user: "kai@neural.app", total: 1299, status: "return_requested" },
];

function Page() {
  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold tracking-tighter mb-6">All orders</h1>
      <div className="glass-strong rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-white/5">
              <th className="text-left p-4">Order</th>
              <th className="text-left p-4 hidden sm:table-cell">Customer</th>
              <th className="text-right p-4">Total</th>
              <th className="text-right p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK.map((o) => (
              <tr key={o.id} className="border-b border-white/5">
                <td className="p-4 font-mono">{o.id}</td>
                <td className="p-4 hidden sm:table-cell text-muted-foreground">{o.user}</td>
                <td className="p-4 text-right font-mono">${o.total.toLocaleString()}</td>
                <td className="p-4 text-right">
                  <span className="px-2 py-0.5 rounded-full glass text-[10px] uppercase font-mono tracking-wider">
                    {o.status.replace("_", " ")}
                  </span>
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

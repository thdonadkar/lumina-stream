import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/careers")({
  head: () => ({ meta: [{ title: "Careers — Neural" }, { name: "description", content: "Build the future of commerce with us." }] }),
  component: Page,
});

const ROLES = [
  { title: "Senior Product Designer", team: "Design", location: "Remote — Americas" },
  { title: "Staff Frontend Engineer", team: "Web", location: "San Francisco" },
  { title: "Infrastructure Engineer", team: "Platform", location: "Remote — EU" },
  { title: "Growth Marketing Lead", team: "Growth", location: "New York" },
];

function Page() {
  return (
    <div className="px-4 pt-28 pb-24 max-w-3xl mx-auto">
      <h1 className="text-5xl font-extrabold tracking-tighter mb-2">Build the future of commerce.</h1>
      <p className="text-muted-foreground mb-10">We're a small team shipping a category-defining platform.</p>
      <div className="space-y-2">
        {ROLES.map((r) => (
          <a
            key={r.title}
            href={`mailto:careers@neural.app?subject=${encodeURIComponent("Application: " + r.title)}`}
            className="glass hover:glass-strong rounded-2xl p-5 flex items-center justify-between gap-4 transition-all"
          >
            <div>
              <p className="font-bold">{r.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.team} · {r.location}</p>
            </div>
            <ArrowUpRight className="size-4" />
          </a>
        ))}
      </div>
    </div>
  );
}

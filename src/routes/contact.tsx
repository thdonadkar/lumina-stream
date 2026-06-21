import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MessageSquare, MapPin } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
import { submitContactMessage } from "@/lib/contact.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — AtomSpot" },
      { name: "description", content: "Reach the AtomSpot team." },
      { property: "og:title", content: "Contact — AtomSpot" },
    ],
  }),
  component: Contact,
});

const Schema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  message: z.string().trim().min(1, "Message required").max(2000),
});

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const submit = useServerFn(submitContactMessage);

  const mut = useMutation({
    mutationFn: (d: typeof form) => submit({ data: d }),
    onSuccess: () => {
      toast.success("Message sent — we'll reply soon.");
      setForm({ name: "", email: "", message: "" });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to send"),
  });

  return (
    <div className="px-4 pt-28 pb-24 max-w-4xl mx-auto grid lg:grid-cols-2 gap-6">
      <div>
        <h1 className="text-5xl font-extrabold tracking-tighter">Get in touch</h1>
        <p className="text-muted-foreground mt-3">We typically reply within one orbit.</p>
        <ul className="mt-8 space-y-3 text-sm">
          <li className="flex items-center gap-3"><Mail className="size-4 text-cyan" /> hello@atomspot.app</li>
          <li className="flex items-center gap-3"><MessageSquare className="size-4 text-cyan" /> +1 (415) 555-0199</li>
          <li className="flex items-center gap-3"><MapPin className="size-4 text-cyan" /> Pier 70, San Francisco</li>
        </ul>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = Schema.safeParse(form);
          if (!parsed.success) {
            toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
            return;
          }
          mut.mutate(parsed.data);
        }}
        className="glass-strong rounded-3xl p-6 space-y-3"
      >
        <input
          required value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Name" maxLength={100}
          className="w-full bg-transparent ring-1 ring-white/10 rounded-xl px-3 py-2 text-sm outline-none"
        />
        <input
          required type="email" value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="Email" maxLength={255}
          className="w-full bg-transparent ring-1 ring-white/10 rounded-xl px-3 py-2 text-sm outline-none"
        />
        <textarea
          required rows={5} value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          placeholder="What's on your mind?" maxLength={2000}
          className="w-full bg-transparent ring-1 ring-white/10 rounded-xl px-3 py-2 text-sm outline-none resize-none"
        />
        <button
          disabled={mut.isPending}
          className="w-full rounded-full bg-aurora animate-aurora text-background font-bold text-sm py-2.5 disabled:opacity-60"
        >
          {mut.isPending ? "Sending…" : "Send message"}
        </button>
      </form>
    </div>
  );
}

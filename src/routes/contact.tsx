import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageSquare, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Neural" },
      { name: "description", content: "Reach the Neural team." },
      { property: "og:title", content: "Contact — Neural" },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <div className="px-4 pt-28 pb-24 max-w-4xl mx-auto grid lg:grid-cols-2 gap-6">
      <div>
        <h1 className="text-5xl font-extrabold tracking-tighter">Get in touch</h1>
        <p className="text-muted-foreground mt-3">We typically reply within one orbit.</p>
        <ul className="mt-8 space-y-3 text-sm">
          <li className="flex items-center gap-3"><Mail className="size-4 text-cyan" /> hello@neural.app</li>
          <li className="flex items-center gap-3"><MessageSquare className="size-4 text-cyan" /> +1 (415) 555-0199</li>
          <li className="flex items-center gap-3"><MapPin className="size-4 text-cyan" /> Pier 70, San Francisco</li>
        </ul>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); toast.success("Message sent — we'll reply soon."); }}
        className="glass-strong rounded-3xl p-6 space-y-3"
      >
        <input required placeholder="Name" className="w-full bg-transparent ring-1 ring-white/10 rounded-xl px-3 py-2 text-sm outline-none" />
        <input required type="email" placeholder="Email" className="w-full bg-transparent ring-1 ring-white/10 rounded-xl px-3 py-2 text-sm outline-none" />
        <textarea required rows={5} placeholder="What's on your mind?" className="w-full bg-transparent ring-1 ring-white/10 rounded-xl px-3 py-2 text-sm outline-none resize-none" />
        <button className="w-full rounded-full bg-aurora animate-aurora text-background font-bold text-sm py-2.5">Send message</button>
      </form>
    </div>
  );
}

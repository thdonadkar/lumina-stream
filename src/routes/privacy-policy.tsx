import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({ meta: [{ title: "Privacy — AtomSpot" }, { name: "description", content: "Privacy policy." }] }),
  component: Page,
});

function Page() {
  return (
    <div className="px-4 pt-28 pb-24 max-w-3xl mx-auto">
      <h1 className="text-5xl font-extrabold tracking-tighter mb-6">Privacy policy</h1>
      <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
        <p>We collect only what's needed to provide the service: account info, order history, and anonymous usage analytics.</p>
        <p><strong className="text-foreground">Data we store.</strong> Email, encrypted credentials, addresses you add, orders, and product preferences.</p>
        <p><strong className="text-foreground">How we use it.</strong> To fulfill orders, prevent fraud, personalize recommendations, and improve the platform.</p>
        <p><strong className="text-foreground">Third parties.</strong> We share data only with payment processors, shipping carriers, and infrastructure providers under strict contracts.</p>
        <p><strong className="text-foreground">Your rights.</strong> Export, correct, or delete your data anytime from your account.</p>
        <p className="text-xs">Last updated: today.</p>
      </div>
    </div>
  );
}

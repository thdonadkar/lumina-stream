import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms — Neural" }, { name: "description", content: "Terms of service." }] }),
  component: () => <Doc title="Terms of service" />,
});

function Doc({ title }: { title: string }) {
  return (
    <div className="px-4 pt-28 pb-24 max-w-3xl mx-auto prose-invert">
      <h1 className="text-5xl font-extrabold tracking-tighter mb-6">{title}</h1>
      <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
        <p>By accessing Neural ("the platform"), you agree to be bound by these terms. If you do not agree, do not use the platform.</p>
        <p><strong className="text-foreground">Accounts.</strong> You are responsible for maintaining the confidentiality of your credentials and for all activities under your account.</p>
        <p><strong className="text-foreground">Purchases.</strong> Prices, availability, and offers may change without notice. All transactions are subject to verification and final acceptance.</p>
        <p><strong className="text-foreground">Sellers.</strong> Sellers warrant they have rights to list and sell their products and agree to Neural's product policies.</p>
        <p><strong className="text-foreground">Refunds.</strong> Refunds are processed per our return policy; please contact support.</p>
        <p><strong className="text-foreground">Liability.</strong> The platform is provided "as is" without warranties. Liability is limited to amounts paid for the disputed transaction.</p>
        <p className="text-xs">Last updated: today.</p>
      </div>
    </div>
  );
}

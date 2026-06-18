import jsPDF from "jspdf";

type InvoiceOrder = {
  id: string;
  created_at: string;
  status: string;
  payment_status?: string;
  payment_method?: string;
  payment_ref?: string | null;
  subtotal: number | string;
  discount: number | string;
  shipping: number | string;
  tax: number | string;
  total: number | string;
  coupon_code?: string | null;
  order_items?: Array<{ title: string; qty: number; unit_price: number | string }>;
  addresses?: {
    recipient?: string;
    line1?: string;
    line2?: string | null;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    phone?: string | null;
  } | null;
};

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

export function downloadInvoice(order: InvoiceOrder) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = 50;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("NEURAL", M, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Tax Invoice", W - M, y, { align: "right" });
  y += 18;
  doc.setDrawColor(220);
  doc.line(M, y, W - M, y);
  y += 24;

  // Meta
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Invoice #", M, y);
  doc.setFont("helvetica", "normal");
  doc.text(order.id.slice(0, 8).toUpperCase(), M + 60, y);
  doc.setFont("helvetica", "bold");
  doc.text("Date", W - M - 130, y);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(order.created_at).toLocaleString("en-IN"), W - M - 100, y);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.text("Order status", M, y);
  doc.setFont("helvetica", "normal");
  doc.text(String(order.status).replace(/_/g, " "), M + 80, y);
  doc.setFont("helvetica", "bold");
  doc.text("Payment", W - M - 130, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${order.payment_status ?? "paid"} (${order.payment_method ?? "demo"})`,
    W - M - 100,
    y,
  );
  y += 24;

  // Bill To
  const a = order.addresses;
  if (a) {
    doc.setFont("helvetica", "bold");
    doc.text("Bill / Ship to:", M, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    const lines = [
      a.recipient,
      a.line1,
      a.line2,
      `${a.city ?? ""}, ${a.state ?? ""} ${a.postal_code ?? ""}`,
      a.country,
      a.phone ? `Phone: ${a.phone}` : null,
    ].filter(Boolean) as string[];
    lines.forEach((l) => {
      doc.text(l, M, y);
      y += 12;
    });
    y += 10;
  }

  // Items header
  doc.setFillColor(245);
  doc.rect(M, y, W - 2 * M, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Item", M + 8, y + 15);
  doc.text("Qty", W - M - 200, y + 15);
  doc.text("Unit", W - M - 140, y + 15);
  doc.text("Amount", W - M - 8, y + 15, { align: "right" });
  y += 22;

  doc.setFont("helvetica", "normal");
  (order.order_items ?? []).forEach((it) => {
    const unit = Number(it.unit_price);
    const amt = unit * it.qty;
    const title = doc.splitTextToSize(it.title, W - M - 240) as string[];
    title.forEach((ln, i) => doc.text(ln, M + 8, y + 14 + i * 12));
    doc.text(String(it.qty), W - M - 200, y + 14);
    doc.text(inr(unit), W - M - 140, y + 14);
    doc.text(inr(amt), W - M - 8, y + 14, { align: "right" });
    y += Math.max(20, title.length * 12 + 6);
    doc.setDrawColor(240);
    doc.line(M, y, W - M, y);
  });

  y += 14;
  // Totals
  const rightX = W - M - 8;
  const labelX = W - M - 180;
  const row = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, labelX, y);
    doc.text(value, rightX, y, { align: "right" });
    y += 14;
  };
  row("Subtotal", inr(Number(order.subtotal)));
  if (Number(order.discount) > 0) row(`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`, `- ${inr(Number(order.discount))}`);
  row("Shipping", Number(order.shipping) === 0 ? "Free" : inr(Number(order.shipping)));
  row("GST", inr(Number(order.tax)));
  y += 4;
  doc.setDrawColor(180);
  doc.line(labelX, y - 8, rightX, y - 8);
  doc.setFontSize(12);
  row("Total", inr(Number(order.total)), true);
  doc.setFontSize(10);

  if (order.payment_ref) {
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Payment reference: ${order.payment_ref}`, M, y);
  }

  // Footer
  doc.setTextColor(140);
  doc.setFontSize(9);
  doc.text(
    "Thank you for shopping with Neural. This is a system-generated invoice.",
    W / 2,
    doc.internal.pageSize.getHeight() - 30,
    { align: "center" },
  );

  doc.save(`invoice-${order.id.slice(0, 8)}.pdf`);
}

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

// jsPDF's built-in Helvetica lacks the ₹ glyph (renders as ¹ / box).
// "Rs." is the standard fallback used on Indian tax invoices.
const RS = "Rs. ";
const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    isFinite(n) ? n : 0,
  );
const money = (n: number) => `${RS}${fmt(n)}`;

const GST_RATE = 18;

function prettyDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) + ", " + new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function methodLabel(m?: string) {
  if (!m) return "-";
  if (m === "cod") return "Cash on Delivery";
  if (m === "razorpay") return "Razorpay (Card / UPI / Netbanking)";
  return m;
}

export function downloadInvoice(order: InvoiceOrder) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  let y = 50;

  // ─── Brand header ────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(20);
  doc.text("NEURAL", M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text("Neural Commerce Pvt Ltd", M, y + 14);
  doc.text("Bengaluru, Karnataka, India", M, y + 26);
  doc.text("support@neural.shop", M, y + 38);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text("TAX INVOICE", W - M, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text("Original for Recipient", W - M, y + 14, { align: "right" });

  y += 58;
  doc.setDrawColor(30);
  doc.setLineWidth(1);
  doc.line(M, y, W - M, y);
  y += 20;

  // ─── Invoice meta (two columns) ──────────────────────────────────
  doc.setTextColor(20);
  doc.setFontSize(9);
  const invoiceNo = `INV-${order.id.slice(0, 8).toUpperCase()}`;
  const orderNo = `#${order.id.slice(0, 8).toUpperCase()}`;

  const metaLeft: Array<[string, string]> = [
    ["Invoice No", invoiceNo],
    ["Order No", orderNo],
    ["Invoice Date", prettyDate(order.created_at)],
  ];
  const metaRight: Array<[string, string]> = [
    ["Payment Method", methodLabel(order.payment_method)],
    ["Payment Status", (order.payment_status ?? "paid").toUpperCase()],
    ["Order Status", String(order.status).replace(/_/g, " ").toUpperCase()],
  ];

  const metaStart = y;
  metaLeft.forEach(([k, v], i) => {
    const ly = metaStart + i * 14;
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, M, ly);
    doc.setFont("helvetica", "normal");
    doc.text(v, M + 80, ly);
  });
  metaRight.forEach(([k, v], i) => {
    const ly = metaStart + i * 14;
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, W / 2 + 10, ly);
    doc.setFont("helvetica", "normal");
    doc.text(v, W / 2 + 110, ly);
  });
  y = metaStart + Math.max(metaLeft.length, metaRight.length) * 14 + 14;

  // ─── Bill / Ship to ──────────────────────────────────────────────
  const a = order.addresses;
  if (a) {
    doc.setFillColor(247, 247, 250);
    doc.rect(M, y, W - 2 * M, 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20);
    doc.text("BILL TO / SHIP TO", M + 8, y + 12);
    y += 26;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(a.recipient || "-", M, y);
    y += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);
    const street = [a.line1, a.line2].filter(Boolean).join(", ");
    const cityLine = `${a.city ?? ""}${a.state ? ", " + a.state : ""}${a.postal_code ? " - " + a.postal_code : ""}`;
    const lines = [
      street,
      cityLine,
      a.country || "India",
      a.phone ? `Phone: ${a.phone}` : null,
    ].filter(Boolean) as string[];
    lines.forEach((l) => {
      doc.text(l, M, y);
      y += 12;
    });
    y += 12;
  }

  // ─── Items table ─────────────────────────────────────────────────
  const colItemX = M + 8;
  const colQtyX = W - M - 240;
  const colUnitX = W - M - 170;
  const colTotalX = W - M - 8;

  // Header row
  doc.setFillColor(20);
  doc.rect(M, y, W - 2 * M, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255);
  doc.text("ITEM DESCRIPTION", colItemX, y + 14);
  doc.text("QTY", colQtyX, y + 14, { align: "right" });
  doc.text("UNIT PRICE", colUnitX, y + 14, { align: "right" });
  doc.text("TOTAL", colTotalX, y + 14, { align: "right" });
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(20);
  doc.setFontSize(9);

  (order.order_items ?? []).forEach((it, idx) => {
    const unit = Number(it.unit_price);
    const amt = unit * it.qty;
    const titleLines = doc.splitTextToSize(it.title, colQtyX - colItemX - 12) as string[];
    const rowH = Math.max(24, titleLines.length * 12 + 12);

    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 252);
      doc.rect(M, y, W - 2 * M, rowH, "F");
    }

    titleLines.forEach((ln, i) => doc.text(ln, colItemX, y + 14 + i * 12));
    doc.text(String(it.qty), colQtyX, y + 14, { align: "right" });
    doc.text(money(unit), colUnitX, y + 14, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(money(amt), colTotalX, y + 14, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += rowH;
  });

  doc.setDrawColor(220);
  doc.line(M, y, W - M, y);
  y += 16;

  // ─── Totals ──────────────────────────────────────────────────────
  const labelX = W - M - 200;
  const valueX = W - M - 8;
  const totalRow = (label: string, value: string, opts: { bold?: boolean; muted?: boolean } = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setTextColor(opts.muted ? 110 : 20);
    doc.text(label, labelX, y);
    doc.text(value, valueX, y, { align: "right" });
    y += 14;
  };

  const subtotal = Number(order.subtotal);
  const discount = Number(order.discount);
  const shipping = Number(order.shipping);
  const tax = Number(order.tax);
  const total = Number(order.total);

  totalRow("Subtotal", money(subtotal));
  if (discount > 0)
    totalRow(`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`, `- ${money(discount)}`);
  totalRow("Shipping", shipping === 0 ? "FREE" : money(shipping));
  totalRow(`GST (${GST_RATE}%)`, money(tax));

  y += 4;
  doc.setDrawColor(20);
  doc.setLineWidth(0.8);
  doc.line(labelX, y - 6, valueX, y - 6);

  // Highlighted total bar
  doc.setFillColor(20);
  doc.rect(labelX - 8, y, valueX - labelX + 16, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255);
  doc.text("GRAND TOTAL", labelX, y + 17);
  doc.text(money(total), valueX, y + 17, { align: "right" });
  y += 40;

  // ─── Payment reference ──────────────────────────────────────────
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.setFont("helvetica", "normal");
  if (order.payment_ref) {
    doc.text(`Payment Reference: ${order.payment_ref}`, M, y);
    y += 14;
  }
  doc.text("All amounts are in Indian Rupees (INR). E. & O.E.", M, y);

  // ─── Footer ──────────────────────────────────────────────────────
  doc.setDrawColor(220);
  doc.line(M, H - 50, W - M, H - 50);
  doc.setTextColor(140);
  doc.setFontSize(8);
  doc.text(
    "Thank you for shopping with Neural. This is a computer-generated invoice and does not require a signature.",
    W / 2,
    H - 32,
    { align: "center" },
  );
  doc.text("Neural Commerce Pvt Ltd  •  support@neural.shop  •  neural.shop", W / 2, H - 20, {
    align: "center",
  });

  doc.save(`invoice-${order.id.slice(0, 8).toUpperCase()}.pdf`);
}

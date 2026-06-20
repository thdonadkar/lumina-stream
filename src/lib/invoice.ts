import jsPDF from "jspdf";
import QRCode from "qrcode";

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
    latitude?: number | null;
    longitude?: number | null;
  } | null;
};


const GST_RATE = 18;

const toNumber = (amount: number | string) => {
  const value = Number(amount);
  return Number.isFinite(value) ? value : 0;
};

const formatINR = (amount: number | string) =>
  `Rs. ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
  }).format(toNumber(amount))}`;

const cleanText = (value: unknown) =>
  String(value ?? "-")
    .replace(/[\u20b9\u00b9]/g, "Rs.")
    .replace(/\s+/g, " ")
    .trim();

function prettyDate(iso: string) {
  const date = new Date(iso);
  return `${date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}, ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

function paymentMethodLabel(method?: string) {
  if (!method) return "-";
  if (method === "cod") return "Cash on Delivery";
  if (method === "razorpay") return "Razorpay";
  return cleanText(method).replace(/\b\w/g, (char) => char.toUpperCase());
}

function paymentMethodShort(method?: string) {
  if (!method) return "-";
  if (method === "cod") return "COD";
  return cleanText(method).toUpperCase();
}

function statusLabel(status?: string) {
  return cleanText(status || "paid")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function createInvoicePdf(order: InvoiceOrder) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = 48;

  const setFont = (style: "normal" | "bold" = "normal", size = 10, gray = 20) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(gray, gray, gray);
    doc.setCharSpace(0);
  };

  const text = (value: unknown, x: number, textY: number, options?: Parameters<typeof doc.text>[3]) => {
    doc.text(cleanText(value), x, textY, options);
  };

  const divider = (lineY: number, color = 220, width = 0.6) => {
    doc.setDrawColor(color, color, color);
    doc.setLineWidth(width);
    doc.line(margin, lineY, pageWidth - margin, lineY);
  };

  setFont("bold", 24, 15);
  text("NEURAL", margin, y);
  setFont("normal", 9, 95);
  text("Neural Commerce Pvt Ltd", margin, y + 15);
  text("Bengaluru, Karnataka, India", margin, y + 28);
  text("support@neural.shop", margin, y + 41);

  setFont("bold", 16, 15);
  text("TAX INVOICE", pageWidth - margin, y, { align: "right" });
  setFont("normal", 9, 95);
  text("Original for Recipient", pageWidth - margin, y + 15, { align: "right" });
  y += 62;
  divider(y, 25, 1);
  y += 24;

  const invoiceId = `INV-${order.id.slice(0, 8).toUpperCase()}`;
  const orderId = `#${order.id.slice(0, 8).toUpperCase()}`;
  const paymentStatus = statusLabel(order.payment_status);
  const paymentMethod = paymentMethodLabel(order.payment_method);
  const metaLeft: Array<[string, string]> = [
    ["Invoice ID", invoiceId],
    ["Order ID", orderId],
    ["Date", prettyDate(order.created_at)],
    ["Seller", "Neural Commerce Pvt Ltd"],
  ];
  const metaRight: Array<[string, string]> = [
    ["Payment", `${paymentStatus} (${paymentMethodShort(order.payment_method)})`],
    ["Payment Method", paymentMethod],
    ["Payment Status", paymentStatus],
    ["GSTIN", "Optional / Not provided"],
  ];

  const drawMetaRow = (label: string, value: string, x: number, rowY: number) => {
    setFont("bold", 9, 35);
    text(`${label}:`, x, rowY);
    setFont("normal", 9, 35);
    text(value, x + 96, rowY);
  };

  const metaStart = y;
  metaLeft.forEach(([label, value], index) => drawMetaRow(label, value, margin, metaStart + index * 16));
  metaRight.forEach(([label, value], index) => drawMetaRow(label, value, margin + 275, metaStart + index * 16));
  y = metaStart + Math.max(metaLeft.length, metaRight.length) * 16 + 18;

  doc.setFillColor(246, 247, 249);
  doc.rect(margin, y, contentWidth, 24, "F");
  setFont("bold", 10, 20);
  text("BILL TO / SHIP TO", margin + 10, y + 16);
  y += 36;

  const address = order.addresses;
  const addrStartY = y;
  const addrBlockWidth = contentWidth - 130; // reserve space for QR on the right
  setFont("bold", 10, 20);
  text(address?.recipient || "-", margin, y);
  y += 15;
  setFont("normal", 9, 60);
  const street = [address?.line1, address?.line2].filter(Boolean).map(cleanText).join(", ");
  const cityLine = [address?.city, address?.state].filter(Boolean).map(cleanText).join(", ");
  const postalLine = address?.postal_code ? `${cityLine} - ${cleanText(address.postal_code)}` : cityLine;
  [street, postalLine, address?.country || "India", address?.phone ? `Phone: ${address.phone}` : null]
    .filter(Boolean)
    .forEach((line) => {
      const wrapped = doc.splitTextToSize(cleanText(line), addrBlockWidth) as string[];
      wrapped.forEach((w) => {
        text(w, margin, y);
        y += 13;
      });
    });

  // QR code linking to Google Maps for delivery navigation
  const lat = address?.latitude;
  const lng = address?.longitude;
  const mapsQuery = lat != null && lng != null
    ? `${lat},${lng}`
    : encodeURIComponent([address?.line1, address?.city, address?.state, address?.postal_code, address?.country]
        .filter(Boolean).join(", "));
  const mapsUrl = `https://www.google.com/maps?q=${mapsQuery}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(mapsUrl, { margin: 1, width: 240 });
    const qrSize = 80;
    const qrX = pageWidth - margin - qrSize;
    const qrY = addrStartY - 4;
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    setFont("normal", 8, 90);
    text("Scan to view delivery location", qrX + qrSize / 2, qrY + qrSize + 10, { align: "center" });
    // Clickable link over the QR
    doc.link(qrX, qrY, qrSize, qrSize, { url: mapsUrl });
    setFont("normal", 8, 60);
    doc.textWithLink("Open in Google Maps", qrX + qrSize / 2, qrY + qrSize + 22, {
      url: mapsUrl,
      align: "center",
    });
  } catch {
    // QR generation is best-effort; ignore failures
  }

  y = Math.max(y, addrStartY + 96);
  y += 14;


  const tableX = margin;
  const itemW = 252;
  const qtyW = 52;
  const unitW = 104;
  const totalW = contentWidth - itemW - qtyW - unitW;
  const qtyX = tableX + itemW;
  const unitX = qtyX + qtyW;
  const totalX = unitX + unitW;
  const tableRight = pageWidth - margin;

  doc.setFillColor(18, 18, 18);
  doc.rect(tableX, y, contentWidth, 26, "F");
  setFont("bold", 9, 255);
  text("Item", tableX + 10, y + 17);
  text("Qty", qtyX + qtyW / 2, y + 17, { align: "center" });
  text("Unit Price", unitX + unitW - 10, y + 17, { align: "right" });
  text("Total", tableRight - 10, y + 17, { align: "right" });
  y += 26;

  const items = order.order_items?.length ? order.order_items : [{ title: "Order item", qty: 1, unit_price: order.subtotal }];
  items.forEach((item, index) => {
    const unitPrice = toNumber(item.unit_price);
    const lineTotal = unitPrice * item.qty;
    const itemLines = doc.splitTextToSize(cleanText(item.title), itemW - 20) as string[];
    const rowHeight = Math.max(34, itemLines.length * 13 + 16);

    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 251);
      doc.rect(tableX, y, contentWidth, rowHeight, "F");
    }

    doc.setDrawColor(226, 226, 226);
    doc.setLineWidth(0.5);
    doc.line(tableX, y + rowHeight, tableRight, y + rowHeight);

    setFont("normal", 9, 25);
    itemLines.forEach((line, lineIndex) => text(line, tableX + 10, y + 17 + lineIndex * 13));
    text(item.qty, qtyX + qtyW / 2, y + 17, { align: "center" });
    text(formatINR(unitPrice), unitX + unitW - 10, y + 17, { align: "right" });
    setFont("bold", 9, 20);
    text(formatINR(lineTotal), tableRight - 10, y + 17, { align: "right" });
    y += rowHeight;
  });

  y += 18;

  const subtotal = toNumber(order.subtotal);
  const discount = toNumber(order.discount);
  const shipping = toNumber(order.shipping);
  const tax = toNumber(order.tax);
  const total = toNumber(order.total);
  const totalsBoxW = 250;
  const totalsX = pageWidth - margin - totalsBoxW;
  const totalsLabelX = totalsX + 12;
  const totalsValueX = pageWidth - margin - 12;

  doc.setFillColor(248, 248, 249);
  doc.rect(totalsX, y - 8, totalsBoxW, discount > 0 ? 122 : 104, "F");

  const totalRow = (label: string, value: string, bold = false) => {
    setFont(bold ? "bold" : "normal", bold ? 11 : 10, 20);
    text(label, totalsLabelX, y + 8);
    text(value, totalsValueX, y + 8, { align: "right" });
    y += bold ? 24 : 18;
  };

  totalRow("Subtotal", formatINR(subtotal));
  if (discount > 0) totalRow(`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`, `- ${formatINR(discount)}`);
  totalRow("Shipping", formatINR(shipping));
  totalRow(`GST (${GST_RATE}%)`, formatINR(tax));
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.8);
  doc.line(totalsLabelX, y - 4, totalsValueX, y - 4);
  totalRow("TOTAL", formatINR(total), true);

  y += 12;
  setFont("normal", 9, 60);
  if (order.payment_ref) {
    text(`Payment Reference: ${order.payment_ref}`, margin, y);
    y += 14;
  }
  text("All amounts are in Indian Rupees (INR). E. & O.E.", margin, y);

  divider(pageHeight - 50);
  setFont("normal", 8, 135);
  text(
    "Thank you for shopping with Neural. This is a computer-generated invoice and does not require a signature.",
    pageWidth / 2,
    pageHeight - 32,
    { align: "center" },
  );
  text("Neural Commerce Pvt Ltd - support@neural.shop - neural.shop", pageWidth / 2, pageHeight - 20, {
    align: "center",
  });

  return doc;
}

export async function downloadInvoice(order: InvoiceOrder) {
  const doc = await createInvoicePdf(order);
  doc.save(`invoice-${order.id.slice(0, 8).toUpperCase()}.pdf`);
}


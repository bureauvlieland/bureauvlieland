/**
 * Native jsPDF invoice renderer for Bureau Vlieland.
 * Produces a Snelstart-style A4 invoice with crisp typography,
 * automatic pagination, repeated header on every page and a
 * full legal/payment block on the last page.
 *
 * Drawn natively with pdf.text/pdf.line/pdf.rect/pdf.addImage —
 * no html2canvas, no jsPDF.html.
 */
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import logoUrl from "@/assets/logo.png";

// ─── Page geometry ───────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 18;
const MARGIN_R = 18;
const MARGIN_T = 18;
const MARGIN_B = 22;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

// Column geometry for line-item table (mm, summing to CONTENT_W = 174)
const COL_DESC_X = MARGIN_L;
const COL_QTY_X = MARGIN_L + 110;
const COL_PRICE_X = MARGIN_L + 132;
const COL_AMOUNT_X = MARGIN_L + 174; // right-aligned end
const COL_DESC_W = 108;

// Colors (RGB tuples)
const NAVY: [number, number, number] = [30, 58, 95];
const LIGHT_BORDER: [number, number, number] = [226, 232, 240];
const TEXT_MUTED: [number, number, number] = [100, 116, 139];
const TEXT_FAINT: [number, number, number] = [148, 163, 184];
const TEXT: [number, number, number] = [26, 26, 26];

// ─── Public types ────────────────────────────────────────────
export interface InvoiceLineRow {
  /** Text in the description column. The renderer wraps it. */
  description: string;
  /** Optional second line (provider, notes, hint) shown smaller under the description. */
  subDescription?: string;
  /** Empty string renders as "—". */
  qty: string;
  /** Empty string renders as "—". */
  unitPrice: string;
  /** Suffix shown next to the unit price (e.g. "p.p." or "9%"). */
  unitPriceSuffix?: string;
  /** Total amount text, right-aligned in last column. Empty for sub-rows without total. */
  amount: string;
  /** Render the row as a sub-row (indented, smaller, lighter). */
  isSubRow?: boolean;
  /** Render bold (used for the parent line of a billing-lines group). */
  bold?: boolean;
}

export interface InvoiceCategory {
  label: string;
  rows: InvoiceLineRow[];
}

export interface InvoiceVatLine {
  rate: number;
  exclVat: number;
  vatAmount: number;
}

export interface InvoiceBureau {
  legalName: string;
  street: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  iban: string;
  kvkNumber: string;
  vatNumber: string;
}

export interface InvoiceCustomer {
  name: string;
  /** Optional contact person under the company name. */
  contactName?: string;
  street?: string;
  postalCity?: string;
  vatNumber?: string;
  /** Customer/reference number (e.g. project reference BV-2602-0006). */
  customerNumber?: string;
}

export interface InvoiceMeta {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  paymentTermDays: number;
  /** Date the service is/was delivered (event date). Optional but recommended. */
  deliveryDate?: string;
}

export interface InvoiceTotalsSummary {
  totalExclVat: number;
  totalVat: number;
  totalInclVat: number;
  vatLines: InvoiceVatLine[];
}

export interface InvoiceData {
  bureau: InvoiceBureau;
  customer: InvoiceCustomer;
  meta: InvoiceMeta;
  categories: InvoiceCategory[];
  totals: InvoiceTotalsSummary;
  /** Optional free-text notes shown above the legal block. */
  notes?: string;
}

// ─── Formatters ──────────────────────────────────────────────
const fmtEuro = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

const fmtNumber = (n: number) =>
  new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtDate = (d: Date) => format(d, "d MMMM yyyy", { locale: nl });

// ─── Logo loader (cached) ────────────────────────────────────
let cachedLogo: { dataUrl: string; w: number; h: number } | null = null;

async function loadLogo(): Promise<{ dataUrl: string; w: number; h: number } | null> {
  if (cachedLogo) return cachedLogo;
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    cachedLogo = { dataUrl, w: dims.w, h: dims.h };
    return cachedLogo;
  } catch (err) {
    console.warn("Could not load invoice logo", err);
    return null;
  }
}

// ─── Drawing helpers ─────────────────────────────────────────
function setText(pdf: jsPDF, color: [number, number, number]) {
  pdf.setTextColor(color[0], color[1], color[2]);
}
function setDraw(pdf: jsPDF, color: [number, number, number]) {
  pdf.setDrawColor(color[0], color[1], color[2]);
}
function setFill(pdf: jsPDF, color: [number, number, number]) {
  pdf.setFillColor(color[0], color[1], color[2]);
}

interface RenderState {
  page: number;
  totalPages: number; // unknown until end; updated in second pass for footer
  y: number;
}

async function renderHeader(pdf: jsPDF, data: InvoiceData, _state: RenderState) {
  const logo = await loadLogo();
  if (logo) {
    // Fit width = 32mm, preserve aspect ratio
    const targetW = 32;
    const targetH = (logo.h / logo.w) * targetW;
    pdf.addImage(logo.dataUrl, "PNG", MARGIN_L, MARGIN_T, targetW, targetH);
  }

  // Right-aligned company block
  const rightX = PAGE_W - MARGIN_R;
  let y = MARGIN_T + 4;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  setText(pdf, NAVY);
  pdf.text(data.bureau.legalName, rightX, y, { align: "right" });
  y += 4.2;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  setText(pdf, TEXT_MUTED);
  if (data.bureau.street) {
    pdf.text(data.bureau.street, rightX, y, { align: "right" });
    y += 3.6;
  }
  const postalCity = [data.bureau.postalCode, data.bureau.city].filter(Boolean).join(" ");
  if (postalCity) {
    pdf.text(postalCity, rightX, y, { align: "right" });
    y += 3.6;
  }
  if (data.bureau.phone) {
    pdf.text(data.bureau.phone, rightX, y, { align: "right" });
    y += 3.6;
  }
  if (data.bureau.email) {
    pdf.text(data.bureau.email, rightX, y, { align: "right" });
    y += 3.6;
  }
  if (data.bureau.website) {
    pdf.text(data.bureau.website, rightX, y, { align: "right" });
    y += 3.6;
  }

  // Divider line under header
  const dividerY = Math.max(MARGIN_T + 22, y + 1);
  setDraw(pdf, NAVY);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN_L, dividerY, PAGE_W - MARGIN_R, dividerY);

  return dividerY + 6;
}

async function renderInvoiceMeta(pdf: jsPDF, data: InvoiceData, startY: number): Promise<number> {
  let y = startY;

  // Title "Factuur"
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  setText(pdf, NAVY);
  pdf.text("Factuur", MARGIN_L, y);
  y += 8;

  // Two-column block: customer (left) + meta (right)
  const leftX = MARGIN_L;
  const rightLabelX = MARGIN_L + 100;
  const rightValueX = PAGE_W - MARGIN_R;

  let yLeft = y;
  let yRight = y;

  // ── Customer block (left)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  setText(pdf, TEXT_FAINT);
  pdf.text("FACTUURADRES", leftX, yLeft);
  yLeft += 4.5;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  setText(pdf, TEXT);
  pdf.text(data.customer.name, leftX, yLeft);
  yLeft += 4.5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  setText(pdf, TEXT);
  if (data.customer.contactName && data.customer.contactName !== data.customer.name) {
    pdf.text(data.customer.contactName, leftX, yLeft);
    yLeft += 4;
  }
  if (data.customer.street) {
    pdf.text(data.customer.street, leftX, yLeft);
    yLeft += 4;
  }
  if (data.customer.postalCity) {
    pdf.text(data.customer.postalCity, leftX, yLeft);
    yLeft += 4;
  }
  if (data.customer.vatNumber) {
    setText(pdf, TEXT_MUTED);
    pdf.setFontSize(8.5);
    pdf.text(`BTW-nr: ${data.customer.vatNumber}`, leftX, yLeft);
    yLeft += 4;
  }

  // ── Meta block (right) — label/value pairs
  const metaRows: Array<[string, string]> = [
    ["Factuurnummer", data.meta.invoiceNumber],
    ["Factuurdatum", fmtDate(data.meta.invoiceDate)],
    ["Vervaldatum", fmtDate(data.meta.dueDate)],
    ["Betalingstermijn", `${data.meta.paymentTermDays} dagen`],
  ];
  if (data.customer.customerNumber) {
    metaRows.push(["Klantnummer", data.customer.customerNumber]);
  }
  if (data.meta.deliveryDate) {
    metaRows.push(["Leverdatum", data.meta.deliveryDate]);
  }

  pdf.setFontSize(9.5);
  for (const [label, value] of metaRows) {
    pdf.setFont("helvetica", "normal");
    setText(pdf, TEXT_MUTED);
    pdf.text(label, rightLabelX, yRight);
    pdf.setFont("helvetica", label === "Factuurnummer" ? "bold" : "normal");
    setText(pdf, TEXT);
    pdf.text(value, rightValueX, yRight, { align: "right" });
    yRight += 4.5;
  }

  return Math.max(yLeft, yRight) + 4;
}

function renderPaymentBox(pdf: jsPDF, data: InvoiceData, startY: number): number {
  const y0 = startY;
  const boxH = 26;
  const boxW = CONTENT_W;

  setFill(pdf, [248, 250, 252]);
  setDraw(pdf, LIGHT_BORDER);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(MARGIN_L, y0, boxW, boxH, 1.5, 1.5, "FD");

  // Title strip
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  setText(pdf, NAVY);
  pdf.text("BETAALGEGEVENS", MARGIN_L + 4, y0 + 5);

  // Two-column: labels left, values right (within box)
  const labelX = MARGIN_L + 4;
  const valueX = MARGIN_L + 38;

  let y = y0 + 10;
  const rows: Array<[string, string, boolean]> = [
    ["Te betalen", `${fmtEuro(data.totals.totalInclVat)}  (vóór ${fmtDate(data.meta.dueDate)})`, true],
    ["IBAN", data.bureau.iban, false],
    ["Op naam van", data.bureau.legalName, false],
    ["Omschrijving", `Factuur ${data.meta.invoiceNumber}`, false],
  ];

  for (const [label, value, bold] of rows) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    setText(pdf, TEXT_MUTED);
    pdf.text(label, labelX, y);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    setText(pdf, bold ? NAVY : TEXT);
    pdf.text(value, valueX, y);
    y += 4.2;
  }

  return y0 + boxH + 6;
}

function renderTableHeader(pdf: jsPDF, y: number): number {
  setDraw(pdf, NAVY);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  setText(pdf, TEXT_MUTED);
  pdf.text("OMSCHRIJVING", COL_DESC_X, y + 4.5);
  pdf.text("AANTAL", COL_QTY_X + 18, y + 4.5, { align: "right" });
  pdf.text("PRIJS", COL_PRICE_X + 18, y + 4.5, { align: "right" });
  pdf.text("BEDRAG", COL_AMOUNT_X, y + 4.5, { align: "right" });

  pdf.setLineWidth(0.2);
  pdf.line(MARGIN_L, y + 6, PAGE_W - MARGIN_R, y + 6);

  return y + 9;
}

/** Estimate row height in mm before drawing (so we know if a page break is needed). */
function estimateRowHeight(pdf: jsPDF, row: InvoiceLineRow): number {
  const baseFont = row.isSubRow ? 8.5 : 9.5;
  pdf.setFontSize(baseFont);
  const descLines = pdf.splitTextToSize(row.description, COL_DESC_W - (row.isSubRow ? 6 : 0));
  const subLines = row.subDescription
    ? pdf.splitTextToSize(row.subDescription, COL_DESC_W).length
    : 0;
  const lineH = row.isSubRow ? 3.4 : 4;
  return Math.max(5, descLines.length * lineH + subLines * 3.2 + 1.5);
}

function renderRow(pdf: jsPDF, row: InvoiceLineRow, y: number): number {
  const baseFont = row.isSubRow ? 8.5 : 9.5;
  const descX = row.isSubRow ? COL_DESC_X + 6 : COL_DESC_X;
  const descW = COL_DESC_W - (row.isSubRow ? 6 : 0);
  const lineH = row.isSubRow ? 3.4 : 4;

  pdf.setFontSize(baseFont);
  pdf.setFont("helvetica", row.bold ? "bold" : "normal");
  setText(pdf, row.isSubRow ? TEXT_MUTED : TEXT);

  const descLines = pdf.splitTextToSize(row.description, descW) as string[];
  let yCursor = y + lineH;
  for (const ln of descLines) {
    pdf.text(ln, descX, yCursor);
    yCursor += lineH;
  }

  if (row.subDescription) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    setText(pdf, TEXT_FAINT);
    pdf.text(row.subDescription, descX, yCursor);
    yCursor += 3.2;
  }

  // Right-side cells aligned to the first description line (top of row)
  const valueY = y + lineH;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(baseFont);
  setText(pdf, row.isSubRow ? TEXT_MUTED : TEXT);

  pdf.text(row.qty || "—", COL_QTY_X + 18, valueY, { align: "right" });

  const priceText = row.unitPrice || "—";
  pdf.text(priceText, COL_PRICE_X + 18, valueY, { align: "right" });
  if (row.unitPriceSuffix) {
    pdf.setFontSize(6.5);
    setText(pdf, TEXT_FAINT);
    pdf.text(row.unitPriceSuffix, COL_PRICE_X + 19, valueY, { align: "left" });
  }

  pdf.setFont("helvetica", row.bold ? "bold" : row.isSubRow ? "normal" : "normal");
  pdf.setFontSize(baseFont);
  setText(pdf, TEXT);
  if (row.amount) {
    pdf.text(row.amount, COL_AMOUNT_X, valueY, { align: "right" });
  }

  // Bottom separator
  setDraw(pdf, [241, 245, 249]);
  pdf.setLineWidth(0.1);
  const rowBottom = Math.max(yCursor, valueY + 1.5);
  pdf.line(MARGIN_L, rowBottom, PAGE_W - MARGIN_R, rowBottom);

  return rowBottom + 0.5;
}

function renderCategoryHeader(pdf: jsPDF, label: string, y: number): number {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  setText(pdf, TEXT_MUTED);
  pdf.text(label.toUpperCase(), COL_DESC_X, y + 4);
  setDraw(pdf, LIGHT_BORDER);
  pdf.setLineWidth(0.2);
  pdf.line(MARGIN_L, y + 5.5, PAGE_W - MARGIN_R, y + 5.5);
  return y + 7.5;
}

function renderTotalsBlock(pdf: jsPDF, data: InvoiceData, startY: number): number {
  const y0 = startY + 2;

  // Snelstart-style: left = VAT breakdown, right = totals
  // Left column: Btw% | Grondslag | Bedrag
  const leftCol1 = MARGIN_L;
  const leftCol2 = MARGIN_L + 22;
  const leftCol3 = MARGIN_L + 50;
  const leftHeaderY = y0;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  setText(pdf, TEXT_MUTED);
  pdf.text("BTW %", leftCol1, leftHeaderY);
  pdf.text("GRONDSLAG", leftCol2 + 22, leftHeaderY, { align: "right" });
  pdf.text("BEDRAG", leftCol3 + 22, leftHeaderY, { align: "right" });

  setDraw(pdf, LIGHT_BORDER);
  pdf.setLineWidth(0.2);
  pdf.line(MARGIN_L, leftHeaderY + 1.5, MARGIN_L + 80, leftHeaderY + 1.5);

  let yL = leftHeaderY + 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  setText(pdf, TEXT);
  for (const line of data.totals.vatLines) {
    pdf.text(fmtNumber(line.rate), leftCol1, yL);
    pdf.text(fmtNumber(line.exclVat), leftCol2 + 22, yL, { align: "right" });
    pdf.text(fmtNumber(line.vatAmount), leftCol3 + 22, yL, { align: "right" });
    yL += 4.5;
  }

  // Right column: Totaal excl./btw/te betalen
  const rightLabelX = MARGIN_L + 95;
  const rightValueX = PAGE_W - MARGIN_R;
  let yR = leftHeaderY;

  const totalsRows: Array<[string, string, boolean]> = [
    ["Totaal excl. btw", fmtEuro(data.totals.totalExclVat), false],
    ["Totaal btw", fmtEuro(data.totals.totalVat), false],
    ["Te betalen", fmtEuro(data.totals.totalInclVat), true],
  ];

  pdf.setFontSize(9.5);
  for (const [label, value, bold] of totalsRows) {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    setText(pdf, bold ? NAVY : TEXT);
    pdf.text(label, rightLabelX, yR);
    pdf.text(value, rightValueX, yR, { align: "right" });
    if (bold) {
      // Underline
      setDraw(pdf, NAVY);
      pdf.setLineWidth(0.4);
      pdf.line(rightLabelX, yR + 1.5, rightValueX, yR + 1.5);
    }
    yR += bold ? 6 : 4.5;
  }

  return Math.max(yL, yR) + 5;
}

function renderLegalBlock(pdf: jsPDF, data: InvoiceData, startY: number): number {
  let y = startY;

  // Notes (if any)
  if (data.notes) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    setText(pdf, TEXT_MUTED);
    pdf.text("OPMERKINGEN", MARGIN_L, y);
    y += 4;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    setText(pdf, TEXT);
    const noteLines = pdf.splitTextToSize(data.notes, CONTENT_W) as string[];
    for (const ln of noteLines) {
      pdf.text(ln, MARGIN_L, y);
      y += 3.8;
    }
    y += 3;
  }

  // Payment terms text
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  setText(pdf, TEXT_MUTED);
  const termsText = `Voorwaarden: betaling binnen ${data.meta.paymentTermDays} dagen na factuurdatum onder vermelding van factuurnummer ${data.meta.invoiceNumber}. Op deze factuur zijn onze algemene voorwaarden van toepassing (${data.bureau.website}/voorwaarden).`;
  const wrapped = pdf.splitTextToSize(termsText, CONTENT_W) as string[];
  for (const ln of wrapped) {
    pdf.text(ln, MARGIN_L, y);
    y += 3.6;
  }
  y += 2;

  // Legal info line (centered)
  setDraw(pdf, LIGHT_BORDER);
  pdf.setLineWidth(0.2);
  pdf.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
  y += 4;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  setText(pdf, NAVY);
  const parts = [
    data.bureau.legalName,
    data.bureau.iban ? `IBAN ${data.bureau.iban}` : "",
    data.bureau.vatNumber ? `BTW ${data.bureau.vatNumber}` : "",
    data.bureau.kvkNumber ? `KvK ${data.bureau.kvkNumber}` : "",
  ].filter(Boolean);
  pdf.text(parts.join("   •   "), PAGE_W / 2, y, { align: "center" });

  return y + 4;
}

function renderFooter(pdf: jsPDF, data: InvoiceData, page: number, totalPages: number) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  setText(pdf, TEXT_FAINT);
  const parts = [
    `Pagina ${page} / ${totalPages}`,
    data.bureau.legalName,
    data.bureau.website,
  ].filter(Boolean);
  pdf.text(parts.join("   •   "), PAGE_W / 2, PAGE_H - 10, { align: "center" });
}

// ─── Main entry ──────────────────────────────────────────────
export async function renderInvoicePdf(data: InvoiceData): Promise<Blob> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const state: RenderState = { page: 1, totalPages: 1, y: 0 };

  // Page 1: full header (with logo + meta + payment box)
  state.y = await renderHeader(pdf, data, state);
  state.y = await renderInvoiceMeta(pdf, data, state.y);
  state.y = renderPaymentBox(pdf, data, state.y);

  // Table header
  state.y = renderTableHeader(pdf, state.y);

  // Pagination loop over rows
  const drawCategoryHeader = (label: string) => {
    // Reserve room for header + at least 1 row
    if (state.y + 18 > PAGE_H - MARGIN_B) {
      addContinuationPage();
    }
    state.y = renderCategoryHeader(pdf, label, state.y);
  };

  const addContinuationPage = async () => {
    // footer for page being closed
    renderFooter(pdf, data, state.page, 999); // placeholder; final pass updates
    pdf.addPage();
    state.page += 1;
    // Compact header on continuation pages: logo + bureau name top-right + line
    const logo = await loadLogo();
    if (logo) {
      const targetW = 22;
      const targetH = (logo.h / logo.w) * targetW;
      pdf.addImage(logo.dataUrl, "PNG", MARGIN_L, MARGIN_T, targetW, targetH);
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    setText(pdf, NAVY);
    pdf.text(data.bureau.legalName, PAGE_W - MARGIN_R, MARGIN_T + 4, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    setText(pdf, TEXT_MUTED);
    pdf.text(
      `Factuur ${data.meta.invoiceNumber}  •  ${data.customer.name}`,
      PAGE_W - MARGIN_R,
      MARGIN_T + 8.5,
      { align: "right" },
    );

    setDraw(pdf, NAVY);
    pdf.setLineWidth(0.5);
    pdf.line(MARGIN_L, MARGIN_T + 16, PAGE_W - MARGIN_R, MARGIN_T + 16);
    state.y = MARGIN_T + 22;
    state.y = renderTableHeader(pdf, state.y);
  };

  for (const cat of data.categories) {
    if (cat.rows.length === 0) continue;
    drawCategoryHeader(cat.label);
    for (const row of cat.rows) {
      const h = estimateRowHeight(pdf, row);
      if (state.y + h > PAGE_H - MARGIN_B) {
        // close page, open new one
        // need await but we're inside a sync for loop — switch to async inline
        await addContinuationPage();
      }
      state.y = renderRow(pdf, row, state.y);
    }
  }

  // Reserve space for totals + legal block (~ 70mm). If not enough, new page.
  const reservedForFooterBlock = 80;
  if (state.y + reservedForFooterBlock > PAGE_H - MARGIN_B) {
    await addContinuationPage();
  }

  state.y += 4;
  state.y = renderTotalsBlock(pdf, data, state.y);
  state.y = renderLegalBlock(pdf, data, state.y);

  // ── Final pass: write footer with correct totalPages on every page
  const totalPages = (pdf as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    // Clear the placeholder footer area by drawing white over it, then redraw
    setFill(pdf, [255, 255, 255]);
    pdf.rect(0, PAGE_H - 14, PAGE_W, 14, "F");
    renderFooter(pdf, data, p, totalPages);
  }

  return pdf.output("blob");
}

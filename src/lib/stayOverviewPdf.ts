import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import logoUrl from "@/assets/logo.png";
import type { AccommodationQuote, AccommodationRequest } from "@/types/accommodation";

const PAGE_W = 210;
const PAGE_H = 297;
const ML = 18;
const MR = 18;
const MT = 18;
const MB = 18;
const CW = PAGE_W - ML - MR;

const NAVY: [number, number, number] = [30, 58, 95];
const TEXT: [number, number, number] = [26, 26, 26];
const MUTED: [number, number, number] = [100, 116, 139];
const BORDER: [number, number, number] = [226, 232, 240];

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateStayOverviewPdf(
  request: AccommodationRequest,
  quote: AccommodationQuote,
  customerName?: string | null
): Promise<void> {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  let y = MT;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - MB) {
      pdf.addPage();
      y = MT;
    }
  };

  // Logo
  try {
    const logo = await loadImage(logoUrl);
    const ratio = logo.width / logo.height;
    const h = 12;
    const w = h * ratio;
    pdf.addImage(logo, "PNG", ML, y, w, h);
  } catch {
    /* ignore */
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text("BUREAU VLIELAND", PAGE_W - MR, y + 4, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.text("info@bureauvlieland.nl", PAGE_W - MR, y + 9, { align: "right" });

  y += 22;

  // Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(...NAVY);
  pdf.text("Verblijfsoverzicht", ML, y);
  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...MUTED);
  if (customerName) {
    pdf.text(`Voor ${customerName}`, ML, y);
    y += 5;
  }
  pdf.text(`Gegenereerd op ${format(new Date(), "d MMMM yyyy", { locale: nl })}`, ML, y);
  y += 8;

  // Hotel block
  pdf.setDrawColor(...BORDER);
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(ML, y, CW, 30, 2, 2, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(...TEXT);
  pdf.text(quote.accommodation_name, ML + 5, y + 8);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...MUTED);
  if (quote.partner?.name) {
    pdf.text(quote.partner.name, ML + 5, y + 14);
  }

  // Dates / guests
  const arrival = format(new Date(request.arrival_date), "EEE d MMM yyyy", { locale: nl });
  const departure = format(new Date(request.departure_date), "EEE d MMM yyyy", { locale: nl });
  pdf.setTextColor(...TEXT);
  pdf.text(`Aankomst: ${arrival}`, ML + 5, y + 22);
  pdf.text(`Vertrek: ${departure}`, ML + 70, y + 22);
  pdf.text(`Gasten: ${request.number_of_guests}`, ML + 130, y + 22);
  y += 36;

  const section = (title: string) => {
    ensureSpace(12);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...NAVY);
    pdf.text(title, ML, y);
    y += 2;
    pdf.setDrawColor(...BORDER);
    pdf.line(ML, y, PAGE_W - MR, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...TEXT);
  };

  const writeWrapped = (text: string, x = ML, width = CW) => {
    const lines = pdf.splitTextToSize(text, width) as string[];
    for (const line of lines) {
      ensureSpace(5);
      pdf.text(line, x, y);
      y += 5;
    }
  };

  // Contact
  const partner = quote.partner;
  if (partner) {
    section("Contact accommodatie");
    const phone = partner.booking_contact_phone || partner.phone;
    const email = partner.contact_email || partner.email;
    if (partner.booking_contact_name) writeWrapped(`Contactpersoon: ${partner.booking_contact_name}`);
    if (phone) writeWrapped(`Telefoon: ${phone}`);
    if (email) writeWrapped(`E-mail: ${email}`);
    if (partner.website_url) writeWrapped(`Website: ${partner.website_url}`);
    y += 3;

    if (partner.address_street || partner.address_city) {
      section("Adres");
      if (partner.address_street) writeWrapped(partner.address_street);
      const cityLine = [partner.address_postal, partner.address_city].filter(Boolean).join(" ");
      if (cityLine) writeWrapped(cityLine);
      y += 3;
    }

    if (partner.location_description) {
      section("Locatie");
      writeWrapped(partner.location_description);
      y += 3;
    }

    if (partner.highlight_features && partner.highlight_features.length > 0) {
      section("Highlights");
      for (const f of partner.highlight_features) writeWrapped(`• ${f}`);
      y += 3;
    }

    if (partner.about_text) {
      section("Over de accommodatie");
      writeWrapped(partner.about_text);
      y += 3;
    }
  }

  if (quote.description) {
    section("Beschrijving");
    writeWrapped(quote.description);
    y += 3;
  }

  if (quote.includes && quote.includes.length > 0) {
    section("Inbegrepen");
    for (const item of quote.includes) writeWrapped(`• ${item}`);
    y += 3;
  }

  if (quote.partner_notes) {
    section("Toelichting van de accommodatie");
    writeWrapped(quote.partner_notes);
    y += 3;
  }

  if (quote.conditions) {
    section("Voorwaarden");
    writeWrapped(quote.conditions);
    y += 3;
  }

  // Price summary
  ensureSpace(20);
  section("Prijs");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(...TEXT);
  const total = `€ ${quote.price_total.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  pdf.text(`Totaal: ${total} ${quote.price_includes_vat ? "incl." : "excl."} BTW`, ML, y);
  y += 6;
  if (quote.price_per_person_per_night) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...MUTED);
    const pppn = `€ ${quote.price_per_person_per_night.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    pdf.text(`${pppn} per persoon per nacht`, ML, y);
    y += 5;
  }

  // Page footers
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...MUTED);
    pdf.text(
      `Bureau Vlieland · Pagina ${i} van ${pageCount}`,
      PAGE_W / 2,
      PAGE_H - 8,
      { align: "center" }
    );
  }

  const safeName = quote.accommodation_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  pdf.save(`verblijfsoverzicht-${safeName}.pdf`);
}

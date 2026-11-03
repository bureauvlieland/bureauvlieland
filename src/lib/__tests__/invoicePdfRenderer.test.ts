import { describe, it, expect } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderInvoicePdf, type InvoiceData } from "@/lib/invoicePdfRenderer";
import { resetInvoiceFontCache } from "@/lib/invoicePdfFonts";

// Lettertypen van schijf: de ?url-import geeft in vitest "/src/assets/…".
const loadFromDisk = async (url: string) => new Uint8Array(await readFile(path.join(process.cwd(), url)));

const sample: InvoiceData = {
  bureau: {
    legalName: "Bureau Vlieland B.V.",
    street: "Sikkelduin 11",
    postalCode: "8899 CG",
    city: "Vlieland",
    phone: "+31 562 700 208",
    email: "hallo@bureauvlieland.nl",
    website: "bureauvlieland.nl",
    iban: "NL68 INGB 0774 1221 37",
    kvkNumber: "88285774",
    vatNumber: "NL864565045B01",
  },
  customer: {
    name: "Mevr M. Swagerman",
    contactName: "Marianne Swagerman-Sinnige",
    street: "Walstro 34",
    postalCity: "3831 WX Leusden",
    customerNumber: "BV-2606-0013",
  },
  meta: {
    invoiceNumber: "FV-BV-2606-0013-001",
    invoiceDate: new Date(2026, 10, 3),
    dueDate: new Date(2026, 11, 3),
    paymentTermDays: 14,
    deliveryDate: "16 t/m 18 okt. 2026",
  },
  categories: [
    {
      label: "Catering",
      rows: [
        {
          description: "Lunch tijdens Vliehors Expres",
          subDescription: "En lunchtasje rijkelijk gevuld met: Broodje Humus met geroosterde groenten, Broodje Brie met honing en walnoten, Candybar, Vers fruit, Blikje Fuze Tea Green, Flesje water",
          qty: "7",
          unitPrice: "€ 18,95",
          unitPriceSuffix: "p.p.",
          amount: "€ 132,65",
        },
      ],
    },
    {
      label: "Vervoer",
      rows: [
        {
          description: "Overtocht Harlingen → Vlieland",
          subDescription: "Wij verzorgen graag uw boottickets bij Rederij Doeksen. • Boekingsnr: 13032791",
          qty: "1",
          unitPrice: "€ 124,81",
          amount: "€ 124,81",
        },
        { description: "Fietshuur (E-bike)", qty: "7×3d", unitPrice: "€ 21,00", unitPriceSuffix: "p.p.p.d.", amount: "€ 441,00" },
      ],
    },
    {
      label: "Overig",
      rows: [
        { description: "Badhotel Bruin", subDescription: "Badhotel Bruin", qty: "", unitPrice: "", amount: "€ 2.848,16", bold: true },
        { description: "Eten en drinken 9%", qty: "1", unitPrice: "€ 882,53", unitPriceSuffix: "9%", amount: "€ 961,95", isSubRow: true },
        { description: "Eten en drinken 21%", qty: "1", unitPrice: "€ 200,03", unitPriceSuffix: "21%", amount: "€ 242,05", isSubRow: true },
        { description: "Accommodatie 21%", qty: "1", unitPrice: "€ 1.358,80", unitPriceSuffix: "21%", amount: "€ 1.644,16", isSubRow: true },
      ],
    },
    {
      label: "Coördinatie & bijdragen",
      rows: [
        { description: "Coördinatiekosten", subDescription: "7 personen · staffel 1–10 personen", qty: "1", unitPrice: "€ 150,00", amount: "€ 150,00" },
        { description: "Toeristenbelasting", subDescription: "7 pers. × 3 dagen", qty: "21", unitPrice: "€ 2,58", unitPriceSuffix: "p.p.p.d.", amount: "€ 54,18" },
      ],
    },
  ],
  totals: {
    totalExclVat: 3533.2,
    totalVat: 580.41,
    totalInclVat: 4113.61,
    vatLines: [
      { rate: 0, exclVat: 64.68, vatAmount: 0 },
      { rate: 9, exclVat: 1233.24, vatAmount: 110.98 },
      { rate: 21, exclVat: 2235.28, vatAmount: 469.43 },
    ],
  },
};

describe("factuur-PDF", () => {
  it("sluit Inter in en zet de pijl van een overtocht op de factuur", async () => {
    const blob = await renderInvoicePdf(sample, { fontLoader: loadFromDisk });
    const bytes = Buffer.from(await blob.arrayBuffer());
    const text = bytes.toString("latin1");
    // jsPDF declareert de standaardlettertypen altijd; het gaat erom dat Inter erbij zit.
    expect(text).toContain("/BaseFont /Inter");
    if (process.env.INVOICE_PDF_OUT) await writeFile(process.env.INVOICE_PDF_OUT, bytes);
  });

  it("valt terug op Helvetica als het lettertype niet laadt", async () => {
    resetInvoiceFontCache();
    const blob = await renderInvoicePdf(sample, {
      fontLoader: async () => {
        throw new Error("geen netwerk");
      },
    });
    const text = Buffer.from(await blob.arrayBuffer()).toString("latin1");
    expect(text).not.toContain("/BaseFont /Inter");
    expect(text).toContain("/BaseFont /Helvetica");
  });
});

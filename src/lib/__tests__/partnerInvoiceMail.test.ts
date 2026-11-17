import { describe, it, expect } from "vitest";
import { buildInvoiceMailto, formatInvoiceMailDates, invoiceMailBody, invoiceMailSubject } from "@/lib/partnerInvoiceMail";
import { formatEuro } from "@/lib/formatEuro";

const base = {
  partnerName: "Café Boven",
  referenceNumber: "BV-2606-0004",
  customerLabel: "Nancy van Randen",
  dates: ["2026-11-06", "2026-11-05"],
  billedTo: "bureau" as const,
  lines: [
    { name: "Pizza & Borrel", amountInclVat: 735 },
    { name: "Borrel", amountInclVat: null },
  ],
};

describe("Factuur mailen", () => {
  it("zet ons referentienummer in het onderwerp", () => {
    expect(invoiceMailSubject(base)).toBe("Factuur Café Boven voor BV-2606-0004");
    expect(invoiceMailSubject({ ...base, referenceNumber: null })).toBe("Factuur Café Boven voor Nancy van Randen");
  });

  it("noemt referentie, programma met datums, aan wie gericht en de onderdelen", () => {
    const body = invoiceMailBody(base);
    expect(body).toContain("- Referentie: BV-2606-0004");
    expect(body).toContain("- Programma: Nancy van Randen, 5 november 2026 tot 6 november 2026");
    expect(body).toContain("- Gericht aan Bureau Vlieland");
    expect(body).toContain(`- Pizza & Borrel (prijsopgave ${formatEuro(735)} incl. btw)`);
    expect(body).toContain("- Borrel\n");
    expect(body).not.toContain("btw-tarief");
  });

  it("vraagt om de vermelding 'betaald door de gast' bij een factuur aan de gast", () => {
    expect(invoiceMailBody({ ...base, billedTo: "customer", kind: "accommodation" })).toContain("- Betaald door de gast (alleen commissie)");
    expect(invoiceMailBody({ ...base, kind: "accommodation" })).toContain("- Verblijf: Nancy van Randen");
  });

  it("bouwt een mailto naar de inkoop-inbox zonder plustekens voor spaties", () => {
    const href = buildInvoiceMailto(base);
    expect(href.startsWith("mailto:invoices@reply.bureauvlieland.nl?subject=")).toBe(true);
    expect(href).not.toContain("+");
    const url = new URL(href);
    expect(url.searchParams.get("subject")).toBe("Factuur Café Boven voor BV-2606-0004");
    expect(url.searchParams.get("body")).toContain("BV-2606-0004");
  });

  it("formatteert één of meer datums", () => {
    expect(formatInvoiceMailDates([])).toBeNull();
    expect(formatInvoiceMailDates(["2026-07-02"])).toBe("2 juli 2026");
    expect(formatInvoiceMailDates(["2026-07-04", "2026-07-02", "2026-07-02"])).toBe("2 juli 2026 tot 4 juli 2026");
  });
});

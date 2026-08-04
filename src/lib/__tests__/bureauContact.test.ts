import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PURCHASE_INVOICE_INBOX, GENERAL_CONTACT_EMAIL } from "../bureauContact";

/**
 * Partners mogen maar één factuuradres zien. Oude adressen (inkoop@ / administratie@)
 * mogen niet terugkomen in partner-gerichte teksten.
 */
const PARTNER_FACING_FILES = [
  "src/pages/PartnerFinance.tsx",
  "src/pages/PartnerGuides.tsx",
  "src/components/partner-portal/InvoiceRegistrationDialog.tsx",
  "src/components/partner-portal/RegisterCollectivePartnerInvoiceDialog.tsx",
  "src/components/partner-portal/PartnerAccommodationQuoteSheet.tsx",
  "src/components/partner-portal/PartnerAccommodationRequestCard.tsx",
  "supabase/functions/send-items-to-partners/index.ts",
  "supabase/functions/accept-quote-proposal/index.ts",
  "supabase/functions/register-partner-invoice/index.ts",
  "supabase/functions/update-customer-program/index.ts",
];

describe("bureau contact adressen", () => {
  it("gebruikt invoices@reply.bureauvlieland.nl als inkoopfactuur-inbox", () => {
    expect(PURCHASE_INVOICE_INBOX).toBe("invoices@reply.bureauvlieland.nl");
    expect(GENERAL_CONTACT_EMAIL).toBe("hallo@bureauvlieland.nl");
  });

  it.each(PARTNER_FACING_FILES)("%s noemt geen oude factuuradressen", (file) => {
    const content = readFileSync(file, "utf8");
    expect(content).not.toContain("inkoop@reply.bureauvlieland.nl");
    expect(content).not.toContain("administratie@bureauvlieland.nl");
  });
});

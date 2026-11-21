/**
 * "Akkoord en ondertekenen" is één klik (CustomerProgram.handleAcceptTerms):
 * eerst acceptTerms (→ update-customer-program → booking_confirmed_customer),
 * daarna acceptQuoteProposal (→ accept-quote-proposal). Zonder de vlag kreeg de
 * klant twee bevestigingsmails (audit notificaties, fase 1). Deze contracttest
 * bewaakt dat de frontend de vlag meegeeft en de edge function hem kent.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("akkoord en ondertekenen: één klantmail", () => {
  const hook = read("src/hooks/useCustomerProgram.ts");
  const page = read("src/pages/CustomerProgram.tsx");
  const fn = read("supabase/functions/accept-quote-proposal/index.ts");

  it("CustomerProgram geeft signedInSameStep mee na een geslaagde handtekening", () => {
    const sign = page.indexOf("await acceptTerms(signatureName, underReservation)");
    const accept = page.indexOf("acceptQuoteProposal({ signedInSameStep: true })");
    expect(sign).toBeGreaterThan(-1);
    expect(accept).toBeGreaterThan(sign);
  });

  it("useCustomerProgram vertaalt signedInSameStep naar body-vlag skipCustomerEmail", () => {
    expect(hook).toMatch(/options\?\.signedInSameStep \? \{ skipCustomerEmail: true \}/);
    // De vlag gaat alleen mee als hij gevraagd is: het losse akkoord via de
    // programmakaart (zonder handtekening) stuurt de klantmail nog gewoon.
    expect(hook).not.toMatch(/skipCustomerEmail: true,\s*\n/);
  });

  it("accept-quote-proposal accepteert skipCustomerEmail en slaat alleen de klantmail over", () => {
    expect(fn).toMatch(/skipCustomerEmail: z\.boolean\(\)\.optional\(\)/);
    const skip = fn.indexOf("if (skipCustomerEmail) {");
    const customerMail = fn.indexOf('email_type: "quote_accepted_customer"');
    const partnerTodo = fn.indexOf('auto_type: "send_items_to_partners"');
    expect(skip).toBeGreaterThan(-1);
    // De klantmail zit in de else-tak ná de vlag; de taak voor het bureau erbuiten, erna.
    expect(customerMail).toBeGreaterThan(skip);
    expect(partnerTodo).toBeGreaterThan(customerMail);
  });
});

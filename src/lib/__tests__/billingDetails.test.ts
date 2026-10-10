import { describe, expect, it } from "vitest";
import {
  EMPTY_BILLING_DETAILS,
  billingCountryRules,
  formatBillingAddress,
  isBillingComplete,
  normalizeBillingDetails,
  validateBillingDetails,
  type BillingDetails,
} from "@/lib/billingDetails";

const complete = (overrides: Partial<BillingDetails> = {}): BillingDetails => ({
  ...EMPTY_BILLING_DETAILS,
  billing_company_name: "Acme B.V.",
  billing_address_street: "Hoofdstraat 1",
  billing_address_postal: "8899 AB",
  billing_address_city: "Vlieland",
  billing_contact_name: "Jan de Vries",
  ...overrides,
});

describe("compleet", () => {
  it("bedrijf, adres en contactpersoon zijn genoeg; nummers en e-mail niet verplicht", () => {
    expect(isBillingComplete(complete())).toBe(true);
    expect(isBillingComplete(complete({ billing_contact_name: " " }))).toBe(false);
    expect(isBillingComplete({ billing_company_name: "Acme" })).toBe(false);
  });
});

describe("validatie per land", () => {
  it("Nederland: postcode 1234 AB, KvK 8 cijfers, btw NL…B01", () => {
    expect(validateBillingDetails(complete())).toEqual({});
    expect(validateBillingDetails(complete({ billing_address_postal: "1000" })).billing_address_postal).toMatch(/4 cijfers en 2 letters/);
    expect(validateBillingDetails(complete({ billing_kvk_number: "1234" })).billing_kvk_number).toMatch(/8 cijfers/);
    expect(validateBillingDetails(complete({ billing_vat_number: "BE0123456789" })).billing_vat_number).toMatch(/NL123456789B01/);
    expect(validateBillingDetails(complete({ billing_kvk_number: "12345678", billing_vat_number: "nl123456789b01" }))).toEqual({});
  });

  it("België en Duitsland: eigen postcode en btw-vorm, geen KvK-regel", () => {
    const be = complete({ billing_country: "BE", billing_address_postal: "1000", billing_vat_number: "BE0123456789", billing_kvk_number: "0123.456.789" });
    expect(validateBillingDetails(be)).toEqual({});
    expect(validateBillingDetails({ ...be, billing_address_postal: "8899 AB" }).billing_address_postal).toMatch(/Belgische postcode/);
    const de = complete({ billing_country: "DE", billing_address_postal: "10115", billing_vat_number: "DE123456789", billing_kvk_number: "HRB 12345" });
    expect(validateBillingDetails(de)).toEqual({});
    expect(validateBillingDetails({ ...de, billing_vat_number: "NL123456789B01" }).billing_vat_number).toMatch(/DE123456789/);
  });

  it("een ander land: alleen de verplichte velden en een geldig e-mailadres", () => {
    const other = complete({ billing_country: "XX", billing_address_postal: "A-1", billing_vat_number: "whatever", billing_kvk_number: "x" });
    expect(validateBillingDetails(other)).toEqual({});
    expect(validateBillingDetails({ ...other, billing_contact_email: "geen-mail" }).billing_contact_email).toBeDefined();
    expect(billingCountryRules("XX").registryLabel).toBe("Registratienummer");
  });

  it("lege verplichte velden geven elk een eigen melding", () => {
    const errors = validateBillingDetails(EMPTY_BILLING_DETAILS);
    expect(Object.keys(errors).sort()).toEqual([
      "billing_address_city",
      "billing_address_postal",
      "billing_address_street",
      "billing_company_name",
      "billing_contact_name",
    ]);
  });
});

describe("normaliseren en adres", () => {
  it("maakt nummers hoofdletters, zet de spatie in een Nederlandse postcode en knipt spaties", () => {
    const n = normalizeBillingDetails(complete({ billing_address_postal: "8899ab", billing_vat_number: " nl 123456789 b01 ", billing_company_name: " Acme " }));
    expect(n.billing_address_postal).toBe("8899 AB");
    expect(n.billing_vat_number).toBe("NL123456789B01");
    expect(n.billing_company_name).toBe("Acme");
    expect(n.billing_country).toBe("NL");
  });

  it("het land staat alleen in het adres als het niet Nederland is", () => {
    expect(formatBillingAddress(complete())).toBe("Hoofdstraat 1, 8899 AB Vlieland");
    expect(formatBillingAddress(complete({ billing_country: "BE", billing_address_postal: "1000", billing_address_city: "Brussel" }))).toBe(
      "Hoofdstraat 1, 1000 Brussel, België",
    );
  });
});

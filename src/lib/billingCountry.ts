/**
 * Facturatiegegevens per land (klantportaal fase 3). Het land stuurt de
 * labels en de controle van postcode, btw-nummer en registratienummer, zodat
 * een Belgische of Duitse klant zijn gegevens kan opslaan en ondertekenen.
 */
export interface BillingDetails {
  billing_company_name: string;
  billing_country: string;
  billing_kvk_number: string;
  billing_vat_number: string;
  billing_address_street: string;
  billing_address_postal: string;
  billing_address_city: string;
  billing_contact_name: string;
  billing_contact_email: string;
  billing_reference: string;
}

export const EMPTY_BILLING_DETAILS: BillingDetails = {
  billing_company_name: "",
  billing_country: "NL",
  billing_kvk_number: "",
  billing_vat_number: "",
  billing_address_street: "",
  billing_address_postal: "",
  billing_address_city: "",
  billing_contact_name: "",
  billing_contact_email: "",
  billing_reference: "",
};

export const BILLING_COUNTRIES = [
  { code: "NL", label: "Nederland" },
  { code: "BE", label: "België" },
  { code: "DE", label: "Duitsland" },
  { code: "LU", label: "Luxemburg" },
  { code: "FR", label: "Frankrijk" },
  { code: "GB", label: "Verenigd Koninkrijk" },
  { code: "XX", label: "Ander land" },
] as const;

export type BillingCountryCode = (typeof BILLING_COUNTRIES)[number]["code"];

export const billingCountryLabel = (code: string | null | undefined): string =>
  BILLING_COUNTRIES.find((c) => c.code === (code || "NL"))?.label ?? code ?? "";

export interface BillingCountryRules {
  postal: RegExp | null;
  postalExample: string;
  vat: RegExp | null;
  vatExample: string;
  /** Het handelsregister van het land; null als er geen vast nummer is. */
  registry: { label: string; pattern: RegExp | null; example: string };
}

export const billingCountryRules = (code: string | null | undefined): BillingCountryRules => {
  switch (code || "NL") {
    case "NL":
      return {
        postal: /^\d{4}\s?[A-Z]{2}$/i,
        postalExample: "1234 AB",
        vat: /^NL\d{9}B\d{2}$/i,
        vatExample: "NL123456789B01",
        registry: { label: "KvK-nummer", pattern: /^\d{8}$/, example: "12345678" },
      };
    case "BE":
      return {
        postal: /^\d{4}$/,
        postalExample: "1000",
        vat: /^BE[01]\d{9}$/i,
        vatExample: "BE0123456789",
        registry: { label: "Ondernemingsnummer", pattern: /^\d{4}\.?\d{3}\.?\d{3}$/, example: "0123.456.789" },
      };
    case "DE":
      return {
        postal: /^\d{5}$/,
        postalExample: "10115",
        vat: /^DE\d{9}$/i,
        vatExample: "DE123456789",
        registry: { label: "Handelsregisternummer", pattern: null, example: "HRB 12345" },
      };
    case "LU":
      return {
        postal: /^(L-)?\d{4}$/i,
        postalExample: "L-1234",
        vat: /^LU\d{8}$/i,
        vatExample: "LU12345678",
        registry: { label: "Registratienummer", pattern: null, example: "B123456" },
      };
    case "FR":
      return {
        postal: /^\d{5}$/,
        postalExample: "75001",
        vat: /^FR[A-Z0-9]{2}\d{9}$/i,
        vatExample: "FR12345678901",
        registry: { label: "SIRET", pattern: /^\d{14}$/, example: "12345678901234" },
      };
    case "GB":
      return {
        postal: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
        postalExample: "SW1A 1AA",
        vat: /^GB\d{9}(\d{3})?$/i,
        vatExample: "GB123456789",
        registry: { label: "Company number", pattern: null, example: "01234567" },
      };
    default:
      return {
        postal: null,
        postalExample: "",
        vat: null,
        vatExample: "",
        registry: { label: "Registratienummer", pattern: null, example: "" },
      };
  }
};

export type BillingErrors = Partial<Record<keyof BillingDetails, string>>;

/** Controleert alle velden; verplicht zijn bedrijfsnaam, adres en contactpersoon. */
export const validateBillingDetails = (d: BillingDetails): BillingErrors => {
  const rules = billingCountryRules(d.billing_country);
  const errors: BillingErrors = {};
  const trimmed = (v: string) => v.trim();

  if (!trimmed(d.billing_company_name)) errors.billing_company_name = "Vul de bedrijfsnaam in.";
  if (!trimmed(d.billing_address_street)) errors.billing_address_street = "Vul straat en huisnummer in.";
  if (!trimmed(d.billing_address_postal)) errors.billing_address_postal = "Vul de postcode in.";
  else if (rules.postal && !rules.postal.test(trimmed(d.billing_address_postal))) errors.billing_address_postal = `Gebruik de vorm ${rules.postalExample}.`;
  if (!trimmed(d.billing_address_city)) errors.billing_address_city = "Vul de plaats in.";
  if (!trimmed(d.billing_contact_name)) errors.billing_contact_name = "Vul de naam van de contactpersoon in.";

  const registry = trimmed(d.billing_kvk_number);
  if (registry && rules.registry.pattern && !rules.registry.pattern.test(registry)) {
    errors.billing_kvk_number = `Gebruik de vorm ${rules.registry.example}.`;
  }
  const vat = trimmed(d.billing_vat_number).replace(/[\s.]/g, "");
  if (vat && rules.vat && !rules.vat.test(vat)) errors.billing_vat_number = `Gebruik de vorm ${rules.vatExample}.`;

  const email = trimmed(d.billing_contact_email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.billing_contact_email = "Dit e-mailadres klopt niet.";

  return errors;
};

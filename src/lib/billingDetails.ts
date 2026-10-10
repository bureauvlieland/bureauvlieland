/**
 * Facturatiegegevens van een klant (klantportaal, tabblad Facturatie):
 * welke velden verplicht zijn, wanneer ze compleet zijn, en de vorm van
 * postcode, btw-nummer en ondernemingsnummer per land. Pure functies, los
 * van React, gedeeld door de sheet, de kaart en de portaalstatus.
 */

export interface BillingDetails {
  billing_company_name: string;
  billing_kvk_number: string;
  billing_vat_number: string;
  billing_address_street: string;
  billing_address_postal: string;
  billing_address_city: string;
  /** ISO 3166-1 alpha-2, standaard NL. */
  billing_country: string;
  billing_contact_name: string;
  billing_contact_email: string;
  billing_reference: string;
}

export type BillingField = keyof BillingDetails;

export const EMPTY_BILLING_DETAILS: BillingDetails = {
  billing_company_name: "",
  billing_kvk_number: "",
  billing_vat_number: "",
  billing_address_street: "",
  billing_address_postal: "",
  billing_address_city: "",
  billing_country: "NL",
  billing_contact_name: "",
  billing_contact_email: "",
  billing_reference: "",
};

/** De landen waarvan we de vorm van postcode en nummers kennen; "overig" is vrij. */
export const BILLING_COUNTRIES: { code: string; label: string }[] = [
  { code: "NL", label: "Nederland" },
  { code: "BE", label: "België" },
  { code: "DE", label: "Duitsland" },
  { code: "LU", label: "Luxemburg" },
  { code: "FR", label: "Frankrijk" },
  { code: "GB", label: "Verenigd Koninkrijk" },
  { code: "XX", label: "Ander land" },
];

export function billingCountryLabel(code: string | null | undefined): string {
  return BILLING_COUNTRIES.find((c) => c.code === (code || "NL"))?.label ?? code ?? "Nederland";
}

/** Per land: hoe het ondernemingsnummer heet en de vorm van postcode, nummer en btw-nummer. */
interface CountryRules {
  registryLabel: string;
  registryHelp: string;
  registryPattern?: RegExp;
  registryError?: string;
  postalPattern?: RegExp;
  postalError?: string;
  postalPlaceholder: string;
  vatPattern?: RegExp;
  vatError?: string;
  vatPlaceholder: string;
}

const COUNTRY_RULES: Record<string, CountryRules> = {
  NL: {
    registryLabel: "KvK-nummer",
    registryHelp: "8 cijfers",
    registryPattern: /^\d{8}$/,
    registryError: "Een KvK-nummer heeft 8 cijfers",
    postalPattern: /^\d{4}\s?[A-Z]{2}$/i,
    postalError: "Een Nederlandse postcode is 4 cijfers en 2 letters, zoals 8899 AB",
    postalPlaceholder: "1234 AB",
    vatPattern: /^NL\d{9}B\d{2}$/i,
    vatError: "Een Nederlands btw-nummer ziet eruit als NL123456789B01",
    vatPlaceholder: "NL123456789B01",
  },
  BE: {
    registryLabel: "Ondernemingsnummer",
    registryHelp: "10 cijfers, zoals 0123.456.789",
    registryPattern: /^[01]\d{3}\.?\d{3}\.?\d{3}$/,
    registryError: "Een Belgisch ondernemingsnummer heeft 10 cijfers",
    postalPattern: /^\d{4}$/,
    postalError: "Een Belgische postcode heeft 4 cijfers",
    postalPlaceholder: "1000",
    vatPattern: /^BE\s?0?\d{9,10}$/i,
    vatError: "Een Belgisch btw-nummer ziet eruit als BE0123456789",
    vatPlaceholder: "BE0123456789",
  },
  DE: {
    registryLabel: "Handelsregisternummer",
    registryHelp: "Zoals HRB 12345",
    postalPattern: /^\d{5}$/,
    postalError: "Een Duitse postcode heeft 5 cijfers",
    postalPlaceholder: "10115",
    vatPattern: /^DE\d{9}$/i,
    vatError: "Een Duits btw-nummer ziet eruit als DE123456789",
    vatPlaceholder: "DE123456789",
  },
  LU: {
    registryLabel: "RCS-nummer",
    registryHelp: "Zoals B123456",
    postalPattern: /^L?-?\d{4}$/i,
    postalError: "Een Luxemburgse postcode heeft 4 cijfers",
    postalPlaceholder: "1234",
    vatPattern: /^LU\d{8}$/i,
    vatError: "Een Luxemburgs btw-nummer ziet eruit als LU12345678",
    vatPlaceholder: "LU12345678",
  },
  FR: {
    registryLabel: "SIREN-nummer",
    registryHelp: "9 cijfers",
    registryPattern: /^\d{3}\s?\d{3}\s?\d{3}$/,
    registryError: "Een SIREN-nummer heeft 9 cijfers",
    postalPattern: /^\d{5}$/,
    postalError: "Een Franse postcode heeft 5 cijfers",
    postalPlaceholder: "75001",
    vatPattern: /^FR[A-Z0-9]{2}\d{9}$/i,
    vatError: "Een Frans btw-nummer ziet eruit als FR12345678901",
    vatPlaceholder: "FR12345678901",
  },
  GB: {
    registryLabel: "Company number",
    registryHelp: "8 tekens",
    postalPattern: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
    postalError: "Een Britse postcode ziet eruit als SW1A 1AA",
    postalPlaceholder: "SW1A 1AA",
    vatPattern: /^GB\d{9}(\d{3})?$/i,
    vatError: "Een Brits btw-nummer ziet eruit als GB123456789",
    vatPlaceholder: "GB123456789",
  },
};

const OTHER_RULES: CountryRules = {
  registryLabel: "Registratienummer",
  registryHelp: "Het nummer van het handelsregister in uw land",
  postalPlaceholder: "Postcode",
  vatPlaceholder: "Btw-nummer",
};

export function billingCountryRules(code: string | null | undefined): CountryRules {
  return COUNTRY_RULES[(code || "NL").toUpperCase()] ?? OTHER_RULES;
}

/** Compleet genoeg om te factureren en te ondertekenen: bedrijf, adres en contactpersoon. */
export function isBillingComplete(details: Partial<Record<BillingField, string | null | undefined>>): boolean {
  return !!(
    details.billing_company_name?.trim() &&
    details.billing_address_street?.trim() &&
    details.billing_address_postal?.trim() &&
    details.billing_address_city?.trim() &&
    details.billing_contact_name?.trim()
  );
}

export type BillingErrors = Partial<Record<BillingField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Alle fouten in één keer; een leeg object betekent: opslaan mag. */
export function validateBillingDetails(details: BillingDetails): BillingErrors {
  const errors: BillingErrors = {};
  const rules = billingCountryRules(details.billing_country);

  if (!details.billing_company_name.trim()) errors.billing_company_name = "Vul de bedrijfsnaam in";
  if (!details.billing_address_street.trim()) errors.billing_address_street = "Vul straat en huisnummer in";
  if (!details.billing_address_city.trim()) errors.billing_address_city = "Vul de plaats in";
  if (!details.billing_contact_name.trim()) errors.billing_contact_name = "Vul de naam van de contactpersoon in";

  const postal = details.billing_address_postal.trim();
  if (!postal) errors.billing_address_postal = "Vul de postcode in";
  else if (rules.postalPattern && !rules.postalPattern.test(postal)) errors.billing_address_postal = rules.postalError;

  const registry = details.billing_kvk_number.trim();
  if (registry && rules.registryPattern && !rules.registryPattern.test(registry)) {
    errors.billing_kvk_number = rules.registryError;
  }

  const vat = details.billing_vat_number.trim().replace(/\s+/g, "");
  if (vat && rules.vatPattern && !rules.vatPattern.test(vat)) errors.billing_vat_number = rules.vatError;

  const email = details.billing_contact_email.trim();
  if (email && !EMAIL_PATTERN.test(email)) errors.billing_contact_email = "Dit e-mailadres klopt niet";

  return errors;
}

/** Eén veld controleren, voor validatie bij het verlaten van het veld. */
export function validateBillingField(details: BillingDetails, field: BillingField): string | undefined {
  return validateBillingDetails(details)[field];
}

/** Netjes maken vóór opslaan: hoofdletters in nummers, spaties weg. */
export function normalizeBillingDetails(details: BillingDetails): BillingDetails {
  const country = (details.billing_country || "NL").toUpperCase();
  const postal = details.billing_address_postal.trim().toUpperCase();
  return {
    ...details,
    billing_company_name: details.billing_company_name.trim(),
    billing_kvk_number: details.billing_kvk_number.trim(),
    billing_vat_number: details.billing_vat_number.trim().replace(/\s+/g, "").toUpperCase(),
    billing_address_street: details.billing_address_street.trim(),
    billing_address_postal: country === "NL" ? postal.replace(/^(\d{4})\s?([A-Z]{2})$/, "$1 $2") : postal,
    billing_address_city: details.billing_address_city.trim(),
    billing_country: country,
    billing_contact_name: details.billing_contact_name.trim(),
    billing_contact_email: details.billing_contact_email.trim(),
    billing_reference: details.billing_reference.trim(),
  };
}

/** Adres op één regel, met het land erbij als het niet Nederland is. */
export function formatBillingAddress(
  details: Partial<Record<BillingField, string | null | undefined>>,
): string {
  const postalCity = [details.billing_address_postal, details.billing_address_city].filter(Boolean).join(" ");
  const country = (details.billing_country || "NL").toUpperCase();
  return [details.billing_address_street, postalCity, country !== "NL" ? billingCountryLabel(country) : null]
    .filter(Boolean)
    .join(", ");
}

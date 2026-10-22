// Eén bron van waarheid voor de afhandeling en facturatieroute van een
// programmaonderdeel. Wordt gebruikt door het partnerportaal en de admin
// (via src/lib/itemHandling.ts) én door edge functions
// (update-partner-item-status, auto-close-past-execution).
//
// partner_handling: wat we van de partner verwachten.
//   quote    offerte/prijs indienen (default, de bestaande flow)
//   confirm  alleen bevestigen dat het geregeld is, zonder prijs
//   inform   ter kennisgeving, geen actie
//
// billing_route: waar de kosten van dit onderdeel landen.
//   bureau                factuur van Bureau Vlieland (default)
//   partner_stay_invoice  op de verblijfsnota/eigen nota van de partner
//   customer_direct       de klant rekent rechtstreeks met de partner af
//
// De twee staan los van elkaar. Een restaurantreservering die het hotel op
// de verblijfsnota zet is confirm + partner_stay_invoice; een "u heeft
// tafel 4" mededeling is inform + customer_direct.

export type PartnerHandling = "quote" | "confirm" | "inform";
export type BillingRoute = "bureau" | "partner_stay_invoice" | "customer_direct";

export const PARTNER_HANDLING_VALUES: readonly PartnerHandling[] = ["quote", "confirm", "inform"];
export const BILLING_ROUTE_VALUES: readonly BillingRoute[] = ["bureau", "partner_stay_invoice", "customer_direct"];

export interface HandlingItemLike {
  partner_handling?: string | null;
  billing_route?: string | null;
}

export function partnerHandlingOf(item: HandlingItemLike | null | undefined): PartnerHandling {
  const v = item?.partner_handling;
  return v === "confirm" || v === "inform" ? v : "quote";
}

export function billingRouteOf(item: HandlingItemLike | null | undefined): BillingRoute {
  const v = item?.billing_route;
  return v === "partner_stay_invoice" || v === "customer_direct" ? v : "bureau";
}

/** Moet de partner voor dit onderdeel een prijs/offerte indienen? */
export function requiresPartnerQuote(item: HandlingItemLike | null | undefined): boolean {
  return partnerHandlingOf(item) === "quote";
}

/** Verwacht Bureau Vlieland een partnerfactuur voor dit onderdeel? */
export function expectsPartnerInvoice(item: HandlingItemLike | null | undefined): boolean {
  return billingRouteOf(item) === "bureau" && partnerHandlingOf(item) !== "inform";
}

/** Onderdeel is ter kennisgeving: de partner hoeft niets te doen. */
export function isInformationalItem(item: HandlingItemLike | null | undefined): boolean {
  return partnerHandlingOf(item) === "inform";
}

/** Onderdeel vraagt alleen een bevestiging van de partner (geen prijs). */
export function isConfirmOnlyItem(item: HandlingItemLike | null | undefined): boolean {
  return partnerHandlingOf(item) === "confirm";
}

export const PARTNER_HANDLING_LABELS: Record<PartnerHandling, { admin: string; partner: string; help: string }> = {
  quote: {
    admin: "Offerte",
    partner: "Offerte gevraagd",
    help: "De partner dient een prijs of gespecificeerde offerte in; Bureau Vlieland beoordeelt en de partner factureert aan Bureau Vlieland.",
  },
  confirm: {
    admin: "Bevestiging",
    partner: "Bevestiging gevraagd",
    help: "Bureau Vlieland geeft het onderdeel door; de partner bevestigt alleen dat het geregeld is. Geen prijs, geen offerte.",
  },
  inform: {
    admin: "Mededeling",
    partner: "Ter kennisgeving",
    help: "Puur ter informatie voor de partner. Er wordt geen reactie verwacht.",
  },
};

export const BILLING_ROUTE_LABELS: Record<BillingRoute, { admin: string; partner: string; help: string }> = {
  bureau: {
    admin: "Via Bureau Vlieland",
    partner: "Factureren aan Bureau Vlieland",
    help: "De partner factureert dit onderdeel aan Bureau Vlieland; het komt op de bureaufactuur aan de klant.",
  },
  partner_stay_invoice: {
    admin: "Op verblijfsnota partner",
    partner: "Op uw eigen verblijfsnota",
    help: "De partner zet dit op zijn eigen (verblijfs)nota aan de klant. Geen partnerfactuur aan Bureau Vlieland.",
  },
  customer_direct: {
    admin: "Klant rechtstreeks",
    partner: "Klant rekent rechtstreeks met u af",
    help: "De klant rekent dit rechtstreeks met de partner af, buiten Bureau Vlieland om.",
  },
};

/** Korte zin voor de partner over de facturatie, alleen als die afwijkt van de bureauroute. */
export function partnerBillingNote(item: HandlingItemLike | null | undefined): string | null {
  switch (billingRouteOf(item)) {
    case "partner_stay_invoice":
      return "Facturatie: op uw eigen verblijfsnota aan de klant. U hoeft hiervoor niets bij Bureau Vlieland in te dienen.";
    case "customer_direct":
      return "Facturatie: de klant rekent dit rechtstreeks met u af. U hoeft hiervoor niets bij Bureau Vlieland in te dienen.";
    default:
      return null;
  }
}

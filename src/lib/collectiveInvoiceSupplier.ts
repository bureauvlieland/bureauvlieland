/**
 * Welke leesmethode hoort bij de partner van een verzamelfactuur.
 *
 * Doeksen heeft reservatienummers, toeristenbelasting en ingehouden commissie
 * en wordt op reservatienummer gematcht. Elke andere leverancier (Isla, Jan van
 * Vlieland, …) stuurt een factuur met één regel per klant en wordt op
 * klantnaam gematcht. Dependency-vrij voor vitest.
 */
export type CollectiveSupplierType = "doeksen" | "generic";

export const DOEKSEN_PARTNER_ID = "rederij";

export const supplierTypeForPartner = (partnerId: string | null | undefined): CollectiveSupplierType =>
  partnerId === DOEKSEN_PARTNER_ID ? "doeksen" : "generic";
